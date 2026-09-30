// Herramientas que el Auxiliar IA puede ejecutar dentro de la app.
// Las usan tanto el proveedor de claude.ai (capacidad `sample`) como la API de Anthropic.
import { runAnalysis, type AnalysisSpec } from '../analysis/run';
import { interpret } from '../analysis/interpret';
import { findDataset, getState, setState } from '../state/store';
import { COURSES, findUnit } from '../content';
import { SIMULATORS } from '../sims/registry';

export interface TutorTool {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  execute: (input: Record<string, unknown>) => string | Promise<string>;
}

const clip = (s: string, n = 7000) => (s.length > n ? s.slice(0, n) + '\n…(recortado)' : s);

const SPEC_SCHEMA = {
  type: 'object',
  description:
    'Especificación del análisis. kind ∈ describe | ols | binary | iv | panel | unitroot | correlogram | arima | var | coint. ' +
    'Campos por tipo: ols {y, x[], covType?: classic|HC1|HAC}; binary {link: logit|probit, y, x[]}; iv {y, exog[], endog[], instruments[]}; ' +
    'panel {y, x[]} (sólo datasets de panel); unitroot {variable, regression?: n|c|ct}; correlogram {variable, lags?}; arima {variable, p, d, q, horizon?}; ' +
    'var {variables[], p?, horizon?}; coint {y, x[]}; describe {variables?[]}. ' +
    'Los términos admiten transformaciones: log(x), d(x), lag(x,k), x^2, a*b.',
  properties: {
    kind: { type: 'string', enum: ['describe', 'ols', 'binary', 'iv', 'panel', 'unitroot', 'correlogram', 'arima', 'var', 'coint'] },
    y: { type: 'string' },
    x: { type: 'array', items: { type: 'string' } },
    covType: { type: 'string', enum: ['classic', 'HC1', 'HAC'] },
    link: { type: 'string', enum: ['logit', 'probit'] },
    exog: { type: 'array', items: { type: 'string' } },
    endog: { type: 'array', items: { type: 'string' } },
    instruments: { type: 'array', items: { type: 'string' } },
    variable: { type: 'string' },
    regression: { type: 'string', enum: ['n', 'c', 'ct'] },
    lags: { type: 'integer' },
    p: { type: 'integer' },
    d: { type: 'integer' },
    q: { type: 'integer' },
    horizon: { type: 'integer' },
    variables: { type: 'array', items: { type: 'string' } },
  },
  required: ['kind'],
};

function asStrings(v: unknown, field: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`"${field}" debe ser una lista de nombres de variables.`);
  return v as string[];
}

/** Valida y normaliza la especificación que propone el modelo. */
export function coerceSpec(raw: unknown): AnalysisSpec {
  if (!raw || typeof raw !== 'object') throw new Error('Falta la especificación "spec".');
  const s = raw as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof s[k] !== 'string' || !s[k]) throw new Error(`Falta el campo "${k}".`);
    return s[k] as string;
  };
  const int = (k: string, def: number) => (s[k] === undefined ? def : Math.max(0, Math.round(Number(s[k]))));
  switch (s.kind) {
    case 'describe': return { kind: 'describe', variables: asStrings(s.variables, 'variables') };
    case 'ols': return { kind: 'ols', y: str('y'), x: asStrings(s.x, 'x'), covType: (['classic', 'HC1', 'HAC'].includes(String(s.covType)) ? s.covType : 'classic') as 'classic' };
    case 'binary': return { kind: 'binary', link: s.link === 'probit' ? 'probit' : 'logit', y: str('y'), x: asStrings(s.x, 'x') };
    case 'iv': return { kind: 'iv', y: str('y'), exog: asStrings(s.exog, 'exog'), endog: asStrings(s.endog, 'endog'), instruments: asStrings(s.instruments, 'instruments') };
    case 'panel': return { kind: 'panel', y: str('y'), x: asStrings(s.x, 'x') };
    case 'unitroot': return { kind: 'unitroot', variable: str('variable'), regression: (['n', 'c', 'ct'].includes(String(s.regression)) ? s.regression : 'c') as 'c' };
    case 'correlogram': return { kind: 'correlogram', variable: str('variable'), lags: int('lags', 20) };
    case 'arima': return { kind: 'arima', variable: str('variable'), p: int('p', 1), d: int('d', 0), q: int('q', 0), horizon: int('horizon', 8) };
    case 'var': return { kind: 'var', variables: asStrings(s.variables, 'variables'), p: s.p === undefined ? undefined : int('p', 1), horizon: int('horizon', 12) };
    case 'coint': return { kind: 'coint', y: str('y'), x: asStrings(s.x, 'x') };
    default: throw new Error(`Tipo de análisis desconocido: ${String(s.kind)}.`);
  }
}

