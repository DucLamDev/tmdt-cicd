const BLOCKED_TERMS = [
  'lừa đảo',
  'lua dao',
  'scam',
  'fake',
  'hàng cấm',
  'hang cam',
  'vũ khí',
  'vu khi',
  'ma túy',
  'ma tuy',
  'đánh bạc',
  'danh bac'
];

const FRAUD_PATTERNS = [
  /chuy[eể]n\s*kho[aả]n\s*ri[eê]ng/i,
  /giao\s*d[iị]ch\s*ngo[aà]i/i,
  /b[oỏ]\s*qua\s*(s[aà]n|h[eệ]\s*th[oố]ng)/i,
  /li[eê]n\s*h[eệ]\s*(zalo|telegram|facebook)\s*ri[eê]ng/i
];

export const scanViolation = (input = '') => {
  const text = String(input).toLowerCase();
  const matchedTerms = BLOCKED_TERMS.filter((term) => text.includes(term));
  const matchedFraud = FRAUD_PATTERNS.filter((pattern) => pattern.test(text));

  return {
    hasViolation: matchedTerms.length > 0 || matchedFraud.length > 0,
    reasons: [
      ...matchedTerms.map((term) => `Từ khóa nhạy cảm: ${term}`),
      ...matchedFraud.map(() => 'Dấu hiệu giao dịch ngoài hệ thống')
    ]
  };
};

export const assertCleanContent = (fields = {}) => {
  const combined = Object.values(fields).filter(Boolean).join(' ');
  const result = scanViolation(combined);
  if (!result.hasViolation) return result;

  const error = new Error('Nội dung có dấu hiệu vi phạm quy định. Vui lòng chỉnh sửa trước khi gửi.');
  error.statusCode = 400;
  error.moderation = result;
  throw error;
};
