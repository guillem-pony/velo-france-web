import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import type { Network } from '../types';

interface Props {
  networks: Network[];
  accent: string;
}

// ── Couleurs par opérateur ───────────────────────────────────────────────────

const OPERATOR_PALETTE: Record<string, { label: string; color: string }> = {
  fifteen: { label: 'Fifteen', color: '#ea3365' },
  ecovelo: { label: 'Ecovélo', color: '#293ad5' },
  pony:    { label: 'Pony',    color: '#00FFFF' },
  voi:     { label: 'Voi',     color: '#e27267' },
  lime:    { label: 'Lime',    color: '#32CD32' },
  dott:    { label: 'Dott',    color: '#009DDB' },
};

const NAME_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /\bpony\b/i, key: 'pony' },
  { pattern: /\bvoi\b/i,  key: 'voi'  },
  { pattern: /\blime\b/i, key: 'lime' },
  { pattern: /\bdott\b/i, key: 'dott' },
];

const FALLBACK_COLOR = '#9aa7ad';
const MIN_SYSTEMS    = 2;

function detectOperator(name: string, operator?: string): { label: string; color: string } {
  if (operator && OPERATOR_PALETTE[operator]) return OPERATOR_PALETTE[operator];
  for (const { pattern, key } of NAME_PATTERNS) {
    if (pattern.test(name)) return OPERATOR_PALETTE[key];
  }
  return { label: 'Autre', color: FALLBACK_COLOR };
}

// ── Recoloration carte ───────────────────────────────────────────────────────

function recolorMap(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id, type = layer.type;
    try {
      if (type === 'background') {
        map.setPaintProperty(id, 'background-color', '#223c47');
      } else if (type === 'fill' && /water|ocean|sea|lake|river/i.test(id)) {
        map.setPaintProperty(id, 'fill-color', '#1a2f39');
      } else if (type === 'fill') {
        map.setPaintProperty(id, 'fill-color', '#2c4d5c');
      } else if (type === 'fill-extrusion') {
        map.setPaintProperty(id, 'fill-extrusion-color', '#33586a');
      } else if (type === 'line' && /water|river|waterway/i.test(id)) {
        map.setPaintProperty(id, 'line-color', '#1a2f39');
      } else if (type === 'line') {
        map.setPaintProperty(id, 'line-color', 'rgba(246,249,237,0.10)');
      } else if (type === 'symbol') {
        map.setPaintProperty(id, 'text-color', 'rgba(246,249,237,0.5)');
        map.setPaintProperty(id, 'text-halo-color', 'rgba(34,60,71,0.85)');
        map.setPaintProperty(id, 'text-halo-width', 1.2);
      }
    } catch {}
  }
}

// ── Écartement anti-chevauchement ────────────────────────────────────────────

type MMap = Map<string, maplibregl.Marker>;

function nKey(n: Network): string {
  return `${n.lat},${n.lon}`;
}

// Union-find : regroupe les points dont la distance écran < threshold
function overlapGroups(items: { key: string; x: number; y: number }[], threshold: number): string[][] {
  const p = items.map((_, i) => i);
  const find = (i: number): number => p[i] === i ? i : (p[i] = find(p[i]));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const dx = items[i].x - items[j].x, dy = items[i].y - items[j].y;
      if (dx * dx + dy * dy < threshold * threshold) p[find(i)] = find(j);
    }
  const g = new Map<number, string[]>();
  items.forEach((v, i) => { const r = find(i); g.set(r, [...(g.get(r) ?? []), v.key]); });
  return [...g.values()].filter(arr => arr.length >= 2);
}

