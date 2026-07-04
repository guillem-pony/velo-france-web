import { useEffect, useState } from 'react';
import type { VehiclesHistoryPoint as DailyPoint } from '../types';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const SEASONAL  = [-.16, -.20, -.04, .10, .22, .27, .24, .19, .08, -.02, -.12, -.18];
const CHART_H   = 160; // hauteur zone barres en px

// ── Série mixte : une barre par mois passé, une par jour du mois courant ────

interface BarPoint {
  key: string;
  label: string;
  vehicles: number;
  isCurrentMonth: boolean;
  tooltip: string;
}

function buildMixed(points: DailyPoint[]): BarPoint[] {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const byMonth = new Map<string, number[]>();
  const currentDays: DailyPoint[] = [];

  for (const p of points) {
    if (p.day.slice(0, 7) === currentMonth) {
      currentDays.push(p);
    } else {
      const arr = byMonth.get(p.day.slice(0, 7)) ?? [];
      arr.push(p.vehicles);
      byMonth.set(p.day.slice(0, 7), arr);
    }
  }

  const result: BarPoint[] = [];

  // Mois passés → moyenne
  for (const [month, values] of Array.from(byMonth.entries()).sort()) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const m   = parseInt(month.slice(5, 7), 10) - 1;
    result.push({
      key: month,
      label: MONTHS_FR[m],
      vehicles: avg,
      isCurrentMonth: false,
      tooltip: `${MONTHS_FR[m]} · moy. ${avg.toLocaleString('fr-FR')} véhicules`,
    });
  }

  // Mois courant → un jour par barre
  for (const p of currentDays) {
    const m = parseInt(p.day.slice(5, 7), 10) - 1;
    const d = parseInt(p.day.slice(8, 10), 10);
    result.push({
      key: p.day,
      label: String(d),
      vehicles: p.vehicles,
      isCurrentMonth: true,
      tooltip: `${d} ${MONTHS_FR[m]} · ${p.vehicles.toLocaleString('fr-FR')} véhicules`,
    });
  }

  return result;
}

function buildFallback(): BarPoint[] {
  const today        = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const result: BarPoint[] = [];

  for (let i = 5; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = d.getMonth();
    result.push({
      key:            `${d.getFullYear()}-${String(m + 1).padStart(2, '0')}`,
      label:          MONTHS_FR[m],
      vehicles:       Math.round(85_000 * (1 + SEASONAL[m])),
      isCurrentMonth: false,
      tooltip:        `${MONTHS_FR[m]} · données simulées`,
    });
  }

  const cm = today.getMonth();
  for (let d = 1; d <= today.getDate(); d++) {
    result.push({
      key:            `${currentMonth}-${String(d).padStart(2, '0')}`,
      label:          String(d),
      vehicles:       Math.round(85_000 * (1 + SEASONAL[cm] + Math.sin(d * 1.3) * 0.015)),
      isCurrentMonth: true,
      tooltip:        `${d} ${MONTHS_FR[cm]} · données simulées`,
    });
  }

  return result;
}

// ── Composant ────────────────────────────────────────────────────────────────

interface Props {
  historyUrl: string;
}

export function GrowthChart({ historyUrl }: Props) {
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [fallback]          = useState<BarPoint[]>(buildFallback);

  useEffect(() => {
    if (!historyUrl) return;
    fetch(historyUrl)
      .then(r => r.json())
      .then((data: { points?: DailyPoint[] }) => {
        if (data.points && data.points.length > 0) setSeries(data.points);
      })
      .catch(() => {});
  }, [historyUrl]);

  const display    = series.length > 0 ? buildMixed(series) : fallback;
  const isFallback = series.length === 0;
  const max        = Math.max(...display.map(d => d.vehicles));
  const first      = display[0];
  const last       = display[display.length - 1];
  const growthPct  = first && last && first.vehicles > 0
    ? Math.round((last.vehicles / first.vehicles - 1) * 100)
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
          Véhicules disponibles · par mois / par jour
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

      {/* Zone barres — hauteur fixe, rien ne déborde */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 4,
        height: CHART_H, overflow: 'hidden',
      }}>
        {display.map(({ key, vehicles, isCurrentMonth, tooltip }) => {
          const h       = Math.max(18, Math.round(6 + (vehicles / max) * (CHART_H - 10)));
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
                  {vehicles.toLocaleString('fr-FR')}
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
