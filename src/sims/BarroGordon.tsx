import { useMemo, useState } from 'react';
import { Slider, Panel, Metric } from '../ui/controls';
import { LineChartX } from '../ui/Chart';

export default function BarroGordon() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [k, setK] = useState(1.3);
  const [ys, setYs] = useState(5);
  const [sigma, setSigma] = useState(2);
  const piD = (b * (k - 1) * ys) / a;
  const react = useMemo(() => Array.from({ length: 31 }, (_, i) => {
    const pe = i * 0.5;
    return { pe, reaccion: +((b * b * pe + b * (k - 1) * ys) / (a + b * b)).toFixed(4), cuarentaycinco: pe };
  }), [a, b, k, ys]);
  const s2 = sigma * sigma;
  const loss = (ap: number) => 0.5 * ((ap / (ap + b * b)) ** 2 * s2 + ((k - 1) * ys) ** 2) + (a / 2) * ((b * (k - 1) * ys / ap) ** 2 + (b / (ap + b * b)) ** 2 * s2);
  const rogoff = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const ap = a * (0.5 + i * 0.25);
    return { ap: +ap.toFixed(2), perdida: +loss(ap).toFixed(4) };
  }), [a, b, k, ys, sigma]); // eslint-disable-line react-hooks/exhaustive-deps
  const best = rogoff.reduce((m, r) => (r.perdida < m.perdida ? r : m));
  const lossCommit = 0.5 * ((a / (a + b * b)) ** 2 * s2 + ((k - 1) * ys) ** 2) + (a / 2) * ((b / (a + b * b)) ** 2 * s2);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Parámetros">
        <div className="grid gap-4">
          <Slider id="bga" label="a: peso de la inflación en la pérdida social" value={a} min={0.2} max={4} step={0.1} onChange={setA} />
          <Slider id="bgb" label="b: efecto de la sorpresa inflacionaria" value={b} min={0.2} max={2} step={0.1} onChange={setB} />
          <Slider id="bgk" label="k: ambición de producto (k·y*)" value={k} min={1} max={2} step={0.05} onChange={setK} />
          <Slider id="bgy" label="y*: producto natural" value={ys} min={1} max={10} step={0.5} onChange={setYs} />
          <Slider id="bgs" label="σ: desviación de los shocks de oferta" value={sigma} min={0} max={5} step={0.25} onChange={setSigma} />
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Inflación discrecional" value={piD.toFixed(2)} hint="= b(k−1)y*/a" tone="accent" />
            <Metric label="Inflación con regla" value="0,00" hint="compromiso creíble" tone="good" />
            <Metric label="Aversión óptima (Rogoff)" value={best.ap.toFixed(2)} hint={`vs a = ${a.toFixed(1)} de la sociedad`} />
            <Metric label="Pérdida: regla creíble" value={lossCommit.toFixed(2)} hint={`discreción: ${loss(a).toFixed(2)}`} />
          </div>
        </Panel>
        <div className="grid gap-4 @4xl:grid-cols-2">
          <Panel title="Función de reacción del banco central">
            <LineChartX data={react} x="pe" xType="number" xLabel="Inflación esperada πᵉ" series={[{ key: 'reaccion', label: 'π elegida por el BC' }, { key: 'cuarentaycinco', label: 'π = πᵉ', dashed: true, color: 'muted' }]} points={[{ x: +piD.toFixed(3), y: +piD.toFixed(3), label: 'discreción' }]} />
            <p className="mt-2 text-sm text-muted">El único punto donde el público no se equivoca es el cruce con la diagonal: inflación positiva sin ganancia de producto.</p>
          </Panel>
          <Panel title="Banquero conservador: pérdida social esperada">
            <LineChartX data={rogoff} x="ap" xType="number" xLabel="Aversión a la inflación del banquero (a′)" series={[{ key: 'perdida', label: 'Pérdida esperada' }]} refX={[{ x: a, label: 'a social' }]} points={[{ x: best.ap, y: best.perdida, label: 'óptimo' }]} />
            <p className="mt-2 text-sm text-muted">Con σ = 0 conviene un banquero infinitamente conservador. Con shocks, el óptimo es finito: más aversión reduce el sesgo pero estabiliza peor.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
