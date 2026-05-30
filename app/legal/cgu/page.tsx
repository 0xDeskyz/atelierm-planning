import LegalShell from "../LegalShell";

export const metadata = { title: "Conditions Générales d'Utilisation — Atelier M Planning" };

// ⚠️ MODÈLE À COMPLÉTER : remplacez les champes [ENTRE CROCHETS] par vos
// informations légales, et faites valider par un juriste avant publication.
export default function CGUPage() {
  return (
    <LegalShell title="Conditions Générales d'Utilisation" updatedAt="2026">
      <h2>1. Éditeur du service</h2>
      <p>
        Le service Atelier M Planning (« le Service ») est édité par [RAISON SOCIALE],
        [FORME JURIDIQUE] au capital de [MONTANT] €, immatriculée au RCS de [VILLE] sous
        le numéro [SIRET], dont le siège social est situé [ADRESSE].
        Contact : [EMAIL DE CONTACT].
      </p>

      <h2>2. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation du Service, une
        application de planification de chantiers en ligne proposée sur abonnement.
      </p>

      <h2>3. Compte et abonnement</h2>
      <p>
        L'utilisation du Service nécessite la création d'un compte. Un essai gratuit de
        14 jours est proposé sans engagement. À l'issue de cet essai, l'accès continu
        requiert un abonnement payant (Starter ou Pro), facturé mensuellement.
      </p>

      <h2>4. Prix et paiement</h2>
      <p>
        Les tarifs en vigueur sont indiqués sur la page d'abonnement. Le paiement est
        traité par notre prestataire Stripe. L'abonnement est reconductible
        automatiquement chaque mois et résiliable à tout moment depuis l'espace de
        facturation.
      </p>

      <h2>5. Résiliation</h2>
      <p>
        Le client peut résilier son abonnement à tout moment. La résiliation prend effet
        à la fin de la période en cours ; aucun remboursement au prorata n'est effectué.
      </p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>
        L'éditeur s'efforce d'assurer la disponibilité du Service mais ne peut garantir un
        fonctionnement ininterrompu. Sa responsabilité ne saurait être engagée en cas de
        force majeure ou d'indisponibilité technique indépendante de sa volonté.
      </p>

      <h2>7. Données</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre
        Politique de confidentialité. Le client reste propriétaire des données qu'il
        saisit dans le Service.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit français. Tout litige relèvera
        de la compétence des tribunaux de [VILLE].
      </p>
    </LegalShell>
  );
}
