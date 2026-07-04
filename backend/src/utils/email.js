import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');
import logger from '../config/logger.js';
import dotenv from 'dotenv';
dotenv.config();
// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.html - Email HTML content
 * @param {String} options.text - Email plain text content
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {String} email - User email
 * @param {String} resetToken - Password reset token
 * @param {String} userName - User name
 */
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
      <p>Vui lòng click vào link dưới đây để đặt lại mật khẩu:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
      <p>Link này sẽ hết hạn sau 1 giờ.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  const text = `
    Xin chào ${userName},
    
    Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.
    
    Vui lòng truy cập link sau để đặt lại mật khẩu:
    ${resetUrl}
    
    Link này sẽ hết hạn sau 1 giờ.
    
    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    
    Trân trọng,
    Marketplace Team
  `;
  
  await sendEmail({
    to: email,
    subject: 'Đặt lại mật khẩu - Marketplace',
    html,
    text
  });
};

/**
 * Send new password email
 * @param {String} email - User email
 * @param {String} newPassword - New password
 * @param {String} userName - User name
 */
export const sendNewPasswordEmail = async (email, newPassword, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Bạn đã yêu cầu lấy lại mật khẩu cho tài khoản của mình.</p>
      <p>Mật khẩu mới của bạn là:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0; color: #007bff; font-family: monospace;">${newPassword}</h3>
      </div>
      <p><strong>Lưu ý quan trọng:</strong></p>
      <ul>
        <li>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này</li>
        <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với chúng tôi ngay</li>
      </ul>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  const text = `
    Xin chào ${userName},
    
    Bạn đã yêu cầu lấy lại mật khẩu cho tài khoản của mình.
    
    Mật khẩu mới của bạn là: ${newPassword}
    
    Lưu ý quan trọng:
    - Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này
    - Không chia sẻ mật khẩu này với bất kỳ ai
    - Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với chúng tôi ngay
    
    Trân trọng,
    Marketplace Team
  `;
  
  await sendEmail({
    to: email,
    subject: 'Mật khẩu mới - Marketplace',
    html,
    text
  });
};

/**
 * Send order confirmation email
 * @param {String} email - User email
 * @param {Object} order - Order object
 */
export const sendOrderConfirmationEmail = async (email, order) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Đơn hàng đã được đặt thành công!</h2>
      <p>Mã đơn hàng: <strong>${order.orderNumber}</strong></p>
      <p>Tổng tiền: <strong>${order.totals.grandTotal.toLocaleString()} VNĐ</strong></p>
      <p>Cảm ơn bạn đã mua hàng tại Marketplace!</p>
      <p>Bạn có thể theo dõi đơn hàng của mình tại trang <a href="${process.env.FRONTEND_URL}/orders/${order._id}">Đơn hàng của tôi</a></p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: `Xác nhận đơn hàng #${order.orderNumber}`,
    html
  });
};

/**
 * Send account rejection notification email
 * @param {String} email - User email
 * @param {String} userName - User name
 * @param {String} reason - Rejection reason
 */
export const sendAccountRejectionEmail = async (email, userName, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Chúng tôi rất tiếc phải thông báo rằng tài khoản của bạn đã bị từ chối.</p>
      <div style="background-color: #fee; padding: 15px; border-left: 4px solid #f00; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #c00;">Lý do từ chối:</h3>
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: 'Thông báo từ chối tài khoản - Marketplace',
    html
  });
};

/**
 * Send account lock notification email
 * @param {String} email - User email
 * @param {String} userName - User name
 * @param {String} reason - Lock reason
 */
export const sendAccountLockEmail = async (email, userName, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Tài khoản của bạn đã bị khóa.</p>
      <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #856404;">Lý do khóa tài khoản:</h3>
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: 'Thông báo khóa tài khoản - Marketplace',
    html
  });
};

/**
 * Send quality warning notification email
 * @param {String} email - User email
 * @param {String} userName - User name
 * @param {Object} warning - Warning details
 */
