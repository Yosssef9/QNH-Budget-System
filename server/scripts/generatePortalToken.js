import "dotenv/config";
import jwt from "jsonwebtoken";

const users = {
  yossef: {
    userId: 1080,
    userCode: "2410",
    userName: "Yossef Ibrahim",
    isAdmin: true,
  },

  fatimah: {
    userId: 763,
    userCode: "4124",
    userName: "Fatimah Zaki Alnasserullah",
    isAdmin: true,
  },

  yasser: {
    userId: 573,
    userCode: "2101",
    userName: "Yasser Hamza",
    isAdmin: true,
  },

  billingHod: {
    userId: 823,
    userCode: "4126",
    userName: "Gaied Mutlak Alenez",
    isAdmin: true,
  },

  transportationHod: {
    userId: 772,
    userCode: "4140",
    userName: "Abdulaziz Matar Mohammed Alharbi",
    isAdmin: true,
  },

  patientSafetyHod: {
    userId: 957,
    userCode: "6170",
    userName: "Lama Alharbi",
    isAdmin: true,
  },

  laundryHod: {
    userId: 467,
    userCode: "2024",
    userName: "Mansour Ahmad Saqer Alotibi",
    isAdmin: true,
  },
};

// Change only this value when you need another user.
const selectedUser = "yasser";

const payload = users[selectedUser];

if (!payload) {
  throw new Error(`Unknown selected user: ${selectedUser}`);
}

if (!process.env.PORTAL_JWT_SECRET) {
  throw new Error("PORTAL_JWT_SECRET is missing from the server .env file.");
}

const token = jwt.sign(payload, process.env.PORTAL_JWT_SECRET, {
  expiresIn: "7d",
});

console.log("\nPayload:");
console.log(JSON.stringify(payload, null, 2));

console.log("\nBearer Token:\n");
console.log(token);

console.log("\nUse in Postman Header:");
console.log(`Authorization: Bearer ${token}\n`);
