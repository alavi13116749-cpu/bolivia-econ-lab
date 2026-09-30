import Anthropic from '@anthropic-ai/sdk';
import { TUTOR_TOOLS, type TutorTool } from './tools';
import { getState, activeDataset } from '../state/store';
import { searchUnits } from '../content';
import { interpret } from '../analysis/interpret';
import { load, save } from '../lib/storage';

export type TutorMode = 'explicar' | 'socratico' | 'examen';
export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export type ProviderKind = 'claude' | 'api' | 'offline';

export interface TutorSettings {
  apiKey: string;
  model: 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-4-5';
  preferOffline: boolean;
}

export function loadSettings(): TutorSettings {
  return load<TutorSettings>('tutor-settings', { apiKey: '', model: 'claude-opus-5-5', preferOffline: false });
}
export function saveSettings(s: TutorSettings) {
  save('tutor-settings', s);
}

const MODE_RULES: Record<TutorMode, string> = {
  explicar: 'Modo EXPLICAR: explica con claridad, paso a paso, con la intuición económica primero y luego la formalización. Termina con una pregunta corta para verificar comprensión.',
  socratico: 'Modo SOCRÁTICO: NO des la respuesta final. Guía con preguntas, pistas graduales y contraejemplos. Si el estudiante acierta, confírmalo y profundiza. Sólo revela la solución si la pide explícitamente dos veces.',
  examen: 'Modo EXAMEN: plantea UNA pregunta de examen a la vez (conceptual o numérica, nivel universitario boliviano), espera la respuesta, corrígela con puntaje sobre 10 y explica los errores. Varía entre teoría, cálculo e interpretación de salidas de software.',
};

export function buildInstructions(mode: TutorMode, page: string): string {
  const s = getState();
  const ds = activeDataset();
  const res = s.result;
  return [
    'Eres el «Auxiliar», el ayudante de cátedra de IA de Bolivia Econ Lab: una plataforma para estudiantes universitarios bolivianos de Econometría II y Economía Monetaria II.',
    'Responde SIEMPRE en español, con tono cercano y riguroso, como un buen auxiliar de docencia de la UMSA, la UMSS o la UCB. Usa Markdown y fórmulas LaTeX entre $…$ o $$…$$.',
    'Sé conciso: prioriza la intuición, luego la matemática necesaria, luego un ejemplo boliviano cuando sea pertinente.',
    'Tienes herramientas: listar_datasets, ejecutar_analisis (motor econométrico validado contra statsmodels), leer_leccion y abrir_pagina. Cuando el estudiante pida estimar, probar o calcular algo con datos, EJECUTA el análisis con la herramienta en vez de inventar números. Nunca inventes resultados numéricos.',
    'Los datasets incorporados son SIMULADOS con fines didácticos (calibrados a rasgos de Bolivia); dilo si el estudiante los trata como datos oficiales. El dataset del Banco Mundial, si está cargado, es oficial.',
    'Sobre hechos de Bolivia (BCB, régimen cambiario, hiperinflación de 1985, DS 21060, bolivianización), sé preciso y, si no estás seguro de una cifra o de un hecho reciente, dilo explícitamente en lugar de adivinar.',
    MODE_RULES[mode],
    '',
    `Contexto actual de la app: página «${page}». Dataset activo en el Lab: ${ds.name} (${ds.source}; variables: ${ds.columns.join(', ')}).`,
    res ? `Último resultado visible en el Lab (${res.title}):\n${res.report.slice(0, 5000)}` : 'Aún no hay resultados en el Lab.',
  ].join('\n');
}

// ------------------------------------------------------------------ proveedor 1: claude.ai (capacidad sample)

interface SampleFn {
  (input: string | ChatTurn[], opts?: {
    onText?: (u: { text: string; delta: string }) => void;
    signal?: AbortSignal;
    cache?: boolean;
    tools?: { name: string; description: string; inputSchema?: unknown; execute: (input: Record<string, unknown>) => unknown }[];
    modelTier?: 'default' | 'complex' | 'quick';
  }): Promise<{ text: string; truncated: boolean }>;
  limits?: () => Promise<{ tools?: { maxCount: number } }>;
}

let samplePromise: Promise<SampleFn | null> | null = null;

