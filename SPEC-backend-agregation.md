# Spec — API d'agrégation « Vélo partagé en France »

Backend qui agrège **en temps quasi-réel** les données de tous les réseaux de véhicules en
libre-service de France (GBFS), les met en cache, et expose **un seul endpoint JSON** que la
landing page consomme. Conçu pour être implémenté avec Claude Code.

---

## 1. Pourquoi un backend (et pas du fetch navigateur)

La page a d'abord tenté d'agréger les flux GBFS directement dans le navigateur. Résultat : **~3
réseaux sur ~40 répondent**, le reste est bloqué par CORS (Lime, Tier, Vélib'… ne servent pas
d'en-tête `Access-Control-Allow-Origin`). Il faut donc agréger **côté serveur** :

- pas de CORS côté serveur (requêtes serveur-à-serveur) ;
- une seule requête légère pour le visiteur (lecture d'un JSON en cache) ;
- pas 80+ requêtes par visiteur vers les opérateurs (politesse + perf) ;
- chargement instantané de la page.

```
Opérateurs GBFS ─┐
PAN (data.gouv) ─┼─►  CRON (toutes les 2-5 min)  ─►  cache JSON  ─►  GET /api/stats  ─►  Page
Votre BdD analytics ─┘        (agrégation)            (Redis/fichier/KV)
```

---

## 2. Sources de données

### 2.1 Liste des réseaux — API du PAN
- **`GET https://transport.data.gouv.fr/api/datasets`** — JSON, **sans authentification ni quota**.
- Pour chaque `dataset`, parcourir `dataset.resources[]` et retenir celles dont
  `format === "gbfs"` et dont l'`url` pointe vers un `gbfs.json` (auto-discovery GBFS).
- Dédupliquer les URLs (`Set`).

### 2.2 Disponibilité temps réel — flux GBFS de chaque réseau
Pour chaque `gbfs.json` :
1. Le lire → trouver le tableau `feeds`. Attention aux **deux structures** :
   - GBFS v3 : `data.feeds[]`
   - GBFS v2 : `data.<lang>.feeds[]` (ex. `data.fr.feeds[]` ou `data.en.feeds[]`)
2. Trouver le feed de statut des véhicules :
   - GBFS v3 : `name === "vehicle_status"` → liste dans `data.vehicles[]`
   - GBFS v2 : `name === "free_bike_status"` → liste dans `data.bikes[]`
3. **Véhicule disponible** = `!is_reserved && !is_disabled`.
4. Récupérer aussi, une fois par réseau (cache plus long, ~24 h) :
   - `system_information` → `data.name`, `data.timezone`, `data.feed_contact_email`,
     et si présent `data.center`/coordonnées. Sinon dériver une coordonnée représentative
     depuis `station_information` (moyenne des stations) ou le centroïde des véhicules.

> Le nom de ville / coordonnées sert à **placer les marqueurs sur la carte**. Si rien
> d'exploitable, exclure le réseau de la carte mais le compter dans le total.

### 2.3 Métriques d'usage (trajets / km / minutes) — API MDS Pony
**GBFS ne fournit AUCUN historique d'usage.** `rides`, `km`, `minutes` (hier / 30 j / année /
année préc.) proviennent de l'**API MDS Pony**, pas des flux ouverts GBFS.

- **Endpoint** : `GET https://mds.getapony.com/v1/{ville}/trips` (ex. `…/v1/bordeaux/trips`).
- **À appeler côté serveur uniquement** : API authentifiée (token Bearer MDS), **non-CORS**, et
  `/trips` renvoie tous les trajets **paginés** — jamais depuis le navigateur (token exposé +
  volume). C'est la raison d'être de ce backend.
- **Authentification** : en-tête `Authorization: Bearer <MDS_TOKEN>` (cf. `MDS_TOKEN` en §8).
- **Fenêtre temporelle** : suivre la convention MDS de l'instance (le plus souvent un paramètre
  de temps type `?end_time=<ISO heure>` par tranche horaire, ou un couple `min_end_time` /
  `max_end_time` en epoch ms — vérifier la doc de l'instance Pony). Itérer sur la plage voulue.
- **Pagination** : suivre `links.next` (ou le curseur renvoyé) jusqu'à épuisement.

**Calcul par trajet** (objet `trips[]` MDS) :
- `rides`   = **nombre** de trajets
- `km`      = Σ `trip_distance` (mètres) ÷ 1000
- `minutes` = Σ `trip_duration` (secondes) ÷ 60

**Agréger en 4 buckets** via `start_time` (ou `end_time`) de chaque trajet :
`yesterday` (J-1, 00:00→24:00 fuseau local) · `month` (30 derniers jours glissants) ·
`year` (année civile en cours) · `lastyear` (année civile précédente).

> Recalcul lourd : agréger ces buckets **1×/heure ou 1×/jour** (pas à chaque requête visiteur) et
> stocker le résultat dans le cache. Multi-villes : appeler `/v1/{ville}/trips` pour chaque ville
> exploitée et **sommer** (Bordeaux pour démarrer).

### 2.4 Série mensuelle « véhicules disponibles »
La courbe de croissance (`available_monthly`) se calcule en **historisant la disponibilité GBFS** :
échantillonner périodiquement `vehicles_available` (le cron le fait déjà) et stocker la **moyenne
mensuelle** par réseau, puis sommer. À défaut d'historique au démarrage, dériver une moyenne depuis
les snapshots accumulés.

---

## 3. Contrat de sortie — `GET /api/stats`

La page lit **exactement** cette forme. Garder les clés stables.

```jsonc
{
  "updated_at": "2026-06-27T09:52:10Z",   // ISO 8601, date de l'agrégation
  "vehicles_available": 48213,            // somme temps réel, tous réseaux
  "networks_count": 41,                   // nb de réseaux agrégés avec succès

  // Par réseau — alimente la carte (1 marqueur = 1 réseau)
  "networks": [
    {
      "id": "pony-evry",
      "name": "Pony — Évry",
      "operator": "Pony",
      "city": "Évry",
      "lat": 48.6309,
      "lon": 2.4408,
      "vehicles_available": 488
    }
    // …
  ],

  // Métriques d'usage (depuis l'API MDS Pony) — 4 périodes chacune
  "rides":   { "yesterday": 1240, "month": 38200, "year": 214500, "lastyear": 356800 },
  "km":      { "yesterday": 3120, "month": 96400, "year": 540300, "lastyear": 889200 },
  "minutes": { "yesterday": 18600,"month": 561000,"year": 3140000,"lastyear": 5210000 },

  // Série mensuelle « véhicules disponibles » (croissance) — ~30 derniers mois
  "available_monthly": [
    { "month": "2024-01", "avg_available": 210 },
    { "month": "2024-02", "avg_available": 205 }
    // …
  ],

  // Trajets par mois (depuis MDS) — alimente le graphe « trajets par mois » (12+ mois)
  "rides_monthly": [
    { "month": "2025-07", "rides": 12800 },
    { "month": "2025-08", "rides": 11900 }
    // …
  ],

  "stale": false   // true si l'agrégation a échoué et qu'on sert le dernier cache valide
}
```

### Notes de contrat
- **Toutes les valeurs numériques sont des entiers.** Le front formate en `fr-FR`.
- `networks[]` peut être vide → la carte affiche juste un état « données indisponibles ».
- Périodes : `yesterday`, `month` (30 derniers jours glissants), `year` (année civile en cours),
  `lastyear` (année civile précédente). Garder ces 4 clés exactes.
- `available_monthly[].month` au format `YYYY-MM`.
- `rides_monthly[].month` au format `YYYY-MM` (12+ mois, calculé depuis MDS — cf. §2.3).
- `networks[].operator` : nom de l'opérateur (Pony, Voi, Lime, Tier, Dott, Vélib'…) — sert à
  colorer les marqueurs de carte. À défaut, le front le déduit du préfixe de `name`.

