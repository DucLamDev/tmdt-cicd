import momoHelper from '../src/utils/momo.js';
import zalopayHelper from '../src/utils/zalopay.js';

// Mock environment variables for testing
process.env.MOMO_PARTNER_CODE = 'MOMOTEST';
process.env.MOMO_ACCESS_KEY = 'test_access_key';
process.env.MOMO_SECRET_KEY = 'test_secret_key';
process.env.MOMO_ENDPOINT = 'https://test.momo.vn/create';
process.env.MOMO_RETURN_URL = 'http://localhost/return';
process.env.MOMO_IPN_URL = 'http://localhost/ipn';

process.env.ZALOPAY_APP_ID = '2553';
process.env.ZALOPAY_KEY1 = 'test_key_1';
process.env.ZALOPAY_KEY2 = 'test_key_2';
process.env.ZALOPAY_ENDPOINT = 'https://test.zalo.vn/create';

describe('Payment Gateways Utility Tests', () => {

  describe('MoMo Helper', () => {
    it('should generate a valid payment request payload', () => {
      const orderInfo = 'Test Order 123';
      const amount = 50000;
      const orderId = 'ORD-' + Date.now();
      
      const payload = momoHelper.createPaymentRequest(orderInfo, amount, orderId);
      
      expect(payload).toHaveProperty('partnerCode', process.env.MOMO_PARTNER_CODE);
      expect(payload).toHaveProperty('orderId', orderId);
      expect(payload).toHaveProperty('amount', amount);
      expect(payload).toHaveProperty('orderInfo', orderInfo);
      expect(payload).toHaveProperty('signature');
      // Signature should be a 64-character hex string (HMAC SHA256)
      expect(payload.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should verify IPN signature correctly', () => {
      const mockIpnData = {
        partnerCode: 'MOMOTEST',
        orderId: 'ORD-123',
        requestId: 'REQ-123',
        amount: 50000,
        orderInfo: 'Test',
        orderType: 'momo_wallet',
        transId: 'TRANS-123',
        resultCode: 0,
        message: 'Success',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: ''
      };

      // Generate a valid signature for the mock data
      const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${mockIpnData.amount}&extraData=${mockIpnData.extraData}&message=${mockIpnData.message}&orderId=${mockIpnData.orderId}&orderInfo=${mockIpnData.orderInfo}&orderType=${mockIpnData.orderType}&partnerCode=${mockIpnData.partnerCode}&payType=${mockIpnData.payType}&requestId=${mockIpnData.requestId}&responseTime=${mockIpnData.responseTime}&resultCode=${mockIpnData.resultCode}&transId=${mockIpnData.transId}`;
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(rawSignature).digest('hex');

      expect(momoHelper.verifySignature(mockIpnData, validSignature)).toBe(true);
      expect(momoHelper.verifySignature(mockIpnData, 'invalid_signature')).toBe(false);
    });
  });

  describe('ZaloPay Helper', () => {
    it('should generate a valid payment request payload', () => {
      const appUser = 'user_123';
      const amount = 100000;
      const orderId = '12345';
      const description = 'Thanh toan ZaloPay test';
      const items = [{ itemid: '1', itemname: 'Test item', itemprice: 100000, itemquantity: 1 }];

      const payload = zalopayHelper.createPaymentRequest(appUser, amount, orderId, description, items);

      expect(payload).toHaveProperty('app_id', Number(process.env.ZALOPAY_APP_ID));
      expect(payload).toHaveProperty('app_user', appUser);
      expect(payload).toHaveProperty('amount', amount);
      expect(payload).toHaveProperty('app_trans_id');
      expect(payload.app_trans_id).toContain(orderId);
      expect(payload).toHaveProperty('mac');
      // MAC should be a 64-character hex string (HMAC SHA256)
      expect(payload.mac).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should verify callback MAC correctly', () => {
      const mockCallbackData = {
        app_id: 2553,
        app_trans_id: '240101_12345',
        app_time: Date.now(),
        app_user: 'user_123',
        amount: 100000,
        embed_data: '{}',
        item: '[]',
        zp_trans_id: '987654321',
        server_time: Date.now(),
        channel: 38,
        merchant_user_id: '',
        user_fee_amount: 0,
        discount_amount: 0
      };

      const dataStr = `${mockCallbackData.app_id}|${mockCallbackData.app_trans_id}|${mockCallbackData.app_user}|${mockCallbackData.amount}|${mockCallbackData.app_time}|${mockCallbackData.embed_data}|${mockCallbackData.item}`;
      const crypto = require('crypto');
      const validMac = crypto.createHmac('sha256', process.env.ZALOPAY_KEY2).update(dataStr).digest('hex');

      expect(zalopayHelper.verifyCallback(mockCallbackData, validMac)).toBe(true);
      expect(zalopayHelper.verifyCallback(mockCallbackData, 'invalid_mac')).toBe(false);
    });
  });

});
