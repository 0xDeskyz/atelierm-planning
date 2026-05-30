import Link from "next/link";
import {
  CalendarDays,
  Users,
  RefreshCw,
  ShieldCheck,
  Check,
  BarChart3,
  Clock,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Planning visuel",
    desc: "Glissez-déposez vos chantiers sur un calendrier clair. Vue semaine, mois, trimestre.",
  },
  {
    icon: Users,
    title: "Travail en équipe",
    desc: "Invitez vos collaborateurs, gérez les rôles (admin, lecture seule) en quelques clics.",
  },
  {
    icon: RefreshCw,
    title: "Synchro temps réel",
    desc: "Chaque modification est visible instantanément par toute l'équipe, sans rafraîchir.",
  },
  {
    icon: BarChart3,
    title: "Suivi de rentabilité",
    desc: "Visualisez la charge, les heures et la rentabilité de chaque chantier en un coup d'œil.",
  },
  {
    icon: ShieldCheck,
    title: "Sauvegardes automatiques",
    desc: "Vos données sont sauvegardées en continu. Restauration possible à tout moment.",
  },
  {
    icon: Clock,
    title: "Gain de temps",
    desc: "Fini les tableurs : tout votre planning d'entreprise centralisé au même endroit.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "49",
    highlight: false,
    features: [
      "Planning d'équipe illimité",
      "Multi-utilisateurs & rôles",
      "Synchronisation temps réel",
      "Sauvegardes automatiques",
    ],
  },
  {
    name: "Pro",
    price: "99",
    highlight: true,
    features: [
      "Tout le plan Starter",
      "Suivi de rentabilité avancé",
      "Statistiques détaillées",
      "Support prioritaire",
    ],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            Atelier M Planning
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="font-medium text-neutral-600 hover:text-neutral-900">
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-700"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          Conçu pour les entreprises du bâtiment
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Le planning de chantiers
          <span className="text-emerald-500"> simple et collaboratif</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-500">
          Organisez vos chantiers, vos équipes et votre charge de travail sur un planning
          visuel synchronisé en temps réel. Sans tableur, sans prise de tête.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white hover:bg-neutral-700"
          >
            Démarrer l'essai gratuit
          </Link>
          <Link
            href="/login"
            className="rounded-xl border px-6 py-3 text-base font-medium hover:bg-neutral-50"
          >
            Se connecter
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-400">14 jours d'essai · Sans carte bancaire</p>
      </section>

      {/* Features */}
      <section className="border-t bg-neutral-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Tout ce qu'il faut pour piloter vos chantiers</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-neutral-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold">Une tarification simple</h2>
          <p className="mt-3 text-center text-neutral-500">
            Choisissez l'offre adaptée à votre entreprise. Changez ou annulez à tout moment.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-8 shadow-sm ${
                  p.highlight ? "border-emerald-500 ring-1 ring-emerald-500" : "bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                    Le plus populaire
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <div className="mt-2 text-4xl font-extrabold">
                  {p.price}€<span className="text-base font-medium text-neutral-400"> /mois</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold ${
                    p.highlight
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-neutral-900 text-white hover:bg-neutral-700"
                  }`}
                >
                  Commencer l'essai
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bg-neutral-900 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold">Prêt à organiser vos chantiers ?</h2>
          <p className="mt-3 text-neutral-300">
            Lancez votre essai gratuit de 14 jours dès maintenant. Aucune carte requise.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-600"
          >
            Démarrer gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-neutral-400">
          <span>© {new Date().getFullYear()} Atelier M Planning</span>
          <div className="flex gap-4">
            <Link href="/legal/cgu" className="hover:text-neutral-700">
              CGU
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-neutral-700">
              Confidentialité
            </Link>
            <Link href="/login" className="hover:text-neutral-700">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
