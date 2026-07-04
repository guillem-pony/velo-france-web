import { fmtTime } from '../utils';

interface Props {
  updatedAt: string | null;
}

export function Nav({ updatedAt }: Props) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '26px 0 14px', borderBottom: '1px solid rgba(246,249,237,.12)',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: '#F6F9ED',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#294754', font: "800 15px 'Poppins'", flexShrink: 0,
        }}>V</div>
        <div style={{ font: "700 14px 'Poppins'", letterSpacing: '.04em' }}>
          VÉLO PARTAGÉ · FRANCE
        </div>
      </div>

      {/* Badge live — couleurs via CSS var */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent-border)',
        padding: '6px 12px', borderRadius: 999,
      }}>
        <span className="live-dot" style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 1.6s ease-in-out infinite',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ font: "600 10px 'Poppins'", color: '#F6F9ED', letterSpacing: '.06em' }}>
          EN DIRECT · {fmtTime(updatedAt)}
        </span>
      </div>

    </div>
  );
}
