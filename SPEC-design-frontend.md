# Spec Design — Landing « Vélo partagé en France »

Spécifications visuelles et d'interaction pour reconstruire fidèlement le front-end avec Claude
Code (React, Next.js, Vue… au choix). La maquette de référence est `Tableau de bord.dc.html`.
Consomme l'API décrite dans `SPEC-backend-agregation.md` (endpoint `/api/stats`).

---

## 1. Principe

Page unique (landing), sombre, éditoriale « data-journalisme ». Un grand chiffre en direct
(nombre de vélos en libre-service en France), puis l'usage par période, deux graphiques, et une
carte nationale. Verticale, scrollable, centrée, largeur de contenu **1160 px max**.

---

## 2. Couleurs

| Rôle | Valeur | Usage |
|---|---|---|
| Fond principal (Raisin black) | `#294754` | `body`, fond de toute la page |
| Texte / surface claire (Ivory) | `#F6F9ED` | texte principal, logo, boutons actifs |
| Accent (vert) | `#5fcf95` | points « live », année courante, marqueurs carte |
| Fond carte — terres | `#2c4d5c` | remplissage MapLibre |
| Fond carte — eau | `#1a2f39` | mers/rivières MapLibre |
| Conteneur carte (fallback) | `#1d333d` | avant chargement de la carte |

**Opacités d'ivoire** (toujours `rgba(246,249,237, α)`) — c'est la clé de la hiérarchie :
`0.72` texte secondaire · `0.66` paragraphe · `0.55` légendes · `0.5` sur-titres ·
`0.45`–`0.42` labels de graphe · `0.22` bord de bouton inactif · `0.12` bords/séparateurs ·
`0.05` fond de carte-stat.

L'accent est **paramétrable** (prop `accent`). Palette proposée : `#5fcf95` (vert), `#6aa9d6`
(bleu), `#e0a04d` (ambre), `#d98b5f` (terracotta). Les fonds de badge « live » dérivent de
l'accent à `α=0.15` (fond) et `α=0.4` (bord).

---

## 3. Typographie

- **Police unique : Poppins** (Google Fonts, poids 400/500/600/700/800).
- Chiffres : **toujours `font-variant-numeric: tabular-nums`** (alignement des compteurs).

| Élément | Poids / taille / interlignage | Détails |
|---|---|---|
| Chiffre héro | 800 · `clamp(64px, 11vw, 132px)` · 0.88 | `letter-spacing:-.03em` |
| Titres section | 700 · 22px | `letter-spacing:-.01em` |
| Chiffres de stat | 700 · `clamp(30px, 4vw, 44px)` | `letter-spacing:-.01em` |
| Sur-titres / labels | 600 · 10–11px · MAJUSCULES | `letter-spacing:.12–.16em` |
| Boutons période | 600 · 12px | |
| Paragraphe intro | 400 · 15px · 1.6 | `text-wrap:pretty` |
| Légendes | 400–500 · 10–13px | opacités ivoire |

---

## 4. Layout & structure (de haut en bas)

Conteneur : `max-width:1160px; margin:0 auto; padding:0 24px 80px`.

1. **Barre de nav** — flex, `space-between`, `padding:26px 0 14px`, bord bas ivoire `0.12`.
   - Gauche : pastille logo 26×26 (fond ivoire, coin 7px, « V » raisin 800/15px) + « VÉLO
     PARTAGÉ · FRANCE » (700/14px, `letter-spacing:.04em`).
   - Droite : **badge live** — pill (`border-radius:999px`), fond/bord dérivés de l'accent,
     point accent 7px qui pulse + « EN DIRECT · HH:MM ».
2. **Héro** — grid `1.35fr 1fr`, `gap:48px`, `align-items:end`, `padding:56px 0 48px`.
   - Colonne gauche : sur-titre « NOMBRE DE VÉLOS EN LIBRE-SERVICE EN FRANCE » → chiffre héro →
     ligne « point pulsant + *en libre-service dans X territoires* ».
   - Colonne droite : paragraphe d'intro (ivoire `0.66`), aligné en bas.
3. **Barre période** — flex `space-between`, `margin-bottom:22px` : libellé « Usage du réseau » +
   groupe de 4 boutons période.
4. **Grille de stats** — `grid-template-columns:repeat(3,1fr)`, `gap:16px` : Trajets · Kilomètres
   parcourus · Minutes pédalées. Chaque carte : fond ivoire `0.05`, bord `0.12`, `border-radius:16px`,
   `padding:24px 22px` → label + grand chiffre + libellé de période.
5. **Graphe « trajets par mois »** — carte même style, `border-radius:16px`, `padding:26px`.
   Barres verticales flex, `gap:10px`, hauteur zone 170px, barres ivoire `0.85`, coin haut 4px,
   label mois (J F M…) sous chaque barre.
6. **Graphe « véhicules disponibles par mois »** — même carte. En-tête : titre + pastille accent +
   « +N % depuis 2024 ». ~30 barres, `gap:4px`, hauteur 150px ; **barres de l'année courante en
   accent, années passées en ivoire `0.42`**. Sous l'axe : `2024 · 2025 · 2026` (space-between).
7. **Carte** — en-tête (titre « Où roule-t-on ? » + sous-titre + légende « réseau actif ») puis
   conteneur `height:520px`, `border-radius:18px`, bord ivoire `0.14`.
8. **Footer** — bord haut ivoire `0.12`, `padding-top:24px`, flex `space-between` : bloc
   « Sources » (≤620px) + « Mis à jour : HH:MM ».

Espacement vertical entre grosses sections : `margin-top:16px` entre cartes, `48px` avant
carte et footer.

---

## 5. Composants & états

