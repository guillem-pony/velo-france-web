import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { Network } from '../types';

interface Props {
  networks: Network[];
  accent: string;
}

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

function placeMarkers(
  map: maplibregl.Map,
  networks: Network[],
  accent: string,
  store: maplibregl.Marker[],
): maplibregl.Marker[] {
  store.forEach(m => m.remove());

  return networks
    .filter(n => typeof n.lat === 'number' && typeof n.lon === 'number')
    .map(n => {
      // Élément du marqueur — 13×13 px uniforme
      const el = document.createElement('div');
      el.style.cssText = `width:13px;height:13px;border-radius:50%;background:${accent};border:2px solid #F6F9ED;box-shadow:0 0 0 4px ${accent}26,0 1px 4px rgba(0,0,0,.35);cursor:pointer`;

      // Popup au survol et au clic
      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="font:600 12px Poppins,sans-serif;color:#294754">${n.name}</div>` +
        `<div style="font:500 11px Poppins,sans-serif;color:#294754">${(n.vehicles_available).toLocaleString('fr-FR')} véhicules dispo</div>`
      );

      let pinned = false;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([n.lon as number, n.lat as number])
        .addTo(map);

      el.addEventListener('mouseenter', () => { if (!pinned) popup.addTo(map).setLngLat([n.lon as number, n.lat as number]); });
      el.addEventListener('mouseleave', () => { if (!pinned) popup.remove(); });
      el.addEventListener('click',      () => {
        pinned = !pinned;
        if (pinned) popup.addTo(map).setLngLat([n.lon as number, n.lat as number]);
        else popup.remove();
      });

      return marker;
    });
}

export function NetworkMap({ networks, accent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const markersRef   = useRef<maplibregl.Marker[]>([]);
  const networksRef  = useRef(networks);
  const accentRef    = useRef(accent);
  networksRef.current = networks;
  accentRef.current   = accent;

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [2.6, 46.4],
      zoom: 4.7,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      recolorMap(map);
      markersRef.current = placeMarkers(map, networksRef.current, accentRef.current, markersRef.current);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rafraîchir les marqueurs après chargement si les données changent
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current = placeMarkers(mapRef.current, networks, accent, markersRef.current);
  }, [networks, accent]);

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
            background: 'var(--accent)', border: '1.5px solid rgba(246,249,237,.9)',
            display: 'inline-block',
          }} />
          <span style={{ font: "500 12px 'Poppins'", color: 'rgba(246,249,237,.6)' }}>
            réseau actif
          </span>
        </div>
      </div>

      <div ref={containerRef} className="map-container" />
    </div>
  );
}
