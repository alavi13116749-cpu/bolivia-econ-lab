import { econometria } from './econometria';
import { monetaria } from './monetaria';
import type { Course, Unit } from './types';

export const COURSES: Course[] = [econometria, monetaria];

export function findUnit(id: string): { course: Course; unit: Unit } | null {
  for (const course of COURSES) {
    const unit = course.units.find((u) => u.id === id);
    if (unit) return { course, unit };
  }
  return null;
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Búsqueda simple por palabras clave para el modo sin conexión y el buscador. */
export function searchUnits(query: string, limit = 3): { course: Course; unit: Unit; score: number }[] {
  const words = norm(query).split(/[^a-z0-9()]+/).filter((w) => w.length > 2);
  const out: { course: Course; unit: Unit; score: number }[] = [];
  for (const course of COURSES) {
    for (const unit of course.units) {
      const kw = unit.keywords.map(norm);
      const title = norm(unit.title);
      const body = norm(unit.body);
      let score = 0;
      for (const w of words) {
        if (kw.some((k) => k.includes(w) || w.includes(k))) score += 4;
        if (title.includes(w)) score += 3;
        if (body.includes(w)) score += 1;
      }
      if (score > 0) out.push({ course, unit, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
