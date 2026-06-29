import { getBudgetAccessByUserId } from "../repositories/userRole.repository.js";

export async function verifyBudgetAccess(req, res, next) {
  try {
    const requestedWorkspaceId = req.get("x-budget-workspace-id") || null;
    const access = await getBudgetAccessByUserId(req.user.userId, {
      activeWorkspaceId: requestedWorkspaceId,
    });

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to Budget System",
      });
    }

    if (access.invalidRequestedWorkspace) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: invalid budget workspace",
      });
    }

    req.budgetAccess = access;
    req.activeBudgetWorkspace = access.activeWorkspace;
    next();
  } catch (error) {
    next(error);
  }
}
