import User from '../models/User.js';
import { generateTokenPair, generateResetToken, verifyToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendNewPasswordEmail } from '../utils/email.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import { isStrongPassword, PASSWORD_RULE_MESSAGE, isValidVietnamPhone } from '../utils/validators.js';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: PASSWORD_RULE_MESSAGE
    });
  }

  if (phone && !isValidVietnamPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không hợp lệ'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email đã được sử dụng'
    });
  }

  // Determine roles based on selected role
  let roles = ['customer']; // Everyone is a customer by default
  let requiresApproval = false;
  
  if (role && ['seller', 'shipper'].includes(role)) {
    roles.push(role); // Add seller or shipper role in addition to customer
    requiresApproval = true;
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: password, // Will be hashed by pre-save hook
    roles
  });

  logger.info(`New user registered: ${email} with roles: ${roles.join(', ')}`);

  // Different response for seller/shipper vs customer
  if (requiresApproval) {
    // For seller/shipper: DO NOT generate tokens, DO NOT allow login
    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt từ admin. Bạn sẽ có thể đăng nhập sau khi được phê duyệt.',
      requiresApproval: true,
      data: {
        email: user.email,
        name: user.name
      }
    });
  }

  // For customer: Generate tokens and allow immediate login
  const tokens = generateTokenPair(user);

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    requiresApproval: false,
    data: {
      user: user.toSafeObject(),
      ...tokens
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password field
  const user = await User.findOne({ email }).select('+passwordHash');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản đã bị khóa'
    });
  }

  // Check approval status for seller/shipper
  if ((user.roles.includes('seller') || user.roles.includes('shipper')) && user.approvalStatus !== 'approved') {
    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang chờ phê duyệt từ admin'
      });
    } else if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: `Tài khoản của bạn đã bị từ chối. Lý do: ${user.rejectionReason || 'Không có lý do cụ thể'}`
      });
    }
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const tokens = generateTokenPair(user);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      user: user.toSafeObject(),
      ...tokens
    }
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  // Verify refresh token
  const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Get user
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }

  const impersonationPayload = decoded.impersonatedBy ? {
    impersonatedBy: decoded.impersonatedBy,
    impersonatedByEmail: decoded.impersonatedByEmail,
    impersonatedAt: decoded.impersonatedAt
  } : {};

  // Generate new token pair
  const tokens = generateTokenPair(user, impersonationPayload);

  res.json({
    success: true,
    data: tokens
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('shop');

  res.json({
    success: true,
    data: user.toSafeObject()
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl, preferences } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  await user.save();

  res.json({
    success: true,
    message: 'Cập nhật thông tin thành công',
    data: user.toSafeObject()
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: PASSWORD_RULE_MESSAGE
    });
  }

  const user = await User.findById(req.user._id).select('+passwordHash');

  // Verify current password
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu hiện tại không đúng'
    });
  }

  // Set new password
  user.passwordHash = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công'
  });
});

/**
 * @desc    Request password reset - generates new password and sends via email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal that user doesn't exist
    return res.json({
      success: true,
      message: 'Nếu email tồn tại, mật khẩu mới đã được gửi'
    });
  }

  // Block password reset for admin users
  if (user.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản admin không thể sử dụng chức năng quên mật khẩu. Vui lòng liên hệ quản trị viên hệ thống.'
    });
  }

  // Generate random password (8 characters: letters + numbers)
  const newPassword = crypto.randomBytes(4).toString('hex'); // 8 character hex string
  
  // Update user password
  user.passwordHash = newPassword; // Will be hashed by pre-save hook
  
  // Clear any existing reset tokens
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  await user.save();

  // Send email with new password
  try {
    await sendNewPasswordEmail(user.email, newPassword, user.name);
    logger.info(`New password sent to: ${email}`);
  } catch (error) {
    logger.error(`Error sending new password email: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi email. Vui lòng thử lại sau'
    });
  }

  res.json({
    success: true,
    message: 'Mật khẩu mới đã được gửi đến email của bạn. Vui lòng kiểm tra email và đăng nhập.'
  });
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: PASSWORD_RULE_MESSAGE
    });
  }

  // Verify token
  let decoded;
  try {
    decoded = verifyToken(token, process.env.JWT_RESET_PASSWORD_SECRET);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }

  // Hash token to compare with database
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    _id: decoded.id,
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }

  // Set new password
  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  logger.info(`Password reset successful for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Đặt lại mật khẩu thành công'
  });
});

/**
 * @desc    Logout (client-side token removal, optional: token blacklist)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // In a real app, you might want to blacklist the token in Redis
  // For now, client will just remove the token

  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
});

export default {
  register,
  login,
  refresh,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
};
