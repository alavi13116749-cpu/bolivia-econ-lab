import { useMemo, useState } from 'react';
import { Slider, Panel, Metric } from '../ui/controls';
import { LineChartX } from '../ui/Chart';
import { normCdf, normPdf } from '../engine/distributions';

export default function LogitCurves() {
  const [b0, setB0] = useState(-4);
  const [b1, setB1] = useState(0.4);
  const [x0, setX0] = useState(10);
  const L = (z: number) => 1 / (1 + Math.exp(-z));
  const bp0 = b0 / 1.6, bp1 = b1 / 1.6;
  const lp1 = b1 / 4, lp0 = 0.5 - lp1 * (-b0 / b1);
  const data = useMemo(() => Array.from({ length: 81 }, (_, k) => {
    const x = k * 0.25;
    return { x, logit: +L(b0 + b1 * x).toFixed(4), probit: +normCdf(bp0 + bp1 * x).toFixed(4), mpl: +(lp0 + lp1 * x).toFixed(4) };
  }), [b0, b1]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = L(b0 + b1 * x0);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Índice lineal β₀ + β₁x">
        <div className="grid gap-4">
          <Slider id="lb0" label="β₀ (Logit)" value={b0} min={-10} max={2} step={0.1} onChange={setB0} />
          <Slider id="lb1" label="β₁ (Logit)" value={b1} min={0.05} max={1.5} step={0.05} onChange={setB1} />
          <Slider id="lx" label="Evaluar en x =" value={x0} min={0} max={20} step={0.5} onChange={setX0} />
          <p className="text-xs text-muted">El Probit usa β/1,6 y el MPL la pendiente del Logit en su punto medio (β/4): la conversión práctica que se usa para comparar coeficientes.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="P(y=1) Logit" value={p.toFixed(3)} tone="accent" />
            <Metric label="Efecto marginal Logit" value={(p * (1 - p) * b1).toFixed(4)} hint="Λ(1−Λ)β₁" />
            <Metric label="Efecto marginal Probit" value={(normPdf(bp0 + bp1 * x0) * bp1).toFixed(4)} hint="φ(·)β₁" />
            <Metric label="Efecto MPL" value={lp1.toFixed(4)} hint="constante" />
          </div>
        </Panel>
        <Panel title="Probabilidad predicha">
          <LineChartX data={data} x="x" xType="number" xLabel="x (p.ej. años de educación)" series={[{ key: 'logit', label: 'Logit' }, { key: 'probit', label: 'Probit', dashed: true }, { key: 'mpl', label: 'MPL', color: 'muted' }]} refY={[{ y: 0 }, { y: 1 }]} refX={[{ x: x0 }]} height={300} />
          <p className="mt-2 text-sm text-muted">El MPL sale de [0, 1] en los extremos. Logit y Probit casi coinciden; el Logit tiene colas un poco más pesadas.</p>
        </Panel>
      </div>
    </div>
  );
}
