import React, { useMemo, useState } from 'react';
import { tlog } from './components/Telemetry';

const sections = [
  { key: 'baseball', label: 'Baseball' },
  { key: 'football', label: 'Football' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'track', label: 'Track & Field' },
] as const;

export function App() {
  const [active, setActive] = useState<typeof sections[number]['key']>('baseball');

  const View = useMemo(() => {
    switch (active) {
      case 'baseball':
        return React.lazy(() => import('./pages/Baseball'));
      case 'football':
        return React.lazy(() => import('./pages/Football'));
      case 'basketball':
        return React.lazy(() => import('./pages/Basketball'));
      case 'track':
        return React.lazy(() => import('./pages/Track'));
    }
  }, [active]);

  return (
    <>
      <header style={{ padding: '1rem', borderBottom: '1px solid #1b1e24' }}>
        <img src="/assets/images/BI-4.png" alt="Blaze Sports Intel" width="36" height="36" />
        <h1 style={{ margin: 0, fontSize: 20 }}>Blaze Sports Intel</h1>
        <span className="badge">America/Chicago</span>
      </header>
      <nav style={{ padding: '0.75rem 1rem', gap: '1rem' }}>
        {sections.map((s) => (
          <a
            key={s.key}
            href={`#${s.key}`}
            onClick={(e) => {
              e.preventDefault();
              setActive(s.key);
              tlog({ type: 'nav', ts: new Date().toISOString(), details: { to: s.key } });
            }}
            className={active === s.key ? 'active' : ''}
          >
            {s.label}
          </a>
        ))}
      </nav>
      <main>
        <React.Suspense fallback={<div>Loading…</div>}>
          <View />
        </React.Suspense>
      </main>
      <footer style={{ padding: '2rem 1rem', opacity: 0.8 }}>
        <small>© {new Date().getFullYear()} Blaze Sports Intel — Texas built</small>
      </footer>
    </>
  );
}
