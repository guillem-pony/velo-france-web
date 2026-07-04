// Graphe "Trajets par mois — 12 derniers mois"
// Données placeholder saisonnières (l'API n'expose pas la décomposition mensuelle des trajets).

const MONTH_ABBR = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const SEASONAL   = [-.16, -.20, -.04, .10, .22, .27, .24, .19, .08, -.02, -.12, -.18];

function buildBars() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const m = d.getMonth();
    const base = 18000 + i * 500;
    return { label: MONTH_ABBR[m], value: Math.round(base * (1 + SEASONAL[m])) };
  });
}

const BARS = buildBars();
const MAX  = Math.max(...BARS.map(b => b.value));

export function MonthlyChart() {
  return (
    <div style={{
      background: 'rgba(246,249,237,.05)', border: '1px solid rgba(246,249,237,.12)',
      borderRadius: 16, padding: '26px 26px 22px', marginTop: 16,
    }}>
      <div style={{
        font: "600 11px 'Poppins'", letterSpacing: '.12em',
        color: 'rgba(246,249,237,.5)', marginBottom: 20, textTransform: 'uppercase',
      }}>
        Trajets par mois — 12 derniers mois
      </div>

      <div className="chart-bars-gap10" style={{
        display: 'flex', alignItems: 'flex-end', gap: 10, height: 170,
      }}>
        {BARS.map(({ label, value }, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', alignItems: 'center', gap: 9, height: '100%',
          }}>
            <div style={{
              width: '100%',
              height: Math.round(10 + (value / MAX) * 150),
              background: 'rgba(246,249,237,.85)',
              borderRadius: '4px 4px 0 0',
            }} />
            <div style={{ font: "500 10px 'Poppins'", color: 'rgba(246,249,237,.42)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
