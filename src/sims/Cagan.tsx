import { useMemo, useState } from 'react';
import { Slider, Panel, Metric, Verdict } from '../ui/controls';
import { LineChartX } from '../ui/Chart';

export default function Cagan() {
  const [alpha, setAlpha] = useState(2.5);
  const [gamma, setGamma] = useState(0);
  const [deficit, setDeficit] = useState(0.1);
  const m0 = Math.exp(gamma);
  const S = (p: number) => p * m0 * Math.exp(-alpha * p);
  const piStar = 1 / alpha;
  const sMax = S(piStar);
  const curve = useMemo(() => Array.from({ length: 81 }, (_, i) => {
    const p = i * 0.025;
    return { pi: +(p * 100).toFixed(1), senoreaje: +S(p).toFixed(5), deficit };
  }), [alpha, gamma, deficit]); // eslint-disable-line react-hooks/exhaustive-deps
  // Equilibrios: raíces de S(π) = déficit
  const eq: number[] = [];
  for (let i = 0; i < 2000; i++) {
    const a = i * 0.001, b = (i + 1) * 0.001;
    if ((S(a) - deficit) * (S(b) - deficit) < 0) eq.push((a + b) / 2);
  }
  const feasible = deficit <= sMax;
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Demanda de dinero de Cagan">
        <div className="grid gap-4">
          <Slider id="ca" label="α: semielasticidad a la inflación" value={alpha} min={0.5} max={8} step={0.1} onChange={setAlpha} />
          <Slider id="cg" label="γ: nivel de la demanda (log)" value={gamma} min={-1} max={1} step={0.05} onChange={setGamma} />
          <Slider id="cd" label="Déficit a financiar con emisión (% de m₀)" value={deficit} min={0} max={0.5} step={0.005} onChange={setDeficit} format={(v) => v.toFixed(3)} />
          <p className="text-xs text-muted">Inflación por período en tanto por uno. Con α = 2,5, la inflación que maximiza el señoreaje es 40% por período.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="π que maximiza S" value={`${(piStar * 100).toFixed(1)}%`} hint="= 1/α" tone="accent" />
            <Metric label="Señoreaje máximo" value={sMax.toFixed(4)} />
            <Metric label="Equilibrios" value={feasible ? eq.map((e) => `${(e * 100).toFixed(1)}%`).join(' y ') || '—' : 'ninguno'} hint={feasible ? 'baja y alta inflación' : ''} />
            <div className="grid content-start gap-1"><div className="eyebrow">Diagnóstico</div><Verdict ok={feasible}>{feasible ? 'financiable' : 'hiperinflación'}</Verdict></div>
          </div>
        </Panel>
        <Panel title="Curva de Laffer del señoreaje">
          <LineChartX data={curve} x="pi" xType="number" xLabel="Inflación por período (%)" series={[{ key: 'senoreaje', label: 'Señoreaje S(π) = π·m(π)', area: true }, { key: 'deficit', label: 'Déficit a financiar', dashed: true, color: 'accent' }]} points={[{ x: +(piStar * 100).toFixed(1), y: +sMax.toFixed(5), label: 'máximo' }]} height={300} />
          <p className="mt-2 text-sm text-muted">
            Si el déficit supera el señoreaje máximo no existe inflación estacionaria que lo financie: los saldos reales caen sin fin. Es el mecanismo de la hiperinflación boliviana de 1984–85, que se detuvo con el ajuste fiscal del DS 21060: al bajar el déficit, la línea cae por debajo de la curva y reaparece el equilibrio de baja inflación.
          </p>
        </Panel>
      </div>
    </div>
  );
}
