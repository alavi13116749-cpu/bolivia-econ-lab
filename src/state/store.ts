import { useSyncExternalStore } from 'react';
import { builtinDatasets, type Dataset } from '../data/datasets';
import type { AnalysisResult, AnalysisSpec } from '../analysis/run';
import { load, save } from '../lib/storage';

export interface Progress {
  visited: Record<string, number>; // unidad → timestamp
  answers: Record<string, { correct: number; total: number }>; // unidad → aciertos
  labRuns: number;
}

interface State {
  datasets: Dataset[];
  activeId: string;
  result: AnalysisResult | null;
  resultDataset: string | null;
  /** Especificación que el Lab debe cargar (desde lecciones o desde el tutor). */
  pendingSpec: { dataset: string; spec: AnalysisSpec; autorun: boolean } | null;
  tutorOpen: boolean;
  tutorDraft: string | null;
  progress: Progress;
}

let state: State = {
  datasets: builtinDatasets(),
  activeId: 'salarios',
  result: null,
  resultDataset: null,
  pendingSpec: null,
  tutorOpen: false,
  tutorDraft: null,
  progress: load<Progress>('progress', { visited: {}, answers: {}, labRuns: 0 }),
};

const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  if ('progress' in p) save('progress', state.progress);
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

export function activeDataset(): Dataset {
  return state.datasets.find((d) => d.id === state.activeId) ?? state.datasets[0];
}

export function findDataset(idOrName: string): Dataset | undefined {
  const k = idOrName.toLowerCase();
  return state.datasets.find((d) => d.id.toLowerCase() === k || d.name.toLowerCase() === k) ??
    state.datasets.find((d) => d.name.toLowerCase().includes(k) || d.id.toLowerCase().includes(k));
}

export function addDataset(ds: Dataset) {
  setState((s) => ({ datasets: [...s.datasets.filter((d) => d.id !== ds.id), ds], activeId: ds.id }));
}

export function markVisited(unitId: string) {
  setState((s) => ({ progress: { ...s.progress, visited: { ...s.progress.visited, [unitId]: Date.now() } } }));
}

export function recordAnswer(unitId: string, correct: boolean) {
  setState((s) => {
    const prev = s.progress.answers[unitId] ?? { correct: 0, total: 0 };
    return { progress: { ...s.progress, answers: { ...s.progress.answers, [unitId]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 } } } };
  });
}

export function openTutor(draft?: string) {
  setState({ tutorOpen: true, tutorDraft: draft ?? null });
}
