import { useMemo, useState } from 'react';
import { Slider, Panel, Metric, Segmented } from '../ui/controls';
import { BarsX, histogram } from '../ui/Chart';
import { RNG } from '../engine/random';
import { ols } from '../engine/ols';

export default function Espuria() {
  const [T, setT] = useState(100);
  const [reps, setReps] = useState(500);
  const [mode, setMode] = useState<'niveles' | 'diferencias'>('niveles');
  const [seed, setSeed] = useState(1);
  const sim = useMemo(() => {
    const rng = new RNG(seed * 7919);
    const ts: number[] = [];
    const r2s: number[] = [];
    for (let r = 0; r < reps; r++) {
      let a = 0, b = 0;
      const y: number[] = [], x: number[] = [];
      for (let t = 0; t < T; t++) {
        const ea = rng.normal(), eb = rng.normal();
        a += ea; b += eb;
        y.push(mode === 'niveles' ? a : ea);
        x.push(mode === 'niveles' ? b : eb);
      }
      const res = ols(y, x.map((v) => [1, v]), ['c', 'x']);
      ts.push(res.t[1]);
      r2s.push(res.r2);
    }
    const reject = ts.filter((t) => Math.abs(t) > 1.96).length / reps;
    return { hist: histogram(ts, 40, mode === 'niveles' ? [-30, 30] : [-5, 5]), reject, r2: r2s.reduce((a, b) => a + b, 0) / reps };
  }, [T, reps, mode, seed]);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Monte Carlo de Granger-Newbold">
        <div className="grid gap-4">
          <Segmented label="Regresión en" value={mode} onChange={setMode} options={[{ id: 'niveles', label: 'Niveles' }, { id: 'diferencias', label: 'Diferencias' }]} />
          <Slider id="et" label="Tamaño de muestra T" value={T} min={20} max={500} step={10} onChange={setT} />
          <Slider id="er" label="Repeticiones" value={reps} min={100} max={2000} step={100} onChange={setReps} />
          <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>Repetir simulación</button>
          <p className="text-xs text-muted">Cada repetición genera dos caminatas aleatorias <strong>independientes</strong> y regresa una sobre la otra. La hipótesis nula β = 0 es verdadera.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Rechazos de β = 0 al 5%" value={`${(sim.reject * 100).toFixed(1)}%`} hint="debería ser 5%" tone={sim.reject > 0.1 ? 'bad' : 'good'} />
            <Metric label="R² promedio" value={sim.r2.toFixed(3)} />
            <Metric label="Tamaño nominal" value="5,0%" hint="lo que promete la tabla t" />
          </div>
        </Panel>
        <Panel title="Distribución de los estadísticos t">
          <BarsX data={sim.hist} x="x" bars={[{ key: 'n', label: 'Frecuencia' }]} xLabel="estadístico t" height={280} />
          <p className="mt-2 text-sm text-muted">En niveles la distribución de t se ensancha con T: con más datos se rechaza <em>más</em> una hipótesis verdadera. En diferencias vuelve a ser una t estándar.</p>
        </Panel>
      </div>
    </div>
  );
}
