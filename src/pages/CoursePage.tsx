import { Link, useParams } from 'react-router-dom';
import { getCourse } from '../content';
import { useStore } from '../state/store';
import { SIMULATORS } from '../sims/registry';

export default function CoursePage() {
  const { courseId } = useParams();
  const course = getCourse(courseId ?? '');
  const progress = useStore((s) => s.progress);
  if (!course) return <p>Curso no encontrado.</p>;
  const sims = SIMULATORS.filter((s) => s.course === course.id);
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <div className="eyebrow !text-accent">{course.code}</div>
        <h1 className="display text-4xl">{course.name}</h1>
        <p className="max-w-prose text-muted">{course.tagline}</p>
      </header>
      <ol className="grid gap-3">
        {course.units.map((u) => {
          const a = progress.answers[u.id];
          return (
            <li key={u.id}>
              <Link to={`/curso/${course.id}/${u.id}`} className="card grid gap-1 p-4 hover:border-muted sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="num font-mono text-2xl text-muted">{String(u.number).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">{u.title}</span>
                  <span className="block text-sm text-muted">{u.summary}</span>
                </span>
                <span className="flex flex-wrap gap-1.5 text-xs">
                  {progress.visited[u.id] ? <span className="chip bg-good-soft text-good">leída</span> : <span className="chip bg-surface-2 text-muted">pendiente</span>}
                  {a && <span className="chip bg-surface-2 text-ink">{a.correct}/{a.total} aciertos</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Simuladores del curso</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sims.map((s) => <Link key={s.id} to={`/simuladores/${s.id}`} className="card grid gap-1 p-4 hover:border-muted"><span className="font-semibold">{s.title}</span><span className="text-sm text-muted">{s.blurb}</span></Link>)}
        </div>
      </section>
    </div>
  );
}
