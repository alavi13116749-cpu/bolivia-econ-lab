import { useMemo, useState } from 'react';
import { Slider, Panel, Metric } from '../ui/controls';
import { BarsX } from '../ui/Chart';
import { RNG } from '../engine/random';
import { ols } from '../engine/ols';
import { iv2sls } from '../engine/iv';

export default function Simultaneidad() {
  const [strength, setStrength] = useState(3);
  const [sdD, setSdD] = useState(3);
  const [n, setN] = useState(150);
  const [seed, setSeed] = useState(3);
  const trueSlope = -1.2;
  const sim = useMemo(() => {
    const rng = new RNG(seed * 104729);
    const bO: number[] = [], bI: number[] = [], Fs: number[] = [];
    for (let r = 0; r < 300; r++) {
      const P: number[] = [], Q: number[] = [], Z: number[] = [];
      for (let i = 0; i < n; i++) {
        const z = rng.normal();
        const u = rng.normal(0, sdD);
        const v = rng.normal(0, 3);
        // Demanda Q = 60 − 1,2P + u ; Oferta Q = 10 + 0,8P + s·z + v
        const p = (60 + u - 10 - strength * z - v) / 2;
        P.push(p); Q.push(60 + trueSlope * p + u); Z.push(z);
      }
      bO.push(ols(Q, P.map((p) => [1, p]), ['c', 'p']).beta[1]);
      const ivr = iv2sls({ y: Q, yName: 'q', exog: P.map(() => [1]), exogNames: ['c'], endog: P.map((p) => [p]), endogNames: ['p'], instruments: Z.map((z) => [z]), instrumentNames: ['z'] });
      bI.push(ivr.main.beta[1]);
      Fs.push(ivr.firstStage[0].F);
    }
    const lo = -3, hi = 1, bins = 40, w = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, k) => ({ x: +(lo + (k + 0.5) * w).toFixed(2), MCO: 0, MC2E: 0 }));
    for (const b of bO) if (b >= lo && b < hi) hist[Math.floor((b - lo) / w)].MCO++;
    for (const b of bI) if (b >= lo && b < hi) hist[Math.floor((b - lo) / w)].MC2E++;
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return { hist, mO: med(bO), mI: med(bI), F: med(Fs) };
  }, [strength, sdD, n, seed]);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Mercado simulado">
        <div className="grid gap-4">
          <Slider id="ss" label="Fuerza del instrumento (efecto de la lluvia en la oferta)" value={strength} min={0} max={8} step={0.25} onChange={setStrength} />
          <Slider id="sd" label="Varianza de los shocks de demanda (σᵤ)" value={sdD} min={0.5} max={8} step={0.5} onChange={setSdD} />
          <Slider id="sn" label="Observaciones por muestra" value={n} min={30} max={500} step={10} onChange={setN} />
          <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>Repetir simulación</button>
          <p className="text-xs text-muted">300 muestras. Pendiente verdadera de la demanda: −1,2.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Mediana MCO" value={sim.mO.toFixed(3)} hint="sesgada" tone="bad" />
            <Metric label="Mediana MC2E" value={sim.mI.toFixed(3)} hint="verdadero −1,200" tone={Math.abs(sim.mI + 1.2) < 0.15 ? 'good' : 'warn'} />
            <Metric label="F de 1ª etapa (mediana)" value={sim.F.toFixed(1)} hint={sim.F < 10 ? 'instrumento débil' : 'relevante'} tone={sim.F < 10 ? 'warn' : undefined} />
          </div>
        </Panel>
        <Panel title="Distribución de la pendiente estimada">
          <BarsX data={sim.hist} x="x" bars={[{ key: 'MCO', label: 'MCO' }, { key: 'MC2E', label: 'MC2E', color: 'series-3' }]} refY={[]} xLabel="pendiente estimada de la demanda" height={280} />
          <p className="mt-2 text-sm text-muted">Baje la fuerza del instrumento hacia 0: MC2E se dispersa y su centro se acerca al de MCO. Suba σᵤ: el sesgo de MCO crece porque el precio queda más correlacionado con el shock de demanda.</p>
        </Panel>
      </div>
    </div>
  );
}
