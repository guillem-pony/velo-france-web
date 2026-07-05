import { useState } from 'react';
import { useStats } from './hooks/useStats';
import { hexA } from './utils';
import type { ChartPeriod, Period } from './types';

import { Nav }            from './components/Nav';
import { Hero }           from './components/Hero';
import { PeriodSelector } from './components/PeriodSelector';
import { StatsGrid }      from './components/StatsGrid';
import { GrowthChart }    from './components/GrowthChart';
import { TripsChart }     from './components/TripsChart';
import { NetworkMap }     from './components/NetworkMap';
import { Footer }         from './components/Footer';

// Couleur d'accent configurable (spec section 2) — palette : #5fcf95 | #6aa9d6 | #e0a04d | #d98b5f
const ACCENT = '#5fcf95';

const STATS_URL: string = import.meta.env.VITE_STATS_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/api/stats' : '');

export default function App() {
  const [period, setPeriod] = useState<ChartPeriod>('year');
  const { data } = useStats(STATS_URL);

  // ChartPeriod → Period pour StatsGrid (buckets backend : yesterday/month/year/lastyear)
  // 'thismonth' → 'month' (30 jours glissants)
  // 'month' (Le mois dernier calendaire) → null : pas de bucket backend, StatsGrid masqué
  const statPeriod: Period | null =
    period === 'thismonth' ? 'month'      :
    period === 'month'     ? null         :
    period as Period;

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

        {statPeriod && (
          <StatsGrid
            period={statPeriod}
            rides={data.rides}
            km={data.km}
            minutes={data.minutes}
            animate
          />
        )}

        <GrowthChart period={period} data={data} />

        <TripsChart period={period} data={data} />

        <NetworkMap networks={data.networks} accent={ACCENT} />

        <Footer updatedAt={data.updated_at} />

      </div>
    </div>
  );
}
