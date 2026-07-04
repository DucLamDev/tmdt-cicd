import crypto from 'crypto';
import axios from 'axios';
import moment from 'moment';
import logger from '../config/logger.js';

/**
 * ZaloPay Payment Gateway Integration
 * Docs: https://docs.zalopay.vn/v2/
 */
export class ZaloPayHelper {
  constructor() {
    this.appId = process.env.ZALOPAY_APP_ID || '2553';
    this.key1 = process.env.ZALOPAY_KEY1 || 'PcY4iAaz624bHTc4SVVSMs45sDEhFGhn';
    this.key2 = process.env.ZALOPAY_KEY2 || 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz';
    this.endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
    this.callbackUrl = process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:5000/api/payments/zalopay/callback';
    this.returnUrl = process.env.ZALOPAY_RETURN_URL || 'http://localhost:3000/payment/zalopay/callback';
  }

  /**
   * Create HMAC SHA256 signature
   * @param {string} data - Raw string to sign
   * @param {string} key - Secret key
   * @returns {string} HMAC SHA256 hash
   */
  createMac(data, key) {
    return crypto
      .createHmac('sha256', key)
      .update(data)
      .digest('hex');
  }

  /**
   * Create ZaloPay order
   * @param {Object} params - Payment parameters
   * @returns {Object} ZaloPay order response
   */
  async createPaymentUrl({ orderId, amount, description, userId }) {
    const transId = Date.now(); // Unique transaction ID
    const appTransId = `${moment().format('YYMMDD')}_${transId}`; // ZaloPay format: YYMMDD_transId

    const embedData = JSON.stringify({
      redirecturl: this.returnUrl,
      orderId: orderId
    });

    const items = JSON.stringify([{
      itemid: orderId,
      itemname: `Thanh toán đơn hàng ${orderId}`,
      itemprice: amount,
      itemquantity: 1
    }]);

    const order = {
      app_id: parseInt(this.appId),
      app_trans_id: appTransId,
      app_user: userId || 'marketplace_user',
      app_time: Date.now(),
      item: items,
      embed_data: embedData,
      amount: amount,
      callback_url: this.callbackUrl,
      description: description || `Thanh toán đơn hàng ${orderId}`,
      bank_code: ''
    };

    // Create MAC: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const macData = [
      order.app_id,
      order.app_trans_id,
      order.app_user,
      order.amount,
      order.app_time,
      order.embed_data,
      order.item
    ].join('|');

    order.mac = this.createMac(macData, this.key1);

    try {
      logger.info(`ZaloPay: Creating payment for order ${orderId}, amount ${amount}, appTransId ${appTransId}`);
      
      const response = await axios.post(this.endpoint, null, { params: order });
      
      logger.info(`ZaloPay response: ${JSON.stringify(response.data)}`);
      
      return {
        ...response.data,
        appTransId // Return for tracking
      };
    } catch (error) {
      logger.error(`ZaloPay payment creation error: ${error.message}`);
      throw new Error(`ZaloPay payment creation failed: ${error.message}`);
    }
  }

  /**
   * Verify ZaloPay callback data
   * @param {Object} callbackData - ZaloPay callback data
   * @returns {Object} Parsed and verified data
   */
  verifyCallback(callbackData) {
    const { data, mac } = callbackData;

    // Verify MAC with key2
    const expectedMac = this.createMac(data, this.key2);
    const isValid = expectedMac === mac;

    logger.info(`ZaloPay callback verification: ${isValid ? 'VALID' : 'INVALID'}`);

    if (isValid) {
      const parsedData = JSON.parse(data);
      return {
        isValid: true,
        data: parsedData
      };
    }

    return { isValid: false, data: null };
  }

  /**
   * Parse ZaloPay return code
   * @param {number} returnCode - ZaloPay return code
   * @returns {Object} Status and message
   */
  parseReturnCode(returnCode) {
    const codes = {
      1: { success: true, message: 'Thanh toán thành công' },
      2: { success: false, message: 'Thanh toán thất bại' },
      3: { success: false, message: 'Đơn hàng đang chờ xử lý' },
      [-49]: { success: false, message: 'Đơn hàng chưa được thanh toán hoặc đã hủy' }
    };

    return codes[returnCode] || { success: false, message: `Lỗi không xác định (code: ${returnCode})` };
  }
}

export default new ZaloPayHelper();
