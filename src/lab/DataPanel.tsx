import { useRef, useState } from 'react';
import type { Dataset } from '../data/datasets';
import { parseCSV } from '../lib/csv';
import { loadWorldBank, WB_INDICATORS } from '../data/worldbank';
import { addDataset, setState, useStore } from '../state/store';

export function SourceChip({ ds }: { ds: Dataset }) {
  const tone = ds.source === 'simulado' ? 'bg-gold-soft text-gold' : ds.source === 'importado' ? 'bg-surface-2 text-ink' : 'bg-teal-soft text-teal';
  return <span className={`chip ${tone}`}>{ds.source === 'simulado' ? 'Simulado · didáctico' : ds.source}</span>;
}

export function DataPanel({ ds }: { ds: Dataset }) {
  const datasets = useStore((s) => s.datasets);
  const [mode, setMode] = useState<null | 'csv' | 'wb'>(null);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wbSel, setWbSel] = useState<string[]>(['FP.CPI.TOTL.ZG', 'FM.LBL.BMNY.ZG', 'NY.GDP.MKTP.KD.ZG']);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const n = ds.data[ds.columns[0]]?.length ?? 0;

  function importText(text: string, name: string) {
    try {
      const t = parseCSV(text);
      const firstLabel = Object.values(t.labels)[0];
      addDataset({
        id: `csv-${Date.now()}`, name, source: 'importado', frequency: 'corte transversal', course: 'ambos',
        description: `Datos importados por usted: ${t.rows} filas, ${t.columns.length} variables numéricas.`,
        columns: t.columns, data: t.data, labels: Object.fromEntries(t.columns.map((c) => [c, c])),
        index: firstLabel, exercises: [],
      });
      setMsg({ ok: true, text: `Importado: ${t.rows} filas y ${t.columns.length} variables numéricas. ${t.warnings.join(' ')}` });
      setMode(null);
      setPaste('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  }

  async function fetchWB() {
    setLoading(true);
    setMsg(null);
    try {
      const d = await loadWorldBank(wbSel);
      addDataset(d);
      setMsg({ ok: true, text: `Descargados ${d.index?.length} años (${d.index?.[0]}–${d.index?.[d.index.length - 1]}) del Banco Mundial.` });
      setMode(null);
    } catch (e) {
      setMsg({ ok: false, text: __ARTIFACT__
        ? 'Esta vista de claude.ai no permite conexiones a otros sitios. Use la versión web del Lab (GitHub Pages) para descargar datos del Banco Mundial, o importe un CSV.'
        : `No se pudo descargar: ${e instanceof Error ? e.message : String(e)}. Revise su conexión o importe un CSV desde data.worldbank.org.` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label htmlFor="ds-select" className="eyebrow">Dataset</label>
      <select id="ds-select" className="field" value={ds.id} onChange={(e) => setState({ activeId: e.target.value })}>
        {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}{d.source !== 'simulado' ? ` — ${d.source}` : ''}</option>)}
      </select>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <SourceChip ds={ds} /><span className="num">{n} obs · {ds.frequency}</span>
      </div>
      <p className="text-sm text-muted">{ds.description}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Variables ({ds.columns.length})</summary>
        <dl className="mt-2 grid gap-1.5">
          {ds.columns.map((c) => (
            <div key={c} className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-2">
              <dt className="font-mono text-[12px]">{c}</dt>
              <dd className="text-xs text-muted">{ds.labels[c]}</dd>
            </div>
          ))}
        </dl>
      </details>
      {ds.exercises.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Ejercicios sugeridos</summary>
          <ul className="mt-2 grid gap-1.5">
            {ds.exercises.map((e) => <li key={e.title}><strong className="font-semibold">{e.title}.</strong> <span className="text-muted">{e.hint}</span></li>)}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" className="btn btn-ghost !py-1 text-xs" aria-expanded={mode === 'csv'} onClick={() => setMode(mode === 'csv' ? null : 'csv')}>Importar CSV / Excel</button>
        <button type="button" className="btn btn-ghost !py-1 text-xs" aria-expanded={mode === 'wb'} onClick={() => setMode(mode === 'wb' ? null : 'wb')}>Datos reales: Banco Mundial</button>
      </div>
      {mode === 'csv' && (
        <div className="grid gap-2 rounded-lg bg-surface-2 p-3">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="text-xs" aria-label="Archivo CSV"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) importText(await f.text(), f.name.replace(/\.\w+$/, '')); }} />
          <label htmlFor="paste" className="text-xs text-muted">…o pegue celdas copiadas de Excel (con encabezados). Acepta coma decimal.</label>
          <textarea id="paste" rows={4} className="field font-mono text-[12px]" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'anio;pib;inflacion\n2019;2,2;1,8\n2020;-8,7;0,7'} />
          <button type="button" className="btn btn-primary justify-self-start !py-1 text-xs" disabled={!paste.trim()} onClick={() => importText(paste, 'Datos pegados')}>Importar datos pegados</button>
        </div>
      )}
      {mode === 'wb' && (
        <div className="grid gap-2 rounded-lg bg-surface-2 p-3 text-sm">
          <p className="text-xs text-muted">Indicadores anuales oficiales de Bolivia desde api.worldbank.org. Se conservan sólo los años con todos los indicadores elegidos.</p>
          <div className="grid gap-1">
            {WB_INDICATORS.map((w) => (
              <label key={w.code} className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={wbSel.includes(w.code)} onChange={(e) => setWbSel(e.target.checked ? [...wbSel, w.code] : wbSel.filter((c) => c !== w.code))} />
                <span>{w.label} <span className="font-mono text-muted">{w.col}</span></span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary justify-self-start !py-1 text-xs" disabled={!wbSel.length || loading} onClick={fetchWB}>{loading ? <span className="dots">Descargando</span> : 'Descargar'}</button>
        </div>
      )}
      {msg && <div role="status" className={`rounded-lg px-3 py-2 text-xs ${msg.ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>{msg.text}</div>}
    </div>
  );
}
