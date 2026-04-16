import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("AUTH ERROR:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const protectAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not admin",
      });
    }

    next();
  } catch (err) {
    console.log("ADMIN AUTH ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Admin auth error",
    });
  }
};


export const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    protectAdmin(req, res, next);
  });
};

export default auth;