/** Resuelve la capacidad `sample` si la app corre como Artifact en claude.ai. */
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const w = window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } };
    samplePromise = w.claude?.use ? (w.claude.use('sample') as Promise<SampleFn | null>).catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

// ------------------------------------------------------------------ interfaz común

export interface AskOptions {
  mode: TutorMode;
  page: string;
  onText: (text: string) => void;
  onTool?: (name: string, status: 'start' | 'ok' | 'error', detail?: string) => void;
  signal: AbortSignal;
}

export interface AskResult { text: string; provider: ProviderKind; note?: string }

export class TutorError extends Error {
  code: string;
  partial?: string;
  constructor(code: string, message: string, partial?: string) {
    super(message);
    this.code = code;
    this.partial = partial;
  }
}

function wrapTool(t: TutorTool, onTool?: AskOptions['onTool']) {
  return async (input: Record<string, unknown>) => {
    onTool?.(t.name, 'start');
    try {
      const out = await t.execute(input ?? {});
      onTool?.(t.name, 'ok');
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onTool?.(t.name, 'error', msg);
      throw new Error(msg);
    }
  };
}

export async function detectProvider(): Promise<ProviderKind> {
  const st = loadSettings();
  if (st.preferOffline) return 'offline';
  if (await getSample()) return 'claude';
  if (st.apiKey) return 'api';
  return 'offline';
}

export async function askTutor(history: ChatTurn[], opts: AskOptions): Promise<AskResult> {
  const provider = await detectProvider();
  const rules = buildInstructions(opts.mode, opts.page);
  if (provider === 'claude') return askClaudeAI(rules, history, opts);
  if (provider === 'api') return askAnthropicAPI(rules, history, opts);
  return { text: offlineAnswer(history[history.length - 1]?.content ?? ''), provider: 'offline' };
}

async function askClaudeAI(rules: string, history: ChatTurn[], opts: AskOptions): Promise<AskResult> {
  const sample = (await getSample())!;
  let canTools = false;
  try {
    canTools = !!(await sample.limits?.())?.tools;
  } catch {
    canTools = false;
  }
  const turns: ChatTurn[] = [{ role: 'user', content: `[Instrucciones del sistema para el Auxiliar]\n${rules}` }, ...history.slice(-16)];
  try {
    const res = await sample(turns, {
      onText: ({ text }) => opts.onText(text),
      signal: opts.signal,
      ...(canTools
        ? { tools: TUTOR_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema, execute: wrapTool(t, opts.onTool) })) }
        : { cache: false }),
    });
    return { text: res.text, provider: 'claude', note: res.truncated ? 'La respuesta se cortó por longitud; pida menos a la vez.' : undefined };
  } catch (e) {
    const err = e as { code?: string; message?: string; text?: string };
    throw new TutorError(err.code ?? 'upstream_error', sampleErrorCopy(err.code), err.text);
  }
}

function sampleErrorCopy(code?: string): string {
  switch (code) {
    case 'not_granted': return 'No se autorizó al Auxiliar a usar Claude en esta vista. Puede seguir en modo sin conexión o configurar una clave de API.';
    case 'rate_limited': return 'Se alcanzó el límite de uso por ahora. Intente de nuevo en unos minutos.';
    case 'session_expired': return 'La sesión de claude.ai expiró: vuelva a iniciar sesión.';
    case 'refused': return 'Claude no respondió a esta solicitud. Reformule la pregunta.';
    case 'prompt_too_large': return 'La conversación es demasiado larga. Empiece una nueva.';
    case 'cancelled': return 'Respuesta detenida.';
    default: return 'No se pudo contactar a Claude. Intente otra vez.';
  }
}

// ------------------------------------------------------------------ proveedor 2: API de Anthropic con clave propia

