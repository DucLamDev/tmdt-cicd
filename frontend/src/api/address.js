import apiClient from './client';

const unwrapData = (response) => response.data ?? response;
const unwrapList = (response) => {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.districts)) return data.districts;
  if (Array.isArray(data?.wards)) return data.wards;
  return [];
};

export const getProvinces = async () => {
  try {
    return unwrapList(await apiClient.get('/addresses/provinces'));
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
};

export const getProvinceWithDistricts = async (provinceCode) => {
  try {
    const response = await apiClient.get(`/addresses/districts/${provinceCode}`);
    const data = unwrapData(response);
    if (Array.isArray(data)) {
      return { code: provinceCode, mode: 'district_ward', districts: data, wards: [] };
    }
    return {
      code: provinceCode,
      mode: data?.mode || 'district_ward',
      districts: data?.districts || [],
      wards: data?.wards || [],
      source: data?.source
    };
  } catch (error) {
    console.error('Error fetching province details:', error);
    return { code: provinceCode, mode: 'district_ward', districts: [], wards: [] };
  }
};

export const getDistrictWithWards = async (districtCode) => {
  try {
    const wards = unwrapList(await apiClient.get(`/addresses/wards/${districtCode}`));
    return { code: districtCode, wards };
  } catch (error) {
    console.error('Error fetching district details:', error);
    return { code: districtCode, wards: [] };
  }
};

export const formatAddressLine = (address = {}) => [
  address.street,
  address.ward,
  address.district,
  address.city
].filter(Boolean).join(', ');

export const addressAPI = {
  getProvinces,
  getProvinceWithDistricts,
  getDistrictWithWards,
  formatAddressLine,
  list: () => apiClient.get('/addresses'),
  create: (data) => apiClient.post('/addresses', data),
  update: (id, data) => apiClient.put(`/addresses/${id}`, data),
  remove: (id) => apiClient.delete(`/addresses/${id}`),
  setDefault: (id) => apiClient.patch(`/addresses/${id}/default`)
};
