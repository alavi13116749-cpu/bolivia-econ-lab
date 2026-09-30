import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import TutorChat from './TutorChat';
import { setState } from '../state/store';

export default function TutorDrawer() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setState({ tutorOpen: false });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <aside aria-label="Auxiliar IA" className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-line bg-bg shadow-2xl sm:w-[440px]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="aguayo" aria-hidden />
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="eyebrow !text-accent">Auxiliar IA</div>
          <div className="font-display text-lg font-semibold">¿En qué te ayudo?</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/auxiliar" className="text-muted hover:text-ink" onClick={() => setState({ tutorOpen: false })}>Pantalla completa</Link>
          <button type="button" className="btn btn-ghost !px-3" onClick={() => setState({ tutorOpen: false })} aria-label="Cerrar el Auxiliar">Cerrar</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 border-t border-line"><TutorChat compact /></div>
    </aside>
  );
}
