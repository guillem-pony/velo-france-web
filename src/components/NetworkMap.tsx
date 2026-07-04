import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import type { Network } from '../types';

interface Props {
  networks: Network[];
  accent: string;
}

// ── Couleurs par opérateur ───────────────────────────────────────────────────

const OPERATOR_PALETTE: Array<{ pattern: RegExp; label: string; color: string }> = [
  { pattern: /\bpony\b/i,           label: ‘Pony’, color: ‘#00FFFF’ },
  { pattern: /\bvoi\b/i,            label: ‘Voi’,  color: ‘#e27267’ },
  { pattern: /\blime\b/i,           label: ‘Lime’, color: ‘#32CD32’ },
  { pattern: /\bdott\b/i,           label: ‘Dott’, color: ‘#009DDB’ },
];
const FALLBACK_COLOR = '#9aa7ad';
const MIN_SYSTEMS    = 2;

function detectOperator(name: string): { label: string; color: string } {
  for (const op of OPERATOR_PALETTE) {
    if (op.pattern.test(name)) return { label: op.label, color: op.color };
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

// ── Marqueurs ────────────────────────────────────────────────────────────────

function placeMarkers(
  map: maplibregl.Map,
  networks: Network[],
  operatorCounts: Map<string, { color: string; count: number }>,
  store: maplibregl.Marker[],
): maplibregl.Marker[] {
  store.forEach(m => m.remove());

  return networks
    .filter(n => typeof n.lat === 'number' && typeof n.lon === 'number')
    .map(n => {
      const op    = detectOperator(n.name);
      const count = operatorCounts.get(op.label)?.count ?? 0;
      const color = count >= MIN_SYSTEMS ? op.color : FALLBACK_COLOR;

      const el = document.createElement('div');
      el.style.cssText = `width:13px;height:13px;border-radius:50%;background:${color};border:2px solid #F6F9ED;box-shadow:0 0 0 4px ${color}26,0 1px 4px rgba(0,0,0,.35);cursor:pointer`;

      const operatorLabel = op.label !== 'Autre' ? op.label : '';
      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="border-radius:10px;padding:9px 13px;box-shadow:0 2px 8px rgba(0,0,0,.2)">` +
          `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">` +
            `<span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>` +
            `<span style="font:600 12px Poppins,sans-serif;color:#294754">${operatorLabel || n.name}</span>` +
          `</div>` +
          `<div style="font:500 11px Poppins,sans-serif;color:#294754">${n.city}</div>` +
          `<div style="font:500 11px Poppins,sans-serif;color:#294754;margin-top:2px">${n.vehicles_available.toLocaleString('fr-FR')} véhicules dispo</div>` +
        `</div>`
      );

      let pinned = false;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([n.lon as number, n.lat as number])
        .addTo(map);

      el.addEventListener('mouseenter', () => { if (!pinned) popup.addTo(map).setLngLat([n.lon as number, n.lat as number]); });
      el.addEventListener('mouseleave', () => { if (!pinned) popup.remove(); });
      el.addEventListener('click', () => {
        pinned = !pinned;
        if (pinned) popup.addTo(map).setLngLat([n.lon as number, n.lat as number]);
        else popup.remove();
      });

      return marker;
    });
}

// ── Composant ────────────────────────────────────────────────────────────────

export function NetworkMap({ networks, accent }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<maplibregl.Map | null>(null);
  const markersRef       = useRef<maplibregl.Marker[]>([]);
  const networksRef      = useRef(networks);
  const operatorCountsRef = useRef(new Map<string, { color: string; count: number }>());

  // Comptage des réseaux par opérateur (pour seuil légende + couleur)
  const operatorCounts = useMemo(() => {
    const counts = new Map<string, { color: string; count: number }>();
    for (const n of networks) {
      const op = detectOperator(n.name);
      const e  = counts.get(op.label) ?? { color: op.color, count: 0 };
      e.count++;
      counts.set(op.label, e);
    }
    return counts;
  }, [networks]);

  const legendItems = useMemo(() =>
    Array.from(operatorCounts.entries())
      .filter(([, v]) => v.count >= MIN_SYSTEMS)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([label, { color }]) => ({ label, color })),
    [operatorCounts]
  );

  networksRef.current       = networks;
  operatorCountsRef.current = operatorCounts;

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
      markersRef.current = placeMarkers(map, networksRef.current, operatorCountsRef.current, markersRef.current);
    };

    map.on('load', tryInit);
    map.on('styledata', tryInit);
    // Polling de secours (~250 ms × 40 essais)
    const poll = setInterval(tryInit, 250);
    setTimeout(() => clearInterval(poll), 10_000);

    return () => {
      clearInterval(poll);
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Mise à jour des marqueurs quand les données changent
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current = placeMarkers(mapRef.current, networks, operatorCounts, markersRef.current);
  }, [networks, operatorCounts]);

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

        {/* Légende opérateurs */}
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
