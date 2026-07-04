import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';

/**
 * VNPay Payment Gateway Integration
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */

export class VNPayHelper {
  constructor() {
    this.vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.tmnCode = process.env.VNPAY_TMN_CODE || 'A6OZW6W4';
    this.hashSecret = process.env.VNPAY_HASH_SECRET || '114OGKPAV874686DXC58H9M5MCFI7F6G';
    this.returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay/callback';
  }

  /**
   * Sort object by key and encode values (VNPay standard)
   */
  sortObject(obj) {
    const sorted = {};
    const str = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
  }

  /**
   * Create HMAC SHA512 signature
   */
  createSignature(data, secretKey) {
    return crypto
      .createHmac('sha512', secretKey)
      .update(Buffer.from(data, 'utf-8'))
      .digest('hex');
  }

  /**
   * Create VNPay payment URL
   * @param {Object} params - Payment parameters
   * @returns {string} Payment URL
   */
  createPaymentUrl({ orderId, amount, orderInfo, ipAddr, locale = 'vn' }) {
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay requires amount in VND * 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    // Sort and encode parameters (encoding done in sortObject)
    vnp_Params = this.sortObject(vnp_Params);

    // Create signature data (NO additional encoding - already encoded in sortObject)
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const signed = this.createSignature(signData, this.hashSecret);
    vnp_Params['vnp_SecureHash'] = signed;

    // Create payment URL (NO encoding - already encoded in sortObject)
    const paymentUrl = this.vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });

    return paymentUrl;
  }

  /**
   * Verify VNPay return/IPN signature
   * @param {Object} vnp_Params - VNPay response parameters
   * @returns {boolean} Valid or not
   */
  verifyReturnUrl(vnp_Params) {
    // Create a copy to avoid mutating original object
    const params = { ...vnp_Params };
    
    const secureHash = params['vnp_SecureHash'];
    
    // Remove signature fields from copy
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // Sort and encode parameters (encoding done in sortObject)
    const sortedParams = this.sortObject(params);
    
    // Verify signature (NO additional encoding - already encoded in sortObject)
    const signData = querystring.stringify(sortedParams, { encode: false });
    const signed = this.createSignature(signData, this.hashSecret);

    // Log for debugging
    console.log('VNPay Verification:');
    console.log('- Received hash:', secureHash);
    console.log('- Calculated hash:', signed);
    console.log('- Match:', secureHash === signed);

    return secureHash === signed;
  }

  /**
   * Parse VNPay response code
   * @param {string} responseCode - VNPay response code
   * @returns {Object} Status and message
   */
  parseResponseCode(responseCode) {
    const codes = {
      '00': { success: true, message: 'Giao dịch thành công' },
      '07': { success: false, message: 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).' },
      '09': { success: false, message: 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.' },
      '10': { success: false, message: 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần' },
      '11': { success: false, message: 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.' },
      '12': { success: false, message: 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.' },
      '13': { success: false, message: 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).' },
      '24': { success: false, message: 'Giao dịch không thành công do: Khách hàng hủy giao dịch' },
      '51': { success: false, message: 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.' },
      '65': { success: false, message: 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.' },
      '75': { success: false, message: 'Ngân hàng thanh toán đang bảo trì.' },
      '79': { success: false, message: 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.' },
      '99': { success: false, message: 'Các lỗi khác' }
    };

    return codes[responseCode] || { success: false, message: 'Lỗi không xác định' };
  }
}

export default new VNPayHelper();
