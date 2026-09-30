import { useMemo, useState } from 'react';
import { Slider, Panel, Metric } from '../ui/controls';
import { BarsX } from '../ui/Chart';
import { RNG } from '../engine/random';
import { ols } from '../engine/ols';

export default function Cobertura() {
  const [het, setHet] = useState(1.5);
  const [n, setN] = useState(100);
  const [seed, setSeed] = useState(11);
  const sim = useMemo(() => {
    const rng = new RNG(seed * 31337);
    const reps = 600;
    let covC = 0, covR = 0, seC = 0, seR = 0, sdB = 0;
    const bs: number[] = [];
    for (let r = 0; r < reps; r++) {
      const x: number[] = [], y: number[] = [];
      for (let i = 0; i < n; i++) {
        const xi = rng.uniform() * 10;
        const sd = Math.exp(het * (xi - 5) / 5);
        x.push(xi);
        y.push(1 + 0.5 * xi + rng.normal(0, sd));
      }
      const X = x.map((v) => [1, v]);
      const c = ols(y, X, ['c', 'x']);
      const h = ols(y, X, ['c', 'x'], 'y', { covType: 'HC1' });
      if (Math.abs(c.beta[1] - 0.5) <= 1.96 * c.se[1]) covC++;
      if (Math.abs(h.beta[1] - 0.5) <= 1.96 * h.se[1]) covR++;
      seC += c.se[1]; seR += h.se[1]; bs.push(c.beta[1]);
    }
    const m = bs.reduce((a, b) => a + b, 0) / reps;
    sdB = Math.sqrt(bs.reduce((a, b) => a + (b - m) ** 2, 0) / (reps - 1));
    return { covC: covC / reps, covR: covR / reps, seC: seC / reps, seR: seR / reps, sdB, mean: m };
  }, [het, n, seed]);
  const bars = [
    { tipo: 'Clásicos', cobertura: +(sim.covC * 100).toFixed(1) },
    { tipo: 'Robustos HC1', cobertura: +(sim.covR * 100).toFixed(1) },
  ];
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Heteroscedasticidad simulada">
        <div className="grid gap-4">
          <Slider id="ch" label="Intensidad: Var(u|x) = exp(2h(x−5)/5)" value={het} min={0} max={3} step={0.1} onChange={setHet} format={(v) => `h = ${v.toFixed(1)}`} />
          <Slider id="cn" label="Observaciones" value={n} min={30} max={1000} step={10} onChange={setN} />
          <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>Repetir simulación</button>
          <p className="text-xs text-muted">600 muestras de y = 1 + 0,5x + u. ¿Cuántas veces el intervalo de 95% contiene el verdadero 0,5?</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="β̂ promedio" value={sim.mean.toFixed(4)} hint="insesgado: 0,5" tone="good" />
            <Metric label="Desv. real de β̂" value={sim.sdB.toFixed(4)} />
            <Metric label="e.e. clásico prom." value={sim.seC.toFixed(4)} tone={sim.seC < sim.sdB * 0.9 ? 'bad' : undefined} />
            <Metric label="e.e. HC1 prom." value={sim.seR.toFixed(4)} tone="good" />
          </div>
        </Panel>
        <Panel title="Cobertura real de un intervalo de 95%">
          <BarsX data={bars} x="tipo" bars={[{ key: 'cobertura', label: 'Cobertura (%)' }]} refY={[{ y: 95, label: '95% nominal' }]} height={240} />
          <p className="mt-2 text-sm text-muted">Con h = 0 ambos cubren ≈95%. Al aumentar h, el coeficiente sigue insesgado pero el error estándar clásico subestima la variabilidad real y los intervalos cubren menos de lo prometido.</p>
        </Panel>
      </div>
    </div>
  );
}
