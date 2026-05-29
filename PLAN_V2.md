# Plan V2 — Commercialisation SaaS

> **Objectif** : transformer le planning mono-client d'Atelier M en SaaS multi-tenant
> commercialisable, **sans jamais toucher à la prod actuelle**.
>
> **Marché cible** : PME du BTP / artisans français (5–50 salariés) qui ont besoin
> d'un planning d'équipe visuel — créneau peu couvert par les concurrents
> (Batappli, Tolteck, Obat sont surtout devis/facturation).

---

## 0. Principe d'isolation (décidé)

```
main  ───────────────►  ATELIER M (prod)
                        Supabase projet A — INTOUCHABLE
                        Déploiement Vercel actuel

v2-saas ─────────────►  SaaS multi-tenant
                        Supabase projet B (neuf, gratuit pour démarrer)
                        Déploiement Vercel séparé (nouveau domaine)
```

**Règles dures :**
- Aucun commit v2 ne part sur `main` tant que le produit n'est pas prêt.
- La v2 utilise des **variables d'environnement distinctes** (`NEXT_PUBLIC_SUPABASE_URL`
  pointe vers le projet B). Atelier M ne peut donc pas être lu ni écrit par erreur.
- Atelier M continue de tourner exactement comme aujourd'hui.
- Plus tard : Atelier M devient le **client #1** (offert à vie → testimonial).

---

## 1. État des lieux technique (ce qu'on a déjà)

| Composant | Aujourd'hui | Verdict pour le SaaS |
|---|---|---|
| Stockage | `planner_state(key, data jsonb, updated_at)` keyé | ✅ **Déjà multi-tenant-able** : `key = org-{id}` |
| API | `/api/state/[key]` paramétrée | ✅ Accepte déjà une clé arbitraire |
| Backups | `planner_state_backup`, 20 snapshots | ✅ Réutilisable par org |
| Sync | clientId par onglet + polling 5s + Realtime | ✅ Fonctionne |
| Auth | ❌ URL ouverte | ⚠️ À construire |
| Cloisonnement | ❌ Service role, aucune RLS réelle | ⚠️ À construire |
| UI | `app/page.tsx` monolithique (~8200 lignes) | ✅ Devient le "produit", enveloppé d'un shell |

**Le point clé** : la donnée étant déjà un blob keyé, la bascule mono→multi-tenant
revient surtout à dériver `key = org-{orgId}` depuis la session authentifiée,
au lieu de la constante `planner-main`.

---

## 2. Schéma de base de données V2 (Supabase projet B)

```sql
-- Organisations (= une société cliente = un tenant)
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'trial',      -- trial | starter | pro
  trial_ends  timestamptz default (now() + interval '14 days'),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at  timestamptz default now()
);

-- Lien utilisateur ↔ organisation (+ rôle)
create table memberships (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member',        -- owner | admin | member
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- Invitations en attente
create table invitations (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations(id) on delete cascade,
  email     text not null,
  role      text not null default 'member',
  token     text unique not null,
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- État du planning : MÊME structure qu'aujourd'hui, mais une ligne par org
-- key = 'org-{orgId}' (au lieu de 'planner-main')
create table planner_state (
  key        text primary key,
  org_id     uuid references organizations(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz default now()
);

create table planner_state_backup (
  id        uuid primary key default gen_random_uuid(),
  key       text not null,
  org_id    uuid,
  data      jsonb not null,
  created_at timestamptz default now()
);
```

### RLS (cloisonnement réel)

```sql
alter table planner_state enable row level security;

-- Un user ne voit/écrit QUE l'état des orgs dont il est membre
create policy "members read own org state"
  on planner_state for select
  using (org_id in (select org_id from memberships where user_id = auth.uid()));

create policy "members write own org state"
  on planner_state for all
  using  (org_id in (select org_id from memberships where user_id = auth.uid()))
  with check (org_id in (select org_id from memberships where user_id = auth.uid()));
```

> **Changement d'architecture important** : aujourd'hui l'API utilise le
> *service role* (bypass RLS). En V2, les requêtes passent par le **token
> de l'utilisateur connecté**, donc la RLS protège réellement les données.
> Le service role n'est gardé que pour les opérations admin (webhooks Stripe, etc.).

---

## 3. Plan par phases