async function askAnthropicAPI(rules: string, history: ChatTurn[], opts: AskOptions): Promise<AskResult> {
  const st = loadSettings();
  const client = new Anthropic({ apiKey: st.apiKey, dangerouslyAllowBrowser: true });
  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-20).map((t) => ({ role: t.role, content: t.content }));
  const tools: Anthropic.Beta.BetaTool[] = TUTOR_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema, eager_input_streaming: true }));
  const isHaiku = st.model === 'claude-haiku-4-5';
  let shown = '';
  for (let round = 0; round < 6; round++) {
    const prefix = shown ? shown + '\n\n' : '';
    let roundText = '';
    let msg: Anthropic.Beta.BetaMessage;
    try {
      const stream = client.beta.messages.stream(
        {
          model: st.model,
          max_tokens: 16000,
          system: rules,
          messages,
          tools,
          ...(isHaiku ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const, output_config: { effort: 'medium' as const } }),
        },
        { signal: opts.signal },
      );
      stream.on('text', (delta) => {
        roundText += delta;
        opts.onText(prefix + roundText);
      });
      msg = await stream.finalMessage();
    } catch (e) {
      throw new TutorError(apiErrorCode(e), apiErrorCopy(e), shown || undefined);
    }
    if (msg.stop_reason === 'refusal') throw new TutorError('refused', 'Claude declinó responder esta solicitud. Reformule la pregunta.', shown || undefined);
    if (roundText) shown = prefix + roundText;
    messages.push({ role: 'assistant', content: msg.content as Anthropic.Beta.BetaContentBlockParam[] });
    if (msg.stop_reason !== 'tool_use') break;
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue;
      const tool = TUTOR_TOOLS.find((t) => t.name === block.name);
      const input = block.input;
      if (!tool || !input || typeof input !== 'object' || Array.isArray(input)) {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: 'INVALID_JSON: entrada de herramienta inválida o incompleta.', is_error: true });
        continue;
      }
      try {
        const out = await wrapTool(tool, opts.onTool)(input as Record<string, unknown>);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: out });
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${e instanceof Error ? e.message : String(e)}`, is_error: true });
      }
    }
    messages.push({ role: 'user', content: results });
  }
  return { text: shown || '(sin respuesta)', provider: 'api' };
}

function apiErrorCode(e: unknown): string {
  if (e instanceof Anthropic.APIUserAbortError) return 'cancelled';
  if (e instanceof Anthropic.AuthenticationError) return 'auth';
  if (e instanceof Anthropic.RateLimitError) return 'rate_limited';
  if (e instanceof Anthropic.APIConnectionError) return 'connection';
  return 'upstream_error';
}
function apiErrorCopy(e: unknown): string {
  switch (apiErrorCode(e)) {
    case 'cancelled': return 'Respuesta detenida.';
    case 'auth': return 'La clave de API no es válida. Revísela en Ajustes del Auxiliar.';
    case 'rate_limited': return 'Límite de uso de la API alcanzado. Espere un momento.';
    case 'connection': return 'No hay conexión con la API de Anthropic. Revise su internet o use el modo sin conexión.';
    default: return `Error de la API: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ------------------------------------------------------------------ proveedor 3: sin conexión

export function offlineAnswer(question: string): string {
  const s = getState();
  const q = question.toLowerCase();
  const parts: string[] = [];
  if (s.result && /(result|interpret|salida|explica|que significa|qué significa|lab)/.test(q)) {
    parts.push(`**Interpretación del último resultado (${s.result.title}):**\n\n${interpret(s.result)}`);
  }
  const hits = searchUnits(question);
  if (hits.length) {
    parts.push('**Material del curso relacionado:**');
    for (const h of hits) {
      const firstPara = h.unit.body.split('\n## ')[1]?.split('\n\n').slice(0, 3).join('\n\n') ?? h.unit.summary;
      parts.push(`### [${h.course.name} · Unidad ${h.unit.number}: ${h.unit.title}](#/curso/${h.course.id}/${h.unit.id})\n${h.unit.summary}\n\n${firstPara.replace(/^[^\n]*\n/, '')}`);
    }
  }
  if (!parts.length) {
    parts.push('No encontré material relacionado con esa pregunta. Pruebe con términos del curso (por ejemplo: *cointegración*, *Hausman*, *multiplicador*, *regla de Taylor*) o ejecute un análisis en el Lab y pida «interpreta el resultado».');
  }
  parts.push('\n> Está en **modo sin conexión**: respuestas a partir del material del curso y de la interpretación automática del Lab. Para conversar con Claude, abra la app en claude.ai o configure una clave de API en Ajustes.');
  return parts.join('\n\n');
}
