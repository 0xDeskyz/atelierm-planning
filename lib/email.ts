import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Expéditeur par défaut. À surcharger via RESEND_FROM_EMAIL.
// Nécessite que le domaine atelierm.fr soit vérifié dans Resend.
const FROM = process.env.RESEND_FROM_EMAIL || "Atelier M Planning <info@atelierm.fr>";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  member: "Lecture seule",
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
};

export async function sendInvitationEmail({
  to,
  orgName,
  role,
  token,
}: {
  to: string;
  orgName: string;
  role: string;
  token: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const inviteUrl = `${appUrl()}/invite/${token}`;
  const roleLabel = ROLE_LABEL[role] || role;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu es invité à rejoindre ${orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;color:#171717">
        <h1 style="font-size:20px;font-weight:700;margin:0">Rejoindre ${orgName}</h1>
        <p style="margin-top:12px;color:#525252;font-size:14px">
          Tu as été invité comme <strong>${roleLabel}</strong> sur <strong>Atelier M Planning</strong>.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;margin-top:24px;padding:10px 22px;background:#171717;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Accepter l'invitation
        </a>
        <p style="margin-top:32px;font-size:12px;color:#a3a3a3">
          Ce lien expire dans 7 jours. Si tu n'attendais pas cet email, ignore-le.
        </p>
      </div>
    `,
  });
}

export async function sendSubscriptionConfirmationEmail({
  to,
  orgName,
  plan,
}: {
  to: string;
  orgName: string;
  plan: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const planLabel = PLAN_LABEL[plan] || plan;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Abonnement ${planLabel} activé — Atelier M Planning`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px;color:#171717">
        <h1 style="font-size:20px;font-weight:700;margin:0">Abonnement activé ✓</h1>
        <p style="margin-top:12px;color:#525252;font-size:14px">
          Ton abonnement <strong>${planLabel}</strong> pour <strong>${orgName}</strong> est maintenant actif.
        </p>
        <a href="${appUrl()}/facturation"
           style="display:inline-block;margin-top:24px;padding:10px 22px;background:#171717;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Voir mon abonnement
        </a>
        <p style="margin-top:32px;font-size:12px;color:#a3a3a3">
          Merci pour ta confiance. Tu peux gérer ton abonnement à tout moment depuis la page Facturation.
        </p>
      </div>
    `,
  });
}
