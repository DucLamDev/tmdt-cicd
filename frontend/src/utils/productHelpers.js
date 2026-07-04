const stripVietnamese = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const FASHION_KEYWORDS = [
  'thoi trang',
  'ao',
  'quan',
  'vay',
  'dam',
  'jean',
  'polo',
  'shirt',
  'top',
  'bottom',
  'dress',
  'clothing',
  'fashion'
];

const PRODUCT_IMAGE_MATCHERS = [
  { terms: ['iphone'], url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80' },
  { terms: ['galaxy s24', 'samsung galaxy'], url: 'https://images.unsplash.com/photo-1705585174953-4c6f3475360e?auto=format&fit=crop&w=900&q=80' },
  { terms: ['macbook'], url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80' },
  { terms: ['airpods'], url: 'https://images.unsplash.com/photo-1606741965429-8d76ff50bb2f?auto=format&fit=crop&w=900&q=80' },
  { terms: ['ipad', 'tablet', 'tab s9'], url: 'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?auto=format&fit=crop&w=900&q=80' },
  { terms: ['xiaomi', 'oppo', 'rog phone'], url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80' },
  { terms: ['dell xps', 'thinkpad', 'laptop'], url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80' },
  { terms: ['sony wh', 'headphone', 'tai nghe'], url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80' },
  { terms: ['apple watch', 'watch'], url: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=900&q=80' },
  { terms: ['buds'], url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80' },
  { terms: ['polo', 'ao'], url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80' },
  { terms: ['jean', 'quan'], url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80' },
  { terms: ['vay', 'dress'], url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80' },
  { terms: ['keychron', 'keyboard', 'ban phim'], url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80' },
  { terms: ['logitech', 'mouse', 'chuot'], url: '/logitech-g-logo.svg' },
  { terms: ['anker', 'power bank', 'sac du phong'], url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80' }
];

const getMatchedProductImage = (product = {}) => {
  const source = stripVietnamese([
    product.title,
    product.brand,
    ...(product.categories || []),
    ...(product.tags || [])
  ].join(' '));

  return PRODUCT_IMAGE_MATCHERS.find(({ terms }) =>
    terms.some(term => source.includes(stripVietnamese(term)))
  )?.url;
};

export const isFashionProduct = (product = {}) => {
  const source = [
    product.title,
    product.brand,
    ...(product.categories || []),
    ...(product.tags || [])
  ].join(' ');

  const normalized = stripVietnamese(source);
  return FASHION_KEYWORDS.some(keyword => normalized.includes(keyword));
};

export const getTryOnCategory = (product = {}) => {
  const source = stripVietnamese([
    product.title,
    ...(product.categories || []),
    ...(product.tags || [])
  ].join(' '));

  if (['dam', 'vay', 'dress'].some(keyword => source.includes(keyword))) return 'dress';
  if (['quan', 'jean', 'bottom', 'pant'].some(keyword => source.includes(keyword))) return 'bottom';
  if (['ao', 'polo', 'shirt', 'top'].some(keyword => source.includes(keyword))) return 'top';
  return 'clothing';
};

export const getProductImage = (product = {}, index = 0) => {
  const image = product.images?.[index];
  const isPlaceholder = image?.includes('picsum.photos') || image?.includes('placehold.co');
  if (image && !isPlaceholder) return image;

  return getProductFallbackImage(product);
};

export const getProductFallbackImage = (product = {}) => {
  const matchedImage = getMatchedProductImage(product);
  if (matchedImage) return matchedImage;

  const title = encodeURIComponent(product.title || 'Marketplace Product');
  return `https://placehold.co/600x600/f8fafc/111827/png?text=${title}`;
};

export const handleProductImageError = (event, product = {}) => {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === 'true') return;
  target.dataset.fallbackApplied = 'true';
  target.src = getProductFallbackImage(product);
};
