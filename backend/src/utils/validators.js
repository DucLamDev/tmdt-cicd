export const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase and number';

export const isStrongPassword = (password = '') => (
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password)
);

export const isValidVietnamPhone = (phone = '') => {
  const normalized = String(phone).replace(/\s|\.|-/g, '');
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(normalized);
};

export const normalizeComparableText = (value = '') => (
  String(value).trim().replace(/\s+/g, ' ').toLowerCase()
);
