import type { ChartPeriod, StatsPayload } from '../types';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const CHART_H   = 160;

interface BarPoint {
  key:       string;
  axisLabel: string;
  tooltip:   string;
  value:     number | null;
}

function fmtVeh(n: number) {
  return n.toLocaleString('fr-FR') + ' véh.';
}

function deriveBars(period: ChartPeriod, data: StatsPayload): BarPoint[] {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  if (period === 'yesterday') {
    const d = data.daily?.yesterday;
    if (!d) return [];
    const mIdx = parseInt(d.day.slice(5, 7), 10) - 1;
    const day  = parseInt(d.day.slice(8),     10);
    return [{
      key:       d.day,
      axisLabel: 'Hier',
      tooltip:   `${day} ${MONTHS_FR[mIdx]} · ${d.available_15h !== null ? fmtVeh(d.available_15h) : 'données manquantes'}`,
      value:     d.available_15h,
    }];
  }

  if (period === 'thismonth' || period === 'month') {
    const pts = period === 'thismonth'
      ? (data.daily?.this_month ?? [])
      : (data.daily?.last_month ?? []);
    if (!pts.length) return [];
    return pts.map(p => {
      const mIdx = parseInt(p.day.slice(5, 7), 10) - 1;
      const day  = parseInt(p.day.slice(8),     10);
      return {
        key:       p.day,
        axisLabel: String(day),
        tooltip:   `${day} ${MONTHS_FR[mIdx]} · ${p.available_15h !== null ? fmtVeh(p.available_15h) : 'données manquantes'}`,
        value:     p.available_15h,
      };
    });
  }

  // year / lastyear — monthly averages
  const yearStr    = String(period === 'year' ? currentYear : currentYear - 1);
  const monthCount = period === 'year' ? currentMonth + 1 : 12;
  const map        = new Map(
    (data.available_monthly ?? [])
      .filter(p => p.month.startsWith(yearStr))
      .map(p => [p.month, p.avg_available])
  );
  return Array.from({ length: monthCount }, (_, m) => {
    const month = `${yearStr}-${String(m + 1).padStart(2, '0')}`;
    const val   = map.get(month) ?? null;
    return {
      key:       month,
      axisLabel: MONTHS_FR[m],
      tooltip:   `${MONTHS_FR[m]} ${yearStr} · ${val !== null ? fmtVeh(val) : 'données manquantes'}`,
      value:     val,
    };
  });
}

const SUBTITLE: Record<ChartPeriod, string> = {
  yesterday: 'hier',
  thismonth: 'ce mois-ci · par jour',
  month:     'mois dernier · par jour',
  year:      'cette année · par mois',
  lastyear:  "l'an dernier · par mois",
};

// Accent pour les périodes courantes, ivoire pour les périodes passées
const IS_ACCENT = new Set<ChartPeriod>(['yesterday', 'thismonth', 'year']);

interface Props {
  period: ChartPeriod;
  data:   StatsPayload;
}

export function GrowthChart({ period, data }: Props) {
  const bars = deriveBars(period, data);

  if (bars.length === 0) {
    return (
      <div style={{
        background: 'rgba(246,249,237,.05)', border: '1px solid rgba(246,249,237,.12)',
        borderRadius: 16, padding: '26px 26px 22px', marginTop: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: CHART_H + 80,
      }}>
        <span style={{ font: "400 13px 'Poppins'", color: 'rgba(246,249,237,.3)' }}>
          Données indisponibles
        </span>
      </div>
    );
  }

  const isAccent = IS_ACCENT.has(period);
  const barFill  = isAccent ? 'var(--accent)' : 'rgba(246,249,237,.42)';
  const txtFill  = isAccent ? '#294754' : 'rgba(41,71,84,.85)';

  const nonNull   = bars.filter(b => b.value !== null);
  const first     = nonNull[0];
  const last      = nonNull[nonNull.length - 1];
  const growthPct = first && last && first !== last && first.value! > 0
    ? Math.round((last.value! / first.value! - 1) * 100)
    : null;

  const maxVal    = Math.max(...bars.map(b => b.value ?? 0), 1);
  const renderKey = `${period}-${data.updated_at}`;
  const gap       = bars.length > 25 ? 2 : bars.length > 10 ? 4 : 6;

  // Modes d'affichage des valeurs selon le nombre de barres
  const n           = bars.length;
  const isHero      = n === 1;                  // 1 barre → chiffre héro au-dessus
  const labelAbove  = !isHero && n <= 10;       // 2–10 barres → label horizontal au-dessus
  const labelInside = n > 10;                   // >10 barres → texte vertical dans la barre
  const extraPad    = isHero ? 60 : labelAbove ? 28 : 0;

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
          Véhicules disponibles · {SUBTITLE[period]}
        </div>
        {growthPct !== null && growthPct !== 0 && (
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

      {/* Barres + axe X (animés ensemble à chaque changement de période) */}
      <div key={renderKey} className="chart-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: CHART_H + extraPad }}>
          {bars.map(({ key, tooltip, value }) => {
            if (value === null) {
              return (
                <div
                  key={key}
                  title={tooltip}
                  style={{
                    flex: 1, minWidth: 3, height: 8,
                    border: '1px dashed rgba(246,249,237,.18)',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              );
            }
            const h = Math.max(18, Math.round(6 + (value / maxVal) * (CHART_H - 10)));
            return (
              <div
                key={key}
                title={tooltip}
                style={{
                  position: 'relative',
                  flex: 1, minWidth: 3, height: h,
                  background: barFill, borderRadius: '2px 2px 0 0',
                  overflow: labelInside ? 'hidden' : 'visible',
                  display: 'flex', alignItems: 'flex-start',
                  cursor: 'default',
                }}
              >
                {/* Chiffre héro — 1 barre (vue "Hier") */}
                {isHero && (
                  <span style={{
                    position: 'absolute', bottom: '100%',
                    left: '50%', transform: 'translateX(-50%)',
                    paddingBottom: 14,
                    font: "700 32px 'Poppins'", fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(246,249,237,.9)', whiteSpace: 'nowrap',
                  }}>
                    {value.toLocaleString('fr-FR')}
                  </span>
                )}
                {/* Label horizontal au-dessus — 2 à 10 barres */}
                {labelAbove && (
                  <span style={{
                    position: 'absolute', bottom: '100%',
                    left: '50%', transform: 'translateX(-50%)',
                    paddingBottom: 5,
                    font: "600 13px 'Poppins'", fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(246,249,237,.9)', whiteSpace: 'nowrap',
                  }}>
                    {value.toLocaleString('fr-FR')}
                  </span>
                )}
                {/* Texte vertical dans la barre — >10 barres */}
                {labelInside && h >= 50 && (
                  <span style={{
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    font: "600 9px 'Poppins'", fontVariantNumeric: 'tabular-nums',
                    color: txtFill, paddingTop: 4, lineHeight: 1, whiteSpace: 'nowrap',
                  }}>
                    {value.toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Axe X */}
        <div style={{ display: 'flex', gap, marginTop: 7 }}>
          {bars.map(({ key, axisLabel }) => (
            <div key={key} style={{
              flex: 1, minWidth: 3,
              font: "500 9px 'Poppins'", color: 'rgba(246,249,237,.42)',
              textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {axisLabel}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
