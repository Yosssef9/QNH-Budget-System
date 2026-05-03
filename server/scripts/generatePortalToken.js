import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const payload = {
  userId: 1080,
  userCode: "2410",
  userName: "Yossef Ibrahim",
  isAdmin: true,
};

// const payload = {
//   userId: 823,
//   userCode: "4126",
//   userName: "Gaied Mutlak Alenez",
//   isAdmin: true,
// };

const token = jwt.sign(payload, process.env.PORTAL_JWT_SECRET, {
  expiresIn: "1d",
});

console.log("\nBearer Token:\n");
console.log(token);
console.log("\nUse in Postman Header:");
console.log(`Authorization: Bearer ${token}\n`);
