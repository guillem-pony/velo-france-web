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

// ── Utilitaires clustering / spiderfy ────────────────────────────────────────

type MMap   = Map<string, maplibregl.Marker>;
type Spider = Map<string, [number, number]>;

function nKey(n: Network): string {
  return `${n.lat},${n.lon}`;
}

function buildGeoJSON(networks: Network[]) {
  return {
    type: 'FeatureCollection' as const,
    features: networks
      .filter(n => typeof n.lat === 'number' && typeof n.lon === 'number')
      .map(n => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [n.lon as number, n.lat as number] },
        properties: { key: nKey(n) },
      })),
  };
}

// Union-find grouping of screen-space nearby items
function spiderGroups(items: { key: string; x: number; y: number }[], d: number): string[][] {
  const p = items.map((_, i) => i);
  const find = (i: number): number => p[i] === i ? i : (p[i] = find(p[i]));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const dx = items[i].x - items[j].x, dy = items[i].y - items[j].y;
      if (dx * dx + dy * dy < d * d) p[find(i)] = find(j);
    }
  const g = new Map<number, string[]>();
  items.forEach((v, i) => { const r = find(i); g.set(r, [...(g.get(r) ?? []), v.key]); });
  return [...g.values()].filter(arr => arr.length >= 2);
}

function setSpiderLines(map: maplibregl.Map, lines: [number, number][][]): void {
  (map.getSource('spider-lines') as maplibregl.GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: lines.map(c => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: c },
      properties: {},
    })),
  } as any);
}

// Recreate all DOM markers (handles color changes too)
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
    (marker as any)._orig = [n.lon as number, n.lat as number] as [number, number];

    el.addEventListener('mouseenter', () => { if (!pinned) popup.addTo(map).setLngLat(marker.getLngLat()); });
    el.addEventListener('mouseleave', () => { if (!pinned) popup.remove(); });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      pinned = !pinned;
      if (pinned) popup.addTo(map).setLngLat(marker.getLngLat());
      else popup.remove();
    });

    mmap.set(key, marker);
  }
}

// Refresh visibility + spiderfy after any camera change
function refreshMarkers(
  map: maplibregl.Map,
  mmap: MMap,
  spiderRef: { current: Spider | null },
): void {
  // Restore original positions before recalculating
  if (spiderRef.current) {
    for (const [key, orig] of spiderRef.current) mmap.get(key)?.setLngLat(orig);
    spiderRef.current = null;
    setSpiderLines(map, []);
  }

  // Show/hide markers based on current cluster state
  const unclust = new Set(
    map.querySourceFeatures('networks', { filter: ['!', ['has', 'point_count']] })
       .map(f => f.properties?.key as string).filter(Boolean)
  );
  for (const [key, m] of mmap) {
    m.getElement().style.display = unclust.has(key) ? '' : 'none';
  }

  // Spiderfy visible markers that overlap on screen (zoom ≥ 13)
  if (map.getZoom() < 13) return;

  const visible = [...mmap.entries()]
    .filter(([, m]) => m.getElement().style.display !== 'none')
    .map(([key, m]) => { const p = map.project(m.getLngLat()); return { key, m, x: p.x, y: p.y }; });

  const groups = spiderGroups(visible, 15);
  if (!groups.length) return;

  const byKey = new Map(visible.map(v => [v.key, v]));
  const orig  = new Map<string, [number, number]>();
  const lines: [number, number][][] = [];

  for (const keys of groups) {
    const items = keys.map(k => byKey.get(k)).filter((v): v is NonNullable<typeof v> => !!v);
    const cx     = items.reduce((s, v) => s + v.x, 0) / items.length;
    const cy     = items.reduce((s, v) => s + v.y, 0) / items.length;
    const center = map.unproject([cx, cy]);

    items.forEach((item, i) => {
      const a  = (i / items.length) * 2 * Math.PI - Math.PI / 2;
      const pt = map.unproject([cx + 28 * Math.cos(a), cy + 28 * Math.sin(a)]);
      orig.set(item.key, item.m.getLngLat().toArray() as [number, number]);
      item.m.setLngLat([pt.lng, pt.lat]);
      lines.push([[center.lng, center.lat], [pt.lng, pt.lat]]);
    });
  }

  spiderRef.current = orig;
  setSpiderLines(map, lines);
}

// ── Composant ────────────────────────────────────────────────────────────────

export function NetworkMap({ networks, accent }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<MMap>(new Map());
  const spiderfiedRef = useRef<Spider | null>(null);
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

      // GeoJSON source avec clustering
      map.addSource('networks', {
        type: 'geojson',
        data: buildGeoJSON(networksRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      } as any);

      // Source vide pour les lignes de spiderfy
      map.addSource('spider-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      } as any);

      // Cercles de clusters (3 tailles : 2–5 / 6–14 / 15+)
      map.addLayer({
        id: 'clusters', type: 'circle', source: 'networks',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(246,249,237,0.15)',
          'circle-radius': ['step', ['get', 'point_count'], 12, 6, 16, 15, 20],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(246,249,237,0.35)',
        } as any,
      });

      // Compteur dans le cercle
      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'networks',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 } as any,
        paint: { 'text-color': 'rgba(246,249,237,0.9)' } as any,
      });

      // Lignes de spiderfy
      map.addLayer({
        id: 'spider-lines', type: 'line', source: 'spider-lines',
        paint: { 'line-color': 'rgba(246,249,237,0.35)', 'line-width': 1 } as any,
      });

      syncMarkers(map, networksRef.current, opCountsRef.current, markersRef.current);
      refreshMarkers(map, markersRef.current, spiderfiedRef);

      // Clic sur cluster → zoom pour décluster
      map.on('click', 'clusters', (e) => {
        const feat = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!feat.length) return;
        const cid = feat[0].properties?.cluster_id;
        if (cid == null) return;
        (map.getSource('networks') as any).getClusterExpansionZoom(
          cid,
          (err: Error | null, zoom: number) => {
            if (err) return;
            map.easeTo({ center: (feat[0].geometry as any).coordinates, zoom });
          }
        );
      });

      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

      // Après tout déplacement/zoom : recalcul visibilité + spiderfy
      const onCameraEnd = () => refreshMarkers(map, markersRef.current, spiderfiedRef);
      map.on('moveend', onCameraEnd);
      map.on('zoomend', onCameraEnd);

      // Clic ailleurs → collapse spiderfy
      map.on('click', (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['clusters'] }).length) return;
        if (!spiderfiedRef.current) return;
        for (const [key, orig] of spiderfiedRef.current) markersRef.current.get(key)?.setLngLat(orig);
        spiderfiedRef.current = null;
        setSpiderLines(map, []);
      });
    };

    map.on('load', tryInit);
    map.on('styledata', tryInit);
    const poll = setInterval(tryInit, 250);
    setTimeout(() => clearInterval(poll), 10_000);

    return () => {
      clearInterval(poll);
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      spiderfiedRef.current = null;
    };
  }, []);

  // Mise à jour quand les données changent
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('networks')) return;
    (map.getSource('networks') as any).setData(buildGeoJSON(networks));
    syncMarkers(map, networks, opCounts, markersRef.current);
    refreshMarkers(map, markersRef.current, spiderfiedRef);
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
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
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
