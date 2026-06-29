import { redirect } from "next/navigation";

// Création de compte publique désactivée : accès par connexion uniquement.
export default function SignupPage() {
  redirect("/login");
}
