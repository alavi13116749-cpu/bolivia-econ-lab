import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { COURSES } from '../content';
import { runAnalysis } from '../analysis/run';
import { getState, openTutor, useStore } from '../state/store';
import { SIMULATORS } from '../sims/registry';
import { fmt, fmtP, stars } from '../lib/format';
import { QuestionCard } from './Practice';
import { GENERATORS, generateQuestion } from '../content/quiz';

function LiveConsole() {
  const r = useMemo(() => {
    const ds = getState().datasets.find((d) => d.id === 'salarios')!;
    const res = runAnalysis(ds, { kind: 'ols', y: 'ln_salario', x: ['educacion', 'experiencia', 'experiencia^2', 'mujer', 'informal'], covType: 'HC1' });
    return res.kind === 'ols' ? res : null;
  }, []);
  if (!r) return null;
  const edu = r.res.table[1];
  const white = r.tests.find((t) => t.id === 'white');
  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
        <span className="font-mono text-[11px] text-muted">. regress ln_salario educacion experiencia c.exp#c.exp mujer informal, vce(robust)</span>
      </div>
      <div className="stata overflow-x-auto px-4 py-3">
        <table>
          <thead><tr><th>ln_salario</th><th>Coef.</th><th>Err. est.</th><th>t</th><th>P&gt;|t|</th></tr></thead>
          <tbody>{r.res.table.map((c) => <tr key={c.name}><td>{c.name}</td><td>{fmt(c.coef)}<span className="inline-block w-6 text-left text-accent">{stars(c.p)}</span></td><td>{fmt(c.se)}</td><td>{fmt(c.t, 2)}</td><td>{fmtP(c.p)}</td></tr>)}</tbody>
        </table>
        <div className="mt-2 text-[12px] text-muted">n = {r.res.n} · R² = {fmt(r.res.r2, 3)} · errores robustos HC1</div>
      </div>
      <div className="grid gap-1.5 border-t border-line px-4 py-3 text-[13.5px]">
        <div className="eyebrow !text-accent">El Auxiliar lee la salida</div>
        <p>Cada año de educación se asocia con un salario <strong>{(edu.coef * 100).toFixed(1)}% mayor</strong>, significativo al 1%.</p>
        {white && <p>White {white.rejects ? 'rechaza homoscedasticidad' : 'no rechaza homoscedasticidad'} (p = {fmtP(white.p)}): {white.rejects ? 'por eso la salida usa errores robustos.' : 'los errores clásicos serían válidos.'}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const progress = useStore((s) => s.progress);
  const q = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    const g = GENERATORS[day % GENERATORS.length];
    return generateQuestion(g.id, day);
  }, []);
  const featured = ['nk', 'espuria', 'cagan', 'multiplicador'].map((id) => SIMULATORS.find((s) => s.id === id)!);
  return (
    <div className="grid gap-12">
      <section className="grid items-center gap-8 @5xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="grid gap-5">
          <div className="eyebrow !text-accent">Auxiliar IA · Bolivia Econ Lab</div>
          <h1 className="display text-[2.4rem] leading-[1.02] sm:text-[3.4rem]">Econometría II y Monetaria II, con un auxiliar que calcula de verdad.</h1>
          <p className="max-w-[58ch] text-[16.5px] text-muted">Lecciones con la experiencia boliviana, un laboratorio que estima MCO, MC2E, Logit, panel, ARIMA, VAR y cointegración en el navegador, doce simuladores y un tutor de IA que ejecuta los análisis antes de opinar.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/lab" className="btn btn-primary !px-5 !py-2.5 text-[15px]">Abrir el Laboratorio</Link>
            <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-[15px]" onClick={() => openTutor()}>Preguntar al Auxiliar</button>
          </div>
        </div>
        <LiveConsole />
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Cursos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {COURSES.map((c) => {
            const visited = c.units.filter((u) => progress.visited[u.id]).length;
            const ans = c.units.reduce((a, u) => { const x = progress.answers[u.id]; return x ? { c: a.c + x.correct, t: a.t + x.total } : a; }, { c: 0, t: 0 });
            return (
              <Link key={c.id} to={`/curso/${c.id}`} className="card group grid gap-3 p-5 transition-colors hover:border-muted">
                <div className="flex items-baseline justify-between gap-2"><span className="eyebrow">{c.code} · {c.units.length} unidades</span><span className="text-sm text-muted group-hover:text-ink">Entrar →</span></div>
                <h3 className="display text-2xl">{c.name}</h3>
                <p className="text-sm text-muted">{c.tagline}</p>
                <div className="grid gap-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(visited / c.units.length) * 100}%` }} /></div>
                  <div className="num flex justify-between text-xs text-muted"><span>{visited} de {c.units.length} unidades leídas</span><span>{ans.t ? `${Math.round((ans.c / ans.t) * 100)}% de aciertos en ${ans.t} preguntas` : 'sin práctica aún'}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 @4xl:grid-cols-2">
        <div className="grid content-start gap-4">
          <div className="flex items-baseline justify-between"><h2 className="text-xl font-semibold">Simuladores</h2><Link to="/simuladores" className="text-sm text-muted hover:text-ink">Ver los 12 →</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.map((s) => (
              <Link key={s.id} to={`/simuladores/${s.id}`} className="card grid content-start gap-1 p-4 hover:border-muted">
                <span className="eyebrow">{s.course === 'econometria' ? 'Econometría II' : 'Monetaria II'}</span>
                <span className="font-semibold">{s.title}</span>
                <span className="text-sm text-muted">{s.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-4">
          <div className="flex items-baseline justify-between"><h2 className="text-xl font-semibold">Ejercicio del día</h2><Link to="/practica" className="text-sm text-muted hover:text-ink">Más práctica →</Link></div>
          <QuestionCard q={q} />
        </div>
      </section>

      <section className="grid gap-4 border-t border-line pt-8 md:grid-cols-3">
        {[
          ['Resultados verificables', 'El motor numérico pasa 34 pruebas automáticas contra statsmodels y linearmodels: coeficientes, errores robustos, ADF con tablas de MacKinnon, VAR, Logit, panel.'],
          ['Bolivia en cada unidad', 'Hiperinflación de 1985 y DS 21060, bolivianización, encaje diferenciado, régimen cambiario, mercado de la quinua y panel departamental.'],
          ['De la clase al software', 'Cada análisis genera su equivalente en Stata, R, Python y EViews para reproducirlo en la práctica o el trabajo de grado.'],
        ].map(([t, d]) => (
          <div key={t} className="grid content-start gap-1.5"><h3 className="font-semibold">{t}</h3><p className="text-sm text-muted">{d}</p></div>
        ))}
      </section>
    </div>
  );
}
