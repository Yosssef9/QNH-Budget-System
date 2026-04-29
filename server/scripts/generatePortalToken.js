import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const payload = {
  userId: 1,
  userCode: "2410",
  userName: "Yossef Ibrahim",
  isAdmin: true,
};

const token = jwt.sign(payload, process.env.PORTAL_JWT_SECRET, {
  expiresIn: "1d",
});

console.log("\nBearer Token:\n");
console.log(token);
console.log("\nUse in Postman Header:");
console.log(`Authorization: Bearer ${token}\n`);