import { useEffect, useState } from 'react';
import type { DailyPoint } from '../types';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const SEASONAL  = [-.16, -.20, -.04, .10, .22, .27, .24, .19, .08, -.02, -.12, -.18];

function buildFallback(): DailyPoint[] {
  const today = new Date();
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (89 - i));
    const m = d.getMonth();
    return {
      day: d.toISOString().slice(0, 10),
      vehicles: Math.round(85_000 * (1 + SEASONAL[m] + Math.sin(i * 2.3) * 0.015)),
    };
  });
}

interface Props {
  historyUrl: string;
}

export function GrowthChart({ historyUrl }: Props) {
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [fallback] = useState<DailyPoint[]>(buildFallback);

  useEffect(() => {
    if (!historyUrl) return;
    fetch(historyUrl)
      .then(r => r.json())
      .then((data: { points?: DailyPoint[] }) => {
        if (data.points && data.points.length > 0) setSeries(data.points);
      })
      .catch(() => {});
  }, [historyUrl]);

  const display    = series.length > 0 ? series : fallback;
  const isFallback = series.length === 0;
  const max        = Math.max(...display.map(d => d.vehicles));
  const first      = display[0];
  const last       = display[display.length - 1];
  const growthPct  = first && last && first.vehicles > 0
    ? Math.round((last.vehicles / first.vehicles - 1) * 100)
    : 0;

  const thisMonth = new Date().toISOString().slice(0, 7);

  // Libellés au début de chaque mois
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = '';
  display.forEach((d, i) => {
    const m = d.day.slice(0, 7);
    if (m !== lastMonth) {
      monthLabels.push({ index: i, label: MONTHS_FR[parseInt(d.day.slice(5, 7), 10) - 1] });
      lastMonth = m;
    }
  });

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
          Véhicules disponibles · par jour
          {isFallback && (
            <span style={{ color: 'rgba(246,249,237,.25)', fontWeight: 400, letterSpacing: 0 }}>
              {' '}— données simulées
            </span>
          )}
        </div>
        {!isFallback && growthPct !== 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3,
              background: 'var(--accent)', display: 'inline-block',
            }} />
            <span style={{ font: "600 12px 'Poppins'", color: 'var(--accent)' }}>
              {growthPct >= 0 ? '+' : ''}{growthPct}&nbsp;% sur la période
            </span>
          </div>
        )}
      </div>

      {/* Barres */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 150 }}>
        {display.map((d, i) => {
          const isCurrent = d.day.slice(0, 7) === thisMonth;
          const h = Math.round(8 + (d.vehicles / max) * 132);
          const [, mm, dd] = d.day.split('-');
          const tooltip = `${parseInt(dd)} ${MONTHS_FR[parseInt(mm, 10) - 1]} · ${d.vehicles.toLocaleString('fr-FR')} véhicules`;
          return (
            <div
              key={i}
              title={tooltip}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', height: '100%', cursor: 'default',
              }}
            >
              <div style={{
                width: '100%', height: h,
                background: isCurrent ? 'var(--accent)' : 'rgba(246,249,237,.42)',
                borderRadius: '2px 2px 0 0',
              }} />
            </div>
          );
        })}
      </div>

      {/* Axe X — mois */}
      <div style={{ position: 'relative', height: 18, marginTop: 8 }}>
        {monthLabels.map(({ index, label }) => (
          <span
            key={index}
            style={{
              position: 'absolute',
              left: `${(index / display.length) * 100}%`,
              font: "500 10px 'Poppins'",
              color: 'rgba(246,249,237,.42)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        ))}
      </div>

    </div>
  );
}
