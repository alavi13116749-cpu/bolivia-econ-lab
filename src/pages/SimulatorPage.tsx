import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSim } from '../sims/registry';
import { findUnit } from '../content';
import { openTutor } from '../state/store';
import { Loading } from '../App';

export default function SimulatorPage() {
  const { simId } = useParams();
  const sim = getSim(simId ?? '');
  if (!sim) return <p>Simulador no encontrado.</p>;
  const u = findUnit(sim.unit);
  const Comp = sim.Component;
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-sm text-muted"><Link to="/simuladores" className="hover:text-ink">Simuladores</Link>{u && <> · <Link to={`/curso/${u.course.id}/${u.unit.id}`} className="hover:text-ink">{u.course.name}, unidad {u.unit.number}</Link></>}</nav>
          <h1 className="display text-3xl sm:text-4xl">{sim.title}</h1>
          <p className="mt-1 max-w-prose text-muted">{sim.blurb}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => openTutor(`Estoy usando el simulador «${sim.title}». Propón un experimento con los controles y explícame qué debería observar y por qué.`)}>Pedir un experimento al Auxiliar</button>
      </header>
      <Suspense fallback={<Loading />}><Comp /></Suspense>
    </div>
  );
}
