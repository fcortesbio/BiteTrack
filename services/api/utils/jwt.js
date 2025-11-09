import jwt from "jsonwebtoken";

export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const generateResetToken = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "reset_";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
