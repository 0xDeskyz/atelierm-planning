// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "AtelierM Planning",
  description: "Planner BTP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50">{children}</body>
    </html>
  );
}

