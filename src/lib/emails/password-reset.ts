/** Transactional email templates (table + inline CSS for client compatibility). */

const BRAND = {
  navy: "#1a2f4a",
  blue: "#2563eb",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f1f5f9",
  card: "#ffffff",
  danger: "#b45309",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail(input: {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
  supportEmail?: string;
}): { subject: string; text: string; html: string } {
  const name = escapeHtml(input.recipientName.trim() || "there");
  const url = escapeHtml(input.resetUrl);
  const mins = input.expiresInMinutes;
  const support = input.supportEmail?.trim();
  const subject = "Reset your TiangPass password";

  const text = [
    `Hi ${input.recipientName.trim() || "there"},`,
    "",
    "We received a request to reset the password for your TiangPass account.",
    "",
    `This link expires in ${mins} minutes (1 hour) and can be used only once:`,
    input.resetUrl,
    "",
    "If you did not request a password reset, you can safely ignore this email. Your password will stay the same.",
    "",
    "For your security:",
    "- Never share this link with anyone",
    "- TiangPass will never ask you for your password by email",
    support ? `- Questions? Contact ${support}` : "",
    "",
    "— TiangPass",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.navy};padding:20px 24px;">
              <p style="margin:0;font-size:18px;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">TiangPass</p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">Penang Bridge fishing association</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:${BRAND.navy};">Reset your password</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">Hi ${name},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
                We received a request to reset the password for your TiangPass account. Use the button below to choose a new password.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 24px 20px;">
              <a href="${url}" style="display:inline-block;background:${BRAND.blue};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;line-height:1;">
                Reset password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                <tr>
                  <td style="padding:12px 14px;font-size:13px;line-height:1.45;color:${BRAND.danger};">
                    <strong>Expires in ${mins} minutes.</strong> This link works only once. After that, request a new reset.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND.blue};">
                <a href="${url}" style="color:${BRAND.blue};text-decoration:underline;">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 28px;border-top:1px solid ${BRAND.border};">
              <p style="margin:20px 0 0;font-size:13px;line-height:1.55;color:#475569;">
                If you did not request this, ignore this email — your password will not change.
              </p>
              <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                Never share this link. TiangPass will never ask for your password by email.
                ${support ? `<br/>Need help? Contact <a href="mailto:${escapeHtml(support)}" style="color:${BRAND.blue};">${escapeHtml(support)}</a>.` : ""}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.4;color:${BRAND.muted};">
          © TiangPass · Official association fishing pass
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
