import Address from '../models/Address.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { isValidVietnamPhone, normalizeComparableText } from '../utils/validators.js';
import { listDistricts, listProvinces, listWards } from '../services/ghnService.js';

const REQUIRED_FIELDS = ['recipientName', 'phone', 'city', 'ward', 'street'];

const sanitizeAddressPayload = (body) => ({
  label: body.label?.trim() || 'Địa chỉ',
  recipientName: body.recipientName?.trim(),
  phone: body.phone?.trim(),
  city: body.city?.trim(),
  provinceCode: body.provinceCode?.toString().trim(),
  district: body.district?.trim(),
  districtCode: body.districtCode?.toString().trim(),
  ward: body.ward?.trim(),
  wardCode: body.wardCode?.toString().trim(),
  street: body.street?.trim(),
  postalCode: body.postalCode?.trim(),
  isDefault: Boolean(body.isDefault)
});

const validatePayload = (payload) => {
  const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
  if (missing.length) return `Thiếu thông tin địa chỉ: ${missing.join(', ')}`;
  if (!isValidVietnamPhone(payload.phone)) return 'Số điện thoại nhận hàng không hợp lệ';
  return null;
};

const escapeRegex = (value) => normalizeComparableText(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDuplicateFilter = (userId, payload, excludeId) => {
  const filter = {
    userId,
    recipientName: new RegExp(`^${escapeRegex(payload.recipientName)}$`, 'i'),
    phone: payload.phone,
    city: new RegExp(`^${escapeRegex(payload.city)}$`, 'i'),
    ward: new RegExp(`^${escapeRegex(payload.ward)}$`, 'i'),
    street: new RegExp(`^${escapeRegex(payload.street)}$`, 'i')
  };
  if (payload.district) filter.district = new RegExp(`^${escapeRegex(payload.district)}$`, 'i');
  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
};

const ensureSingleDefault = async (userId, addressId) => {
  await Address.updateMany(
    { userId, _id: { $ne: addressId }, isDefault: true },
    { $set: { isDefault: false } }
  );
};

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, updatedAt: -1 });
  res.json({ success: true, data: addresses });
});

export const getProvinces = asyncHandler(async (req, res) => {
  const provinces = await listProvinces();
  res.json({ success: true, data: provinces });
});

export const getDistricts = asyncHandler(async (req, res) => {
  const districts = await listDistricts(req.params.provinceCode);
  res.json({ success: true, data: districts });
});

export const getWards = asyncHandler(async (req, res) => {
  const wards = await listWards(req.params.districtCode);
  res.json({ success: true, data: wards });
});

export const createAddress = asyncHandler(async (req, res) => {
  const payload = sanitizeAddressPayload(req.body);
  const validationError = validatePayload(payload);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const duplicate = await Address.findOne(buildDuplicateFilter(req.user._id, payload));
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'Địa chỉ này đã tồn tại trong tài khoản' });
  }

  const existingCount = await Address.countDocuments({ userId: req.user._id });
  const address = await Address.create({
    ...payload,
    userId: req.user._id,
    isDefault: payload.isDefault || existingCount === 0
  });

  if (address.isDefault) await ensureSingleDefault(req.user._id, address._id);

  res.status(201).json({ success: true, message: 'Đã thêm địa chỉ nhận hàng', data: address });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

  const payload = { ...address.toObject(), ...sanitizeAddressPayload(req.body) };
  const validationError = validatePayload(payload);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const duplicate = await Address.findOne(buildDuplicateFilter(req.user._id, payload, address._id));
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'Địa chỉ này đã tồn tại trong tài khoản' });
  }

  Object.assign(address, payload);
  await address.save();
  if (address.isDefault) await ensureSingleDefault(req.user._id, address._id);

  res.json({ success: true, message: 'Đã cập nhật địa chỉ', data: address });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const nextDefault = await Address.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  res.json({ success: true, message: 'Đã xóa địa chỉ' });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

  address.isDefault = true;
  await address.save();
  await ensureSingleDefault(req.user._id, address._id);

  res.json({ success: true, message: 'Đã đặt địa chỉ mặc định', data: address });
});

export default {
  listAddresses,
  getProvinces,
  getDistricts,
  getWards,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
