import { useMemo, useState } from 'react';
import { Slider, Panel, Metric } from '../ui/controls';
import { LineChartX } from '../ui/Chart';

export default function Baumol() {
  const [Y, setY] = useState(4000);
  const [i, setI] = useState(0.06);
  const [bc, setBc] = useState(10);
  const nStar = Math.sqrt((i * Y) / (2 * bc));
  const Md = Y / (2 * nStar);
  const data = useMemo(() => Array.from({ length: 30 }, (_, k) => {
    const n = k + 1;
    return { n, costoTotal: +(n * bc + (i * Y) / (2 * n)).toFixed(2), transaccion: n * bc, oportunidad: +((i * Y) / (2 * n)).toFixed(2) };
  }), [Y, i, bc]);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Hogar representativo">
        <div className="grid gap-4">
          <Slider id="by" label="Gasto mensual Y (Bs)" value={Y} min={1000} max={20000} step={100} onChange={setY} />
          <Slider id="bi" label="Tasa de interés mensual de un DPF" value={i} min={0.002} max={0.1} step={0.002} onChange={setI} format={(v) => `${(v * 100).toFixed(1)}%`} />
          <Slider id="bb" label="Costo de cada retiro b (Bs: pasaje, tiempo, comisión)" value={bc} min={1} max={50} step={1} onChange={setBc} />
        </div>
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Retiros óptimos n*" value={nStar.toFixed(2)} hint="√(iY/2b)" tone="accent" />
            <Metric label="Saldo medio de efectivo" value={`Bs ${Md.toFixed(0)}`} hint="M/P = √(bY/2i)" />
            <Metric label="Elasticidades" value="½ y −½" hint="ingreso y tasa" />
          </div>
        </Panel>
        <Panel title="Costo total según el número de retiros">
          <LineChartX data={data} x="n" xType="number" xLabel="Número de retiros al mes" series={[{ key: 'costoTotal', label: 'Costo total' }, { key: 'transaccion', label: 'Costo de transacción n·b', dashed: true }, { key: 'oportunidad', label: 'Costo de oportunidad iY/2n', dashed: true }]} refX={[{ x: +nStar.toFixed(2), label: 'n*' }]} />
          <p className="mt-2 text-sm text-muted">Duplique Y: el saldo de efectivo sube sólo √2 ≈ 41%. Las billeteras móviles y los QR interbancarios bajan b y, con ello, la demanda de efectivo.</p>
        </Panel>
      </div>
    </div>
  );
}