---

## 4. Logique d'agrégation (pseudocode)

```
async function aggregate():
  datasets = GET https://transport.data.gouv.fr/api/datasets
  gbfsUrls = unique( datasets.flatMap(d => d.resources)
                     .filter(r => r.format == "gbfs" && /gbfs\.json/.test(r.url))
                     .map(r => r.url) )

  results = await Promise.allSettled( gbfsUrls.map(perNetwork) )   // concurrence limitée (voir §5)

  total = 0; networks = []
  for r in results where r.fulfilled && r.value != null:
     total += r.value.vehicles_available
     networks.push(r.value)

  usage = await readUsageFromMDS()         // rides/km/minutes (cache horaire/journalier)
  monthly = await readAvailableMonthly()   // série mensuelle (snapshots GBFS historisés)

  payload = { updated_at: now(), vehicles_available: total,
              networks_count: networks.length, networks, ...usage, stale: false }
  cache.set("stats", payload)              // + garder une copie "last_good"

async function perNetwork(gbfsUrl):
  gj = await fetchJSON(gbfsUrl, timeout=6s)
  feeds = gj.data.feeds ?? gj.data[firstKey(gj.data)].feeds          // v3 ou v2
  statusUrl = feeds.find(f => f.name in ["vehicle_status","free_bike_status"])?.url
  if !statusUrl: return null
  vj = await fetchJSON(statusUrl, timeout=6s)
  list = vj.data.vehicles ?? vj.data.bikes ?? []
  available = list.filter(v => !v.is_reserved && !v.is_disabled).length
  meta = await networkMeta(gbfsUrl, feeds)   // nom + lat/lon, caché ~24h
  return { id: meta.id, name: meta.name, city: meta.city,
           lat: meta.lat, lon: meta.lon, vehicles_available: available }
```