// Recalcule l'écartement après chaque fin de déplacement/zoom
function spreadMarkers(map: maplibregl.Map, mmap: MMap): void {
  // Remettre tous les marqueurs à leur position géographique réelle
  for (const m of mmap.values()) {
    const orig = (m as any)._orig as [number, number] | undefined;
    if (orig) m.setLngLat(orig);
  }

  // Projeter toutes les positions vraies en coordonnées écran
  const items = [...mmap.entries()].map(([key, m]) => {
    const orig = (m as any)._orig as [number, number] | undefined;
    const p = map.project(orig ?? m.getLngLat());
    return { key, m, x: p.x, y: p.y };
  });

  const byKey = new Map(items.map(v => [v.key, v]));

  for (const keys of overlapGroups(items, 16)) {
    const its = keys.map(k => byKey.get(k)!).filter(Boolean);
    const n  = its.length;
    const R  = n <= 3 ? 10 : n <= 6 ? 16 : 22;
    const cx = its.reduce((s, v) => s + v.x, 0) / n;
    const cy = its.reduce((s, v) => s + v.y, 0) / n;

    its.forEach((item, i) => {
      const a  = (i / n) * 2 * Math.PI - Math.PI / 2;
      const pt = map.unproject([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      item.m.setLngLat([pt.lng, pt.lat]);
    });
  }

  // Mettre à jour les popups ouverts après repositionnement
  for (const m of mmap.values()) {
    const popup = (m as any)._popup as maplibregl.Popup | undefined;
    if (popup?.isOpen()) popup.setLngLat(m.getLngLat());
  }
}

// ── Marqueurs DOM ─────────────────────────────────────────────────────────────

function syncMarkers(
  map: maplibregl.Map,
  networks: Network[],
  opCounts: Map<string, { color: string; count: number }>,
  mmap: MMap,
): void {
  for (const m of mmap.values()) m.remove();
  mmap.clear();

  for (const n of networks) {
    if (typeof n.lat !== 'number' || typeof n.lon !== 'number') continue;
    const key   = nKey(n);
    const op    = detectOperator(n.name, n.operator);
    const color = (opCounts.get(op.label)?.count ?? 0) >= MIN_SYSTEMS ? op.color : FALLBACK_COLOR;
    const label = op.label !== 'Autre' ? op.label : '';

    const el = document.createElement('div');
    el.style.cssText = `width:13px;height:13px;border-radius:50%;background:${color};border:2px solid #F6F9ED;box-shadow:0 0 0 4px ${color}26,0 1px 4px rgba(0,0,0,.35);cursor:pointer`;

    const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
      `<div style="border-radius:10px;padding:9px 13px;box-shadow:0 2px 8px rgba(0,0,0,.2)">` +
        `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">` +
          `<span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>` +
          `<span style="font:600 12px Poppins,sans-serif;color:#294754">${label || n.name}</span>` +
        `</div>` +
        `<div style="font:500 11px Poppins,sans-serif;color:#294754">${n.city}</div>` +
        `<div style="font:500 11px Poppins,sans-serif;color:#294754;margin-top:2px">${n.vehicles_available.toLocaleString('fr-FR')} véhicules dispo</div>` +
      `</div>`
    );

    let pinned = false;
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([n.lon as number, n.lat as number])
      .addTo(map);

    (marker as any)._orig  = [n.lon as number, n.lat as number] as [number, number];
    (marker as any)._popup = popup;

    el.addEventListener('mouseenter', () => { if (!pinned) popup.addTo(map).setLngLat(marker.getLngLat()); });
    el.addEventListener('mouseleave', () => { if (!pinned) popup.remove(); });
    el.addEventListener('click',      (e) => {
      e.stopPropagation();
      pinned = !pinned;
      if (pinned) popup.addTo(map).setLngLat(marker.getLngLat());
      else        popup.remove();
    });

    mmap.set(key, marker);
  }
}

// ── Composant ────────────────────────────────────────────────────────────────

export function NetworkMap({ networks, accent }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<MMap>(new Map());
  const networksRef   = useRef(networks);
  const opCountsRef   = useRef(new Map<string, { color: string; count: number }>());

  const opCounts = useMemo(() => {
    const m = new Map<string, { color: string; count: number }>();
    for (const n of networks) {
      const op = detectOperator(n.name, n.operator);
      const e  = m.get(op.label) ?? { color: op.color, count: 0 };
      e.count++;
      m.set(op.label, e);
    }
    return m;
  }, [networks]);

  const legendItems = useMemo(() =>
    [...opCounts.entries()]
      .filter(([, v]) => v.count >= MIN_SYSTEMS)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([label, { color }]) => ({ label, color })),
    [opCounts]
  );

  networksRef.current = networks;
  opCountsRef.current = opCounts;

  // Init carte — une seule fois
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [2.6, 46.4],
      zoom: 4.7,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    let initialized = false;
    const tryInit = () => {
      if (initialized || !map.isStyleLoaded()) return;
      initialized = true;
      clearInterval(poll);
      mapRef.current = map;

      recolorMap(map);
      syncMarkers(map, networksRef.current, opCountsRef.current, markersRef.current);
      spreadMarkers(map, markersRef.current);

      // Recalcul de l'écartement après chaque fin de déplacement ou zoom
      map.on('moveend', () => spreadMarkers(map, markersRef.current));
      map.on('zoomend', () => spreadMarkers(map, markersRef.current));
    };

    map.on('load',      tryInit);
    map.on('styledata', tryInit);
    // Polling de secours (~250 ms × 40 essais)
    const poll = setInterval(tryInit, 250);
    setTimeout(() => clearInterval(poll), 10_000);

    return () => {
      clearInterval(poll);
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Mise à jour des marqueurs quand les données changent
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncMarkers(map, networks, opCounts, markersRef.current);
    spreadMarkers(map, markersRef.current);
  }, [networks, opCounts]);

  return (
    <div style={{ marginTop: 48 }}>

      {/* En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        flexWrap: 'wrap', gap: 8, marginBottom: 18,
      }}>
        <div>
          <div style={{ font: "700 22px 'Poppins'", letterSpacing: '-.01em' }}>
            Où roule-t-on&nbsp;?
          </div>
          <div style={{ font: "400 13px 'Poppins'", color: 'rgba(246,249,237,.55)', marginTop: 4 }}>
            Un marqueur par réseau de véhicules en libre-service
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 11, height: 11, borderRadius: '50%',
            background: accent, border: '1.5px solid rgba(246,249,237,.9)',
            display: 'inline-block',
          }} />
          <span style={{ font: "500 12px 'Poppins'", color: 'rgba(246,249,237,.6)' }}>
            réseau actif
          </span>
        </div>
      </div>

      {/* Conteneur carte + légende */}
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} className="map-container" />

        {legendItems.length > 0 && (
          <div style={{
            position: 'absolute', top: 14, right: 50,
            background: 'rgba(34,60,71,0.92)',
            borderRadius: 10, padding: '10px 14px',
            border: '1px solid rgba(246,249,237,.14)',
            zIndex: 1, backdropFilter: 'blur(6px)',
          }}>
            {legendItems.map(({ label, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 5,
              }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: color, border: '1.5px solid rgba(246,249,237,.7)',
                  flexShrink: 0, display: 'inline-block',
                }} />
                <span style={{ font: "500 11px 'Poppins'", color: 'rgba(246,249,237,.8)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
