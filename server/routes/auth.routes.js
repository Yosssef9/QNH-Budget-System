import express from "express";

import { verifyPortalJwt } from "../shared/auth/verifyPortalJwt.js";
import { resolveOptionalBudgetWorkspace } from "../shared/middleware/resolveBudgetWorkspace.js";

const router = express.Router();

/*
  Authentication and Budget System authorization are separate states.

  Results:

  1. Missing or invalid portal token:
     verifyPortalJwt returns HTTP 401.

  2. Valid portal token without Budget System access:
     return HTTP 200 with:
       user: authenticated portal user
       budgetAccess: null

  3. Valid portal token with Budget System access:
     return HTTP 200 with both user and budgetAccess.
*/
router.get(
  "/me",
  verifyPortalJwt,
  resolveOptionalBudgetWorkspace,
  (req, res) => {
    return res.json({
      success: true,
      user: req.user,
      budgetAccess: req.budgetAccess,
    });
  },
);

export default router;