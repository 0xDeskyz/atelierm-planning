import LegalShell from "../LegalShell";

export const metadata = { title: "Politique de confidentialité — Atelier M Planning" };

// ⚠️ MODÈLE À COMPLÉTER : remplacez les champs [ENTRE CROCHETS] par vos
// informations, et faites valider par un juriste avant publication.
export default function ConfidentialitePage() {
  return (
    <LegalShell title="Politique de confidentialité" updatedAt="2026">
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est [RAISON SOCIALE], [ADRESSE].
        Pour toute question relative à vos données : [EMAIL DE CONTACT].
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>Données de compte : adresse email, nom de la société, mot de passe (chiffré).</li>
        <li>Données d'usage : plannings, chantiers, équipes que vous saisissez.</li>
        <li>Données de facturation : gérées par Stripe (nous ne stockons aucune carte).</li>
      </ul>

      <h2>3. Finalités</h2>
      <p>
        Vos données sont utilisées pour fournir le Service, gérer votre abonnement,
        assurer le support et améliorer l'application. Elles ne sont jamais vendues.
      </p>

      <h2>4. Sous-traitants</h2>
      <ul>
        <li>Supabase — hébergement de la base de données.</li>
        <li>Stripe — traitement des paiements.</li>
        <li>Resend — envoi des emails transactionnels.</li>
      </ul>

      <h2>5. Conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. Après suppression du
        compte, elles sont effacées sous un délai raisonnable, sauf obligation légale de
        conservation (facturation).
      </p>

      <h2>6. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de
        suppression et de portabilité de vos données. Pour les exercer, contactez
        [EMAIL DE CONTACT]. Vous pouvez également introduire une réclamation auprès de la
        CNIL.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les données sont protégées par chiffrement en transit et au repos, et l'accès est
        restreint par des règles de sécurité (RLS) au niveau de la base de données.
      </p>
    </LegalShell>
  );
}
