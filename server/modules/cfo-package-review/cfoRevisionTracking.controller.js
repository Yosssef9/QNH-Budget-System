import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import {
  getCmRevisionTrackerService, setCmRevisionReviewedService, getCfoRevisionComparisonService,
} from './cfoRevisionTracking.service.js';

export const getCmRevisionTracker = asyncHandler(async (req, res) => {
  const data = await getCmRevisionTrackerService({ budgetAccess: req.budgetAccess });
  res.json(new ApiResponse({ message: 'CM CFO revision progress fetched', data }));
});
export const setCmRevisionReviewed = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.packageItemId);
  const reviewed = req.body?.reviewed;
  const data = await setCmRevisionReviewedService({
    budgetAccess: req.budgetAccess, itemId, reviewed, actorUserId: req.user.userId,
  });
  res.json(new ApiResponse({ message: 'CM revision status saved', data }));
});
export const getCfoRevisionComparison = asyncHandler(async (req, res) => {
  const packageId = Number(req.params.packageId);
  if (!Number.isSafeInteger(packageId) || packageId <= 0) return res.status(400).json({ success: false, message: 'Invalid package ID' });
  const data = await getCfoRevisionComparisonService({ packageId, budgetAccess: req.budgetAccess });
  res.json(new ApiResponse({ message: 'CFO review cycle comparison fetched', data }));
});