---

## 5. Robustesse & politesse
- **Timeout par requête** : 6 s (AbortController). Un réseau lent ne doit pas bloquer le batch.
- **Concurrence limitée** : ~8–10 requêtes simultanées (p-limit) plutôt que tout en parallèle.
- **`Promise.allSettled`** : un réseau en échec n'invalide jamais l'agrégat.
- **Cache « dernier bon résultat »** : si une exécution renvoie 0 réseau, **servir le précédent**
  avec `stale: true` plutôt qu'un JSON vide.
- **Métadonnées réseau** (nom, coordonnées) en cache long (~24 h) — ne change quasi jamais.
- **User-Agent** explicite (ex. `velo-france-stats/1.0 (contact@…)`) par courtoisie.
- **Retry** léger (1 réessai) sur erreur réseau transitoire.

---

## 6. Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/stats` | Lit le cache et renvoie le JSON (§3). **C'est ce que lit la page.** |
| `GET` | `/api/health` | `{ ok, last_run, networks_count, stale }` pour le monitoring. |
| `POST`| `/api/refresh` | (optionnel, protégé) force une ré-agrégation manuelle. |

### En-têtes de `/api/stats`
- `Content-Type: application/json; charset=utf-8`
- `Access-Control-Allow-Origin: *` (ou le domaine de la page) — **indispensable** côté API.
- `Cache-Control: public, max-age=60` (laisser le CDN/navigateur souffler 1 min).

---

## 7. Planification
- **Cron** d'agrégation toutes les **2–5 min** (la disponibilité bouge en continu).
- La série `available_monthly` peut être recalculée **1×/jour** (agrégat lourd côté analytics).
- Découpler : `/api/stats` ne calcule **jamais** à la volée — il lit seulement le cache.

---

## 8. Pile technique suggérée (au choix)
- **Node + TypeScript** : `fetch` natif (Node ≥ 18), `p-limit` pour la concurrence,
  cron via `node-cron` ou un scheduler de plateforme (Vercel Cron, Cloud Scheduler, GitHub
  Actions). Cache : Redis, Upstash, ou simple fichier JSON / KV.
- **Python** : `httpx` (async) + `asyncio.Semaphore`, cron via APScheduler ou crontab.
- Hébergement serverless OK (la fonction cron écrit le cache, la fonction `/api/stats` le lit).

### Variables d'environnement
```
PAN_DATASETS_URL = https://transport.data.gouv.fr/api/datasets
REFRESH_INTERVAL_SEC = 180
FETCH_TIMEOUT_MS = 6000
MAX_CONCURRENCY = 8
MDS_BASE_URL = https://mds.getapony.com/v1
MDS_CITIES = bordeaux            # liste des villes à sommer (séparées par des virgules)
MDS_TOKEN = …                    # token Bearer MDS Pony
USAGE_REFRESH_SEC = 3600         # ré-agrégation MDS (horaire) — distincte du cron GBFS
CACHE_URL = …            # Redis/Upstash/KV (ou chemin fichier)
ALLOW_ORIGIN = https://votre-domaine.gouv.fr
```

---

## 9. Définition de « terminé »
- [ ] `GET /api/stats` renvoie le JSON du §3, en < 50 ms (lecture cache).
- [ ] Le cron peuple le cache et journalise nb de réseaux OK / en échec.
- [ ] En cas d'échec total, `stale: true` + dernier bon résultat servi.
- [ ] CORS activé sur `/api/stats`.
- [ ] `rides/km/minutes` calculés depuis l'API MDS Pony (Σ par période).
- [ ] `available_monthly` calculé depuis l'historisation des snapshots GBFS.
- [ ] `/api/health` exploitable pour une alerte (ex. `stale` depuis > 30 min).

---

## 10. Côté page (déjà prêt)
La landing lit l'endpoint via une prop **`statsUrl`**. Renseigne l'URL de `/api/stats` et la page
remplace l'agrégation navigateur (fallback) par tes données serveur — compteurs, graphiques et
carte (marqueurs depuis `networks[]`) se branchent automatiquement sur ce contrat.