### Boutons de période
4 boutons : **Hier · 30 derniers jours · Cette année · L'an dernier** (clés `yesterday`,
`month`, `year`, `lastyear`). Pill `border-radius:999px`, `padding:8px 15px`, `transition:all .15s`.
- **Actif** : fond `#F6F9ED`, texte `#294754`, bord ivoire plein.
- **Inactif** : fond transparent, texte ivoire `0.7`, bord ivoire `0.22`.
Cliquer une période met à jour **les 3 compteurs** (Trajets/Km/Minutes) avec ré-animation.

### Compteurs animés
Au chargement et à chaque changement de période, les nombres s'animent de l'ancienne valeur vers la
nouvelle. Durée **1100 ms**, easing **ease-out cubic** (`1 - (1-t)³`), valeur arrondie à chaque
frame, formatage **`fr-FR`** (espaces milliers). Prop `animateCounters` (bool) pour désactiver
(accessibilité / `prefers-reduced-motion` → respecter et couper l'animation).

### Point « live »
Rond de couleur accent, animation `pulse` 1.6s ease-in-out infinie
(`opacity 1→.3`, `scale 1→.6`). Présent dans le badge nav et sous le chiffre héro.

### Cartes de stat / graphe
Fond ivoire `0.05`, bord ivoire `0.12`, coins 16px. Ne pas ajouter d'ombre (page sombre, on
joue sur les surfaces translucides).

---

## 6. Carte (MapLibre GL JS)

- **Lib** : `maplibre-gl` **4.7.1** (JS + CSS). Pas de token, pas de compte.
- **Style de base** : `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`.
- **Vue initiale** : `center:[2.6, 46.4]`, `zoom:4.7` (France entière).
- **Contrôles** : `NavigationControl` sans boussole, en haut à droite ; attribution activée.
- **Recoloration à `load`** (parcourir `getStyle().layers` et appliquer selon `type`) :
  - `background` → `#223c47`
  - `fill` eau (`/water|ocean|sea|lake|river/`) → `#1a2f39` ; autres `fill` → `#2c4d5c`
  - `fill-extrusion` → `#33586a`
  - `line` eau → `#1a2f39` ; autres `line` → `rgba(246,249,237,0.10)`
  - `symbol` → texte `rgba(246,249,237,0.5)`, halo `rgba(34,60,71,0.85)` largeur 1.2
- **Marqueurs** : **un point par réseau, taille UNIFORME** (pas proportionnel à la flotte).
  Rond **13×13px**, fond accent, bord `2px #F6F9ED`, halo `box-shadow:0 0 0 4px <accent>26` +
  `0 1px 4px rgba(0,0,0,.35)`, `cursor:pointer`.
- **Popup** (au clic/survol, `closeButton:false`) : nom du réseau (600/12px raisin) + « N véhicules
  dispo » (500/11px raisin). CSS popup : `border-radius:10px`, `padding:9px 13px`, ombre douce.
- Source des marqueurs : `networks[]` de `/api/stats` (`{name, city, lat, lon,
  vehicles_available}`). Prévoir un **fallback** (liste de villes de référence) si vide, et un
  état « données indisponibles » discret.

---

## 7. Données (rappel — voir SPEC-backend-agregation.md)

La page lit **`/api/stats`** via une config `statsUrl`. Contrat consommé :
- `vehicles_available` (entier) → chiffre héro
- `networks_count` (entier) → « X territoires »
- `networks[]` → marqueurs carte
- `rides` / `km` / `minutes` : objets `{yesterday, month, year, lastyear}` → grille de stats
- `available_monthly[]` : `{month:"YYYY-MM", avg_available}` → graphe de croissance
- `updated_at` (ISO) → badge « EN DIRECT · HH:MM » et footer (format heure `fr-FR`)

Toutes les valeurs sont des entiers ; le front formate en `fr-FR`. Fallback sans `statsUrl` :
agrégation GBFS navigateur + placeholders (utile en dev seulement).

---

## 8. Responsive

- **Desktop** (≥ 960px) : layout décrit ci-dessus.
- **Tablette** (600–960px) : héro en 1 colonne (chiffre au-dessus du paragraphe) ; grille de stats
  reste 3 colonnes ou passe à 1 si trop serré ; carte `height` ~420px.
- **Mobile** (< 600px) : tout en 1 colonne ; chiffre héro borné par `clamp` (min 64px) ; boutons
  période en `flex-wrap` (déjà prévu) ; graphes conservent leurs barres (réduire `gap`) ; carte
  `height` ~360px ; `padding` latéral 16px.
- Zone tactile des boutons ≥ 44px de haut sur mobile.

---

## 9. Accessibilité

- Contraste : ivoire sur raisin ≈ 11:1 (OK). Ne pas descendre le texte courant sous ivoire `0.55`.
- `prefers-reduced-motion` : couper l'animation des compteurs et le `pulse`.
- Boutons période = vrais `<button>` avec `aria-pressed` sur l'actif.
- Carte : fournir une alternative textuelle (la grille de stats + le total héro portent déjà
  l'information chiffrée).
- Langue : `<html lang="fr">`.

---

## 10. Détails à ne pas perdre

- **Tabular-nums partout** sur les chiffres, sinon les compteurs « sautent » pendant l'animation.
- Le **badge live** et le **point héro** partagent la même couleur d'accent et la même animation.
- Année courante (2026) en **accent** dans le graphe de croissance ; le reste en ivoire translucide.
- Formatage `fr-FR` (espace fine comme séparateur de milliers) systématique.
- Largeur de contenu **1160px**, jamais pleine largeur pour le texte.
- Fond **`#294754` dès le `body`** (pas de flash blanc au chargement).
