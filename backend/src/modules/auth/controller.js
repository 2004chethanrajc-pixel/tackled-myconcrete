import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './service.js';

export const login = asyncHandler(async (req, res) => {
  const { identifier, password, forceLogout } = req.body;

  const { user, token } = await authService.loginUser(identifier, password, forceLogout === true);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await authService.logoutUser(token);
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user.id);

  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: { user }
  });
});

export const customerSignup = asyncHandler(async (req, res) => {
  const user = await authService.registerCustomer(req.body);

  res.status(201).json({
    success: true,
    message: 'Customer registration successful. Please wait for admin approval.',
    data: { user }
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  const result = await authService.requestPasswordReset(identifier);

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      identifier: result.identifier,
      isEmail: result.isEmail
    }
  });
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { identifier, otp } = req.body;

  const result = await authService.verifyOTP(identifier, otp);

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    data: result
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, otp, newPassword } = req.body;

  await authService.resetPassword(identifier, otp, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  });
});
