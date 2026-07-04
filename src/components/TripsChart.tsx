import { useEffect, useState } from 'react';
import type { TripHistoryPoint } from '../types';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const SEASONAL  = [-.16, -.20, -.04, .10, .22, .27, .24, .19, .08, -.02, -.12, -.18];
const CHART_H   = 160;

interface BarPoint {
  key: string;
  label: string;
  trips: number;
  isCurrentMonth: boolean;
  tooltip: string;
}

function buildMixed(points: TripHistoryPoint[]): BarPoint[] {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const byMonth = new Map<string, number[]>();
  const currentDays: TripHistoryPoint[] = [];

  for (const p of points) {
    if (p.day.slice(0, 7) === currentMonth) {
      currentDays.push(p);
    } else {
      const arr = byMonth.get(p.day.slice(0, 7)) ?? [];
      arr.push(p.trips);
      byMonth.set(p.day.slice(0, 7), arr);
    }
  }

  const result: BarPoint[] = [];

  // Mois passés → moyenne journalière
  for (const [month, values] of Array.from(byMonth.entries()).sort()) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const m   = parseInt(month.slice(5, 7), 10) - 1;
    result.push({
      key: month,
      label: MONTHS_FR[m],
      trips: avg,
      isCurrentMonth: false,
      tooltip: `${MONTHS_FR[m]} · moy. ${avg.toLocaleString('fr-FR')} trajets/jour`,
    });
  }

  // Mois courant → un jour par barre
  for (const p of currentDays) {
    const m = parseInt(p.day.slice(5, 7), 10) - 1;
    const d = parseInt(p.day.slice(8, 10), 10);
    const distKm  = p.distance_km.toLocaleString('fr-FR');
    const durH    = Math.floor(p.duration_min / 60);
    const durMin  = p.duration_min % 60;
    const durStr  = durH > 0 ? `${durH}h${String(durMin).padStart(2, '0')}` : `${durMin} min`;
    result.push({
      key: p.day,
      label: String(d),
      trips: p.trips,
      isCurrentMonth: true,
      tooltip: `${d} ${MONTHS_FR[m]} · ${p.trips.toLocaleString('fr-FR')} trajets · ${distKm} km · ${durStr}`,
    });
  }

  return result;
}

function buildFallback(): BarPoint[] {
  const today        = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const result: BarPoint[] = [];
  const BASE = 1_500;

  for (let i = 5; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = d.getMonth();
    result.push({
      key:            `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}`,
      label:          MONTHS_FR[m],
      trips:          Math.round(BASE * (1 + SEASONAL[m])),
      isCurrentMonth: false,
      tooltip:        `${MONTHS_FR[m]} · données simulées`,
    });
  }

  const cm = today.getMonth();
  for (let d = 1; d <= today.getDate(); d++) {
    result.push({
      key:            `${currentMonth}-${String(d).padStart(2, '0')}`,
      label:          String(d),
      trips:          Math.round(BASE * (1 + SEASONAL[cm] + Math.sin(d * 1.3) * 0.015)),
      isCurrentMonth: true,
      tooltip:        `${d} ${MONTHS_FR[cm]} · données simulées`,
    });
  }

  return result;
}

interface Props {
  tripsUrl: string;
}

export function TripsChart({ tripsUrl }: Props) {
  const [series, setSeries]   = useState<TripHistoryPoint[]>([]);
  const [fallback]            = useState<BarPoint[]>(buildFallback);

  useEffect(() => {
    if (!tripsUrl) return;
    fetch(tripsUrl, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { points?: TripHistoryPoint[] }) => {
        if (data.points && data.points.length > 0) setSeries(data.points);
      })
      .catch(() => {});
  }, [tripsUrl]);

  const display    = series.length > 0 ? buildMixed(series) : fallback;
  const isFallback = series.length === 0;
  const max        = Math.max(...display.map(d => d.trips));
  const first      = display[0];
  const last       = display[display.length - 1];
  const growthPct  = first && last && first.trips > 0
    ? Math.round((last.trips / first.trips - 1) * 100)
    : 0;

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
          Trajets · par mois / par jour
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

      {/* Zone barres */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 4,
        height: CHART_H, overflow: 'hidden',
      }}>
        {display.map(({ key, trips, isCurrentMonth, tooltip }) => {
          const h       = Math.max(18, Math.round(6 + (trips / max) * (CHART_H - 10)));
          const bgCol   = isCurrentMonth ? 'var(--accent)' : 'rgba(246,249,237,.42)';
          const txtCol  = isCurrentMonth ? '#294754' : 'rgba(41,71,84,.85)';
          const showTxt = h >= 50;
          return (
            <div
              key={key}
              title={tooltip}
              style={{
                flex: 1, height: h,
                background: bgCol,
                borderRadius: '2px 2px 0 0',
                overflow: 'hidden',
                display: 'flex', alignItems: 'flex-start',
                cursor: 'default', flexShrink: 0,
              }}
            >
              {showTxt && (
                <span style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  font: "600 9px 'Poppins'",
                  fontVariantNumeric: 'tabular-nums',
                  color: txtCol,
                  paddingTop: 4,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}>
                  {trips.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Axe X */}
      <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
        {display.map(({ key, label, isCurrentMonth }) => (
          <div key={key} style={{
            flex: 1,
            font: "500 9px 'Poppins'",
            color: isCurrentMonth ? 'rgba(246,249,237,.7)' : 'rgba(246,249,237,.42)',
            textAlign: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {label}
          </div>
        ))}
      </div>

    </div>
  );
}
