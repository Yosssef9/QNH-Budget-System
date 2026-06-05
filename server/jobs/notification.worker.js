import dotenv from "dotenv";
dotenv.config();

import { processPendingNotifications } from "../services/notification.service.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWorker() {
  console.log("Notification Worker Started");

  while (true) {
    try {
      await processPendingNotifications();
    } catch (error) {
      console.error(error);
    }

    await sleep(10000);
  }
}

startWorker();
