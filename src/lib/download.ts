import type { Dataset } from '../data/datasets';

interface DownloadsCap { save: (a: { filename: string; data: Blob | string }) => Promise<unknown> }

export function datasetToCSV(ds: Dataset): string {
  const n = ds.data[ds.columns[0]]?.length ?? 0;
  const extra: [string, string[]][] = [];
  if (ds.panel) extra.push(['departamento', ds.panel.entity], ['anio', ds.panel.time]);
  else if (ds.index) extra.push(['periodo', ds.index]);
  const header = [...extra.map(([k]) => k), ...ds.columns].join(',');
  const rows = Array.from({ length: n }, (_, i) => [...extra.map(([, v]) => `"${v[i]}"`), ...ds.columns.map((c) => (Number.isFinite(ds.data[c][i]) ? String(ds.data[c][i]) : ''))].join(','));
  return [header, ...rows].join('\n');
}

/** Ofrece un archivo al usuario: capacidad `downloads` en claude.ai o enlace normal en la web. */
export async function offerDownload(filename: string, text: string): Promise<'ok' | 'declined' | 'unavailable'> {
  const w = window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } };
  if (w.claude?.use) {
    const dl = (await w.claude.use('downloads').catch(() => null)) as DownloadsCap | null;
    if (dl) {
      try {
        await dl.save({ filename, data: new Blob([text], { type: 'text/csv' }) });
        return 'ok';
      } catch {
        return 'declined';
      }
    }
    if (__ARTIFACT__) return 'unavailable';
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'ok';
}
