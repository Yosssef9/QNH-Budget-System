import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const payload = {
  userId: 1080,
  userCode: "2410",
  userName: "Yossef Ibrahim",
  isAdmin: true,
};
// Budget Approver

// const payload = {
//   userId: 763,
//   userCode: "4124",
//   userName: "Fatimah Zaki Alnasserullah",
//   isAdmin: true,
// };

// HOD Marketing and Public Relations

// const payload = {
//   userId: 573,
//   userCode: "2101",
//   userName: "Yasser Hamza",
//   isAdmin: true,
// };

// HOD Billing

// const payload = {
//   userId: 823,
//   userCode: "4126",
//   userName: "Gaied Mutlak Alenez",
//   isAdmin: true,
// };

// HOD Transportation

// const payload = {
//   userId: 772,
//   userCode: "4140",
//   userName: "Abdulaziz Matar Mohammed Alharbi",
//   isAdmin: true,
// };

// HOD Patient Safety

// const payload = {
//   userId: 957,
//   userCode: "6170",
//   userName: "Lama Alharbi",
//   isAdmin: true,
// };

// HOD Laundry

// const payload = {
//   userId: 467,
//   userCode: "2024",
//   userName: " Mansour Ahmad Saqer Alotibi",
//   isAdmin: true,
// };

const token = jwt.sign(payload, process.env.PORTAL_JWT_SECRET, {
  expiresIn: "7d",
});

console.log("\nBearer Token:\n");
console.log(token);
console.log("\nUse in Postman Header:");
console.log(`Authorization: Bearer ${token}\n`);
