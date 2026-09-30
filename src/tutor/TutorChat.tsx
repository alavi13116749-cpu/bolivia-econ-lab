import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { askTutor, detectProvider, loadSettings, saveSettings, TutorError, type ChatTurn, type ProviderKind, type TutorMode, type TutorSettings } from '../ai/tutor';
import { Markdown } from '../ui/Markdown';
import { Segmented } from '../ui/controls';
import { getState, setState, useStore } from '../state/store';
import { load, save } from '../lib/storage';

interface Msg extends ChatTurn { tools?: { name: string; status: 'start' | 'ok' | 'error'; detail?: string }[]; error?: string }

const TOOL_LABEL: Record<string, string> = {
  listar_datasets: 'Revisando datasets',
  ejecutar_analisis: 'Ejecutando análisis en el Lab',
  leer_leccion: 'Leyendo la lección',
  abrir_pagina: 'Abriendo página',
};

const PROVIDER_LABEL: Record<ProviderKind, string> = {
  claude: 'Claude · claude.ai',
  api: 'Claude · tu clave de API',
  offline: 'Sin conexión',
};

function suggestions(path: string, hasResult: boolean): string[] {
  const base = hasResult ? ['Interpreta el último resultado del Lab como si fuera un examen', '¿Qué supuestos debo revisar en este resultado?'] : [];
  if (path.startsWith('/curso/econometria')) return [...base, 'Explícame la diferencia entre efectos fijos y aleatorios con un ejemplo boliviano', 'Estima la demanda de quinua por MCO y por MC2E y compáralas'];
  if (path.startsWith('/curso/monetaria')) return [...base, '¿Por qué la bolivianización aumenta la efectividad de la política monetaria?', 'Explícame el DS 21060 con el modelo de Cagan'];
  if (path.startsWith('/lab')) return [...base, 'Prueba si ln_m1_real y ln_pib están cointegradas', 'Estima un Logit de acceso al crédito y explícame los efectos marginales'];
  return [...base, 'Hazme una pregunta de examen de Econometría II', '¿Cómo sé si una serie tiene raíz unitaria?', '¿Qué es el sesgo inflacionario de Barro-Gordon?'];
}

