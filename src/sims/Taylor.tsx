import { useMemo, useState } from 'react';
import { Slider, Panel, Metric, Verdict } from '../ui/controls';
import { LineChartX } from '../ui/Chart';
import { Tex } from '../ui/Markdown';

export default function Taylor() {
  const [rs, setRs] = useState(2);
  const [pis, setPis] = useState(4);
  const [phiPi, setPhiPi] = useState(0.5);
  const [phiY, setPhiY] = useState(0.5);
  const [pi, setPi] = useState(6);
  const [gap, setGap] = useState(-1);
  const i = rs + pi + phiPi * (pi - pis) + phiY * gap;
  const data = useMemo(() => Array.from({ length: 25 }, (_, k) => {
    const p = k * 0.5;
    return { pi: p, regla: +(rs + p + phiPi * (p - pis) + phiY * gap).toFixed(3), fisher: +(rs + p).toFixed(3) };
  }), [rs, pis, phiPi, phiY, gap]);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="La regla">
        <div className="grid gap-4">
          <Slider id="tr" label="r*: tasa real neutral (%)" value={rs} min={0} max={5} step={0.25} onChange={setRs} />
          <Slider id="tp" label="π*: meta de inflación (%)" value={pis} min={1} max={6} step={0.5} onChange={setPis} />
          <Slider id="tfp" label="φπ: reacción a la inflación" value={phiPi} min={-0.5} max={2} step={0.1} onChange={setPhiPi} />
          <Slider id="tfy" label="φy: reacción a la brecha" value={phiY} min={0} max={2} step={0.1} onChange={setPhiY} />
          <Slider id="tpi" label="π observada (%)" value={pi} min={0} max={12} step={0.1} onChange={setPi} />
          <Slider id="tg" label="Brecha del producto (%)" value={gap} min={-5} max={5} step={0.1} onChange={setGap} />
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Tasa nominal prescrita" value={`${i.toFixed(2)}%`} tone="accent" />
            <Metric label="Tasa real implícita" value={`${(i - pi).toFixed(2)}%`} />
            <div className="grid content-start gap-1"><div className="eyebrow">Principio de Taylor</div><Verdict ok={1 + phiPi > 1}>{1 + phiPi > 1 ? 'se cumple' : 'no se cumple'}</Verdict></div>
          </div>
          <div className="mt-3 overflow-x-auto"><Tex display tex={String.raw`i = ${rs} + ${pi.toFixed(1)} + ${phiPi.toFixed(1)}(${pi.toFixed(1)} - ${pis}) + ${phiY.toFixed(1)}(${gap.toFixed(1)}) = ${i.toFixed(2)}\%`} /></div>
        </Panel>
        <Panel title="Tasa prescrita según la inflación">
          <LineChartX data={data} x="pi" xType="number" xLabel="Inflación (%)" yLabel="Tasa (%)" series={[{ key: 'regla', label: 'Regla de Taylor' }, { key: 'fisher', label: 'Tasa real constante (pendiente 1)', dashed: true, color: 'muted' }]} points={[{ x: pi, y: +i.toFixed(3), label: 'hoy' }]} />
          <p className="mt-2 text-sm text-muted">Si la regla es más plana que la línea punteada (φπ &lt; 0), una inflación mayor <em>baja</em> la tasa real y alimenta la inflación: la política es desestabilizadora.</p>
        </Panel>
      </div>
    </div>
  );
}
