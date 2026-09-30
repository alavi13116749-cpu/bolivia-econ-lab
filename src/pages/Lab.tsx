import { useEffect, useMemo, useState } from 'react';
import { activeDataset, findDataset, setState, useStore } from '../state/store';
import { runAnalysis } from '../analysis/run';
import { ModelBuilder, builderFromSpec, defaultBuilder, sanitizeBuilder, specFromBuilder, type BuilderState } from '../lab/ModelBuilder';
import { DataPanel } from '../lab/DataPanel';
import { ResultView } from '../lab/ResultView';
import { datasetToCSV, offerDownload } from '../lib/download';
import { fmt } from '../lib/format';
import { LineChartX } from '../ui/Chart';

function DataTable() {
  const ds = useStore(() => activeDataset());
  const [msg, setMsg] = useState('');
  const n = ds.data[ds.columns[0]]?.length ?? 0;
  const [plotVar, setPlotVar] = useState(ds.columns[0]);
  useEffect(() => setPlotVar(ds.columns[0]), [ds.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = Math.min(n, 200);
  const label = (i: number) => ds.panel ? `${ds.panel.entity[i]} ${ds.panel.time[i]}` : ds.index?.[i] ?? String(i + 1);
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><div className="eyebrow">Datos</div><h2 className="text-lg font-semibold">{ds.name}</h2></div>
        <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={async () => {
          const r = await offerDownload(`${ds.id}.csv`, datasetToCSV(ds));
          setMsg(r === 'ok' ? '' : r === 'declined' ? 'Descarga cancelada.' : 'Esta vista no permite descargas; copie la tabla o use la versión web.');
        }}>Descargar CSV</button>
      </div>
      {msg && <p role="status" className="mb-2 text-xs text-warn">{msg}</p>}
      {!ds.panel && (
        <div className="mb-4">
          <label htmlFor="plotvar" className="sr-only">Variable a graficar</label>
          <select id="plotvar" className="field mb-2 !w-auto font-mono text-[12px]" value={plotVar} onChange={(e) => setPlotVar(e.target.value)}>
            {ds.columns.map((c) => <option key={c}>{c}</option>)}
          </select>
          {ds.data[plotVar] && <LineChartX data={ds.data[plotVar].map((v, i) => ({ t: label(i), v }))} x="t" series={[{ key: 'v', label: plotVar }]} height={200} />}
        </div>
      )}
      <div className="stata max-h-[420px] overflow-auto">
        <table>
          <thead className="sticky top-0 bg-surface"><tr><th>obs</th>{ds.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{Array.from({ length: rows }, (_, i) => <tr key={i}><td>{label(i)}</td>{ds.columns.map((c) => <td key={c}>{fmt(ds.data[c][i], 3)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {n > rows && <p className="mt-2 text-xs text-muted">Mostrando {rows} de {n} observaciones.</p>}
    </div>
  );
}

export default function Lab() {
  const ds = useStore(() => activeDataset());
  const result = useStore((s) => s.result);
  const resultDataset = useStore((s) => s.resultDataset);
  const pending = useStore((s) => s.pendingSpec);
  const [b, setB] = useState<BuilderState>(() => defaultBuilder(ds));
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'resultado' | 'datos'>('resultado');
  const [busy, setBusy] = useState(false);

  // Cambiar de dataset reinicia el constructor con variables válidas
  useEffect(() => {
    if (!pending) setB((prev) => sanitizeBuilder(prev, ds));
  }, [ds.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function run(spec = specFromBuilder(b), dsId = ds.id) {
    const target = findDataset(dsId) ?? ds;
    setBusy(true);
    setError(null);
    // Dejar que la UI pinte el estado "calculando" antes del trabajo pesado
    setTimeout(() => {
      try {
        const res = runAnalysis(target, spec);
        setState((s) => ({ result: res, resultDataset: target.id, progress: { ...s.progress, labRuns: s.progress.labRuns + 1 } }));
        setView('resultado');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }, 20);
  }

  // Especificaciones que llegan desde lecciones o desde el Auxiliar
  useEffect(() => {
    if (!pending) return;
    const target = findDataset(pending.dataset);
    if (target) {
      setState({ activeId: target.id, pendingSpec: null });
      setB(builderFromSpec(target, pending.spec));
      if (pending.autorun) run(pending.spec, target.id);
    } else setState({ pendingSpec: null });
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si no hay resultado, mostrar uno de ejemplo para que el Lab nunca esté vacío
  useEffect(() => {
    if (!result && !pending) run({ kind: 'ols', y: 'ln_salario', x: ['educacion', 'experiencia', 'experiencia^2', 'mujer', 'informal', 'urbano'] }, 'salarios');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showResult = useMemo(() => result, [result]);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow !text-accent">Laboratorio econométrico</div>
          <h1 className="display text-3xl sm:text-4xl">Estime, pruebe e interprete</h1>
          <p className="mt-1 max-w-prose text-sm text-muted">Motor propio validado contra statsmodels y linearmodels. Los resultados coinciden con Stata/EViews a 6 decimales.</p>
        </div>
        <div role="tablist" aria-label="Vista del Lab" className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          {(['resultado', 'datos'] as const).map((v) => <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 capitalize ${view === v ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}>{v}</button>)}
        </div>
      </header>
      <div className="grid items-start gap-5 @5xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-5 @5xl:sticky @5xl:top-4">
          <section className="card p-4"><DataPanel ds={ds} /></section>
          <section className="card grid gap-4 p-4">
            <div className="eyebrow">Modelo</div>
            <ModelBuilder ds={ds} b={b} set={(p) => setB((prev) => ({ ...prev, ...p }))} />
            <button type="button" className="btn btn-primary justify-center !py-2.5 text-[15px]" disabled={busy} onClick={() => run()}>
              {busy ? <span className="dots">Calculando</span> : 'Ejecutar análisis'}
            </button>
            {error && <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
          </section>
        </div>
        <div className="min-w-0">
          {view === 'datos' ? <DataTable /> : showResult ? <ResultView r={showResult} datasetId={resultDataset ?? ds.id} /> : <div className="card p-8 text-sm text-muted"><span className="dots">Preparando un ejemplo</span></div>}
        </div>
      </div>
    </div>
  );
}