export const TUTOR_TOOLS: TutorTool[] = [
  {
    name: 'listar_datasets',
    description: 'Lista los datasets cargados en el Lab: id, nombre, procedencia (simulado u oficial), frecuencia, número de observaciones y variables con su descripción. Úsala antes de proponer un análisis.',
    input_schema: { type: 'object', properties: {} },
    execute: () => JSON.stringify(getState().datasets.map((d) => ({
      id: d.id, nombre: d.name, procedencia: d.source, frecuencia: d.frequency,
      n: d.data[d.columns[0]]?.length ?? 0, panel: !!d.panel,
      variables: Object.fromEntries(d.columns.map((c) => [c, d.labels[c] ?? c])),
    }))),
  },
  {
    name: 'ejecutar_analisis',
    description: 'Ejecuta un análisis econométrico con el motor validado del Lab sobre un dataset y devuelve la salida completa (tabla tipo Stata, pruebas y una interpretación automática). El resultado también se muestra al estudiante en el Lab. Nunca calcules a mano lo que esta herramienta puede calcular.',
    input_schema: { type: 'object', properties: { dataset: { type: 'string', description: 'id del dataset (p.ej. salarios, credito, quinua, panel, dinero, var, espuria)' }, spec: SPEC_SCHEMA }, required: ['dataset', 'spec'] },
    execute: (input) => {
      const ds = findDataset(String(input.dataset ?? ''));
      if (!ds) throw new Error(`No existe el dataset «${String(input.dataset)}». Use listar_datasets.`);
      const spec = coerceSpec(input.spec);
      const res = runAnalysis(ds, spec);
      setState((s) => ({ result: res, resultDataset: ds.id, activeId: ds.id, pendingSpec: { dataset: ds.id, spec, autorun: false }, progress: { ...s.progress, labRuns: s.progress.labRuns + 1 } }));
      return clip(`Dataset: ${ds.name} (${ds.source})\n\n${res.report}\n\nInterpretación automática:\n${interpret(res)}`);
    },
  },
  {
    name: 'leer_leccion',
    description: 'Devuelve el texto completo (Markdown con LaTeX) de una unidad del curso. Ids: e1…e9 (Econometría II), m1…m8 (Economía Monetaria II). Úsala para alinear tu explicación con el material del curso.',
    input_schema: { type: 'object', properties: { unidad: { type: 'string' } }, required: ['unidad'] },
    execute: (input) => {
      const u = findUnit(String(input.unidad ?? ''));
      if (!u) throw new Error(`Unidad desconocida. Disponibles: ${COURSES.flatMap((c) => c.units.map((x) => `${x.id} (${x.title})`)).join(', ')}.`);
      return clip(`# ${u.unit.title}\n${u.unit.body}`, 12000);
    },
  },
  {
    name: 'abrir_pagina',
    description: 'Lleva al estudiante a una página de la app: "lab", "practica", una unidad (p.ej. "e7", "m4") o un simulador. Simuladores: ' + SIMULATORS.map((s) => s.id).join(', ') + '.',
    input_schema: { type: 'object', properties: { destino: { type: 'string' } }, required: ['destino'] },
    execute: (input) => {
      const d = String(input.destino ?? '').trim().toLowerCase();
      let route: string | null = null;
      if (d === 'lab' || d === 'laboratorio') route = '/lab';
      else if (d === 'practica' || d === 'práctica') route = '/practica';
      else if (findUnit(d)) route = `/curso/${findUnit(d)!.course.id}/${d}`;
      else if (SIMULATORS.some((s) => s.id === d)) route = `/simuladores/${d}`;
      if (!route) throw new Error('Destino desconocido.');
      window.location.hash = '#' + route;
      return `Página abierta: ${route}`;
    },
  },
];
