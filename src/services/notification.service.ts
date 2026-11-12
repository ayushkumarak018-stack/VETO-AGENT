import { prisma } from "@/lib/prisma";

export interface SendOOBNotificationParams {
  userId: string;
  authorizationRequestId: string;
  userEmail: string;
  actionSummary: string;
  actionDetails: {
    service: string;
    action: string;
    summary?: string;
    startTime?: string;
    endTime?: string;
    invitees?: string[];
    riskLevel: string;
    expiresAt: Date;
  };
  approvalUrl: string;
  rejectionUrl: string;
}

export class NotificationService {
  /**
   * Dispatches an out-of-band notification (Email via Resend if configured + Local Outbox record).
   */
  static async sendOutOfBandNotification(params: SendOOBNotificationParams) {
    const {
      userId,
      authorizationRequestId,
      userEmail,
      actionSummary,
      actionDetails,
      approvalUrl,
      rejectionUrl,
    } = params;

    const formattedTime = actionDetails.startTime
      ? new Date(actionDetails.startTime).toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        })
      : "Not specified";

    const inviteesStr =
      actionDetails.invitees && actionDetails.invitees.length > 0
        ? actionDetails.invitees.join(", ")
        : "None (Internal only)";

    const subject = `[ACTION REQUIRED] Veto Agent Approval Request: ${actionSummary}`;

    const bodyText = `
VETO AGENT — Authorization Required

Your AI assistant wants your permission to perform a high-impact operation.
Execution is currently PAUSED. No third-party changes have been made yet.

--- DETAILS ---
Requested Action: ${actionDetails.action}
Target Service: ${actionDetails.service}
Event Summary: ${actionDetails.summary || "N/A"}
Scheduled Time: ${formattedTime}
External Invitees: ${inviteesStr}
Risk Classification: ${actionDetails.riskLevel}
Expiration: ${actionDetails.expiresAt.toLocaleTimeString()} (15 minutes from issue)

--- YOUR DECISION ---
To APPROVE this action, visit:
${approvalUrl}

To REJECT (VETO) this action, visit:
${rejectionUrl}

Note: This link is single-use and will expire automatically. If you do nothing, the operation will be cancelled.
`;

    const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fee2e2; color: #991b1b; text-transform: uppercase; }
    .btn { display: inline-block; padding: 12px 24px; font-weight: 600; border-radius: 8px; text-decoration: none; text-align: center; font-size: 14px; margin-right: 12px; }
    .btn-approve { background-color: #2563eb; color: #ffffff !important; }
    .btn-reject { background-color: #f1f5f9; color: #475569 !important; border: 1px solid #cbd5e1; }
    .detail-row { border-bottom: 1px solid #f1f5f9; padding: 10px 0; font-size: 14px; }
    .detail-label { color: #64748b; width: 140px; display: inline-block; font-weight: 500; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #0f172a; font-size: 20px;">🛡️ VETO AGENT</h2>
      <span class="badge">High Risk Action</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; color: #334155;">
      Your AI assistant is attempting to perform a sensitive operation on your connected <strong>${actionDetails.service}</strong> account.
      <strong>Execution is currently paused. No changes have been applied.</strong>
    </p>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Action:</span> <strong>${actionDetails.action}</strong></div>
      <div class="detail-row"><span class="detail-label">Title / Summary:</span> ${actionDetails.summary || "N/A"}</div>
      <div class="detail-row"><span class="detail-label">Scheduled Time:</span> ${formattedTime}</div>
      <div class="detail-row"><span class="detail-label">Invitees:</span> ${inviteesStr}</div>
      <div class="detail-row" style="border: none;"><span class="detail-label">Expires At:</span> ${actionDetails.expiresAt.toLocaleTimeString()}</div>
    </div>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${approvalUrl}" class="btn btn-approve" target="_blank">✓ Approve & Execute</a>
      <a href="${rejectionUrl}" class="btn btn-reject" target="_blank">✗ Veto / Reject</a>
    </div>

    <div class="footer">
      VETO AGENT Asynchronous Authorization (CIBA) — Single-use cryptographic authorization link.<br>
      If you did not request this action, click Reject or ignore this message.
    </div>
  </div>
</body>
</html>
`;

    // 1. Always record in NotificationOutbox for zero-friction demo inspection & preview
    const outboxRecord = await prisma.notificationOutbox.create({
      data: {
        userId,
        authorizationRequestId,
        recipient: userEmail,
        subject,
        bodyText,
        bodyHtml,
        approvalLink: approvalUrl,
        rejectionLink: rejectionUrl,
        isSimulated: !process.env.RESEND_API_KEY,
      },
    });

    // 2. If Resend is configured, send actual external email
    if (process.env.RESEND_API_KEY) {
      try {
        const fromEmail =
          process.env.NOTIFICATION_EMAIL_FROM || "onboarding@resend.dev";
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: userEmail,
            subject,
            html: bodyHtml,
          }),
        });
      } catch (err) {
        console.warn("[NotificationService] Resend dispatch failed:", err);
      }
    }

    return outboxRecord;
  }
}
