import { useMemo, useState } from 'react';
import { Slider, Panel, Segmented, Metric } from '../ui/controls';
import { LineChartX } from '../ui/Chart';

type Regime = 'fijo' | 'flexible';

/** Mundell-Fleming lineal con movilidad perfecta de capital. */
export default function Mundell() {
  const [regime, setRegime] = useState<Regime>('fijo');
  const [dM, setDM] = useState(0);
  const [dG, setDG] = useState(10);
  const [iStar, setIStar] = useState(5);
  // IS: Y = A + G − b·i + c·e ; LM: M = k·Y − h·i ; BP: i = i*
  const A = 400, b = 10, cE = 20, k = 0.5, h = 8, M0 = 150, G0 = 100, e0 = 6.96;
  const base = useMemo(() => {
    const Y0 = (M0 + h * iStar) / k;
    const eBar = (Y0 - A - G0 + b * iStar) / cE; // e que equilibra IS inicialmente
    return { Y0, eBar };
  }, [iStar]);
  const res = useMemo(() => {
    const G = G0 + dG;
    if (regime === 'flexible') {
      const M = M0 + dM;
      const Y = (M + h * iStar) / k;
      const e = (Y - A - G + b * iStar) / cE;
      return { Y, e, M, reservas: 0 };
    }
    const e = base.eBar;
    const Y = A + G - b * iStar + cE * e;
    const M = k * Y - h * iStar;
    return { Y, e, M, reservas: M - (M0 + dM) + dM };
  }, [regime, dM, dG, iStar, base]);
  const curves = useMemo(() => Array.from({ length: 41 }, (_, j) => {
    const i = j * 0.5;
    const isOld = A + G0 - b * i + cE * base.eBar;
    const isNew = A + G0 + dG - b * i + cE * res.e;
    const lmOld = (M0 + h * i) / k;
    const lmNew = (res.M + h * i) / k;
    return { i, isOld, isNew, lmOld, lmNew };
  }), [dG, res, base]);
  // Pasamos a formato (Y en eje x) muestreando por i
  const plot = curves.map((c) => ({ i: c.i, IS0: +c.isOld.toFixed(2), IS1: +c.isNew.toFixed(2), LM0: +c.lmOld.toFixed(2), LM1: +c.lmNew.toFixed(2) }));
  const ch = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(1);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Política y régimen">
        <div className="grid gap-4">
          <Segmented label="Régimen cambiario" value={regime} onChange={setRegime} options={[{ id: 'fijo', label: 'Tipo de cambio fijo' }, { id: 'flexible', label: 'Flexible' }]} />
          <Slider id="mfm" label="Expansión monetaria ΔM" value={dM} min={-40} max={40} step={1} onChange={setDM} />
          <Slider id="mfg" label="Expansión fiscal ΔG" value={dG} min={-40} max={40} step={1} onChange={setDG} />
          <Slider id="mfi" label="Tasa internacional i* (%)" value={iStar} min={1} max={10} step={0.5} onChange={setIStar} />
          <p className="text-xs text-muted">Con tipo de cambio fijo, el banco central compra o vende divisas hasta que la oferta monetaria sea la que el mercado demanda a la tasa i*.</p>
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Δ Producto" value={ch(res.Y - base.Y0)} tone={res.Y - base.Y0 > 0.05 ? 'good' : res.Y - base.Y0 < -0.05 ? 'bad' : undefined} />
            <Metric label="Tipo de cambio" value={regime === 'fijo' ? `${e0.toFixed(2)} (fijo)` : `${ch(res.e - base.eBar)} índ.`} hint={regime === 'flexible' ? (res.e < base.eBar ? 'apreciación' : res.e > base.eBar ? 'depreciación' : '') : 'Bs por USD'} />
            <Metric label="Oferta monetaria final" value={res.M.toFixed(1)} hint={`inicial ${M0}`} />
            <Metric label="Δ Reservas del BC" value={regime === 'fijo' ? ch(res.M - M0 - dM) : '0'} hint={regime === 'fijo' ? 'compra (+) / venta (−) de divisas' : 'no interviene'} tone={regime === 'fijo' && res.M - M0 - dM < -0.05 ? 'bad' : undefined} />
          </div>
        </Panel>
        <Panel title="IS y LM (movilidad perfecta: i = i*)">
          <LineChartX data={plot} x="i" xType="number" xLabel="Tasa de interés i (%)" yLabel="Producto Y" series={[
            { key: 'IS0', label: 'IS inicial', dashed: true, color: 'series-1' }, { key: 'IS1', label: 'IS final', color: 'series-1' },
            { key: 'LM0', label: 'LM inicial', dashed: true, color: 'series-2' }, { key: 'LM1', label: 'LM final', color: 'series-2' },
          ]} refX={[{ x: iStar, label: 'BP: i = i*' }]} height={300} />
          <p className="mt-2 text-sm text-muted">Ejes invertidos respecto del libro (i horizontal, Y vertical) para leer el producto directamente en i*. Pruebe ΔM &gt; 0 con tipo de cambio fijo: la LM vuelve a su lugar y el banco central pierde reservas.</p>
        </Panel>
      </div>
    </div>
  );
}