export const sendQualityWarningEmail = async (email, userName, warning = {}) => {
  const {
    roleLabel = 'tài khoản',
    reason = 'Điểm đánh giá đang thấp, vui lòng cải thiện chất lượng phục vụ.',
    warningCount = 1,
    warningLimit = 3,
    score,
    reviews
  } = warning;

  const scoreLine = score !== undefined && score !== null
    ? `<p>Điểm hiện tại: <strong>${Number(score).toFixed(1)}/5</strong>${reviews !== undefined ? ` từ ${reviews} lượt đánh giá` : ''}.</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Hệ thống gửi cảnh báo chất lượng cho ${roleLabel} của bạn.</p>
      <div style="background-color: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #c2410c;">Cảnh báo lần ${warningCount}/${warningLimit}</h3>
        <p style="margin: 0;">${reason}</p>
      </div>
      ${scoreLine}
      <p>Vui lòng kiểm tra phản hồi của khách hàng và cải thiện chất lượng phục vụ. Nếu tiếp tục nhận đủ số lần cảnh báo, tài khoản có thể bị admin xem xét khóa.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;

  const text = `
    Xin chào ${userName},

    Hệ thống gửi cảnh báo chất lượng cho ${roleLabel} của bạn.
    Cảnh báo lần ${warningCount}/${warningLimit}
    Lý do: ${reason}
    ${score !== undefined && score !== null ? `Điểm hiện tại: ${Number(score).toFixed(1)}/5${reviews !== undefined ? ` từ ${reviews} lượt đánh giá` : ''}.` : ''}

    Vui lòng kiểm tra phản hồi của khách hàng và cải thiện chất lượng phục vụ.

    Trân trọng,
    Marketplace Team
  `;

  await sendEmail({
    to: email,
    subject: `Cảnh báo chất lượng ${roleLabel} lần ${warningCount}/${warningLimit} - Marketplace`,
    html,
    text
  });
};

/**
 * Send account deletion notification email
 * @param {String} email - User email
 * @param {String} userName - User name
 * @param {String} reason - Deletion reason
 */
export const sendAccountDeletionEmail = async (email, userName, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Tài khoản của bạn đã bị xóa khỏi hệ thống.</p>
      <div style="background-color: #fee; padding: 15px; border-left: 4px solid #f00; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #c00;">Lý do xóa tài khoản:</h3>
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: 'Thông báo xóa tài khoản - Marketplace',
    html
  });
};

/**
 * Send contact message response email
 * @param {String} email - User email
 * @param {String} userName - User name
 * @param {String} originalMessage - Original message
 * @param {String} response - Admin response
 */
export const sendContactResponseEmail = async (email, userName, originalMessage, response) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Chúng tôi đã nhận được tin nhắn của bạn và gửi phản hồi như sau:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Tin nhắn của bạn:</h3>
        <p style="margin: 0;">${originalMessage}</p>
      </div>
      <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1976d2;">Phản hồi của chúng tôi:</h3>
        <p style="margin: 0;">${response}</p>
      </div>
      <p>Nếu bạn có thêm câu hỏi, vui lòng liên hệ lại với chúng tôi.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: 'Phản hồi tin nhắn của bạn - Marketplace',
    html
  });
};

/**
 * Send product rejection notification email
 * @param {String} email - Seller email
 * @param {String} userName - Seller name
 * @param {String} productTitle - Product title
 * @param {String} reason - Rejection reason
 */
export const sendProductRejectionEmail = async (email, userName, productTitle, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xin chào ${userName},</h2>
      <p>Sản phẩm "<strong>${productTitle}</strong>" của bạn đã bị từ chối.</p>
      <div style="background-color: #fee; padding: 15px; border-left: 4px solid #f00; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #c00;">Lý do từ chối:</h3>
        <p style="margin: 0;">${reason}</p>
      </div>
      <p>Vui lòng chỉnh sửa sản phẩm theo yêu cầu và gửi lại để được duyệt.</p>
      <br>
      <p>Trân trọng,<br>Marketplace Team</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: `Sản phẩm "${productTitle}" bị từ chối - Marketplace`,
    html
  });
};

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendNewPasswordEmail,
  sendOrderConfirmationEmail,
  sendAccountRejectionEmail,
  sendAccountLockEmail,
  sendQualityWarningEmail,
  sendAccountDeletionEmail,
  sendContactResponseEmail,
  sendProductRejectionEmail
};
