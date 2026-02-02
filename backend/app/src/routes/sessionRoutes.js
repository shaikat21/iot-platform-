import { Router } from "express";
import { zitadelAuth } from "../auth/zitadelAuth.js";
import { checkAudience } from "../auth/checkAudience.js";
import { userID } from "../auth/userRoleID.js";

const router = Router();

router.get("/", zitadelAuth, checkAudience, userID, (req, res) => {
  // To indentify anon token
  const isAnon =
    req.auth && req.auth.client_id && !req.auth.email && req.auth.isAnon;

  if (!req.auth || isAnon) {
    return res.json({
      authenticated: false,
      roles: ["anon"],
    });
  }

  return res.json({
    authenticated: true,
    userId: req.auth.userId,
    roles: req.auth.roles || [],
   // isAdmin: req.auth.isAdmin === true,
   // isUser: req.auth.isUser === true,
  });
});

export default router;
