import dotenv from "dotenv";
dotenv.config();

import { queueNotification } from "./services/notification.service.js";

import { NOTIFICATION_TYPES } from "./constants/notificationTypes.js";
const TEST_EMAIL = "yossefyasser561@gmail.com";


async function run() {
  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_APPROVED,

    entityType: "TEST",

    entityId: 999,

    recipientEmail: TEST_EMAIL,

    payload: {
      transferId: 999,
      budgetName: "Test Budget",
      amount: 1000,
      approvedBy: "System Test",
    },
  });

  console.log("Notification Queued");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
