import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { fmt } from '../utils';

interface Props {
  vehicles: number;
  networksCount: number;
  animate: boolean;
}

export function Hero({ vehicles, networksCount, animate }: Props) {
  const displayVehicles = useAnimatedCounter(vehicles, animate);

  return (
    <div className="hero-grid">

      {/* Colonne gauche : chiffre héro */}
      <div>
        <div style={{
          font: "600 11px 'Poppins'", letterSpacing: '.16em',
          color: 'rgba(246,249,237,.5)', textTransform: 'uppercase',
        }}>
          Nombre de vélos en libre-service en France
        </div>

        <div style={{
          font: "800 clamp(64px,11vw,132px)/0.88 'Poppins'",
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-.03em', marginTop: 12,
        }}>
          {fmt(displayVehicles)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
          <span className="live-dot" style={{
            width: 9, height: 9, borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse 1.6s ease-in-out infinite',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ font: "500 15px 'Poppins'", color: 'rgba(246,249,237,.72)' }}>
            en libre-service dans{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(networksCount)}</span>
            {' '}territoires
          </span>
        </div>
      </div>

      {/* Colonne droite : intro éditoriale */}
      <div className="hero-intro" style={{ paddingBottom: 10 }}>
        <p style={{ font: "400 15px/1.6 'Poppins'", color: 'rgba(246,249,237,.66)' }}>
          Chaque jour, des milliers de vélos en libre-service circulent
          en France. Cette page agrège en temps réel les données ouvertes{' '}
          <strong style={{ color: '#F6F9ED', fontWeight: 600 }}>GBFS</strong> de tous
          les réseaux, publiées sur transport.data.gouv.fr.
        </p>
      </div>

    </div>
  );
}
