import { useEffect, useState, type ReactNode, Suspense, lazy } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { COURSES } from '../content';
import { setState, useStore } from '../state/store';
import { load, save } from '../lib/storage';

const TutorDrawer = lazy(() => import('../tutor/TutorDrawer'));

type ThemePref = 'system' | 'light' | 'dark';

function useThemePref(): [ThemePref, (t: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => load<ThemePref>('theme', 'system'));
  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
    save('theme', pref);
  }, [pref]);
  return [pref, setPref];
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] transition-colors ${isActive ? 'bg-surface-2 font-semibold text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'}`;

function Brand() {
  return (
    <NavLink to="/" className="block leading-tight" aria-label="Inicio">
      <div className="eyebrow !text-accent">Auxiliar IA</div>
      <div className="display text-[1.35rem] text-ink">Bolivia Econ Lab</div>
    </NavLink>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-5 text-sm" onClick={onNavigate}>
      <div className="grid gap-0.5">
        <NavLink to="/" end className={linkCls}>Inicio</NavLink>
        <NavLink to="/lab" className={linkCls}>Laboratorio</NavLink>
        <NavLink to="/simuladores" className={linkCls}>Simuladores</NavLink>
        <NavLink to="/practica" className={linkCls}>Práctica</NavLink>
        <NavLink to="/auxiliar" className={linkCls}>Auxiliar IA</NavLink>
      </div>
      {COURSES.map((c) => (
        <div key={c.id} className="grid gap-0.5">
          <NavLink to={`/curso/${c.id}`} end className={({ isActive }) => `eyebrow px-3 pb-1 ${isActive ? '!text-ink' : 'hover:!text-ink'}`}>{c.name}</NavLink>
          {c.units.map((u) => (
            <NavLink key={u.id} to={`/curso/${c.id}/${u.id}`} className={linkCls}>
              <span className="num w-5 shrink-0 font-mono text-[11px] text-muted">{u.number}</span>
              <span className="truncate" title={u.title}>{u.title}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function ThemeSwitch() {
  const [pref, setPref] = useThemePref();
  const opts: { id: ThemePref; label: string }[] = [{ id: 'system', label: 'Auto' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Oscuro' }];
  return (
    <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-lg border border-line p-0.5 text-xs">
      {opts.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={pref === o.id} onClick={() => setPref(o.id)}
          className={`rounded-md px-2 py-1 ${pref === o.id ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}>{o.label}</button>
      ))}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const tutorOpen = useStore((s) => s.tutorOpen);
  const loc = useLocation();
  useEffect(() => {
    setMenu(false);
    document.getElementById('main')?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  const onTutorPage = loc.pathname === '/auxiliar';
  return (
    <div className="min-h-full">
      <div className="aguayo" aria-hidden />
      {/* Barra superior móvil */}
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <button type="button" className="btn btn-ghost !px-3" aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu((m) => !m)}>{menu ? 'Cerrar' : 'Menú'}</button>
      </header>
      {menu && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-[60px] z-30 overflow-y-auto bg-bg px-4 py-4 lg:hidden">
          <Nav onNavigate={() => setMenu(false)} />
          <div className="mt-6"><ThemeSwitch /></div>
        </div>
      )}
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-line px-4 py-6 lg:flex">
          <Brand />
          <Nav />
          <div className="mt-auto grid gap-3 pt-4">
            <ThemeSwitch />
            <NavLink to="/acerca" className="text-xs text-muted hover:text-ink">Acerca del motor y los datos</NavLink>
          </div>
        </aside>
        <main id="main" className={`@container min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-8 ${tutorOpen && !onTutorPage ? 'xl:pr-[440px]' : ''}`}>
          {children}
        </main>
      </div>
      {!onTutorPage && !tutorOpen && (
        <button type="button" onClick={() => setState({ tutorOpen: true })}
          className="btn btn-primary fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 !rounded-full !px-5 !py-3 shadow-lg">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--gold)]" /> Preguntar al Auxiliar
        </button>
      )}
      {tutorOpen && !onTutorPage && (
        <Suspense fallback={null}><TutorDrawer /></Suspense>
      )}
    </div>
  );
}
