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

// Points de l'endpoint /api/history/daily (graphe de croissance)
export interface VehiclesHistoryPoint {
  day: string;       // YYYY-MM-DD
  vehicles: number;
}

// Granularité journalière du champ "daily" dans /api/stats
export interface DailyPoint {
  day: string;                   // YYYY-MM-DD
  available_15h: number | null;  // Σ véhicules snapshot ~15h UTC
  rides: number | null;          // Σ trajets MDS ce jour
}

export interface DailyStats {
  yesterday: DailyPoint;
  this_month: DailyPoint[];
  last_month: DailyPoint[];
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
  rides_monthly?: Array<{ month: string; rides: number }>;
  daily?: DailyStats;
  stale: boolean;
}

export interface TripHistoryPoint {
  day: string;          // YYYY-MM-DD
  trips: number;
  distance_km: number;
  duration_min: number;
}

// ── Périodes ─────────────────────────────────────────────────────────────────

// Period : clés des buckets backend (rides/km/minutes) — utilisé par StatsGrid
export type Period = 'yesterday' | 'month' | 'year' | 'lastyear';

export const PERIOD_LABELS: Record<Period, string> = {
  yesterday: 'Hier',
  month: 'Le mois dernier',
  year: 'Cette année',
  lastyear: "L'an dernier",
};

// ChartPeriod : 5 périodes exposées par le sélecteur (+ utilisées par les graphiques)
export type ChartPeriod = 'yesterday' | 'thismonth' | 'month' | 'year' | 'lastyear';

export const CHART_PERIOD_LABELS: Record<ChartPeriod, string> = {
  yesterday: 'Hier',
  thismonth: 'Ce mois-ci',
  month: 'Le mois dernier',
  year: 'Cette année',
  lastyear: "L'an dernier",
};
