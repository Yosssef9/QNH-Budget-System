import {
  createNotificationRepo,
  claimNotificationRepo,
  markNotificationSentRepo,
  markNotificationFailedRepo,
} from "../repositories/notification.repository.js";

import { resolveRecipients } from "../notifications/recipientResolver.js";
import { sendEmail } from "../utils/email.js";

import { resolveTemplate } from "../notifications/templateResolver.js";
import { defaultLayout } from "../notifications/layouts/default.layout.js";

export async function queueNotification(data) {
  const recipients = await resolveRecipients(
    data.notificationType,
    data.payload,
  );

  if (!recipients?.length) {
    return;
  }

  const validRecipients = [];
  const skippedRecipients = [];

  for (const recipient of recipients) {
    const email = recipient?.email?.trim?.();

    if (email) {
      validRecipients.push({
        ...recipient,
        email,
      });
    } else {
      skippedRecipients.push(recipient);
    }
  }

  if (skippedRecipients.length) {
    console.warn(
      `[Notification Queue] Skipped ${skippedRecipients.length} recipient(s) without email`,
      skippedRecipients.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
      })),
    );
  }

  if (!validRecipients.length) {
    return;
  }

  await Promise.all(
    validRecipients.map((recipient) =>
      createNotificationRepo({
        ...data,
        recipientEmail: recipient.email,
      }),
    ),
  );
}

export async function processPendingNotifications() {
  while (true) {
    const notification = await claimNotificationRepo();

    if (!notification) {
      break;
    }

    try {
      if (
        !notification.recipient_email ||
        !String(notification.recipient_email).trim()
      ) {
        await markNotificationFailedRepo(
          notification.id,
          notification.attempts + 1,
          "Recipient email is missing",
        );

        continue;
      }

      const payload = JSON.parse(notification.payload || "{}");

      const template = resolveTemplate(notification.notification_type, payload);

      const html = defaultLayout({
        status: template.status,
        title: template.title,
        message: template.message,
        details: template.details,
      });

      await sendEmail({
        to: notification.recipient_email,
        subject: template.subject,
        html,
      });

      await markNotificationSentRepo(notification.id);
    } catch (error) {
      await markNotificationFailedRepo(
        notification.id,
        notification.attempts + 1,
        error?.message || "Unknown error",
      );
    }
  }
}
