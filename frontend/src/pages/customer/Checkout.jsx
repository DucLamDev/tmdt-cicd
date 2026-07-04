import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useCartStore, { getCartItemKey } from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { ordersAPI } from '../../api/orders';
import { paymentAPI } from '../../api/payments';
import { addressAPI } from '../../api/address';
import { getAvailableCoupons, validateCoupon } from '../../api/coupon';
import toast from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiMapPin, FiTag } from 'react-icons/fi';
import { isValidVietnamPhone } from '../../utils/validation';

const CHECKOUT_STORAGE_KEY = 'checkout_items';

const paymentMethods = [
  { value: 'cod', name: 'COD', note: 'Thanh toán khi nhận hàng', logo: '/payment-logos/cod.svg' },
  { value: 'vnpay', name: 'VNPay', note: 'Thanh toán qua cổng VNPay', logo: '/payment-logos/vnpay.svg' },
  { value: 'momo', name: 'MoMo', note: 'Ví điện tử MoMo', logo: '/payment-logos/momo.svg' },
  { value: 'zalopay', name: 'ZaloPay', note: 'Ví điện tử ZaloPay', logo: '/payment-logos/zalopay.svg' },
  { value: 'stripe', name: 'Stripe', note: 'Thẻ quốc tế Visa/Mastercard', logo: '/payment-logos/stripe.svg' },
];

