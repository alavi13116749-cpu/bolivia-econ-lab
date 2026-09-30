import { useMemo, useState } from 'react';
import { Slider, Metric, Panel } from '../ui/controls';
import { LineChartX } from '../ui/Chart';
import { Tex } from '../ui/Markdown';

const f = (x: number, d = 3) => x.toFixed(d).replace('.', ',');

export default function Multiplicador() {
  const [c, setC] = useState(0.35);
  const [rmn, setRmn] = useState(0.08);
  const [rme, setRme] = useState(0.35);
  const [d, setD] = useState(0.2);
  const [B, setB] = useState(60);
  const calc = (dd: number, rr = rmn, re = rme) => {
    const den = c + rr * (1 - dd) + re * dd;
    return { m: (1 + c) / den, mMN: (1 + c - dd) / den };
  };
  const cur = calc(d);
  const D = B / (c + rmn * (1 - d) + rme * d);
  const path = useMemo(() => Array.from({ length: 19 }, (_, k) => {
    const dd = 0.95 - k * 0.05;
    const a = calc(dd);
    const same = calc(dd, rmn, rmn);
    return { d: Math.round(dd * 100), m: a.m, mMN: a.mMN, mIgual: same.m };
  }), [c, rmn, rme]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Parámetros">
        <div className="grid gap-4">
          <Slider id="mc" label={<>Preferencia por efectivo <Tex tex="c = C/D" /></>} value={c} min={0.05} max={1} step={0.01} onChange={setC} format={(v) => f(v, 2)} />
          <Slider id="mrmn" label={<>Encaje en bolivianos <Tex tex="r_{MN}" /></>} value={rmn} min={0.02} max={0.3} step={0.005} onChange={setRmn} format={(v) => `${f(v * 100, 1)}%`} />
          <Slider id="mrme" label={<>Encaje en dólares <Tex tex="r_{ME}" /></>} value={rme} min={0.02} max={0.6} step={0.005} onChange={setRme} format={(v) => `${f(v * 100, 1)}%`} />
          <Slider id="md" label={<>Dolarización de depósitos <Tex tex="d" /></>} value={d} min={0} max={0.95} step={0.01} onChange={setD} format={(v) => `${f(v * 100, 0)}%`} />
          <Slider id="mb" label="Base monetaria (miles de millones de Bs)" value={B} min={10} max={150} step={1} onChange={setB} format={(v) => f(v, 0)} />
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Multiplicador m′" value={f(cur.m)} hint="Agregado ampliado (MN + ME)" tone="accent" />
            <Metric label="Multiplicador MN" value={f(cur.mMN)} hint="Sólo moneda nacional" />
            <Metric label="M′ total" value={f(cur.m * B, 1)} hint="miles de millones Bs" />
            <Metric label="Depósitos en ME" value={f(D * d, 1)} hint="miles de millones Bs equiv." />
          </div>
          <div className="mt-4 overflow-x-auto text-sm"><Tex display tex={String.raw`m' = \frac{1+c}{c + r_{MN}(1-d) + r_{ME}\,d} = \frac{${f(1 + c, 2)}}{${f(c + rmn * (1 - d) + rme * d, 4)}} = ${f(cur.m)}`} /></div>
        </Panel>
        <Panel title="La bolivianización vista desde el multiplicador">
          <p className="mb-2 text-sm text-muted">Eje horizontal: dolarización de depósitos, de 95% (inicios de los 2000) a 5%. Con encaje más alto en dólares, desdolarizar <strong className="text-ink">aumenta</strong> el multiplicador y la parte del dinero que el BCB controla.</p>
          <LineChartX data={path} x="d" xLabel="Dolarización de depósitos (%)" series={[
            { key: 'm', label: "m′ con encaje diferenciado" },
            { key: 'mMN', label: 'multiplicador MN' },
            { key: 'mIgual', label: 'm′ si r_ME = r_MN', dashed: true, color: 'muted' },
          ]} refX={[{ x: Math.round(d * 100 / 5) * 5, label: 'actual' }]} />
        </Panel>
      </div>
    </div>
  );
}
