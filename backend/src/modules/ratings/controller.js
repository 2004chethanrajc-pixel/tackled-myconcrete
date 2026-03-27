import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import * as ratingsService from './service.js';

export const submitRating = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId;
  const { rating, feedback } = req.body;

  if (!rating) throw new ApiError(400, 'Rating is required');

  const result = await ratingsService.submitRating(projectId, req.user.id, Number(rating), feedback);

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: { rating: result },
  });
});

export const getProjectRating = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId;

  const rating = await ratingsService.getProjectRating(projectId);

  res.status(200).json({
    success: true,
    data: { rating: rating || null },
  });
});
