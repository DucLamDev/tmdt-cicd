import logger from '../config/logger.js';

const GHN_BASE_URL = (process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn/shiip/public-api').replace(/\/$/, '');
const GHN_TOKEN = process.env.GHN_TOKEN || process.env.GHN_API_TOKEN || '';
const LEGACY_PROVINCES_BASE_URL = 'https://provinces.open-api.vn/api/v1';
const MODERN_PROVINCES_BASE_URL = 'https://provinces.open-api.vn/api/v2';
const ADDRESS_SOURCE = (process.env.ADDRESS_SOURCE || 'modern').toLowerCase();
const USE_GHN_SOURCE = ADDRESS_SOURCE === 'ghn' || ADDRESS_SOURCE === 'legacy';

const normalizeCode = (value) => String(value ?? '').trim();

const safeFetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Address API error ${response.status}`);
  }

  return payload;
};

const ghnRequest = async (path, body) => {
  if (!GHN_TOKEN) throw new Error('GHN_TOKEN is not configured');

  const hasBody = body && Object.keys(body).length > 0;
  return safeFetchJson(`${GHN_BASE_URL}${path}`, {
    method: hasBody ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      token: GHN_TOKEN,
      ...(process.env.GHN_SHOP_ID ? { ShopId: process.env.GHN_SHOP_ID } : {})
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {})
  });
};

const normalizeGhnProvince = (item = {}) => ({
  code: normalizeCode(item.ProvinceID),
  id: item.ProvinceID,
  name: item.ProvinceName,
  source: 'ghn'
});

const normalizeGhnDistrict = (item = {}) => ({
  code: normalizeCode(item.DistrictID),
  id: item.DistrictID,
  name: item.DistrictName,
  provinceCode: normalizeCode(item.ProvinceID),
  source: 'ghn'
});

const normalizeGhnWard = (item = {}, districtCode) => ({
  code: normalizeCode(item.WardCode),
  id: item.WardCode,
  name: item.WardName,
  districtCode: normalizeCode(item.DistrictID || districtCode),
  source: 'ghn'
});

const normalizeFallbackProvince = (item = {}) => ({
  code: normalizeCode(item.code),
  id: item.code,
  name: item.name,
  source: item.source || 'fallback'
});

const normalizeFallbackDistrict = (item = {}, provinceCode) => ({
  code: normalizeCode(item.code),
  id: item.code,
  name: item.name,
  provinceCode: normalizeCode(provinceCode),
  source: 'fallback'
});

const normalizeModernWard = (item = {}, provinceCode) => ({
  code: normalizeCode(item.code),
  id: item.code,
  name: item.name,
  provinceCode: normalizeCode(item.province_code || provinceCode),
  source: 'open-api-v2'
});

const normalizeFallbackWard = (item = {}, districtCode) => ({
  code: normalizeCode(item.code),
  id: item.code,
  name: item.name,
  districtCode: normalizeCode(districtCode),
  source: 'fallback'
});

const listModernProvinces = async () => {
  const payload = await safeFetchJson(`${MODERN_PROVINCES_BASE_URL}/p/`);
  return (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeFallbackProvince({ ...item, source: 'open-api-v2' }));
};

const listModernProvinceWards = async (provinceCode) => {
  const payload = await safeFetchJson(`${MODERN_PROVINCES_BASE_URL}/p/${provinceCode}?depth=2`);
  return {
    mode: 'province_ward',
    provinceCode: normalizeCode(provinceCode),
    districts: [],
    wards: (payload.wards || []).map((item) => normalizeModernWard(item, provinceCode)),
    source: 'open-api-v2'
  };
};

const listFallbackProvinces = async () => {
  const payload = await safeFetchJson(`${LEGACY_PROVINCES_BASE_URL}/p/`);
  return (Array.isArray(payload) ? payload : []).map(normalizeFallbackProvince);
};

const listFallbackDistricts = async (provinceCode) => {
  const payload = await safeFetchJson(`${LEGACY_PROVINCES_BASE_URL}/p/${provinceCode}?depth=2`);
  return (payload.districts || []).map((item) => normalizeFallbackDistrict(item, provinceCode));
};

const listFallbackWards = async (districtCode) => {
  const payload = await safeFetchJson(`${LEGACY_PROVINCES_BASE_URL}/d/${districtCode}?depth=2`);
  return (payload.wards || []).map((item) => normalizeFallbackWard(item, districtCode));
};

export const listProvinces = async () => {
  if (!USE_GHN_SOURCE) return listModernProvinces();

  try {
    const payload = await ghnRequest('/master-data/province');
    return (payload.data || []).map(normalizeGhnProvince);
  } catch (error) {
    logger.warn(`GHN provinces unavailable, using fallback: ${error.message}`);
    return listFallbackProvinces();
  }
};

export const listDistricts = async (provinceCode) => {
  if (!USE_GHN_SOURCE) return listModernProvinceWards(provinceCode);

  try {
    const payload = await ghnRequest('/master-data/district', { province_id: Number(provinceCode) });
    return (payload.data || []).map(normalizeGhnDistrict);
  } catch (error) {
    logger.warn(`GHN districts unavailable, using fallback: ${error.message}`);
    return listFallbackDistricts(provinceCode);
  }
};

export const listWards = async (districtCode) => {
  if (!USE_GHN_SOURCE) {
    const result = await listModernProvinceWards(districtCode);
    return result.wards;
  }

  try {
    const payload = await ghnRequest('/master-data/ward', { district_id: Number(districtCode) });
    return (payload.data || []).map((item) => normalizeGhnWard(item, districtCode));
  } catch (error) {
    logger.warn(`GHN wards unavailable, using fallback: ${error.message}`);
    return listFallbackWards(districtCode);
  }
};

export default {
  listProvinces,
  listDistricts,
  listWards
};
