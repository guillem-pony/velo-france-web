import type { ChartPeriod } from '../types';
import { CHART_PERIOD_LABELS } from '../types';

const PERIODS: ChartPeriod[] = ['yesterday', 'thismonth', 'month', 'year', 'lastyear'];

interface Props {
  period: ChartPeriod;
  onChange: (p: ChartPeriod) => void;
}

export function PeriodSelector({ period, onChange }: Props) {
  return (
    <div className="period-row">
      <div style={{ font: "600 13px 'Poppins'", color: 'rgba(246,249,237,.7)' }}>
        Vélos et usage
      </div>
      <div className="period-buttons">
        {PERIODS.map((p) => {
          const active = p === period;
          return (
            <button
              key={p}
              aria-pressed={active}
              onClick={() => onChange(p)}
              style={{
                padding: '8px 15px', minHeight: 44, borderRadius: 999,
                border: active ? '1px solid #F6F9ED' : '1px solid rgba(246,249,237,.22)',
                background: active ? '#F6F9ED' : 'transparent',
                color: active ? '#294754' : 'rgba(246,249,237,.7)',
                font: "600 12px 'Poppins'", transition: 'all .15s',
              }}
            >
              {CHART_PERIOD_LABELS[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
