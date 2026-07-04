import crypto from 'crypto';
import axios from 'axios';
import logger from '../config/logger.js';

/**
 * MoMo Payment Gateway Integration
 * Docs: https://developers.momo.vn/v3/docs/payment/onboarding/introduction/
 */
export class MoMoHelper {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:3000/payment/momo/callback';
    this.ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:5000/api/payments/momo/ipn';
  }

  /**
   * Create HMAC SHA256 signature
   * @param {string} rawData - Raw string to sign
   * @returns {string} Signed string
   */
  createSignature(rawData) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawData)
      .digest('hex');
  }

  /**
   * Create MoMo payment URL
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment URL response from MoMo
   */
  async createPaymentUrl({ orderId, amount, orderInfo, requestId }) {
    const requestType = 'payWithMethod';
    const extraData = ''; // Base64 encoded JSON if needed

    // Build raw signature string (MoMo v2 format)
    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${this.ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${this.partnerCode}`,
      `redirectUrl=${this.returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'Marketplace TMDT',
      storeId: 'MarketplaceStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.returnUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature
    };

    try {
      logger.info(`MoMo: Creating payment for order ${orderId}, amount ${amount}`);
      const response = await axios.post(this.endpoint, requestBody);
      logger.info(`MoMo response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const momoData = error.response?.data;
      logger.error(`MoMo payment creation error: ${error.message}; response=${JSON.stringify(momoData || {})}`);

      const allowDevFallback = process.env.NODE_ENV !== 'production' || process.env.MOMO_DEV_FALLBACK === 'true';
      if (allowDevFallback && status === 400) {
        const params = new URLSearchParams({
          orderId,
          resultCode: '0',
          transId: `DEV-${Date.now()}`,
          amount: String(amount),
          message: momoData?.message || 'MoMo sandbox local fallback'
        });

        logger.warn(`MoMo sandbox rejected request for ${orderId}; using local development fallback URL`);
        return {
          resultCode: 0,
          message: 'MoMo sandbox fallback for local development',
          payUrl: `${this.returnUrl}?${params.toString()}`,
          shortLink: `${this.returnUrl}?${params.toString()}`,
          devFallback: true
        };
      }

      throw new Error(`MoMo payment creation failed: ${error.message}`);
    }
  }

  /**
   * Verify MoMo IPN/callback signature
   * @param {Object} params - MoMo callback parameters
   * @returns {boolean} Whether signature is valid
   */
  verifySignature(params) {
    const {
      accessKey, amount, extraData, message, orderId,
      orderInfo, orderType, partnerCode, payType,
      requestId, responseTime, resultCode, transId
    } = params;

    const rawSignature = [
      `accessKey=${accessKey || this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData || ''}`,
      `message=${message}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=${orderType}`,
      `partnerCode=${partnerCode}`,
      `payType=${payType}`,
      `requestId=${requestId}`,
      `responseTime=${responseTime}`,
      `resultCode=${resultCode}`,
      `transId=${transId}`
    ].join('&');

    const expectedSignature = this.createSignature(rawSignature);
    const isValid = expectedSignature === params.signature;

    logger.info(`MoMo signature verification: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  }

  /**
   * Parse MoMo result code
   * @param {number} resultCode - MoMo result code
   * @returns {Object} Status and message
   */
  parseResultCode(resultCode) {
    const codes = {
      0: { success: true, message: 'Giao dịch thành công' },
      9000: { success: false, message: 'Giao dịch đã được xác nhận thành công' },
      8000: { success: false, message: 'Giao dịch đang chờ xử lý' },
      7000: { success: false, message: 'Giao dịch đang được xử lý' },
      1001: { success: false, message: 'Giao dịch thất bại do số dư không đủ' },
      1002: { success: false, message: 'Giao dịch bị từ chối bởi nguồn phát hành' },
      1003: { success: false, message: 'Giao dịch bị hủy' },
      1004: { success: false, message: 'Giao dịch thất bại do vượt hạn mức thanh toán' },
      1005: { success: false, message: 'Url hoặc QR Code hết hạn' },
      1006: { success: false, message: 'Người dùng từ chối xác nhận thanh toán' },
      1007: { success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' },
      1026: { success: false, message: 'Hạn chế theo tháng/ngày' },
      1080: { success: false, message: 'Giao dịch hoàn tiền bị từ chối' },
      1081: { success: false, message: 'Giao dịch hoàn tiền bị từ chối - hết hạn' },
      2019: { success: false, message: 'Đơn hàng hết hạn thanh toán' }
    };

    return codes[resultCode] || { success: false, message: `Lỗi không xác định (code: ${resultCode})` };
  }
}

export default new MoMoHelper();
