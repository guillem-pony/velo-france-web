import { fmtTime } from '../utils';

interface Props {
  updatedAt: string | null;
}

export function Footer({ updatedAt }: Props) {
  return (
    <div style={{
      marginTop: 48, paddingTop: 24,
      borderTop: '1px solid rgba(246,249,237,.12)',
      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ font: "400 12px/1.7 'Poppins'", color: 'rgba(246,249,237,.5)', maxWidth: 620 }}>
        <strong style={{ color: 'rgba(246,249,237,.75)', fontWeight: 600 }}>Sources.</strong>{' '}
        Disponibilité temps réel : flux ouverts GBFS agrégés via l'API du Point d'Accès National
        (transport.data.gouv.fr). Trajets, kilomètres et minutes : données d'usage Pony agrégées
        via MDS. Fond cartographique : © OpenStreetMap, © CARTO.
      </div>
      <div style={{ font: "500 12px 'Poppins'", color: 'rgba(246,249,237,.5)' }}>
        Mis à jour : {fmtTime(updatedAt)}
      </div>
    </div>
  );
}
