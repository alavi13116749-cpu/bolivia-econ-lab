import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCourse } from '../content';
import { Markdown } from '../ui/Markdown';
import { markVisited, openTutor, setState } from '../state/store';
import { getSim } from '../sims/registry';
import { QUESTIONS, GENERATORS, generateQuestion } from '../content/quiz';
import { QuestionCard } from './Practice';

export default function UnitPage() {
  const { courseId, unitId } = useParams();
  const nav = useNavigate();
  const course = getCourse(courseId ?? '');
  const idx = course?.units.findIndex((u) => u.id === unitId) ?? -1;
  const unit = course?.units[idx];
  useEffect(() => { if (unit) markVisited(unit.id); }, [unit]);
  const questions = useMemo(() => {
    if (!unit) return [];
    const bank = QUESTIONS.filter((q) => q.unit === unit.id);
    const gens = GENERATORS.filter((g) => g.unit === unit.id).map((g) => generateQuestion(g.id, Math.floor(Math.random() * 1e9)));
    return [...gens, ...bank];
  }, [unit]);
  if (!course || !unit) return <p>Unidad no encontrada.</p>;
  const prev = course.units[idx - 1];
  const next = course.units[idx + 1];
  return (
    <div className="grid gap-8 @5xl:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0">
        <nav className="mb-3 text-sm text-muted"><Link to={`/curso/${course.id}`} className="hover:text-ink">{course.name}</Link> · Unidad {unit.number}</nav>
        <h1 className="display mb-2 text-3xl sm:text-4xl">{unit.title}</h1>
        <p className="mb-5 max-w-prose text-[16px] text-muted">{unit.summary}</p>
        <div className="mb-6 rounded-xl border border-line bg-surface p-4">
          <div className="eyebrow mb-2">Al terminar podrás</div>
          <ul className="grid list-disc gap-1 pl-5 text-[14.5px]">{unit.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
        <Markdown text={unit.body} className="text-[15.5px] leading-[1.7]" />
        {questions.length > 0 && (
          <section className="mt-10 grid gap-4">
            <h2 className="text-xl font-semibold">Comprueba lo aprendido</h2>
            {questions.slice(0, 4).map((q) => <QuestionCard key={q.id} q={q} />)}
          </section>
        )}
        <nav className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-sm">
          {prev ? <Link to={`/curso/${course.id}/${prev.id}`} className="text-muted hover:text-ink">← {prev.title}</Link> : <span />}
          {next && <Link to={`/curso/${course.id}/${next.id}`} className="text-muted hover:text-ink">{next.title} →</Link>}
        </nav>
      </article>
      <aside className="grid content-start gap-4 @5xl:sticky @5xl:top-4">
        {unit.lab && unit.lab.length > 0 && (
          <section className="card grid gap-2 p-4">
            <div className="eyebrow !text-accent">Hazlo en el Lab</div>
            {unit.lab.map((l) => (
              <button key={l.label} type="button" className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-muted"
                onClick={() => { setState({ pendingSpec: { dataset: l.dataset, spec: l.spec, autorun: true } }); nav('/lab'); }}>
                {l.label} <span className="text-muted">→</span>
              </button>
            ))}
          </section>
        )}
        {unit.simulators && unit.simulators.length > 0 && (
          <section className="card grid gap-2 p-4">
            <div className="eyebrow">Simulador</div>
            {unit.simulators.map((id) => { const s = getSim(id); return s ? <Link key={id} to={`/simuladores/${id}`} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-muted"><span className="font-semibold">{s.title}</span><span className="block text-xs text-muted">{s.blurb}</span></Link> : null; })}
          </section>
        )}
        <section className="card grid gap-2 p-4">
          <div className="eyebrow">Auxiliar IA</div>
          {[`Explícame "${unit.title}" como para un parcial`, `Hazme 3 preguntas de examen sobre ${unit.title}`, `¿Qué errores comunes se cometen en ${unit.title}?`].map((q) => (
            <button key={q} type="button" className="rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-ink" onClick={() => openTutor(q)}>{q}</button>
          ))}
        </section>
      </aside>
    </div>
  );
}
