import type { Period, PeriodMetric } from '../types';
import { PERIOD_LABELS } from '../types';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { fmt } from '../utils';

const PERIODS: Period[] = ['yesterday', 'month', 'year', 'lastyear'];

interface CardProps {
  label: string;
  value: number;
  periodLabel: string;
  animate: boolean;
}

function StatCard({ label, value, periodLabel, animate }: CardProps) {
  const display = useAnimatedCounter(value, animate);
  return (
    <div style={{
      background: 'rgba(246,249,237,.05)',
      border: '1px solid rgba(246,249,237,.12)',
      borderRadius: 16,
      padding: '24px 22px',
    }}>
      <div style={{ font: "500 12px 'Poppins'", color: 'rgba(246,249,237,.55)' }}>{label}</div>
      <div style={{
        font: "700 clamp(30px,4vw,44px) 'Poppins'",
        fontVariantNumeric: 'tabular-nums',
        marginTop: 10,
        letterSpacing: '-.01em',
      }}>
        {fmt(display)}
      </div>
      <div style={{ font: "400 11px 'Poppins'", color: 'rgba(246,249,237,.4)', marginTop: 6 }}>
        {periodLabel}
      </div>
    </div>
  );
}

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  rides: PeriodMetric;
  km: PeriodMetric;
  minutes: PeriodMetric;
  animate: boolean;
}

export function StatCards({ period, onPeriodChange, rides, km, minutes, animate }: Props) {
  const periodLabel = PERIOD_LABELS[period];

  return (
    <>
      {/* Barre période */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 22,
      }}>
        <div style={{ font: "600 13px 'Poppins'", color: 'rgba(246,249,237,.7)' }}>
          Usage du réseau
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PERIODS.map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                aria-pressed={active}
                onClick={() => onPeriodChange(p)}
                style={{
                  padding: '8px 15px',
                  borderRadius: 999,
                  border: active ? '1px solid #F6F9ED' : '1px solid rgba(246,249,237,.22)',
                  background: active ? '#F6F9ED' : 'transparent',
                  color: active ? '#294754' : 'rgba(246,249,237,.7)',
                  font: "600 12px 'Poppins'",
                  transition: 'all .15s',
                  minHeight: 36,
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille 3 cartes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <StatCard label="Trajets" value={rides[period]} periodLabel={periodLabel} animate={animate} />
        <StatCard label="Kilomètres parcourus" value={km[period]} periodLabel={periodLabel} animate={animate} />
        <StatCard label="Minutes pédalées" value={minutes[period]} periodLabel={periodLabel} animate={animate} />
      </div>
    </>
  );
}
