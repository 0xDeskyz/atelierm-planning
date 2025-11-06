# AtelierM Planning (Next.js 14)

## Dev
```bash
npm install
npm run dev
# http://localhost:3000
```

## Build
```bash
npm run build
npm run start
```

## Deploy (Vercel)
1. Pousse ce dossier sur GitHub
2. Vercel > New Project > Import repo
3. Framework: Next.js | Build: `next build` | Output: `.next` | Node: 18.x
4. (Optionnel) Variables d'env si tu branches Supabase plus tard

## Import/Export JSON
Boutons dans le header.

## Notes
- ESLint/TypeScript ne bloquent pas le build (configurée pour shipper rapidement).
- Tailwind déjà câblé.
