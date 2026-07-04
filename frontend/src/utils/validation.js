export const passwordRuleText = 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và số';

export const isStrongPassword = (password = '') => (
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
);

export const isValidVietnamPhone = (phone = '') => {
  const normalized = String(phone).replace(/\s|\.|-/g, '');
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(normalized);
};
