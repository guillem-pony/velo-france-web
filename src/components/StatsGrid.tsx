import type { Period, PeriodMetric } from '../types';
import { PERIOD_LABELS } from '../types';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { fmt } from '../utils';

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
      borderRadius: 16, padding: '24px 22px',
    }}>
      <div style={{ font: "500 12px 'Poppins'", color: 'rgba(246,249,237,.55)' }}>
        {label}
      </div>
      <div style={{
        font: "700 clamp(30px,4vw,44px) 'Poppins'",
        fontVariantNumeric: 'tabular-nums',
        marginTop: 10, letterSpacing: '-.01em',
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
  rides: PeriodMetric;
  km: PeriodMetric;
  minutes: PeriodMetric;
  animate: boolean;
}

export function StatsGrid({ period, rides, km, minutes, animate }: Props) {
  const periodLabel = PERIOD_LABELS[period];
  return (
    <div className="stats-grid">
      <StatCard label="Trajets"            value={rides[period]}   periodLabel={periodLabel} animate={animate} />
      <StatCard label="Kilomètres parcourus" value={km[period]}    periodLabel={periodLabel} animate={animate} />
      <StatCard label="Minutes pédalées"   value={minutes[period]} periodLabel={periodLabel} animate={animate} />
    </div>
  );
}
