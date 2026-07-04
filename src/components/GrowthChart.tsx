// Graphe "Véhicules disponibles par mois"
// Données réelles : available_monthly[] de /api/stats  →  fallback série saisonnière.

import type { MonthlyPoint } from '../types';

const SEASONAL = [-.16, -.20, -.04, .10, .22, .27, .24, .19, .08, -.02, -.12, -.18];

function buildFallback(): MonthlyPoint[] {
  let base = 210;
  return Array.from({ length: 30 }, (_, i) => {
    const year  = 2024 + Math.floor(i / 12);
    const month = i % 12;
    base += 5.6;
    return {
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      avg_available: Math.round(base * (1 + SEASONAL[month])),
    };
  });
}

interface Props {
  data: MonthlyPoint[];
}

export function GrowthChart({ data }: Props) {
  const series    = data.length > 0 ? data : buildFallback();
  const currentYear = new Date().getFullYear();
  const max = Math.max(...series.map(d => d.avg_available));

  const first2024 = series.find(d => d.month.startsWith('2024'));
  const last       = series[series.length - 1];
  const growthPct  = first2024 && last && first2024.avg_available > 0
    ? Math.round((last.avg_available / first2024.avg_available - 1) * 100)
    : 0;

  const years = [...new Set(series.map(d => d.month.slice(0, 4)))].sort();

  return (
    <div style={{
      background: 'rgba(246,249,237,.05)', border: '1px solid rgba(246,249,237,.12)',
      borderRadius: 16, padding: '26px 26px 22px', marginTop: 16,
    }}>

      {/* En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{
          font: "600 11px 'Poppins'", letterSpacing: '.12em',
          color: 'rgba(246,249,237,.5)', textTransform: 'uppercase',
        }}>
          Véhicules disponibles par mois — La flotte grandit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: 3,
            background: 'var(--accent)', display: 'inline-block',
          }} />
          <span style={{ font: "600 12px 'Poppins'", color: 'var(--accent)' }}>
            +{growthPct}&nbsp;% depuis 2024
          </span>
        </div>
      </div>

      {/* Barres */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150 }}>
        {series.map((d, i) => {
          const year      = Number(d.month.slice(0, 4));
          const isCurrent = year === currentYear;
          const h = Math.round(8 + (d.avg_available / max) * 132);
          return (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end', height: '100%',
            }}>
              <div style={{
                width: '100%', height: h,
                background: isCurrent ? 'var(--accent)' : 'rgba(246,249,237,.42)',
                borderRadius: '2px 2px 0 0',
              }} />
            </div>
          );
        })}
      </div>

      {/* Axe années */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        font: "500 10px 'Poppins'", color: 'rgba(246,249,237,.42)', marginTop: 10,
      }}>
        {years.map(y => <span key={y}>{y}</span>)}
      </div>

    </div>
  );
}
