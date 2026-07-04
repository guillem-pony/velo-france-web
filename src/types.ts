export interface PeriodMetric {
  yesterday: number;
  month: number;
  year: number;
  lastyear: number;
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  avg_available: number;
}

export interface DailyPoint {
  day: string;      // YYYY-MM-DD
  vehicles: number;
}

export interface Network {
  id: string;
  name: string;
  city: string;
  lat: number | null;
  lon: number | null;
  vehicles_available: number;
  operator?: string;
}

export interface StatsPayload {
  updated_at: string;
  vehicles_available: number;
  networks_count: number;
  networks: Network[];
  rides: PeriodMetric;
  km: PeriodMetric;
  minutes: PeriodMetric;
  available_monthly: MonthlyPoint[];
  stale: boolean;
}

export interface TripHistoryPoint {
  day: string;          // YYYY-MM-DD
  trips: number;
  distance_km: number;
  duration_min: number;
}

export type Period = 'yesterday' | 'month' | 'year' | 'lastyear';

export const PERIOD_LABELS: Record<Period, string> = {
  yesterday: 'Hier',
  month: 'Le mois dernier',
  year: 'Cette année',
  lastyear: "L'an dernier",
};