### Phase 0 — Fondations multi-tenant (1–2 semaines)
**But : l'app existante fonctionne, mais cloisonnée par société.**

- [ ] Créer le projet Supabase B + appliquer le schéma ci-dessus
- [ ] Supabase Auth : email/mot de passe + Google OAuth
- [ ] Middleware Next.js : rediriger les non-connectés vers `/login`
- [ ] Dériver `orgId` depuis la session → clé `org-{orgId}`
- [ ] Remplacer le service-role par le client authentifié (RLS active)
- [ ] Page `/login`, `/signup`

**Livrable** : on se connecte, on voit le planning de SA société, isolé des autres.

### Phase 1 — Onboarding & équipe (1 semaine)
- [ ] Flux inscription → "Créer ma société" (nom, slug)
- [ ] Inviter des collègues par email (table `invitations`)
- [ ] Rôles : owner/admin (édition) vs member (lecture seule)
- [ ] Page `/settings/team` (gérer les membres)

### Phase 2 — Monétisation (1 semaine)
- [ ] Intégration Stripe (Checkout + Customer Portal)
- [ ] Plans : Trial 14 j → Starter (49 €/mois) → Pro (99 €/mois)
- [ ] Webhook Stripe → met à jour `organizations.plan`
- [ ] Paywall : bloquer l'accès si `trial_ends` dépassé et pas d'abonnement
- [ ] Bandeau "Il reste X jours d'essai"

### Phase 3 — Go-to-market (1 semaine)
- [ ] Landing page (proposition de valeur, captures, pricing)
- [ ] Page tarifs
- [ ] RGPD : CGU, politique de confidentialité, registre des traitements
- [ ] Analytics (Plausible/PostHog)
- [ ] Domaine + emails transactionnels (Resend)

### Phase 4 — Robustesse (plus tard, post-lancement)
- [ ] Normaliser les données : tables `sites`, `assignments`, etc. au lieu du
      blob JSON unique → vraie collaboration temps réel sans la limite du
      debounce 600 ms (cf. limite multi-onglets identifiée).
- [ ] Export/sauvegarde par org, restauration des backups depuis l'UI
- [ ] Back-office admin (gérer tenants, support, métriques)

---

## 4. Décisions d'architecture à trancher

1. **Blob JSON vs données normalisées ?**
   - Garder le blob pour lancer vite (Phases 0–3). ✅ recommandé.
   - Normaliser en Phase 4 quand des clients auront plusieurs éditeurs simultanés.

2. **Un seul codebase ou deux ?**
   - Un seul, branche `v2-saas`. Le `app/page.tsx` devient le cœur produit,
     on l'enveloppe d'un shell (auth, layout, billing). ✅ recommandé.

3. **Tarification par société ou par siège ?**
   - Par société au début (plus simple à vendre à un artisan). Par siège plus tard.

---

## 5. Estimation

| Phase | Durée | Bloquant pour vendre ? |
|---|---|---|
| 0 — Fondations | 1–2 sem. | ✅ Oui |
| 1 — Onboarding | 1 sem. | ✅ Oui |
| 2 — Stripe | 1 sem. | ✅ Oui (pour encaisser) |
| 3 — GTM | 1 sem. | ✅ Oui (pour acquérir) |
| 4 — Robustesse | continu | ❌ Non (amélioration) |

**MVP commercialisable : ~4–5 semaines de dev.**

---

## 6. Risques & garde-fous

- **Ne jamais merger v2-saas dans main** avant validation produit complète.
- **Variables d'env séparées** : un `.env` v2 qui pointe vers Supabase B.
  Vérifier au démarrage que l'URL ≠ celle d'Atelier M.
- **RGPD** : obligatoire en France dès le premier client payant (registre,
  consentement, droit à l'effacement). À ne pas négliger.
- **Migration d'Atelier M** : optionnelle. On peut les laisser sur leur instance
  actuelle indéfiniment, ou les importer comme tenant #1 plus tard.

---

## 7. Prochaine étape

Une fois ce plan validé, on attaque la **Phase 0** :
1. Création du projet Supabase B + schéma SQL
2. Auth + middleware
3. Bascule `planner-main` → `org-{orgId}`

*Aucune ligne de code produit ne sera écrite avant ton feu vert sur ce plan.*
