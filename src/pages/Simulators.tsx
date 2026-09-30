import { Link } from 'react-router-dom';
import { SIMULATORS } from '../sims/registry';
import { findUnit } from '../content';

export default function Simulators() {
  const groups = [['monetaria', 'Economía Monetaria II'], ['econometria', 'Econometría II']] as const;
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <div className="eyebrow !text-accent">Simuladores</div>
        <h1 className="display text-3xl sm:text-4xl">Mueva los parámetros, vea la teoría</h1>
        <p className="max-w-prose text-muted">Modelos interactivos y experimentos de Monte Carlo que corren en su navegador.</p>
      </header>
      {groups.map(([id, name]) => (
        <section key={id} className="grid gap-3">
          <h2 className="text-xl font-semibold">{name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SIMULATORS.filter((s) => s.course === id).map((s) => (
              <Link key={s.id} to={`/simuladores/${s.id}`} className="card grid content-start gap-1.5 p-4 hover:border-muted">
                <span className="eyebrow">Unidad {findUnit(s.unit)?.unit.number}</span>
                <span className="text-[16px] font-semibold">{s.title}</span>
                <span className="text-sm text-muted">{s.blurb}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
