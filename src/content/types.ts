import type { AnalysisSpec } from '../analysis/run';

export interface Unit {
  id: string;
  number: number;
  title: string;
  summary: string;
  objectives: string[];
  /** Markdown con LaTeX. */
  body: string;
  /** Acciones "Hazlo en el Lab". */
  lab?: { label: string; dataset: string; spec: AnalysisSpec }[];
  simulators?: string[];
  keywords: string[];
}

export interface Course {
  id: 'econometria' | 'monetaria';
  name: string;
  code: string;
  tagline: string;
  units: Unit[];
}
