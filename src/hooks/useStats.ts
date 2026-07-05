import { useEffect, useState } from 'react';
import type { StatsPayload } from '../types';

const FALLBACK: StatsPayload = {
  updated_at: new Date().toISOString(),
  vehicles_available: 52000,
  networks_count: 95,
  networks: [
    // Île-de-France
    { id: 'velib',         name: "Vélib' Métropole",   city: 'Paris',          lat: 48.8566, lon:  2.3522, vehicles_available: 16000 },
    { id: 'pony-evry',     name: 'Pony Évry',          city: 'Évry',           lat: 48.6309, lon:  2.4408, vehicles_available:   450 },
    { id: 'pony-versailles',name:'Pony Versailles',    city: 'Versailles',     lat: 48.8014, lon:  2.1301, vehicles_available:   280 },
    // Auvergne-Rhône-Alpes
    { id: 'velov',         name: "Vélo'v",             city: 'Lyon',           lat: 45.7640, lon:  4.8357, vehicles_available:  4300 },
    { id: 'metrovelo',     name: 'Métrovélo',          city: 'Grenoble',       lat: 45.1885, lon:  5.7245, vehicles_available:   950 },
    { id: 'pony-lyon',     name: 'Pony Lyon',          city: 'Lyon',           lat: 45.7640, lon:  4.8357, vehicles_available:   380 },
    { id: 'cit-lib',       name: "Cit'Lib",            city: 'Annecy',         lat: 45.8992, lon:  6.1294, vehicles_available:   210 },
    { id: 'vel-st-etienne',name: 'Vélos verts',        city: 'Saint-Étienne',  lat: 45.4378, lon:  4.3853, vehicles_available:   220 },
    { id: 'clermontferrand',name:'Vélomagg SMTC',      city: 'Clermont-Ferrand',lat:45.7772, lon:  3.0870, vehicles_available:   280 },
    { id: 'aubiere',       name: 'Vélo Thiers-Vichy',  city: 'Thiers',         lat: 45.8556, lon:  3.5429, vehicles_available:    90 },
    // Provence-Alpes-Côte d'Azur
    { id: 'le-velo',       name: 'Le Vélo',            city: 'Marseille',      lat: 43.2965, lon:  5.3698, vehicles_available:  2600 },
    { id: 'velobleu',      name: "Vélo Bleu",          city: 'Nice',           lat: 43.7102, lon:  7.2620, vehicles_available:  1300 },
    { id: 'pony-nice',     name: 'Pony Nice',          city: 'Nice',           lat: 43.7102, lon:  7.2620, vehicles_available:   320 },
    { id: 'pony-marseille',name: 'Pony Marseille',     city: 'Marseille',      lat: 43.2965, lon:  5.3698, vehicles_available:   280 },
    { id: 'vel-oc',        name: "Vélo'v Aix",         city: 'Aix-en-Provence',lat: 43.5297, lon:  5.4474, vehicles_available:   260 },
    { id: 'toulon-velo',   name: 'Vélos Toulon',       city: 'Toulon',         lat: 43.1258, lon:  5.9306, vehicles_available:   280 },
    { id: 'avignon-velo',  name: 'Vélos Avignon',      city: 'Avignon',        lat: 43.9493, lon:  4.8055, vehicles_available:   220 },
    { id: 'cannes-velo',   name: 'Cannes Mobilités',   city: 'Cannes',         lat: 43.5528, lon:  7.0174, vehicles_available:   160 },
    { id: 'antibes-velo',  name: 'Vélos Antibes',      city: 'Antibes',        lat: 43.5804, lon:  7.1279, vehicles_available:   120 },
    { id: 'gap-velo',      name: 'Vélo Gap',           city: 'Gap',            lat: 44.5588, lon:  6.0748, vehicles_available:    80 },
    // Occitanie
    { id: 'velotoulouse',  name: 'VélôToulouse',       city: 'Toulouse',       lat: 43.6047, lon:  1.4442, vehicles_available:  1900 },
    { id: 'velomagg',      name: 'VéloMagg',           city: 'Montpellier',    lat: 43.6108, lon:  3.8767, vehicles_available:  1200 },
    { id: 'pony-montpellier',name:'Pony Montpellier',  city: 'Montpellier',    lat: 43.6108, lon:  3.8767, vehicles_available:   250 },
    { id: 'nimes-velo',    name: 'Vélos Nîmes',        city: 'Nîmes',          lat: 43.8367, lon:  4.3601, vehicles_available:   180 },
    { id: 'beziers-velo',  name: 'Vélos Béziers',      city: 'Béziers',        lat: 43.3444, lon:  3.2154, vehicles_available:   120 },
    { id: 'perpignan-velo',name: 'Bicing Perpignan',   city: 'Perpignan',      lat: 42.6987, lon:  2.8956, vehicles_available:   180 },
    { id: 'ales-velo',     name: 'Vélos Alès',         city: 'Alès',           lat: 44.1256, lon:  4.0828, vehicles_available:    90 },
    // Nouvelle-Aquitaine
    { id: 'vcub',          name: 'VCub',               city: 'Bordeaux',       lat: 44.8378, lon: -0.5792, vehicles_available:  2100 },
    { id: 'pony-bordeaux', name: 'Pony Bordeaux',      city: 'Bordeaux',       lat: 44.8378, lon: -0.5792, vehicles_available:   350 },
    { id: 'yelo',          name: 'Yélo',               city: 'La Rochelle',    lat: 46.1603, lon: -1.1511, vehicles_available:   270 },
    { id: 'mon-velo-pau',  name: 'Mon Vélo',           city: 'Pau',            lat: 43.2951, lon: -0.3708, vehicles_available:   340 },
    { id: 'limoges-velo',  name: 'Vélos Limoges',      city: 'Limoges',        lat: 45.8469, lon:  1.2644, vehicles_available:   150 },
    { id: 'bayonne-velo',  name: 'Vélos BAB',          city: 'Bayonne',        lat: 43.4929, lon: -1.4749, vehicles_available:   130 },
    { id: 'angouleme-velo',name: 'Vélos Angoulême',    city: 'Angoulême',      lat: 45.6476, lon:  0.1567, vehicles_available:   100 },
    { id: 'perigueux-velo',name: 'Périgueux Vélos',    city: 'Périgueux',      lat: 45.1840, lon:  0.7199, vehicles_available:    80 },
    // Pays de la Loire
    { id: 'bicloo',        name: 'Bicloo',             city: 'Nantes',         lat: 47.2184, lon: -1.5536, vehicles_available:  1500 },
    { id: 'velo-angers',   name: 'Vélo Angers',        city: 'Angers',         lat: 47.4784, lon: -0.5632, vehicles_available:   540 },
    { id: 'le-mans-velo',  name: 'Setram Vélo',        city: 'Le Mans',        lat: 48.0000, lon:  0.1900, vehicles_available:   190 },
    { id: 'laval-velo',    name: 'Vélos Laval',        city: 'Laval',          lat: 48.0735, lon: -0.7696, vehicles_available:    90 },
    { id: 'saint-nazaire', name: 'Vélos Saint-Nazaire',city: 'Saint-Nazaire',  lat: 47.2736, lon: -2.2136, vehicles_available:   110 },
    // Bretagne
    { id: 'velostar',      name: 'VéloStar',           city: 'Rennes',         lat: 48.1173, lon: -1.6778, vehicles_available:  1100 },
    { id: 'brest-velo',    name: 'Vélos Brest',        city: 'Brest',          lat: 48.3904, lon: -4.4861, vehicles_available:   200 },
    { id: 'quimper-velo',  name: 'Vélos Quimper',      city: 'Quimper',        lat: 47.9971, lon: -4.0957, vehicles_available:    90 },
    { id: 'lorient-velo',  name: 'Vélos Lorient',      city: 'Lorient',        lat: 47.7486, lon: -3.3698, vehicles_available:    90 },
    // Normandie
    { id: 'cyclic',        name: "Cy'clic",            city: 'Rouen',          lat: 49.4432, lon:  1.0993, vehicles_available:   360 },
    { id: 'twisto-velo',   name: 'Twisto Vélos',       city: 'Caen',           lat: 49.1829, lon: -0.3707, vehicles_available:   280 },
    { id: 'havre-velo',    name: 'Vélos Le Havre',     city: 'Le Havre',       lat: 49.4944, lon:  0.1079, vehicles_available:   190 },
    { id: 'cherbourg-velo',name: 'Vélos Cherbourg',    city: 'Cherbourg',      lat: 49.6337, lon: -1.6167, vehicles_available:    90 },
    // Hauts-de-France
    { id: 'vlille',        name: "V'lille",            city: 'Lille',          lat: 50.6292, lon:  3.0573, vehicles_available:  1700 },
    { id: 'velodunkerque', name: 'VéloDK',             city: 'Dunkerque',      lat: 51.0333, lon:  2.3767, vehicles_available:   250 },
    { id: 'amiens-velo',   name: 'Vélam',              city: 'Amiens',         lat: 49.8941, lon:  2.2958, vehicles_available:   380 },
    { id: 'valenciennes',  name: 'Vélos Valenciennes', city: 'Valenciennes',   lat: 50.3579, lon:  3.5236, vehicles_available:   200 },
    { id: 'lens-velo',     name: 'Vélos Lens-Liévin',  city: 'Lens',           lat: 50.4322, lon:  2.8302, vehicles_available:   150 },
    { id: 'compiegne-velo',name: 'Vélos Compiègne',    city: 'Compiègne',      lat: 49.4180, lon:  2.8258, vehicles_available:   100 },
    // Grand Est
    { id: 'velhop',        name: 'Vélhop',             city: 'Strasbourg',     lat: 48.5734, lon:  7.7521, vehicles_available:  1400 },
    { id: 'velostation',   name: 'Vélostation',        city: 'Mulhouse',       lat: 47.7508, lon:  7.3359, vehicles_available:   320 },
    { id: 'stan-velo',     name: 'Stan Vélo',          city: 'Nancy',          lat: 48.6921, lon:  6.1844, vehicles_available:   250 },
    { id: 'metz-velo',     name: "Vél'Oc Metz",        city: 'Metz',           lat: 49.1193, lon:  6.1757, vehicles_available:   280 },
    { id: 'reims-velo',    name: 'Vélos Reims',        city: 'Reims',          lat: 49.2583, lon:  4.0317, vehicles_available:   350 },
    { id: 'colmar-velo',   name: 'Vélos Colmar',       city: 'Colmar',         lat: 48.0800, lon:  7.3590, vehicles_available:   110 },
    { id: 'troyes-velo',   name: 'Vélos Troyes',       city: 'Troyes',         lat: 48.2997, lon:  4.0795, vehicles_available:   120 },
    { id: 'belfort-velo',  name: 'Vélos Belfort',      city: 'Belfort',        lat: 47.6380, lon:  6.8636, vehicles_available:   110 },
    // Bourgogne-Franche-Comté
    { id: 'velocite',      name: 'VéloCité',           city: 'Besançon',       lat: 47.2378, lon:  6.0241, vehicles_available:   290 },
    { id: 'dijon-velo',    name: 'Divia Vélo',         city: 'Dijon',          lat: 47.3220, lon:  5.0415, vehicles_available:   380 },
    { id: 'chalon-velo',   name: 'Vélos Chalon',       city: 'Chalon-sur-Saône',lat:46.7805, lon:  4.8536, vehicles_available:   100 },
    // Centre-Val de Loire
    { id: 'fil-bleu-velo', name: 'Fil Bleu Vélo',      city: 'Tours',          lat: 47.3941, lon:  0.6848, vehicles_available:   620 },
    { id: 'veloce',        name: "Vélo'cé",            city: 'Orléans',        lat: 47.9030, lon:  1.9039, vehicles_available:   330 },
    { id: 'velo-blois',    name: 'Vélos Blois',        city: 'Blois',          lat: 47.5941, lon:  1.3358, vehicles_available:    90 },
    // Corse
    { id: 'bastia-velo',   name: 'Vélos Bastia',       city: 'Bastia',         lat: 42.6976, lon:  9.4507, vehicles_available:    70 },
    { id: 'ajaccio-velo',  name: 'Vélos Ajaccio',      city: 'Ajaccio',        lat: 41.9192, lon:  8.7386, vehicles_available:    80 },
    // DROM
    { id: 'martinique-velo',name:'Vélos Martinique',   city: 'Fort-de-France', lat: 14.6037, lon: -61.0694,vehicles_available:   120 },
    { id: 'reunion-velo',  name: 'Vélos Réunion',      city: 'Saint-Denis',    lat:-20.8823, lon:  55.4504, vehicles_available:   100 },
  ],
  rides:   { yesterday: 1240, thismonth:  12000, month:  38200, year:  214500, lastyear:  356800 },
  km:      { yesterday: 3120, thismonth:  30000, month:  96400, year:  540300, lastyear:  889200 },
  minutes: { yesterday: 18600, thismonth: 175000, month: 561000, year: 3140000, lastyear: 5210000 },
  available_monthly: [],
  stale: false,
};

export function useStats(statsUrl: string) {
  const [data, setData] = useState<StatsPayload>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!statsUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        const res = await fetch(statsUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: StatsPayload = await res.json();
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [statsUrl]);

  return { data, loading, error };
}