export default function TutorChat({ compact = false }: { compact?: boolean }) {
  const loc = useLocation();
  const draft = useStore((s) => s.tutorDraft);
  const hasResult = useStore((s) => !!s.result);
  const [msgs, setMsgs] = useState<Msg[]>(() => load<Msg[]>('chat', []));
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<TutorMode>(() => load<TutorMode>('tutor-mode', 'explicar'));
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<ProviderKind | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TutorSettings>(loadSettings);
  const ctl = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { detectProvider().then(setProvider); }, [settings]);
  useEffect(() => { save('chat', msgs.slice(-40)); }, [msgs]);
  useEffect(() => { save('tutor-mode', mode); }, [mode]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs]);
  useEffect(() => {
    if (draft) {
      setInput(draft);
      setState({ tutorDraft: null });
      inputRef.current?.focus();
    }
  }, [draft]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: ChatTurn[] = [...msgs.filter((m) => !m.error && m.content).map(({ role, content }) => ({ role, content })), { role: 'user', content: q }];
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '', tools: [] }]);
    setInput('');
    setBusy(true);
    ctl.current = new AbortController();
    const patchLast = (f: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), f(all[all.length - 1])]);
    try {
      const res = await askTutor(history, {
        mode, page: loc.pathname, signal: ctl.current.signal,
        onText: (t) => patchLast((m) => ({ ...m, content: t })),
        onTool: (name, status, detail) => patchLast((m) => {
          const tools = [...(m.tools ?? [])];
          if (status === 'start') tools.push({ name, status });
          else {
            const i = tools.map((t) => t.name).lastIndexOf(name);
            if (i >= 0) tools[i] = { name, status, detail };
          }
          return { ...m, tools };
        }),
      });
      setProvider(res.provider);
      patchLast((m) => ({ ...m, content: res.text, error: res.note }));
    } catch (e) {
      const err = e instanceof TutorError ? e : new TutorError('upstream_error', String(e));
      patchLast((m) => ({ ...m, content: err.partial ?? m.content, error: err.code === 'cancelled' ? undefined : err.message }));
    } finally {
      setBusy(false);
      ctl.current = null;
    }
  }

  const sugg = suggestions(loc.pathname, hasResult);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Segmented label="Modo del Auxiliar" value={mode} onChange={setMode} options={[{ id: 'explicar', label: 'Explicar' }, { id: 'socratico', label: 'Socrático' }, { id: 'examen', label: 'Examen' }]} />
        <div className="flex items-center gap-2">
          {provider && <span className={`chip ${provider === 'offline' ? 'bg-warn-soft text-warn' : 'bg-teal-soft text-teal'}`}>{PROVIDER_LABEL[provider]}</span>}
          <button type="button" className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>Ajustes</button>
        </div>
      </div>

      {showSettings && (
        <form className="grid gap-3 border-b border-line bg-surface-2 px-4 py-3 text-sm" onSubmit={(e) => { e.preventDefault(); saveSettings(settings); setShowSettings(false); }}>
          <p className="text-xs text-muted">Dentro de claude.ai el Auxiliar usa tu cuenta de Claude sin configurar nada. Fuera de claude.ai puedes usar tu propia clave de la API de Anthropic: se guarda sólo en este navegador y se envía directamente a api.anthropic.com.</p>
          <label className="grid gap-1" htmlFor="apikey"><span className="text-muted">Clave de API de Anthropic</span>
            <input id="apikey" type="password" autoComplete="off" className="field font-mono" placeholder="sk-ant-…" value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value.trim() })} />
          </label>
          <label className="grid gap-1" htmlFor="model"><span className="text-muted">Modelo (con clave propia)</span>
            <select id="model" className="field" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value as TutorSettings['model'] })}>
              <option value="claude-opus-5-5">Claude Opus 5.5 (más capaz)</option>
              <option value="claude-sonnet-5-5">Claude Sonnet 5.5 (equilibrado)</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5 (más económico)</option>
            </select>
          </label>
          <label className="flex items-center gap-2" htmlFor="offline"><input id="offline" type="checkbox" checked={settings.preferOffline} onChange={(e) => setSettings({ ...settings, preferOffline: e.target.checked })} /> Usar siempre el modo sin conexión</label>
          <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancelar</button></div>
        </form>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 ${compact ? '' : 'sm:px-6'}`} aria-live="polite">
        {msgs.length === 0 && (
          <div className="grid gap-4">
            <div>
              <div className="eyebrow mb-1">Tu auxiliar de cátedra</div>
              <p className="text-[15px]">Pregúntame por cualquier tema de Econometría II o Economía Monetaria II. Puedo <strong>ejecutar análisis en el Lab</strong> con el motor validado, interpretar tus resultados y tomarte un examen.</p>
            </div>
            <div className="grid gap-2">
              {sugg.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-muted">{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-8 justify-self-end rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14.5px] text-bg' : 'min-w-0'}>
              {m.role === 'user' ? (
                <div className="whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div className="grid gap-2">
                  {m.tools && m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tools.map((t, k) => (
                        <span key={k} className={`chip ${t.status === 'error' ? 'bg-bad-soft text-bad' : t.status === 'ok' ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted'}`} title={t.detail}>
                          {t.status === 'start' ? <span className="dots">{TOOL_LABEL[t.name] ?? t.name}</span> : `${TOOL_LABEL[t.name] ?? t.name}${t.status === 'ok' ? ' ✓' : ' ✕'}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.content ? <Markdown text={m.content} className="text-[14.5px]" /> : busy && i === msgs.length - 1 ? <div className="text-sm text-muted"><span className="dots">Pensando</span></div> : null}
                  {m.error && <div className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{m.error}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <form className="border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <div className="flex items-end gap-2">
          <label htmlFor="tutor-input" className="sr-only">Mensaje para el Auxiliar</label>
          <textarea id="tutor-input" ref={inputRef} rows={2} className="field min-h-[44px] flex-1 resize-none" placeholder="Escribe tu pregunta… (Enter para enviar)"
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          {busy ? (
            <button type="button" className="btn btn-ghost" onClick={() => ctl.current?.abort()}>Detener</button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>Enviar</button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{getState().result ? `Contexto: ${getState().result!.title}` : 'Sin resultados del Lab en contexto'}</span>
          {msgs.length > 0 && <button type="button" className="hover:text-ink" onClick={() => setMsgs([])}>Nueva conversación</button>}
        </div>
      </form>
    </div>
  );
}
