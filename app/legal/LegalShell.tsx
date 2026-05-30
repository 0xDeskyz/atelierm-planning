import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">{title}</h1>
        <p className="mt-1 text-xs text-neutral-400">Dernière mise à jour : {updatedAt}</p>
        <div className="prose prose-sm prose-neutral mt-6 max-w-none text-neutral-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </div>
    </div>
  );
}
