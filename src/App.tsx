import { useState } from 'react';
import { useStats } from './hooks/useStats';
import { hexA } from './utils';
import type { Period } from './types';

import { Nav }            from './components/Nav';
import { Hero }           from './components/Hero';
import { PeriodSelector } from './components/PeriodSelector';
import { StatsGrid }      from './components/StatsGrid';
import { MonthlyChart }   from './components/MonthlyChart';
import { GrowthChart }    from './components/GrowthChart';
import { NetworkMap }     from './components/NetworkMap';
import { Footer }         from './components/Footer';

// Couleur d'accent configurable (spec section 2) — palette : #5fcf95 | #6aa9d6 | #e0a04d | #d98b5f
const ACCENT = '#5fcf95';

const STATS_URL: string   = import.meta.env.VITE_STATS_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/api/stats' : '');
const HISTORY_URL: string = STATS_URL ? STATS_URL.replace('/api/stats', '/api/history') : '';

export default function App() {
  const [period, setPeriod] = useState<Period>('year');
  const { data } = useStats(STATS_URL);

  // CSS variables propagées à tous les enfants via style inline
  const cssVars = {
    '--accent':        ACCENT,
    '--accent-bg':     hexA(ACCENT, 0.15),
    '--accent-border': hexA(ACCENT, 0.4),
  } as React.CSSProperties;

  return (
    <div className="page-wrapper" style={{ ...cssVars, minHeight: '100vh', background: '#294754', color: '#F6F9ED' }}>
      <div className="page-inner">

        <Nav updatedAt={data.updated_at} />

        <Hero
          vehicles={data.vehicles_available}
          networksCount={data.networks_count}
          animate
        />

        <PeriodSelector period={period} onChange={setPeriod} />

        <StatsGrid
          period={period}
          rides={data.rides}
          km={data.km}
          minutes={data.minutes}
          animate
        />

        <MonthlyChart />

        <GrowthChart historyUrl={HISTORY_URL} />

        <NetworkMap networks={data.networks} accent={ACCENT} />

        <Footer updatedAt={data.updated_at} />

      </div>
    </div>
  );
}
