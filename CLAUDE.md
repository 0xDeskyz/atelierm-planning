# atelierm-planning

Next.js 14 planning app for a French construction company (Atelier M).

## Stack

- Next.js 14 App Router (TypeScript), monolithic `app/page.tsx`
- Supabase (postgres, jsonb state, RLS)
- @dnd-kit/core for drag-and-drop
- Tailwind CSS
- Vercel production = branche `v2-saas` (PAS `main`, qui est obsolète)

## Deploy workflow

**La prod tourne sur `v2-saas`.** Pousser sur `v2-saas` après chaque changement. **Ne JAMAIS pousser sur `main`** : c'est une ancienne version (avant le passage SaaS) et un push y redéploie l'ancienne appli en production (planning vide pour les utilisateurs).

## Key conventions

- All app logic lives in `app/_planner/PlannerApp.tsx` (monolithic by design); `app/page.tsx` is just the entry point
- Calendar lane order persisted in Supabase as `calendarLaneOrder: string[]`
- Span-based greedy packing for lane assignment (first→last planningWeek of each chantier)
- `LANE_H = 26px` per row
- Catégorie principale (type de client) : blue (Public), violet (Privé), emerald (Particulier). Anciennes valeurs migrées via `CATEGORIE_MIGRATION` (ao→public, pro→prive, particulier→particulier). Sous-catégorie = liste libre partagée (`DEFAULT_SOUS_CATEGORIES` : Appel d'offre, Marché négocié, Syndic…).
- Catégories ET origines sont des listes ÉDITABLES (ajout/renommage/suppression) persistées dans l'état (`categorieOptions`, `origineOptions`), gérées dans Réglages → Personnalisation via `<OptionsManager>`. Couleurs auto-assignées depuis `CATEGORIE_COLOR_PRESETS` / `ORIGINE_BADGE_PRESETS`. `normalizeSiteRecord` accepte toute valeur non vide (plus de validation stricte). Origines par défaut incluent Réseaux et Vitrine.
- Difficulty: 3 niveaux choisis MANUELLEMENT par chantier (`difficulteLevel` + `difficulteReason` texte). Couleurs vives : green-500 (vert), orange-500 (orange), red-500 (rouge). Ancien niveau `jaune` migré → `vert` dans `normalizeSiteRecord`. `resolveDifficulteLevel()` retombe sur l'ancien calcul par drapeaux (`difficulte` flags) pour les chantiers non encore édités (retourne vert/orange/rouge).
