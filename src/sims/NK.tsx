import { useMemo, useState } from 'react';
import { Slider, Panel, Segmented, Metric } from '../ui/controls';
import { LineChartX } from '../ui/Chart';

type Shock = 'demanda' | 'inflacion' | 'oferta';

/** Modelo de tres ecuaciones (Carlin-Soskice): IS con rezago, Phillips inercial, regla MR óptima. */
export default function NK() {
  const [shock, setShock] = useState<Shock>('inflacion');
  const [size, setSize] = useState(2);
  const [alpha, setAlpha] = useState(1);
  const [kappa, setKappa] = useState(0.5);
  const [beta, setBeta] = useState(1);
  const [rho, setRho] = useState(0.5);
  const piT = 4;
  const rStar = 2;
  const data = useMemo(() => {
    const T = 16;
    let pi = piT, r = rStar, eD = 0;
    const rows = [] as { t: number; brecha: number; inflacion: number; tasa: number }[];
    for (let t = 0; t < T; t++) {
      eD = t === 2 && shock === 'demanda' ? size : rho * eD;
      const eS = shock === 'inflacion' ? (t === 2 ? size : 0) : shock === 'oferta' && t >= 2 ? size * 0.6 ** (t - 2) : 0;
      const y = -alpha * (r - rStar) + eD;
      pi = pi + kappa * y + eS;
      // El BC elige r_t para llevar la economía a la MR en t+1: ỹ_{t+1} = −κβ(π_t − π*)/(1+κ²β)
      const yTarget = (-kappa * beta * (pi - piT)) / (1 + kappa * kappa * beta);
      const eNext = rho * eD;
      r = rStar + (eNext - yTarget) / alpha;
      rows.push({ t, brecha: +y.toFixed(4), inflacion: +pi.toFixed(4), tasa: +r.toFixed(4) });
    }
    return rows;
  }, [shock, size, alpha, kappa, beta, rho]);
  const peak = data.reduce((a, b) => (b.tasa > a.tasa ? b : a));
  const sacrifice = data.reduce((s, d) => s + Math.min(d.brecha, 0), 0);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Shock y parámetros">
        <div className="grid gap-4">
          <Segmented label="Tipo de shock" value={shock} onChange={setShock} options={[{ id: 'inflacion', label: 'Inflación' }, { id: 'demanda', label: 'Demanda' }, { id: 'oferta', label: 'Costos' }]} />
          <Slider id="nks" label="Tamaño del shock (pp)" value={size} min={0.5} max={5} step={0.5} onChange={setSize} />
          <Slider id="nkb" label="β: aversión a la inflación del BC" value={beta} min={0.2} max={4} step={0.1} onChange={setBeta} />
          <Slider id="nkk" label="κ: pendiente de la curva de Phillips" value={kappa} min={0.1} max={1.5} step={0.05} onChange={setKappa} />
          <Slider id="nka" label="α: sensibilidad de la demanda a la tasa" value={alpha} min={0.2} max={2} step={0.1} onChange={setAlpha} />
          <Slider id="nkr" label="ρ: persistencia del shock de demanda" value={rho} min={0} max={0.9} step={0.05} onChange={setRho} />
          <p className="text-xs text-muted">Meta de inflación 4%, tasa real neutral 2%. El shock ocurre en t = 2.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Tasa real máxima" value={`${peak.tasa.toFixed(2)}%`} hint={`en t = ${peak.t}`} tone="accent" />
            <Metric label="Inflación máxima" value={`${Math.max(...data.map((d) => d.inflacion)).toFixed(2)}%`} />
            <Metric label="Costo en producto" value={sacrifice.toFixed(2)} hint="suma de brechas negativas" tone={sacrifice < -2 ? 'bad' : undefined} />
          </div>
        </Panel>
        <Panel title="Respuesta dinámica">
          <LineChartX data={data} x="t" xLabel="Período" series={[{ key: 'inflacion', label: 'Inflación (%)' }, { key: 'tasa', label: 'Tasa real (%)' }, { key: 'brecha', label: 'Brecha del producto (%)' }]} refY={[{ y: 4, label: 'meta π*' }, { y: 0 }]} height={300} />
          <p className="mt-2 text-sm text-muted">Suba β: el banco central actúa más fuerte, la inflación vuelve antes a la meta y la recesión es más profunda pero más corta. Un shock de costos que se repite varios períodos (como un alza de combustibles) obliga a sostener la tasa alta por más tiempo.</p>
        </Panel>
      </div>
    </div>
  );
}
