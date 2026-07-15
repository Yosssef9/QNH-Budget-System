import dotenv from "dotenv";
dotenv.config();

import { processPendingNotifications } from "../services/notification.service.js";
import {
  recordWorkerHeartbeatRepo,
  SYSTEM_HEALTH_WORKERS,
} from "../modules/system-health/systemHealthHeartbeat.repository.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWorker() {
  console.log("Notification Worker Started");

  while (true) {
    try {
      await recordWorkerHeartbeatRepo({
        workerName: SYSTEM_HEALTH_WORKERS.NOTIFICATION_EMAIL,
        status: "RUNNING",
      });

      await processPendingNotifications();

      await recordWorkerHeartbeatRepo({
        workerName: SYSTEM_HEALTH_WORKERS.NOTIFICATION_EMAIL,
        status: "SUCCESS",
      });
    } catch (error) {
      console.error(error);
      await recordWorkerHeartbeatRepo({
        workerName: SYSTEM_HEALTH_WORKERS.NOTIFICATION_EMAIL,
        status: "FAILED",
        errorMessage: error?.message || "Unknown notification worker error",
      });
    }

    await sleep(10000);
  }
}

startWorker();
