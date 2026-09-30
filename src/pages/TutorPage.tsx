import TutorChat from '../tutor/TutorChat';

export default function TutorPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <header>
        <div className="eyebrow !text-accent">Auxiliar IA</div>
        <h1 className="display text-3xl sm:text-4xl">Tu ayudante de cátedra, a cualquier hora</h1>
        <p className="mt-2 max-w-prose text-muted">Explica, pregunta como en una defensa oral o toma un examen corto. Cuando hace falta calcular, ejecuta el análisis en el Lab en lugar de inventar números.</p>
      </header>
      <div className="card h-[calc(100vh-220px)] min-h-[520px] overflow-hidden"><TutorChat /></div>
    </div>
  );
}
