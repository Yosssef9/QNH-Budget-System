import jwt from "jsonwebtoken";

export function verifyPortalJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.PORTAL_JWT_SECRET);

    req.user = {
      userId: payload.userId,
      userCode: payload.userCode,
      userName: payload.userName,
      isAdmin: payload.isAdmin,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
