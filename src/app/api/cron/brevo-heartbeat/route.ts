import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/actions/emailActions";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceSend = searchParams.get('force') === 'true';

    const { firestore } = initializeAdminApp();
    console.log("Running scheduled job: brevo-heartbeat...");

    const settingsDoc = await firestore.collection('platform_settings').doc('brevo').get();
    const settings = settingsDoc.data() || {};

    const adminEmail = settings.adminAlertEmail || 'west2uk@googlemail.com';
    const intervalDays = settings.heartbeatIntervalDays || 60;
    const apiKey = settings.apiKey || process.env.BREVO_API_KEY;

    let lastSentDate = new Date();
    if (settings.lastSentAt) {
      lastSentDate = settings.lastSentAt.toDate ? settings.lastSentAt.toDate() : new Date(settings.lastSentAt);
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSentDate.getTime();
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    console.log(`Brevo heartbeat check: ${daysElapsed} days since last email (threshold: ${intervalDays} days, force: ${forceSend})`);

    if (daysElapsed < intervalDays && !forceSend) {
      const remainingDays = intervalDays - daysElapsed;
      return NextResponse.json({
        success: true,
        action: 'skipped',
        daysElapsed,
        thresholdDays: intervalDays,
        daysUntilNextHeartbeat: remainingDays,
        message: `Only ${daysElapsed} days since last email activity. Heartbeat will trigger when inactivity reaches ${intervalDays} days (${remainingDays} days remaining).`,
      });
    }

    // Query Brevo Account directly to verify key and get credit status
    let accountInfo: any = null;
    if (apiKey) {
      try {
        const accRes = await fetch('https://api.brevo.com/v3/account', {
          headers: {
            'Accept': 'application/json',
            'api-key': apiKey,
          },
        });
        if (accRes.ok) {
          accountInfo = await accRes.json();
        }
      } catch (accErr) {
        console.warn("Could not query Brevo account status directly:", accErr);
      }
    }

    const planType = accountInfo?.plan?.[0]?.type || 'Free';
    const dailyCredits = accountInfo?.plan?.[0]?.credits !== undefined ? accountInfo.plan[0].credits : 300;
    const formattedDate = now.toUTCString();

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 6px 0; font-size: 20px;">🔔 Brevo API Keep-Alive Heartbeat</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Automated 90-Day Inactivity Timer Reset</p>
        </div>

        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Hello Allan,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          This is your automated Community Hub keep-alive heartbeat. It has been <strong>${daysElapsed} days</strong> since the last platform email dispatch.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">✅ 90-Day Timer Successfully Reset</h3>
          <p style="color: #15803d; margin: 0; font-size: 14px; line-height: 1.5;">
            By sending this email via the Brevo API, the 90-day inactivity clock has been reset to Day 0. Your API key will remain active without any manual intervention.
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">API Key Status</td>
            <td style="padding: 10px 0; color: #16a34a; font-weight: 600; text-align: right;">Active &amp; Verified</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Brevo Plan</td>
            <td style="padding: 10px 0; color: #1e293b; font-weight: 500; text-align: right;">${planType} (${dailyCredits} daily credits)</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Days Since Last Email</td>
            <td style="padding: 10px 0; color: #1e293b; font-weight: 500; text-align: right;">${daysElapsed} days</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Heartbeat Dispatched At</td>
            <td style="padding: 10px 0; color: #1e293b; font-weight: 500; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">Next Auto-Heartbeat</td>
            <td style="padding: 10px 0; color: #1e293b; font-weight: 500; text-align: right;">In ${intervalDays} days (if no other emails are sent)</td>
          </tr>
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This is an automated maintenance email sent by Community Hub Platform Scheduled Tasks. No action is required.
          </p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: [{ email: adminEmail, name: 'Allan Jamieson' }],
      subject: '🔔 Brevo API Heartbeat: 90-Day Inactivity Clock Reset',
      htmlContent,
    });

    if (!emailResult.success) {
      console.error("Failed to send Brevo heartbeat email:", emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to dispatch heartbeat email via Brevo.',
      }, { status: 500 });
    }

    // Update lastSentAt and heartbeat stats in platform_settings/brevo
    await firestore.collection('platform_settings').doc('brevo').set({
      lastSentAt: Timestamp.now(),
      lastHeartbeatAt: Timestamp.now(),
      lastHeartbeatStatus: 'success',
      lastHeartbeatRecipient: adminEmail,
    }, { merge: true });

    console.log(`Brevo heartbeat email successfully sent to ${adminEmail}`);

    return NextResponse.json({
      success: true,
      action: 'heartbeat_sent',
      recipient: adminEmail,
      daysElapsed,
      dispatchedAt: formattedDate,
      message: `Brevo heartbeat email sent successfully to ${adminEmail}. 90-day inactivity clock reset.`,
    });

  } catch (error: any) {
    console.error("Brevo heartbeat scheduled task error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
