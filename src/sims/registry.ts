import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface SimMeta {
  id: string;
  title: string;
  course: 'econometria' | 'monetaria';
  unit: string;
  blurb: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const SIMULATORS: SimMeta[] = [
  { id: 'multiplicador', title: 'Multiplicador y bolivianización', course: 'monetaria', unit: 'm2', blurb: 'Encaje diferenciado, preferencia por efectivo y dolarización de depósitos.', Component: lazy(() => import('./Multiplicador')) },
  { id: 'nk', title: 'Modelo de tres ecuaciones', course: 'monetaria', unit: 'm5', blurb: 'IS, curva de Phillips y regla del banco central ante shocks.', Component: lazy(() => import('./NK')) },
  { id: 'taylor', title: 'Regla de Taylor', course: 'monetaria', unit: 'm5', blurb: 'Qué tasa prescribe la regla y cuándo se cumple el principio de Taylor.', Component: lazy(() => import('./Taylor')) },
  { id: 'barro-gordon', title: 'Barro-Gordon y Rogoff', course: 'monetaria', unit: 'm4', blurb: 'Sesgo inflacionario, reglas y el banquero central conservador.', Component: lazy(() => import('./BarroGordon')) },
  { id: 'cagan', title: 'Señoreaje e hiperinflación', course: 'monetaria', unit: 'm7', blurb: 'La curva de Laffer del señoreaje y la lógica de 1985.', Component: lazy(() => import('./Cagan')) },
  { id: 'mundell', title: 'Mundell-Fleming', course: 'monetaria', unit: 'm6', blurb: 'Política fiscal y monetaria con tipo de cambio fijo o flexible.', Component: lazy(() => import('./Mundell')) },
  { id: 'baumol', title: 'Baumol-Tobin', course: 'monetaria', unit: 'm1', blurb: 'Cuántas veces ir al cajero: la demanda de efectivo óptima.', Component: lazy(() => import('./Baumol')) },
  { id: 'arma', title: 'Explorador ARMA', course: 'econometria', unit: 'e6', blurb: 'Mueva φ y θ y vea cómo cambian la serie, la FAC y la FACP.', Component: lazy(() => import('./ARMA')) },
  { id: 'espuria', title: 'Regresión espuria', course: 'econometria', unit: 'e7', blurb: 'Monte Carlo de Granger-Newbold con caminatas aleatorias.', Component: lazy(() => import('./Espuria')) },
  { id: 'simultaneidad', title: 'Sesgo de simultaneidad', course: 'econometria', unit: 'e3', blurb: 'MCO vs MC2E en un mercado de oferta y demanda, con instrumentos fuertes o débiles.', Component: lazy(() => import('./Simultaneidad')) },
  { id: 'logit', title: 'MPL, Logit y Probit', course: 'econometria', unit: 'e4', blurb: 'Probabilidades predichas y efectos marginales lado a lado.', Component: lazy(() => import('./LogitCurves')) },
  { id: 'cobertura', title: 'Errores robustos', course: 'econometria', unit: 'e1', blurb: 'Cobertura real de los intervalos con errores clásicos y HC1.', Component: lazy(() => import('./Cobertura')) },
];

export function getSim(id: string) {
  return SIMULATORS.find((s) => s.id === id);
}
