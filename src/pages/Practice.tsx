import { useMemo, useState } from 'react';
import { COURSES, findUnit } from '../content';
import { QUESTIONS, GENERATORS, generateQuestion, type Question } from '../content/quiz';
import { Markdown } from '../ui/Markdown';
import { openTutor, recordAnswer } from '../state/store';

export function QuestionCard({ q, onDone }: { q: Question; onDone?: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const unit = findUnit(q.unit);
  return (
    <div className="card grid gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {unit && <span className="eyebrow">{unit.course.name} · U{unit.unit.number}</span>}
        {q.generated && <span className="chip bg-teal-soft text-teal">numérico · valores al azar</span>}
      </div>
      <Markdown text={q.prompt} className="text-[15px]" />
      <div className="grid gap-2" role="radiogroup" aria-label="Opciones">
        {q.options.map((o, i) => {
          const isRight = i === q.answer;
          const cls = !done ? 'border-line hover:border-muted' : isRight ? 'border-good bg-good-soft' : i === picked ? 'border-bad bg-bad-soft' : 'border-line opacity-60';
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} disabled={done}
              onClick={() => { setPicked(i); recordAnswer(q.unit, i === q.answer); onDone?.(i === q.answer); }}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-[14.5px] transition-colors ${cls}`}>
              <span className="num mt-0.5 font-mono text-xs text-muted">{String.fromCharCode(65 + i)}</span>
              <Markdown text={o} className="min-w-0 [&_p]:!mb-0" />
            </button>
          );
        })}
      </div>
      {done && (
        <div className={`grid gap-2 rounded-lg p-3 text-[14px] ${picked === q.answer ? 'bg-good-soft' : 'bg-warn-soft'}`}>
          <strong className={picked === q.answer ? 'text-good' : 'text-warn'}>{picked === q.answer ? 'Correcto.' : `La respuesta es ${String.fromCharCode(65 + q.answer)}.`}</strong>
          <Markdown text={q.explain} />
          <button type="button" className="justify-self-start text-sm text-teal underline underline-offset-2" onClick={() => openTutor(`Tengo dudas con esta pregunta: ${q.prompt.replace(/\s+/g, ' ')} La respuesta correcta es "${q.options[q.answer]}". ¿Me la explicas paso a paso?`)}>Pedir una explicación al Auxiliar</button>
        </div>
      )}
    </div>
  );
}

export default function Practice() {
  const [course, setCourse] = useState<'econometria' | 'monetaria' | 'todos'>('todos');
  const [unit, setUnit] = useState<string>('todas');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ c: 0, t: 0 });
  const units = COURSES.filter((c) => course === 'todos' || c.id === course).flatMap((c) => c.units);
  const deck = useMemo(() => {
    const ids = unit === 'todas' ? units.map((u) => u.id) : [unit];
    const bank = QUESTIONS.filter((q) => ids.includes(q.unit));
    const gens = GENERATORS.filter((g) => ids.includes(g.unit)).map((g, k) => generateQuestion(g.id, (round + 1) * 7919 + k * 104729 + Date.now() % 100000));
    const all = [...gens, ...bank];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, 8);
  }, [unit, course, round]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="grid gap-2">
        <div className="eyebrow !text-accent">Práctica</div>
        <h1 className="display text-3xl sm:text-4xl">Preguntas de examen</h1>
        <p className="text-muted">Conceptuales del banco y numéricas generadas al azar: cada ronda trae valores nuevos con su solución paso a paso.</p>
      </header>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="grid gap-1 text-sm" htmlFor="pc"><span className="text-muted">Curso</span>
          <select id="pc" className="field" value={course} onChange={(e) => { setCourse(e.target.value as typeof course); setUnit('todas'); }}>
            <option value="todos">Ambos cursos</option>{COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="grid min-w-[220px] flex-1 gap-1 text-sm" htmlFor="pu"><span className="text-muted">Unidad</span>
          <select id="pu" className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="todas">Todas</option>{units.map((u) => <option key={u.id} value={u.id}>{u.id.startsWith('e') ? 'Econometría' : 'Monetaria'} {u.number}: {u.title}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => { setRound((r) => r + 1); setScore({ c: 0, t: 0 }); }}>Nueva ronda</button>
        <div className="num ml-auto text-sm"><span className="text-muted">Esta ronda:</span> <strong>{score.c}/{score.t}</strong></div>
      </div>
      <div className="grid gap-4">
        {deck.map((q) => <QuestionCard key={`${round}-${q.id}`} q={q} onDone={(ok) => setScore((s) => ({ c: s.c + (ok ? 1 : 0), t: s.t + 1 }))} />)}
      </div>
      <button type="button" className="btn btn-primary justify-self-center" onClick={() => openTutor('Tómame un examen corto de 5 preguntas, una por una, y califícame al final.')}>Pedir un examen oral al Auxiliar</button>
    </div>
  );
}