const normalizeOrders = (data) => (Array.isArray(data) ? data : [data]).filter(Boolean);

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutMode = searchParams.get('mode') || 'cart';
  const { items, clearCart, removeItems } = useCartStore();
  const { user } = useAuthStore();
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showCouponList, setShowCouponList] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: user?.name || '',
    phone: user?.phone || '',
    street: '',
    ward: '',
    district: '',
    city: '',
    provinceCode: '',
    districtCode: '',
    wardCode: '',
    paymentMethod: 'cod',
    buyerNote: '',
  });

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || '[]');
    const sourceItems = (checkoutMode === 'buy-now' || checkoutMode === 'cart-selected') && stored.length
      ? stored
      : items;
    setCheckoutItems(sourceItems);
  }, [checkoutMode, items]);

  const totals = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);
    const shipping = checkoutItems.length > 0 ? 30000 : 0;
    const discount = appliedCoupon?.discount || 0;
    return { subtotal, shipping, discount, total: Math.max(0, subtotal + shipping - discount) };
  }, [checkoutItems, appliedCoupon]);

  useEffect(() => {
    addressAPI.getProvinces().then(setProvinces).catch(() => setProvinces([]));
    addressAPI.list().then((response) => {
      const addresses = response.data || [];
      setSavedAddresses(addresses);
      const defaultAddress = addresses.find((item) => item.isDefault) || addresses[0];
      if (!defaultAddress) return;
      setSelectedAddressId(defaultAddress._id);
      fillAddressFromSaved(defaultAddress);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!checkoutItems.length) return;
    getAvailableCoupons({ orderTotal: totals.total })
      .then((response) => setAvailableCoupons(response.data?.coupons || []))
      .catch(() => setAvailableCoupons([]));
  }, [checkoutItems.length, totals.total]);

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    const selectedProvince = provinces.find((p) => p.code.toString() === provinceCode);
    setSelectedAddressId('');
    setFormData({ ...formData, provinceCode, city: selectedProvince?.name || '', districtCode: '', district: '', wardCode: '', ward: '' });
    setDistricts([]);
    setWards([]);
    if (provinceCode) {
      const provinceData = await addressAPI.getProvinceWithDistricts(provinceCode);
      setDistricts(provinceData?.districts || []);
      setWards(provinceData?.wards || []);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtCode = e.target.value;
    const selectedDistrict = districts.find((d) => d.code.toString() === districtCode);
    setSelectedAddressId('');
    setFormData({ ...formData, districtCode, district: selectedDistrict?.name || '', wardCode: '', ward: '' });
    setWards([]);
    if (districtCode) {
      const districtData = await addressAPI.getDistrictWithWards(districtCode);
      setWards(districtData?.wards || []);
    }
  };

  const handleSavedAddressChange = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    const address = savedAddresses.find((item) => item._id === addressId);
    if (!address) {
      setFormData((current) => ({
        ...current,
        street: '',
        ward: '',
        district: '',
        city: '',
        provinceCode: '',
        districtCode: '',
        wardCode: ''
      }));
      setDistricts([]);
      setWards([]);
      return;
    }
    fillAddressFromSaved(address);
  };

  const fillAddressFromSaved = (address) => {
    setFormData((current) => ({
      ...current,
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      ward: address.ward,
      district: address.district,
      city: address.city,
      provinceCode: address.provinceCode || '',
      districtCode: address.districtCode || '',
      wardCode: address.wardCode || ''
    }));
  };

  const handleWardChange = (e) => {
    const wardCode = e.target.value;
    const selectedWard = wards.find((ward) => ward.code.toString() === wardCode);
    setSelectedAddressId('');
    setFormData({ ...formData, wardCode, ward: selectedWard?.name || '' });
  };

  const applyCouponCode = async (code) => {
    setCouponLoading(true);
    try {
      const response = await validateCoupon({ code, orderTotal: totals.total });
      setAppliedCoupon(response.data);
      toast.success(response.message || 'Áp dụng mã giảm giá thành công');
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSelectCoupon = (code) => {
    setCouponCode(code);
    setShowCouponList(false);
    applyCouponCode(code);
  };

  const clearPurchasedItems = () => {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    if (checkoutMode === 'buy-now') return;
    if (checkoutMode === 'cart-selected') {
      removeItems(checkoutItems.map((item) => getCartItemKey(item)));
      return;
    }
    clearCart();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutItems.length) {
      toast.error('Không có sản phẩm để thanh toán');
      return;
    }
    if (!formData.recipientName || !formData.phone || !formData.street || !formData.city || !formData.ward) {
      toast.error('Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }
    if (!isValidVietnamPhone(formData.phone)) {
      toast.error('Số điện thoại nhận hàng không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const orderResponse = await ordersAPI.createOrder({
        items: checkoutItems.map((item) => ({
          productId: item._id,
          variantId: item.variantId,
          quantity: item.quantity,
          attributes: item.selectedAttributes || {}
        })),
        shippingAddress: {
          recipientName: formData.recipientName,
          phone: formData.phone,
          street: formData.street,
          ward: formData.ward,
          district: formData.district,
          city: formData.city,
          provinceCode: formData.provinceCode,
          districtCode: formData.districtCode,
          wardCode: formData.wardCode,
        },
        paymentMethod: formData.paymentMethod,
        couponCode: appliedCoupon?.code || null,
        buyerNote: formData.buyerNote,
      });

      const createdOrders = normalizeOrders(orderResponse.data);
      const orderIds = createdOrders.map((order) => order._id);
      const firstOrderId = orderIds[0];

      const redirectPaymentMethods = {
        vnpay: { create: paymentAPI.createVNPayPayment, name: 'VNPay', supportsMultiple: false },
        momo: { create: paymentAPI.createMoMoPayment, name: 'MoMo', supportsMultiple: true },
        zalopay: { create: paymentAPI.createZaloPayPayment, name: 'ZaloPay', supportsMultiple: false },
      };

      if (redirectPaymentMethods[formData.paymentMethod]) {
        const { create, name, supportsMultiple } = redirectPaymentMethods[formData.paymentMethod];
        if (!supportsMultiple && orderIds.length > 1) {
          clearPurchasedItems();
          toast.success('Đã tạo đơn hàng. Cổng này chỉ thanh toán từng shop, vui lòng thanh toán trong trang đơn hàng.');
          navigate('/orders');
          return;
        }

        try {
          const paymentResponse = await create(supportsMultiple ? orderIds : firstOrderId);
          clearPurchasedItems();
          window.location.href = paymentResponse.data.paymentUrl;
          return;
        } catch (paymentError) {
          console.error(`${name} payment error:`, paymentError);
          clearPurchasedItems();
          toast.success('Đã đặt hàng thành công. Bạn có thể thanh toán lại trong trang đơn hàng.');
          navigate('/orders');
          return;
        }
      }

      if (formData.paymentMethod === 'stripe') {
        if (orderIds.length > 1) {
          clearPurchasedItems();
          toast.success('Đã tạo đơn hàng. Stripe hiện chỉ thanh toán từng shop trong trang đơn hàng.');
          navigate('/orders');
          return;
        }
        const paymentResponse = await paymentAPI.createStripePaymentIntent(firstOrderId);
        const { clientSecret, paymentIntentId } = paymentResponse.data;
        clearPurchasedItems();
        navigate(`/payment/stripe/checkout?clientSecret=${clientSecret}&paymentIntentId=${paymentIntentId}&orderId=${firstOrderId}`);
        return;
      }

      clearPurchasedItems();
      toast.success(orderResponse.message || 'Đặt hàng thành công');
      navigate('/orders');
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Không có sản phẩm để thanh toán</h2>
      </div>
    );
  }

  const usesDistrictLevel = districts.length > 0;

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Thanh toán</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-xl font-bold">Thông tin giao hàng</h3>
          <div className="space-y-4">
            {savedAddresses.length > 0 && (
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-4">
                <label className="mb-2 flex items-center gap-2 font-medium text-primary-800">
                  <FiMapPin /> Chọn địa chỉ đã lưu
                </label>
                <select value={selectedAddressId} onChange={handleSavedAddressChange} className="input w-full bg-white">
                  <option value="">Nhập địa chỉ mới</option>
                  {savedAddresses.map((address) => (
                    <option key={address._id} value={address._id}>
                      {address.isDefault ? '[Mặc định] ' : ''}{address.recipientName} - {address.phone} - {addressAPI.formatAddressLine(address)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">Người nhận</label>
                <input required value={formData.recipientName} onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })} className="input w-full" />
              </div>
              <div>
                <label className="mb-2 block font-medium">Số điện thoại</label>
                <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium">Địa chỉ</label>
              <input required value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="input w-full" placeholder="Số nhà, tên đường" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <select required={!selectedAddressId} value={formData.provinceCode} onChange={handleProvinceChange} className="input w-full" disabled={!!selectedAddressId}>
                <option value={selectedAddressId ? formData.provinceCode : ''}>{selectedAddressId ? formData.city : 'Chọn Tỉnh/Thành phố'}</option>
                {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <select required={!selectedAddressId && usesDistrictLevel} value={formData.districtCode} onChange={handleDistrictChange} className={`input w-full ${usesDistrictLevel || selectedAddressId ? '' : 'hidden'}`} disabled={!!selectedAddressId || !formData.provinceCode}>
                <option value={selectedAddressId ? formData.districtCode : ''}>{selectedAddressId ? formData.district : 'Chọn Quận/Huyện'}</option>
                {districts.map((district) => <option key={district.code} value={district.code}>{district.name}</option>)}
              </select>
              <select required={!selectedAddressId} value={formData.wardCode} onChange={handleWardChange} className="input w-full" disabled={!!selectedAddressId || !formData.provinceCode || (usesDistrictLevel && !formData.districtCode)}>
                <option value={selectedAddressId ? formData.wardCode : ''}>{selectedAddressId ? formData.ward : 'Chọn Phường/Xã'}</option>
                {wards.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
              </select>
            </div>

            <textarea value={formData.buyerNote} onChange={(e) => setFormData({ ...formData, buyerNote: e.target.value })} className="input w-full" rows="3" placeholder="Ghi chú cho shop" />

            <div>
              <label className="mb-2 block font-medium">Phương thức thanh toán</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paymentMethods.map((method) => (
                  <label key={method.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${formData.paymentMethod === method.value ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="sr-only" />
                    <img src={method.logo} alt={method.name} className="h-9 w-20 rounded object-contain" />
                    <span>
                      <span className="block font-semibold">{method.name}</span>
                      <span className="block text-xs text-gray-600">{method.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">Đơn hàng</h3>
          <div className="mb-4 space-y-3">
            {checkoutItems.map((item) => (
              <div key={getCartItemKey(item)} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="line-clamp-2">{item.title} x{item.quantity}</span>
                  {Object.keys(item.selectedAttributes || {}).length > 0 && (
                    <span className="mt-1 block text-xs text-gray-500">
                      {Object.entries(item.selectedAttributes).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{((item.salePrice || item.price) * item.quantity).toLocaleString('vi-VN')} đ</span>
              </div>
            ))}
          </div>

          <div className="mb-4 border-b pb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block font-medium">Mã giảm giá</label>
              {!appliedCoupon && (
                <button type="button" onClick={() => setShowCouponList(!showCouponList)} className="flex items-center gap-1 text-sm font-medium text-primary-600">
                  <FiTag /> Nhập mã khác {showCouponList ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}
            </div>
            {(showCouponList || appliedCoupon || availableCoupons.length === 0) && (
            <div className="flex gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Nhập mã" className="input flex-1" disabled={!!appliedCoupon} />
              {appliedCoupon ? (
                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="btn-secondary px-4">Gỡ</button>
              ) : (
                <button type="button" onClick={() => couponCode.trim() ? applyCouponCode(couponCode) : toast.error('Vui lòng nhập mã giảm giá')} disabled={couponLoading} className="btn-primary px-4">
                  {couponLoading ? '...' : 'Áp dụng'}
                </button>
              )}
            </div>
            )}
            {appliedCoupon && <div className="mt-2 rounded bg-green-50 p-2 text-sm text-green-700">Đã áp dụng {appliedCoupon.code}</div>}
            {availableCoupons.length > 0 && (
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {availableCoupons.map((coupon) => {
                  const selected = appliedCoupon?.code === coupon.code;
                  return (
                    <button
                      key={coupon._id || coupon.code}
                      type="button"
                      onClick={() => !selected && handleSelectCoupon(coupon.code)}
                      disabled={couponLoading || selected || !!appliedCoupon}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-primary-700">{coupon.code}</span>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-sm font-semibold text-red-600">
                          {coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : `-${Number(coupon.discountValue || 0).toLocaleString('vi-VN')} đ`}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {coupon.description || `Đơn tối thiểu ${Number(coupon.minOrderValue || 0).toLocaleString('vi-VN')} đ`}
                      </div>
                      {selected && <div className="mt-2 text-xs font-semibold text-green-700">Đang áp dụng</div>}
                    </button>
                  );
                })}
              </div>
            )}
            {!appliedCoupon && false && availableCoupons.length > 0 && (
              <div className="mt-3">
                <button type="button" onClick={() => setShowCouponList(!showCouponList)} className="flex items-center gap-2 text-sm text-primary-600">
                  <FiTag /> Chọn mã giảm giá ({availableCoupons.length}) {showCouponList ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {showCouponList && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border">
                    {availableCoupons.map((coupon) => (
                      <button key={coupon._id} type="button" onClick={() => { setCouponCode(coupon.code); setShowCouponList(false); applyCouponCode(coupon.code); }} className="block w-full border-b p-3 text-left last:border-b-0 hover:bg-gray-50">
                        <div className="flex justify-between">
                          <span className="font-semibold text-primary-600">{coupon.code}</span>
                          <span className="text-sm font-medium text-red-600">{coupon.discountType === 'percentage' ? `-${coupon.discountValue}%` : `-${coupon.discountValue.toLocaleString('vi-VN')} đ`}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{coupon.description || `Đơn tối thiểu ${(coupon.minOrderValue || 0).toLocaleString('vi-VN')} đ`}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between"><span>Tạm tính:</span><span>{totals.subtotal.toLocaleString('vi-VN')} đ</span></div>
            <div className="flex justify-between"><span>Phí vận chuyển:</span><span>{totals.shipping.toLocaleString('vi-VN')} đ</span></div>
            {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá:</span><span>-{totals.discount.toLocaleString('vi-VN')} đ</span></div>}
            <div className="flex justify-between border-t pt-2 text-xl font-bold">
              <span>Tổng:</span>
              <span className="text-primary-600">{totals.total.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full py-3">
            {loading ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
