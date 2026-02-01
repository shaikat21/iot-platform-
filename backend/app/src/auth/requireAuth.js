// Backend/auth/requireAuth.js
//---------------do not change this file------------------

export const requireAuth = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ error: "authentication_required" });
  }
  next();
};
