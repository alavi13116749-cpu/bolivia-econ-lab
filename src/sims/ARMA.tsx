import { useMemo, useState } from 'react';
import { Slider, Panel, Verdict } from '../ui/controls';
import { BarsX, LineChartX } from '../ui/Chart';
import { RNG } from '../engine/random';
import { acf, pacf, simulateARMA, theoreticalACF, pacfFromAcf } from '../engine/timeseries';
import { spectralRadius } from '../engine/linalg';

export default function ARMA() {
  const [phi1, setPhi1] = useState(0.6);
  const [phi2, setPhi2] = useState(0);
  const [theta1, setTheta1] = useState(0);
  const [n, setN] = useState(200);
  const [seed, setSeed] = useState(7);
  const phi = [phi1, phi2].filter((_, i) => i === 0 || phi2 !== 0);
  const radius = spectralRadius([[phi1, phi2], [1, 0]]);
  const stationary = radius < 1;
  const sim = useMemo(() => {
    const rng = new RNG(seed);
    const y = simulateARMA(n, phi, theta1 ? [theta1] : [], rng.normals(n + 200));
    const lags = 20;
    const sa = acf(y, lags);
    const sp = pacf(y, lags);
    const ta = stationary ? theoreticalACF(phi, theta1 ? [theta1] : [], lags) : null;
    const tp = ta ? pacfFromAcf(ta) : null;
    return {
      series: y.map((v, t) => ({ t, y: +v.toFixed(3) })),
      acf: sa.slice(1).map((v, k) => ({ k: k + 1, muestral: +v.toFixed(4), teorica: ta ? +ta[k + 1].toFixed(4) : 0 })),
      pacf: sp.slice(1).map((v, k) => ({ k: k + 1, muestral: +v.toFixed(4), teorica: tp ? +tp[k + 1].toFixed(4) : 0 })),
      band: 1.96 / Math.sqrt(n),
    };
  }, [phi1, phi2, theta1, n, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = `${phi2 !== 0 ? 'AR(2)' : phi1 !== 0 ? 'AR(1)' : ''}${theta1 !== 0 ? (phi1 || phi2 ? '+MA(1)' : 'MA(1)') : ''}` || 'Ruido blanco';
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Proceso ARMA">
        <div className="grid gap-4">
          <Slider id="ap1" label="φ₁" value={phi1} min={-1.2} max={1.2} step={0.05} onChange={setPhi1} />
          <Slider id="ap2" label="φ₂" value={phi2} min={-0.95} max={0.95} step={0.05} onChange={setPhi2} />
          <Slider id="at1" label="θ₁" value={theta1} min={-0.95} max={0.95} step={0.05} onChange={setTheta1} />
          <Slider id="an" label="Observaciones" value={n} min={50} max={1000} step={50} onChange={setN} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-surface-2 text-ink">{label}</span>
            <Verdict ok={stationary}>{stationary ? `estacionario (|raíz inv.| = ${radius.toFixed(2)})` : 'no estacionario'}</Verdict>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setSeed((s) => s + 1)}>Nueva muestra</button>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel title="Serie simulada"><LineChartX data={sim.series} x="t" series={[{ key: 'y', label: 'y' }]} height={200} refY={[{ y: 0 }]} /></Panel>
        <div className="grid gap-4 @4xl:grid-cols-2">
          <Panel title="FAC: muestral vs teórica"><BarsX data={sim.acf} x="k" bars={[{ key: 'muestral', label: 'Muestral' }, ...(stationary ? [{ key: 'teorica', label: 'Teórica', color: 'series-2' }] : [])]} refY={[{ y: sim.band }, { y: -sim.band }]} /></Panel>
          <Panel title="FACP: muestral vs teórica"><BarsX data={sim.pacf} x="k" bars={[{ key: 'muestral', label: 'Muestral' }, ...(stationary ? [{ key: 'teorica', label: 'Teórica', color: 'series-2' }] : [])]} refY={[{ y: sim.band }, { y: -sim.band }]} /></Panel>
        </div>
        <p className="text-sm text-muted">Pruebe φ₁ = 1: la serie deambula sin volver a su media y la FAC decae lentísimo. Es la huella de una raíz unitaria.</p>
      </div>
    </div>
  );
}
