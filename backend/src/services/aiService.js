import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import logger from '../config/logger.js';
import fs from 'fs/promises';

import dotenv from 'dotenv';
dotenv.config();
// Initialize Gemini client (free model)
let genAI = null;
let model = null;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const normalizeGeminiModel = (value) => {
  const modelName = String(value || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, '');
  if (!modelName || modelName === 'gemini-1.5-flash') return DEFAULT_GEMINI_MODEL;
  return modelName;
};
const GEMINI_MODEL = normalizeGeminiModel(process.env.GEMINI_MODEL);
const GEMINI_MODEL_CANDIDATES = [...new Set([
  GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
])];
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE_URL = (process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5.5';
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
} else {
  logger.warn('Gemini API key not configured, chatbot will use mock responses');
}

const cleanJsonText = (text = '') => text
  .replace(/```json/gi, '')
  .replace(/```/g, '')
  .trim();

const ensureArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const requestGeminiContent = async (candidateModel, body, timeoutMs = 30000) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${GEMINI_API_KEY}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error?.message || `Gemini REST error ${response.status}`);
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) throw new Error('Gemini returned empty response');
    return text;
  } finally {
    clearTimeout(timeout);
  }
};

const generateGeminiText = async (prompt) => {
  if (!GEMINI_API_KEY) return null;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      topP: 0.9,
      maxOutputTokens: 2048
    }
  };

  let lastError = null;
  for (const candidateModel of GEMINI_MODEL_CANDIDATES) {
    try {
      return await requestGeminiContent(candidateModel, body);
    } catch (error) {
      lastError = error;
      logger.warn(`Gemini text model ${candidateModel} failed: ${error.message}`);
    }
  }

  if (!model) throw lastError;

  const result = await model.generateContent(prompt);
  const sdkResponse = await result.response;
  return sdkResponse.text();
};

const generateGeminiVisionJson = async ({ prompt, imageBuffer, mimeType }) => {
  if (!GEMINI_API_KEY) return null;

  let lastError = null;
  for (const candidateModel of GEMINI_MODEL_CANDIDATES) {
    try {
      const text = await requestGeminiContent(candidateModel, {
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBuffer.toString('base64')
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 512
        }
      });
      return JSON.parse(cleanJsonText(text));
    } catch (error) {
      lastError = error;
      logger.warn(`Gemini vision model ${candidateModel} failed: ${error.message}`);
    }
  }

  if (lastError) throw lastError;
  return null;
};

const normalizeVisionAnalysis = (analysis = {}, provider = 'unknown') => ({
  productType: String(analysis.productType || analysis.product_type || '').trim(),
  color: String(analysis.color || analysis.primaryColor || analysis.primary_color || '').trim(),
  brand: String(analysis.brand || '').trim(),
  material: String(analysis.material || '').trim(),
  style: String(analysis.style || '').trim(),
  gender: String(analysis.gender || '').trim(),
  visualSignature: String(analysis.visualSignature || analysis.visual_signature || '').trim(),
  keywords: ensureArray(analysis.keywords).map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12),
  categories: ensureArray(analysis.categories).map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6),
  attributes: ensureArray(analysis.attributes).map(String).map((item) => item.trim()).filter(Boolean).slice(0, 10),
  confidence: Math.max(0, Math.min(1, Number(analysis.confidence ?? 0.5) || 0)),
  provider
});

const generateOpenAIVisionJson = async ({ prompt, imageBuffer, mimeType }) => {
  if (!OPENAI_API_KEY) return null;

  const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBuffer.toString('base64')}`;
  const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'high'
            }
          }
        ]
      }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 700
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI vision error ${response.status}`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI vision returned empty response');
  return JSON.parse(cleanJsonText(text));
};

/**
 * Get product recommendations for a user
 * Uses collaborative filtering / popularity-based approach
 * Can be enhanced with embeddings for content-based filtering
 */
export const getRecommendations = async (userId, limit = 10) => {
  try {
    const baseFilter = { isActive: true, isApproved: true };
    let signalProducts = [];

    if (userId) {
      const [recentItems, deliveredOrders] = await Promise.all([
        RecentlyViewed.find({ userId })
          .sort({ viewedAt: -1 })
          .limit(12)
          .populate('productId', 'categories brand tags title')
          .lean(),
        Order.find({ buyerId: userId, orderStatus: 'DELIVERED' })
          .sort({ updatedAt: -1 })
          .limit(12)
          .populate('items.productId', 'categories brand tags title')
          .lean()
      ]);

      signalProducts = [
        ...recentItems.map((item) => item.productId).filter(Boolean),
        ...deliveredOrders.flatMap((order) => order.items || []).map((item) => item.productId).filter(Boolean)
      ];
    }

    const categories = [...new Set(signalProducts.flatMap((product) => product.categories || []).filter(Boolean))];
    const brands = [...new Set(signalProducts.map((product) => product.brand).filter(Boolean))];
    const tags = [...new Set(signalProducts.flatMap((product) => product.tags || []).filter(Boolean))];
    const excludedIds = signalProducts.map((product) => product._id).filter(Boolean);

    let recommendations = [];
    if (categories.length || brands.length || tags.length) {
      recommendations = await Product.find({
        ...baseFilter,
        _id: { $nin: excludedIds },
        $or: [
          ...(categories.length ? [{ categories: { $in: categories } }] : []),
          ...(brands.length ? [{ brand: { $in: brands } }] : []),
          ...(tags.length ? [{ tags: { $in: tags } }] : [])
        ]
      })
        .sort({ soldCount: -1, ratingAvg: -1, createdAt: -1 })
        .limit(limit)
        .select('title slug images price salePrice ratingAvg reviewCount soldCount brand categories tags')
        .lean();
    }

    if (recommendations.length < limit) {
      const existingIds = [...excludedIds, ...recommendations.map((product) => product._id)];
      const popular = await Product.find({
        ...baseFilter,
        _id: { $nin: existingIds }
      })
        .sort({ soldCount: -1, ratingAvg: -1, createdAt: -1 })
        .limit(limit - recommendations.length)
        .select('title slug images price salePrice ratingAvg reviewCount soldCount brand categories tags')
        .lean();

      recommendations = [...recommendations, ...popular];
    }

    return recommendations;
  } catch (error) {
    logger.error(`Recommendation error: ${error.message}`);
    throw error;
  }
};

const getMimeTypeFromPath = (filePath = '') => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const analyzeProductImage = async (imagePath, mimeType) => {
  const imageBuffer = await fs.readFile(imagePath);
  const prompt = `Analyze this marketplace product image for product search.
Return valid JSON only, no markdown. The JSON must use this shape:
{
  "productType": "short Vietnamese and English product type, for example ao thun / t-shirt",
  "color": "main color",
  "brand": "visible brand if clear, otherwise empty string",
  "material": "visible material or empty string",
  "style": "style, fit, or use case if visible",
  "gender": "men, women, unisex, kids, or empty string",
  "visualSignature": "compact description of shape, pattern, key details",
  "keywords": ["6-12 searchable Vietnamese and English terms, include unaccented Vietnamese variants when useful"],
  "categories": ["likely marketplace categories"],
  "attributes": ["specific visual attributes such as collar, sleeve, camera layout, heel type, pattern"],
  "confidence": 0-1
}
If the image is not a clear product photo, set confidence below 0.25.`;

  const imageMimeType = mimeType || getMimeTypeFromPath(imagePath);

  if (OPENAI_API_KEY) {
    try {
      const analysis = await generateOpenAIVisionJson({ prompt, imageBuffer, mimeType: imageMimeType });
      return normalizeVisionAnalysis(analysis, 'openai');
    } catch (error) {
      logger.warn(`OpenAI vision analysis failed: ${error.message}`);
    }
  }

  if (GEMINI_API_KEY) {
    const analysis = await generateGeminiVisionJson({
      prompt,
      imageBuffer,
      mimeType: imageMimeType
    });
    return normalizeVisionAnalysis(analysis, 'gemini');
  }

  return null;
};

const buildImageSearchTerms = (analysis = {}) => {
  const rawTerms = [
    analysis.productType,
    analysis.color,
    analysis.brand,
    analysis.material,
    analysis.style,
    analysis.gender,
    analysis.visualSignature,
    ...(analysis.keywords || []),
    ...(analysis.categories || []),
    ...(analysis.attributes || [])
  ].filter(Boolean);

  const expanded = new Set();
  rawTerms.forEach((term) => {
    const value = String(term).trim();
    if (!value) return;
    expanded.add(value);

    const lower = value.toLowerCase();
    if (lower.includes('shirt') || lower.includes('t-shirt') || lower.includes('tee')) {
      ['áo thun', 'ao thun', 'áo phông', 'ao phong', 'tshirt', 't-shirt'].forEach((item) => expanded.add(item));
    }
    if (lower.includes('white') || lower.includes('trắng') || lower.includes('trang')) {
      ['trắng', 'trang', 'white'].forEach((item) => expanded.add(item));
    }
  });

  return [...expanded].slice(0, 14);
};

const searchProductsByTerms = async (terms, limit) => {
  if (!terms.length) return [];

  const regexes = terms.map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  const products = await Product.find({
    isActive: true,
    isApproved: true,
    $or: [
      { title: { $in: regexes } },
      { description: { $in: regexes } },
      { categories: { $in: regexes } },
      { tags: { $in: regexes } },
      { brand: { $in: regexes } }
    ]
  })
    .sort({ soldCount: -1, ratingAvg: -1 })
    .limit(limit)
    .select('title slug images price salePrice ratingAvg reviewCount soldCount brand categories tags')
    .lean();

  return products
    .map((product) => {
      const text = `${product.title || ''} ${product.brand || ''} ${(product.categories || []).join(' ')} ${(product.tags || []).join(' ')}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (text.includes(String(term).toLowerCase()) ? 1 : 0), 0);
      return { ...product, matchScore: score };
    })
    .filter((product) => product.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || (b.soldCount || 0) - (a.soldCount || 0));
};

const normalizeSearchText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/pro\s*max/g, 'pro max')
  .replace(/promax/g, 'pro max')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const VOICE_STOP_WORDS = new Set([
  'toi', 'minh', 'muon', 'mua', 'tim', 'kiem', 'san', 'pham', 'hang', 'co',
  'ban', 'cho', 'xem', 'can', 'gia', 'may', 'chiec', 'cai', 'loai'
]);

const PRODUCT_LINE_ALIASES = [
  { line: 'iphone', patterns: ['iphone', 'ip 15', 'ip15'] },
  { line: 'samsung', patterns: ['samsung', 'galaxy'] },
  { line: 'macbook', patterns: ['macbook'] },
  { line: 'ipad', patterns: ['ipad'] },
  { line: 'airpods', patterns: ['airpods', 'airpod'] },
  { line: 'laptop', patterns: ['laptop'] },
  { line: 'tablet', patterns: ['tablet', 'may tinh bang'] },
  { line: 'watch', patterns: ['dong ho', 'smartwatch', 'apple watch'] },
  { line: 'keyboard', patterns: ['keyboard', 'ban phim'] },
  { line: 'headphone', patterns: ['tai nghe', 'headphone'] },
  { line: 'chair', patterns: ['ghe', 'ghe cong thai hoc'] },
  { line: 'dress', patterns: ['dam', 'vay', 'dress'] },
  { line: 'shirt', patterns: ['ao thun', 'ao phong', 'ao polo', 'shirt', 't shirt'] }
];

const SHOPPING_STOP_WORDS = new Set([
  ...VOICE_STOP_WORDS,
  'toi', 'minh', 'muon', 'mua', 'tim', 'kiem', 'cho', 'xem', 'de', 'voi',
  'mot', 'mon', 'do', 'hang', 'nao', 'gi', 'la', 'co', 'can', 'nen',
  'cap', 'nhat', 'tin', 'tuc', 'hang', 'ngay', 'thong', 'minh',
  'phuc', 'vu', 'viec', 'chua', 'biet', 'chon', 'lua', 'giam', 'sale',
  'khuyen', 'mai', 'uu', 'dai'
]);

const CATALOG_GROUPS = [
  { group: 'phone', patterns: ['dien thoai', 'smartphone', 'iphone', 'samsung', 'galaxy', 'xiaomi', 'oppo', 'phone'] },
  { group: 'tablet', patterns: ['may tinh bang', 'tablet', 'ipad', 'tab'] },
  { group: 'laptop', patterns: ['laptop', 'macbook', 'notebook', 'thinkpad', 'dell', 'asus', 'lenovo'] },
  { group: 'audio', patterns: ['tai nghe', 'headphone', 'earbud', 'airpod', 'buds', 'loa', 'speaker'] },
  { group: 'watch', patterns: ['dong ho', 'smartwatch', 'apple watch', 'watch'] },
  { group: 'fashion_top', patterns: ['ao', 'ao thun', 'ao phong', 'ao polo', 'shirt', 'tee', 'hoodie', 'so mi'] },
  { group: 'fashion_bottom', patterns: ['quan', 'jean', 'pants', 'short'] },
  { group: 'fashion_dress', patterns: ['dam', 'vay', 'dress', 'skirt'] },
  { group: 'footwear', patterns: ['giay', 'sneaker', 'shoe', 'dep', 'sandals'] },
  { group: 'furniture', patterns: ['ghe', 'ban', 'noi that', 'cong thai hoc', 'chair', 'desk'] },
  { group: 'accessory', patterns: ['phu kien', 'op lung', 'sac', 'cap', 'adapter', 'case'] }
];

const QUERY_INTENT_RULES = [
  {
    group: 'web_browsing_device',
    patterns: ['luot web', 'duyet web', 'doc bao', 'xem youtube', 'xem phim', 'giai tri online'],
    allowedGroups: ['phone', 'tablet', 'laptop']
  },
  {
    group: 'electronics',
    patterns: ['san pham dien tu', 'do dien tu', 'thiet bi dien tu', 'hang dien tu'],
    allowedGroups: ['phone', 'tablet', 'laptop', 'audio', 'watch']
  },
  {
    group: 'smart_device',
    patterns: ['do dien tu thong minh', 'dien tu thong minh', 'cap nhat tin tuc', 'doc tin tuc', 'xem tin tuc', 'thiet bi thong minh', 'smart device'],
    allowedGroups: ['phone', 'tablet', 'laptop', 'watch']
  },
  {
    group: 'study_device',
    patterns: ['hoc tap', 'hoc online', 'lam viec van phong', 'may hoc tap'],
    allowedGroups: ['laptop', 'tablet']
  }
];

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizedHasPhrase = (normalizedText = '', pattern = '') => {
  const normalizedPattern = normalizeSearchText(pattern);
  if (!normalizedText || !normalizedPattern) return false;

  const phrasePattern = escapeRegex(normalizedPattern).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${phrasePattern}(?=\\s|$)`).test(normalizedText);
};

const findCatalogGroup = (text = '') => {
  const normalized = normalizeSearchText(text);
  return CATALOG_GROUPS.find((entry) => entry.patterns.some((pattern) => normalizedHasPhrase(normalized, pattern)))?.group || null;
};

const inferQueryIntent = (query = '', searchParams = {}) => {
  const joined = [
    query,
    ...(searchParams.keywords || []),
    searchParams.category,
    searchParams.brand
  ].filter(Boolean).join(' ');
  const normalized = normalizeSearchText(joined);
  const rule = QUERY_INTENT_RULES.find((entry) => entry.patterns.some((pattern) => normalized.includes(pattern)));
  const directGroup = findCatalogGroup(normalized);
  const allowedGroups = rule?.allowedGroups || (directGroup ? [directGroup] : []);
  const tokens = normalized
    .split(' ')
    .filter((token) => token.length > 1 && !SHOPPING_STOP_WORDS.has(token));

  return {
    normalized,
    tokens,
    directGroup,
    ruleGroup: rule?.group || null,
    allowedGroups,
    brand: searchParams.brand ? normalizeSearchText(searchParams.brand) : null,
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    sortBy: searchParams.sortBy,
    isBroadQuery: !allowedGroups.length && !tokens.length && !searchParams.brand
  };
};

const flattenProductForCatalogSearch = (product = {}) => normalizeSearchText([
  product.title,
  product.description,
  product.shortDescription,
  product.brand,
  ...(product.categories || []),
  ...(product.tags || []),
  JSON.stringify(product.attributes || {}),
  JSON.stringify(product.specifications || {})
].filter(Boolean).join(' '));

const scoreCatalogProduct = (product, intent) => {
  const text = flattenProductForCatalogSearch(product);
  const productGroup = findCatalogGroup(text);
  const effectivePrice = product.salePrice || product.price || 0;

  if (intent.minPrice && effectivePrice < intent.minPrice) return -1;
  if (intent.maxPrice && effectivePrice > intent.maxPrice) return -1;
  if (intent.brand && !text.includes(intent.brand)) return -1;

  let relevanceScore = 0;
  if (intent.allowedGroups.length) {
    if (intent.allowedGroups.includes(productGroup)) {
      relevanceScore += 70;
    } else {
      return -1;
    }
  }

  let matchedTokenCount = 0;
  intent.tokens.forEach((token) => {
    if (normalizedHasPhrase(text, token)) {
      matchedTokenCount += 1;
      relevanceScore += token.length > 4 ? 14 : 8;
    }
  });

  if (intent.normalized && normalizedHasPhrase(text, intent.normalized)) relevanceScore += 80;

  const hasExplicitRelevance = relevanceScore > 0 || Boolean(intent.brand) || intent.isBroadQuery;
  if (!hasExplicitRelevance || (!intent.allowedGroups.length && intent.tokens.length && matchedTokenCount === 0)) {
    return -1;
  }

  let score = relevanceScore;
  if (Number(product.stock || 0) > 0) score += 8;
  score += Math.min(18, Number(product.soldCount || 0) / 25);
  score += Number(product.ratingAvg || 0) * 2;

  return Math.round(score * 10) / 10;
};

const parseVoiceProductIntent = (query = '') => {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(' ').filter((token) => token && !VOICE_STOP_WORDS.has(token));
  const productLine = PRODUCT_LINE_ALIASES.find((item) => item.patterns.some((pattern) => normalized.includes(pattern)))?.line || null;

  return {
    normalized,
    tokens,
    productLine,
    requiredTokens: productLine
      ? tokens.filter((token) => token !== productLine && token.length > 1)
      : tokens.filter((token) => token.length > 1)
  };
};

const productMatchesLine = (text, line) => {
  if (!line) return true;
  switch (line) {
    case 'iphone':
      return /\biphone\b/.test(text);
    case 'samsung':
      return /\bsamsung\b|\bgalaxy\b/.test(text);
    case 'macbook':
      return /\bmacbook\b/.test(text);
    case 'ipad':
      return /\bipad\b/.test(text);
    case 'tablet':
      return /\btablet\b|\bipad\b|\bmay tinh bang\b/.test(text);
    case 'airpods':
      return /\bairpods?\b/.test(text);
    case 'watch':
      return /\bdong ho\b|\bwatch\b|\bsmartwatch\b/.test(text);
    case 'laptop':
      return /\blaptop\b|\bmacbook\b|\bdell\b|\basus\b|\blenovo\b/.test(text);
    case 'keyboard':
      return /\bkeyboard\b|\bban phim\b|\bkeychron\b/.test(text);
    case 'headphone':
      return /\btai nghe\b|\bheadphone\b|\bearbuds?\b|\bbuds\b/.test(text);
    case 'chair':
      return /\bghe\b|\bchair\b|\bcong thai hoc\b|\bnoi that\b/.test(text);
    case 'dress':
      return /\bdam\b|\bvay\b|\bdress\b|\bskirt\b/.test(text);
    case 'shirt':
      return /\bao\b|\bshirt\b|\bpolo\b|\bthun\b|\bphong\b/.test(text);
    default:
      return true;
  }
};

const scoreVoiceCandidate = (product, intent) => {
  const text = normalizeSearchText([
    product.title,
    product.brand,
    ...(product.categories || []),
    ...(product.tags || [])
  ].filter(Boolean).join(' '));

  if (!productMatchesLine(text, intent.productLine)) return -1;

  const matchedRequired = intent.requiredTokens.filter((token) => text.includes(token));
  let score = 0;
  if (intent.productLine) score += 60;
  if (intent.normalized && text.includes(intent.normalized.replace(/^(toi|minh|muon|mua|tim|kiem)\s+/g, ''))) score += 90;
  score += matchedRequired.length * 25;
  score += Math.min(20, Number(product.soldCount || 0) / 20);
  score += Number(product.ratingAvg || 0);

  return score;
};

const productTypeMatchers = (analysis = {}) => {
  const typeText = `${analysis.productType || ''} ${(analysis.keywords || []).join(' ')}`.toLowerCase();
  if (/(mobile|cell phone|android|ios|camera phone|iphone|pro max|promax|titanium|titan)/i.test(typeText)) {
    return [/(phone|smartphone|mobile|iphone|apple|samsung|galaxy|xiaomi|oppo|asus|rog|android|ios|dien thoai|điện thoại)/i];
  }
  if (/(áo|ao|shirt|t-shirt|tee|polo|hoodie|sơ mi|so mi)/i.test(typeText)) {
    return [/(áo|ao|shirt|t-shirt|tee|polo|hoodie|thun|phông|phong|sơ mi|so mi)/i];
  }
  if (/(quần|quan|pants|jean|short)/i.test(typeText)) {
    return [/(quần|quan|pants|jean|short)/i];
  }
  if (/(váy|vay|dress|skirt|đầm|dam)/i.test(typeText)) {
    return [/(váy|vay|dress|skirt|đầm|dam)/i];
  }
  if (/(giày|giay|shoe|sneaker|dép|dep)/i.test(typeText)) {
    return [/(giày|giay|shoe|sneaker|dép|dep)/i];
  }
  if (/(tai nghe|headphone|earbud|airpod)/i.test(typeText)) {
    return [/(tai nghe|headphone|earbud|airpod|buds)/i];
  }
  if (/(điện thoại|dien thoai|phone|smartphone|mobile|iphone|samsung|android|ios|pro max|promax)/i.test(typeText)) {
    return [/(điện thoại|dien thoai|phone|smartphone|mobile|iphone|apple|samsung|galaxy|xiaomi|oppo|asus|rog|android|ios)/i];
  }
  return [];
};

const applyImageTypeFilter = (products, analysis) => {
  const matchers = productTypeMatchers(analysis);
  if (!matchers.length) return products;

  const filtered = products.filter((product) => {
    const text = `${product.title || ''} ${product.brand || ''} ${(product.categories || []).join(' ')} ${(product.tags || []).join(' ')}`;
    return matchers.some((matcher) => matcher.test(text));
  });

  return filtered.length ? filtered : products;
};

const IMAGE_GROUPS = [
  { group: 'fashion_top', patterns: ['ao', 'shirt', 't shirt', 'tee', 'polo', 'hoodie', 'top', 'so mi'] },
  { group: 'fashion_bottom', patterns: ['quan', 'pants', 'jean', 'short', 'skirt'] },
  { group: 'fashion_dress', patterns: ['vay', 'dam', 'dress'] },
  { group: 'footwear', patterns: ['giay', 'shoe', 'sneaker', 'dep', 'sandals'] },
  { group: 'phone', patterns: ['dien thoai', 'điện thoại', 'phone', 'smartphone', 'mobile', 'cell phone', 'iphone', 'apple', 'samsung', 'xiaomi', 'oppo', 'galaxy', 'android', 'ios', 'camera', 'pro max', 'promax', 'titanium', 'titan'] },
  { group: 'laptop', patterns: ['laptop', 'macbook', 'notebook', 'dell', 'asus', 'lenovo', 'thinkpad'] },
  { group: 'tablet', patterns: ['may tinh bang', 'tablet', 'ipad', 'tab'] },
  { group: 'audio', patterns: ['tai nghe', 'headphone', 'earbud', 'airpod', 'buds', 'speaker', 'loa'] },
  { group: 'watch', patterns: ['dong ho', 'watch', 'smartwatch'] },
  { group: 'bag', patterns: ['tui', 'bag', 'backpack', 'balo'] }
];

const IMAGE_TERM_SYNONYMS = {
  white: ['trang', 'white'],
  black: ['den', 'black'],
  red: ['do', 'red'],
  blue: ['xanh', 'blue'],
  green: ['xanh la', 'green'],
  yellow: ['vang', 'yellow'],
  pink: ['hong', 'pink'],
  gray: ['xam', 'ghi', 'gray', 'grey'],
  silver: ['bac', 'silver'],
  brown: ['nau', 'brown'],
  shirt: ['ao', 'ao thun', 'ao phong', 'ao polo', 'shirt', 't shirt', 'tee', 'top'],
  pants: ['quan', 'pants', 'jean', 'short'],
  dress: ['vay', 'dam', 'dress'],
  phone: ['dien thoai', 'điện thoại', 'smartphone', 'phone', 'mobile', 'cell phone', 'iphone', 'galaxy', 'android', 'ios', 'camera phone'],
  iphone: ['iphone', 'apple', 'ios', 'pro max', 'promax', 'titanium', 'titan'],
  laptop: ['laptop', 'notebook', 'macbook'],
  headphone: ['tai nghe', 'headphone', 'earbuds', 'buds', 'airpods']
};

const flattenProductForImageSearch = (product = {}) => normalizeSearchText([
  product.title,
  product.description,
  product.shortDescription,
  product.brand,
  ...(product.categories || []),
  ...(product.tags || []),
  JSON.stringify(product.attributes || {}),
  JSON.stringify(product.specifications || {})
].filter(Boolean).join(' '));

const getImageGroup = (value = '') => {
  const normalized = normalizeSearchText(value);
  return IMAGE_GROUPS.find((entry) => entry.patterns.some((pattern) => normalizedHasPhrase(normalized, pattern)))?.group || null;
};

const getImageAnalysisText = (analysis = {}) => normalizeSearchText([
  analysis.productType,
  analysis.color,
  analysis.brand,
  analysis.material,
  analysis.style,
  analysis.visualSignature,
  ...(analysis.keywords || []),
  ...(analysis.categories || []),
  ...(analysis.attributes || [])
].filter(Boolean).join(' '));

const getImageColorTerms = (color = '') => {
  const normalized = normalizeSearchText(color);
  if (!normalized) return [];

  const terms = new Set([normalized]);
  Object.values(IMAGE_TERM_SYNONYMS).forEach((synonyms) => {
    if (synonyms.some((synonym) => normalizedHasPhrase(normalized, synonym))) {
      synonyms.forEach((synonym) => terms.add(normalizeSearchText(synonym)));
    }
  });
  return [...terms].filter(Boolean);
};

const buildExpandedImageSearchTerms = (analysis = {}) => {
  const baseTerms = buildImageSearchTerms(analysis);
  const expanded = new Set(baseTerms);

  baseTerms.forEach((term) => {
    const normalized = normalizeSearchText(term);
    if (!normalized) return;
    expanded.add(normalized);

    Object.entries(IMAGE_TERM_SYNONYMS).forEach(([key, synonyms]) => {
      if (normalized.includes(key) || synonyms.some((synonym) => normalized.includes(synonym))) {
        synonyms.forEach((synonym) => expanded.add(synonym));
      }
    });
  });

  const group = getImageGroup([
    analysis.productType,
    analysis.color,
    analysis.brand,
    analysis.material,
    analysis.style,
    analysis.visualSignature,
    ...(analysis.keywords || []),
    ...(analysis.categories || []),
    ...(analysis.attributes || [])
  ].filter(Boolean).join(' '));

  const groupEntry = IMAGE_GROUPS.find((entry) => entry.group === group);
  groupEntry?.patterns.forEach((pattern) => expanded.add(pattern));

  const analysisText = normalizeSearchText([
    analysis.productType,
    analysis.color,
    analysis.brand,
    analysis.material,
    analysis.style,
    analysis.visualSignature,
    ...(analysis.keywords || []),
    ...(analysis.categories || []),
    ...(analysis.attributes || [])
  ].filter(Boolean).join(' '));
  if (/(iphone|apple|ios|pro max|promax|titan|titanium|camera lens|triple camera|mobile|smartphone|phone)/i.test(analysisText)) {
    ['iphone', 'apple', 'smartphone', 'phone', 'dien thoai', 'pro max', 'promax', 'titanium'].forEach((term) => expanded.add(term));
  }

  return [...expanded]
    .map((term) => String(term).trim())
    .filter(Boolean)
    .slice(0, 30);
};

const scoreImageCandidate = (product, analysis, terms) => {
  const text = flattenProductForImageSearch(product);
  const normalizedTerms = terms.map(normalizeSearchText).filter((term) => term.length > 1);
  const analysisText = getImageAnalysisText(analysis);
  const analysisGroup = getImageGroup(analysisText);
  const productGroup = getImageGroup(text);
  const normalizedBrand = normalizeSearchText(analysis.brand);
  const colorTerms = getImageColorTerms(analysis.color);

  if (analysisGroup && productGroup && productGroup !== analysisGroup) return -1;
  if (analysisGroup && !productGroup) return -1;
  if (normalizedBrand && !text.includes(normalizedBrand)) return -1;

  let score = 0;
  normalizedTerms.forEach((term) => {
    if (normalizedHasPhrase(text, term)) {
      score += term.includes(' ') ? 12 : 8;
      return;
    }

    const tokenHits = term
      .split(' ')
      .filter((token) => token.length > 2 && normalizedHasPhrase(text, token)).length;
    score += tokenHits * 3;
  });

  if (analysisGroup && productGroup === analysisGroup) score += analysisGroup === 'phone' ? 42 : 28;
  if (analysisText.includes('iphone') && text.includes('iphone')) score += 45;
  if (analysisText.includes('apple') && (text.includes('apple') || text.includes('iphone'))) score += 28;
  if ((analysisText.includes('pro max') || analysisText.includes('promax')) && (text.includes('pro max') || text.includes('promax'))) score += 20;
  if (colorTerms.length) {
    const hasColorMatch = colorTerms.some((term) => normalizedHasPhrase(text, term));
    score += hasColorMatch ? 20 : -8;
  }
  score += Math.min(10, Number(product.soldCount || 0) / 30);
  score += Number(product.ratingAvg || 0);

  return Math.round(score * 10) / 10;
};

const searchProductsByVisualSignals = async (analysis, limit) => {
  const terms = buildExpandedImageSearchTerms(analysis);
  const analysisGroup = getImageGroup(getImageAnalysisText(analysis));
  const minScore = analysisGroup ? 34 : 24;

  const candidates = await Product.find({ isActive: true, isApproved: true })
    .sort({ soldCount: -1, ratingAvg: -1, createdAt: -1 })
    .limit(200)
    .select('title slug images price salePrice ratingAvg reviewCount soldCount brand categories tags attributes specifications description shortDescription')
    .lean();

  const exactProducts = applyImageTypeFilter(await searchProductsByTerms(terms, limit * 4), analysis)
    .map((product) => ({ ...product, matchScore: scoreImageCandidate(product, analysis, terms) }))
    .filter((product) => product.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore || (b.soldCount || 0) - (a.soldCount || 0));

  const exactIds = new Set(exactProducts.map((product) => product._id?.toString()).filter(Boolean));
  const fuzzyProducts = candidates
    .filter((product) => !exactIds.has(product._id?.toString()))
    .map((product) => ({ ...product, matchScore: scoreImageCandidate(product, analysis, terms) }))
    .filter((product) => product.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore || (b.soldCount || 0) - (a.soldCount || 0));

  const merged = [...exactProducts, ...fuzzyProducts];
  if (merged.length) {
    return {
      products: merged.slice(0, limit),
      terms,
      approximate: exactProducts.length < Math.min(limit, merged.length)
    };
  }

  return {
    products: [],
    terms,
    approximate: false
  };
};

/**
 * Generate text embeddings (mock implementation for now)
 * @param {String} text - Text to embed
 * @returns {Array} Embedding vector
 */
export const generateTextEmbedding = async (text) => {
  // Return mock embedding - Gemini doesn't have embedding API in free tier
  logger.info('Using mock embedding generation');
  return Array(384).fill(0).map(() => Math.random());
};

/**
 * Search products by image similarity
 * @param {String} imageUrl - URL of the search image
 * @param {Number} limit - Number of results
 * @returns {Array} Similar products
 */
export const searchByImage = async (imageUrl, limit = 8, mimeType) => {
  try {
    logger.info(`Image search requested for: ${imageUrl}`);

    let analysis = null;
    try {
      analysis = await analyzeProductImage(imageUrl, mimeType);
    } catch (error) {
      logger.error(`Image analysis error: ${error.message}`);
    }

    if (!analysis && !OPENAI_API_KEY && !GEMINI_API_KEY) {
      return {
        products: [],
        analysis: { productType: 'fallback', confidence: 0 },
        message: 'Chức năng nhận diện ảnh đang tạm thời chưa sẵn sàng. Vui lòng thử tìm bằng từ khóa trong lúc này.'
      };
    }

    if (!analysis || Number(analysis.confidence || 0) < 0.25) {
      return {
        products: [],
        analysis,
        message: 'Chưa phân tích được đặc điểm ảnh. Vui lòng thử ảnh rõ sản phẩm hơn hoặc nhập thêm mô tả.'
      };
    }

    const searchResult = await searchProductsByVisualSignals(analysis, limit);
    const products = searchResult.products;

    return {
      products,
      analysis: {
        ...analysis,
        searchTerms: searchResult.terms,
        approximate: searchResult.approximate
      },
      message: products.length
        ? `Nhận diện: ${[analysis.color, analysis.productType].filter(Boolean).join(' ')}`.trim()
        : 'Không tìm thấy sản phẩm đủ tương đồng với ảnh mẫu trong dữ liệu hiện tại.'
    };
  } catch (error) {
    logger.error(`Image search error: ${error.message}`);
    throw error;
  }
};

/**
 * Transcribe audio to text (not available in Gemini free tier)
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {String} Transcribed text
 */
export const transcribeAudio = async (audioBuffer) => {
  throw new Error('Audio transcription not available in free tier. Please use text input.');
};

/**
 * Virtual try-on service
 * @param {String} userImageUrl - User photo URL
 * @param {String} productImageUrl - Product image URL
 * @returns {String} Composited image URL
 */
export const virtualTryOn = async (userImageUrl, productImageUrl) => {
  try {
    // Mock implementation
    // TODO: Integrate with image segmentation and composition API
    // e.g., DeepLab for segmentation + alpha compositing
    
    logger.info(`Virtual try-on requested: user=${userImageUrl}, product=${productImageUrl}`);

    // Return placeholder response
    return {
      success: true,
      compositedImageUrl: productImageUrl, // Mock: return product image as-is
      message: 'Virtual try-on feature is in development. Please integrate with a computer vision API.'
    };
  } catch (error) {
    logger.error(`Virtual try-on error: ${error.message}`);
    throw error;
  }
};

export const virtualTryOnFiles = async ({
  userFile,
  productFile,
  productImageUrl,
  productName = '',
  productCategory = 'clothing',
  tryOnContext = ''
}) => {
  const serviceUrl = process.env.AI_TRYON_SERVICE_URL || 'http://localhost:8000';

  if (!userFile || (!productFile && !productImageUrl)) {
    throw new Error('Missing user image or product image');
  }

  const downloadImage = async (imageUrl) => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Cannot download product image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return {
      buffer: Buffer.from(arrayBuffer),
      mimetype: contentType.includes('image/') ? contentType : 'image/jpeg',
      filename: imageUrl.split('/').pop()?.split('?')?.[0] || 'product.jpg'
    };
  };

  const productSource = productFile
    ? {
      buffer: await fs.readFile(productFile.path),
      mimetype: productFile.mimetype || 'image/jpeg',
      filename: productFile.originalname || 'product.jpg'
    }
    : await downloadImage(productImageUrl);

  const userBuffer = await fs.readFile(userFile.path);

  const formData = new FormData();
  formData.append(
    'user_image',
    new Blob([userBuffer], { type: userFile.mimetype || 'image/jpeg' }),
    userFile.originalname || 'user.jpg'
  );
  formData.append(
    'product_image',
    new Blob([productSource.buffer], { type: productSource.mimetype }),
    productSource.filename
  );
  formData.append('product_name', productName);
  formData.append('product_category', productCategory);
  formData.append('tryon_context', tryOnContext);

  const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/api/tryon`, {
    method: 'POST',
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.message || 'AI try-on service failed');
  }

  return payload;
};

/**
 * Extract search parameters from user message using Gemini
 * @param {String} userMessage - User's message
 * @returns {Object} Extracted search parameters
 */
const extractSearchParams = async (userMessage) => {
  try {
    if (!model) {
      // Fallback: simple keyword extraction
      return extractSearchParamsFallback(userMessage);
    }

    const extractionPrompt = `Bạn là hệ thống trích xuất thông tin tìm kiếm sản phẩm. 
Phân tích câu hỏi của khách hàng và trả về JSON với format sau:
{
  "isProductQuery": true/false,
  "keywords": ["từ khóa 1", "từ khóa 2"],
  "category": "danh mục nếu có",
  "brand": "thương hiệu nếu có",
  "minPrice": số hoặc null,
  "maxPrice": số hoặc null,
  "sortBy": "price_asc" | "price_desc" | "rating" | "popular" | "newest" | null
}

Ví dụ:
- "Tôi muốn mua điện thoại dưới 10 triệu" => {"isProductQuery": true, "keywords": ["điện thoại"], "maxPrice": 10000000}
- "Laptop Dell giá từ 15 đến 20 triệu" => {"isProductQuery": true, "keywords": ["laptop"], "brand": "Dell", "minPrice": 15000000, "maxPrice": 20000000}
- "Sản phẩm giảm giá" => {"isProductQuery": true, "sortBy": "price_asc"}

Chỉ trả về JSON, không có text khác.

Câu hỏi: "${userMessage}"

JSON:`;

    let jsonText = (await generateGeminiText(extractionPrompt))?.trim();
    
    // Clean up JSON response (remove markdown if any)
    jsonText = cleanJsonText(jsonText);
    
    try {
      const params = JSON.parse(jsonText);
      return { ...params, rawQuery: userMessage };
    } catch (parseError) {
      logger.warn('Failed to parse extraction result, using fallback');
      return extractSearchParamsFallback(userMessage);
    }
  } catch (error) {
    logger.error(`Extract search params error: ${error.message}`);
    return extractSearchParamsFallback(userMessage);
  }
};

/**
 * Fallback extraction using simple keyword matching
 */
const extractSearchParamsFallback = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();
  const normalized = normalizeSearchText(userMessage);
  const params = {
    isProductQuery: false,
    keywords: [],
    category: null,
    brand: null,
    minPrice: null,
    maxPrice: null,
    sortBy: null,
    rawQuery: userMessage
  };

  // Check if it's a product query
  const productKeywords = ['mua', 'tìm', 'sản phẩm', 'có', 'bán', 'giá', 'điện thoại', 'laptop', 'máy', 'đồ', 'áo', 'quần'];
  const normalizedProductKeywords = ['mua', 'tim', 'kiem', 'san pham', 'co ban', 'gia', 'dien thoai', 'laptop', 'may', 'do', 'ao', 'quan', 'vay', 'dam', 'dress', 'ghe', 'tai nghe', 'thiet bi'];
  if (productKeywords.some(kw => lowerMessage.includes(kw)) || normalizedProductKeywords.some((kw) => normalized.includes(kw))) {
    params.isProductQuery = true;
  }

  const rule = QUERY_INTENT_RULES.find((entry) => entry.patterns.some((pattern) => normalized.includes(pattern)));
  const directGroup = findCatalogGroup(normalized);
  if (rule || directGroup) params.isProductQuery = true;

  // Extract price range
  const pricePatterns = [
    /dưới\s+(\d+)\s*(triệu|nghìn|k|đ)/i,
    /dưới\s+(\d+)\s*(triệu|nghìn|k)/i,
    /trên\s+(\d+)\s*(triệu|nghìn|k|đ)/i,
    /từ\s+(\d+)\s*đến\s+(\d+)\s*(triệu|nghìn|k|đ)/i,
    /(\d+)\s*-\s*(\d+)\s*(triệu|nghìn|k|đ)/i,
    /khoảng\s+(\d+)\s*(triệu|nghìn|k|đ)/i
  ];

  for (const pattern of pricePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const unit = match[match.length - 1]?.toLowerCase();
      const multiplier = unit === 'triệu' ? 1000000 : unit === 'nghìn' || unit === 'k' ? 1000 : 1;
      
      if (pattern.source.includes('dưới')) {
        params.maxPrice = parseInt(match[1]) * multiplier;
      } else if (pattern.source.includes('trên')) {
        params.minPrice = parseInt(match[1]) * multiplier;
      } else if (match[2]) {
        params.minPrice = parseInt(match[1]) * multiplier;
        params.maxPrice = parseInt(match[2]) * multiplier;
      } else {
        // Khoảng
        const value = parseInt(match[1]) * multiplier;
        params.minPrice = value * 0.8;
        params.maxPrice = value * 1.2;
      }
      break;
    }
  }

  // Extract keywords (remove common words)
  const stopWords = ['tôi', 'muốn', 'mua', 'có', 'bán', 'nào', 'gì', 'với', 'giá', 'dưới', 'trên', 'từ', 'đến', 'khoảng'];
  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !SHOPPING_STOP_WORDS.has(word) && !stopWords.includes(word));
  params.keywords = words.slice(0, 8);

  return params;
};

/**
 * Search products based on extracted parameters
 */
const searchProducts = async (searchParams, limit = 6) => {
  try {
    const intent = inferQueryIntent(searchParams.rawQuery || (searchParams.keywords || []).join(' '), searchParams);
    const candidates = await Product.find({ isActive: true, isApproved: true })
      .sort({ soldCount: -1, ratingAvg: -1, createdAt: -1 })
      .limit(350)
      .select('title slug images price salePrice stock ratingAvg reviewCount soldCount brand categories tags attributes specifications description shortDescription createdAt')
      .lean();

    let scored = candidates
      .map((product) => ({
        ...product,
        matchScore: scoreCatalogProduct(product, intent)
      }))
      .filter((product) => product.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (b.soldCount || 0) - (a.soldCount || 0));

    if (intent.allowedGroups.length) {
      const strictGroupResults = scored.filter((product) => intent.allowedGroups.includes(findCatalogGroup(flattenProductForCatalogSearch(product))));
      if (strictGroupResults.length) scored = strictGroupResults;
    }

    if (!scored.length && (intent.allowedGroups.length || intent.isBroadQuery)) {
      const fallbackPool = intent.allowedGroups.length
        ? candidates.filter((product) => intent.allowedGroups.includes(findCatalogGroup(flattenProductForCatalogSearch(product))))
        : candidates;
      scored = (fallbackPool.length ? fallbackPool : candidates)
        .map((product) => ({
          ...product,
          matchScore: Math.max(0, scoreCatalogProduct(product, intent))
        }))
        .sort((a, b) => b.matchScore - a.matchScore || (b.soldCount || 0) - (a.soldCount || 0));
    }

    switch (searchParams.sortBy) {
      case 'price_asc':
        scored.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0));
        break;
      case 'price_desc':
        scored.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0));
        break;
      case 'rating':
        scored.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
        break;
      case 'newest':
        scored.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'popular':
      default:
        break;
    }

    if (intent.allowedGroups.length) {
      const strictResults = scored.filter((product) => (
        intent.allowedGroups.includes(findCatalogGroup(flattenProductForCatalogSearch(product)))
      ));
      scored = strictResults;
    }

    return scored.slice(0, limit);
  } catch (error) {
    logger.error(`Search products error: ${error.message}`);
    return [];
  }
};

/**
 * Chatbot with RAG (Retrieval Augmented Generation)
 * @param {String} userMessage - User's message
 * @param {Object} context - Additional context (cart, order status, etc.)
 * @param {Array} conversationHistory - Previous messages
 * @returns {Object} Bot response with message, products, and updated context
 */
const legacyChatbotResponse = async (userMessage, context = {}, conversationHistory = []) => {
  try {
    // Extract search parameters
    const searchParams = await extractSearchParams(userMessage);
    let products = [];
    let shouldSearchProducts = false;

    // If it's a product query, search for products
    if (searchParams.isProductQuery) {
      shouldSearchProducts = true;
      products = await searchProducts(searchParams, 6);
    }

    if (!model) {
      // Enhanced mock responses with products
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('order')) {
        return {
          message: 'Bạn có thể kiểm tra đơn hàng của mình trong mục "Đơn hàng" ở menu. Nếu cần hỗ trợ cụ thể, vui lòng cung cấp mã đơn hàng.',
          context: { topic: 'orders' },
          products: []
        };
      }
      
      if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) {
        return {
          message: 'Chúng tôi hỗ trợ các hình thức thanh toán: COD (thanh toán khi nhận hàng), chuyển khoản ngân hàng, Momo, ZaloPay. Bạn muốn biết thêm về phương thức nào?',
          context: { topic: 'payment' },
          products: []
        };
      }
      
      if (lowerMessage.includes('giao hàng') || lowerMessage.includes('ship')) {
        return {
          message: 'Thời gian giao hàng thường từ 2-5 ngày làm việc tùy khu vực. Bạn có thể theo dõi đơn hàng real-time trong mục "Đơn hàng".',
          context: { topic: 'shipping' },
          products: []
        };
      }

      // Product query mock response
      if (shouldSearchProducts) {
        if (products.length > 0) {
          return {
            message: `Tôi tìm thấy ${products.length} sản phẩm phù hợp với yêu cầu của bạn. Hãy xem các sản phẩm bên dưới:`,
            context: { topic: 'products', searchParams },
            products: products
          };
        } else {
          return {
            message: 'Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác hoặc điều chỉnh khoảng giá.',
            context: { topic: 'products', searchParams },
            products: []
          };
        }
      }
      
      return {
        message: 'Xin chào! Tôi là trợ lý ảo của shop. Tôi có thể giúp bạn về: đơn hàng, thanh toán, giao hàng, sản phẩm. Bạn cần hỗ trợ gì?',
        context: { topic: 'general' },
        products: []
      };
    }

    // Build system prompt with context
    let systemPrompt = `Bạn là trợ lý mua sắm thân thiện, nhiệt tình trên marketplace TMĐT Việt Nam.
Nhiệm vụ của bạn:
- Tư vấn sản phẩm, giá cả, khuyến mãi
- Hỗ trợ về đơn hàng, thanh toán, giao hàng
- Giải đáp thắc mắc về chính sách đổi trả, bảo hành
- Luôn lịch sự, chuyên nghiệp, dùng tiếng Việt

Context hiện tại: ${JSON.stringify(context)}`;

    // If we found products, include them in the context
    if (products.length > 0) {
      const productsSummary = products.map((p, idx) => 
        `${idx + 1}. ${p.title} - Giá: ${(p.salePrice || p.price).toLocaleString('vi-VN')}đ`
      ).join('\n');
      
      systemPrompt += `\n\nTôi đã tìm thấy các sản phẩm sau phù hợp với yêu cầu:\n${productsSummary}`;
      systemPrompt += `\n\nHãy giới thiệu ngắn gọn về các sản phẩm này (khoảng 2-3 câu) và khuyến khích khách hàng xem chi tiết.`;
    } else if (shouldSearchProducts) {
      systemPrompt += `\n\nTôi đã tìm kiếm nhưng không tìm thấy sản phẩm phù hợp. Hãy xin lỗi và gợi ý khách hàng điều chỉnh tiêu chí tìm kiếm.`;
    }

    systemPrompt += `\n\nHướng dẫn:
- Nếu có sản phẩm, giới thiệu ngắn gọn và khuyến khích khách hàng xem
- Nếu khách hỏi về sản phẩm cụ thể, tư vấn dựa trên thông tin có
- Nếu khách cần kiểm tra đơn hàng, yêu cầu mã đơn hàng
- Nếu khách muốn thanh toán, giải thích các phương thức: COD, chuyển khoản, Momo, ZaloPay
- Trả lời ngắn gọn, rõ ràng, không quá 150 từ`;

    // Build conversation history for context
    let conversationText = systemPrompt + '\n\n';
    
    // Add recent history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'Khách hàng' : 'Trợ lý';
      conversationText += `${role}: ${msg.content}\n`;
    });
    
    conversationText += `Khách hàng: ${userMessage}\nTrợ lý: `;

    // Generate response using Gemini
    const result = await model.generateContent(conversationText);
    const response = await result.response;
    const botMessage = response.text();

    return {
      message: botMessage,
      context: {
        ...context,
        lastTopic: extractTopic(userMessage),
        searchParams: shouldSearchProducts ? searchParams : undefined
      },
      products: products || []
    };
  } catch (error) {
    logger.error(`Chatbot error: ${error.message}`);
    return {
      message: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ CSKH để được hỗ trợ trực tiếp.',
      context: {},
      products: []
    };
  }
};

export const chatbotResponse = async (userMessage, context = {}, conversationHistory = []) => {
  try {
    const searchParams = await extractSearchParams(userMessage);
    const shouldSearchProducts = Boolean(searchParams.isProductQuery);
    const products = shouldSearchProducts ? await searchProducts(searchParams, 3) : [];
    const lowerMessage = userMessage.toLowerCase();

    const localAnswer = () => {
      if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('don hang') || lowerMessage.includes('order')) {
        return 'Bạn có thể kiểm tra đơn hàng trong mục "Đơn hàng". Nếu cần hỗ trợ cụ thể, vui lòng cung cấp mã đơn hàng.';
      }
      if (lowerMessage.includes('thanh toán') || lowerMessage.includes('thanh toan') || lowerMessage.includes('payment')) {
        return 'Shop hỗ trợ COD, chuyển khoản ngân hàng, MoMo, ZaloPay và VNPay. Bạn muốn mình hướng dẫn phương thức nào?';
      }
      if (lowerMessage.includes('giao hàng') || lowerMessage.includes('giao hang') || lowerMessage.includes('ship')) {
        return 'Thời gian giao hàng thường từ 2-5 ngày làm việc tùy khu vực. Bạn có thể theo dõi trạng thái đơn trong mục "Đơn hàng".';
      }
      if (shouldSearchProducts) {
        return products.length > 0
          ? `Mình tìm thấy ${products.length} sản phẩm phù hợp với yêu cầu của bạn. Bạn xem các gợi ý bên dưới nhé.`
          : 'Mình chưa tìm thấy sản phẩm phù hợp. Bạn thử đổi từ khóa, thương hiệu hoặc khoảng giá nhé.';
      }
      return 'Xin chào! Mình có thể giúp bạn tìm sản phẩm, tư vấn mua hàng, thanh toán, giao hàng hoặc kiểm tra đơn hàng.';
    };

    if (!GEMINI_API_KEY) {
      return {
        message: localAnswer(),
        context: { ...context, lastTopic: extractTopic(userMessage), searchParams: shouldSearchProducts ? searchParams : undefined },
        products
      };
    }

    const productsSummary = products.map((p, idx) => (
      `${idx + 1}. ${p.title} | Giá: ${(p.salePrice || p.price).toLocaleString('vi-VN')}đ | Nhóm: ${(p.categories || []).join(', ')} | Score: ${p.matchScore || 0} | Đã bán: ${p.soldCount || 0} | Rating: ${p.ratingAvg || 0}`
    )).join('\n');

    const recentHistory = conversationHistory.slice(-8).map((msg) => (
      `${msg.role === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${msg.content}`
    )).join('\n');

    const prompt = `Bạn là trợ lý mua sắm của một marketplace Việt Nam.
Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, thân thiện, không quá 150 từ.
Không nói bạn bị lỗi kỹ thuật nếu vẫn có thể trả lời bằng dữ liệu bên dưới.

Ngữ cảnh người dùng:
${JSON.stringify(context)}

Lịch sử gần đây:
${recentHistory || 'Chưa có'}

Sản phẩm tìm được:
${productsSummary || 'Không có sản phẩm phù hợp từ truy vấn hiện tại'}

Câu hỏi mới: ${userMessage}

Hãy trả lời hữu ích. Nếu có sản phẩm, gợi ý 1-3 sản phẩm nổi bật và lý do.`;

    let botMessage = null;
    try {
      botMessage = await generateGeminiText(prompt);
    } catch (error) {
      logger.error(`Chatbot Gemini answer error: ${error.message}`);
      botMessage = localAnswer();
    }

    return {
      message: botMessage || localAnswer(),
      context: {
        ...context,
        lastTopic: extractTopic(userMessage),
        searchParams: shouldSearchProducts ? searchParams : undefined
      },
      products
    };
  } catch (error) {
    logger.error(`Chatbot error: ${error.message}`);
    return {
      message: 'Xin lỗi, mình đang gặp sự cố khi kết nối AI. Bạn thử lại sau hoặc nhắn CSKH để được hỗ trợ trực tiếp.',
      context: {},
      products: []
    };
  }
};

/**
 * Extract topic from user message
 */
function extractTopic(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('order')) return 'orders';
  if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) return 'payment';
  if (lowerMessage.includes('giao hàng') || lowerMessage.includes('ship')) return 'shipping';
  if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('product')) return 'products';
  return 'general';
}

/**
 * Generate product embeddings for search and recommendations
 * @param {String} productId - Product ID
 */
export const generateProductEmbeddings = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Generate text embedding from title + description
    const text = `${product.title} ${product.description} ${product.categories.join(' ')}`;
    const textEmbedding = await generateTextEmbedding(text);

    // Update product with embeddings
    product.embeddings = product.embeddings || {};
    product.embeddings.text = textEmbedding;
    
    await product.save();

    logger.info(`Generated embeddings for product: ${product.title}`);
    return true;
  } catch (error) {
    logger.error(`Product embedding generation error: ${error.message}`);
    throw error;
  }
};

/**
 * Semantic search using embeddings
 * @param {String} query - Search query
 * @param {Number} limit - Number of results
 * @returns {Array} Similar products
 */
export const semanticSearch = async (query, limit = 10) => {
  try {
    const voiceIntent = parseVoiceProductIntent(query);
    const results = await searchProducts({
      isProductQuery: true,
      rawQuery: query,
      keywords: voiceIntent.tokens,
      sortBy: null
    }, limit);

    if (voiceIntent.productLine) {
      const strict = results
        .map((product) => ({ ...product, intentScore: scoreVoiceCandidate(product, voiceIntent) }))
        .filter((product) => product.intentScore >= 0)
        .sort((a, b) => b.intentScore - a.intentScore);
      return strict.length ? strict.slice(0, limit) : results;
    }

    return results;
  } catch (error) {
    logger.error(`Semantic search error: ${error.message}`);
    throw error;
  }
};

const legacyPredictAdminTrends = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [topProducts, recentOrders, lowStockProducts] = await Promise.all([
    Product.find({ isActive: true, isApproved: true })
      .sort({ soldCount: -1, ratingAvg: -1 })
      .limit(12)
      .select('title categories brand price salePrice soldCount ratingAvg reviewCount stock')
      .lean(),
    Order.find({ createdAt: { $gte: since } })
      .select('items totals orderStatus paymentStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Product.find({ isActive: true, isApproved: true, stock: { $lte: 10 } })
      .sort({ soldCount: -1 })
      .limit(8)
      .select('title stock soldCount categories')
      .lean()
  ]);

  const fallback = {
    source: model ? 'gemini_fallback' : 'local_fallback',
    summary: 'Xu hướng hiện tại nghiêng về các sản phẩm bán chạy, có đánh giá tốt và tồn kho thấp cần bổ sung.',
    trendScore: Math.min(100, Math.round((topProducts[0]?.soldCount || 0) / 5)),
    opportunities: topProducts.slice(0, 5).map((product) => ({
      title: product.title,
      reason: `Đã bán ${product.soldCount || 0}, rating ${product.ratingAvg || 0}`,
      action: product.stock <= 10 ? 'Bổ sung tồn kho và chạy voucher' : 'Đẩy flash sale hoặc combo'
    })),
    risks: lowStockProducts.map((product) => ({
      title: product.title,
      reason: `Tồn kho còn ${product.stock}`,
      action: 'Nhắc seller nhập thêm hàng'
    }))
  };

  if (!model) return fallback;

  try {
    const prompt = `Bạn là AI phân tích xu hướng TMĐT cho admin marketplace Việt Nam.
Dựa trên dữ liệu JSON sau, dự đoán xu hướng 7-14 ngày tới.
Chỉ trả về JSON hợp lệ với keys: summary, trendScore, opportunities[{title, reason, action}], risks[{title, reason, action}].
Dữ liệu:
${JSON.stringify({ topProducts, recentOrders, lowStockProducts }).slice(0, 12000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    return { source: 'gemini', ...JSON.parse(text) };
  } catch (error) {
    logger.error(`Admin trend prediction error: ${error.message}`);
    return fallback;
  }
};

const buildAdminAIData = async (days = 30) => {
  const since = new Date(Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000);
  const validOrderStatuses = { $nin: ['CANCELLED', 'FAILED'] };

  const [
    topProducts,
    lowStockProducts,
    outOfStockProducts,
    slowMovingProducts,
    orderStats,
    statusDistribution,
    categorySales,
    recentOrders,
    pendingProducts
  ] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: validOrderStatuses } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $addToSet: '$_id' }
        }
      },
      { $addFields: { orderCount: { $size: '$orderCount' } } },
      { $sort: { revenue: -1, unitsSold: -1 } },
      { $limit: 12 }
    ]),
    Product.find({ isActive: true, isApproved: true, stock: { $lte: 10, $gt: 0 } })
      .sort({ stock: 1, soldCount: -1 })
      .limit(12)
      .select('title sku stock soldCount price salePrice categories brand')
      .lean(),
    Product.find({ isActive: true, isApproved: true, stock: 0 })
      .sort({ soldCount: -1 })
      .limit(12)
      .select('title sku stock soldCount price salePrice categories brand')
      .lean(),
    Product.find({ isActive: true, isApproved: true, stock: { $gte: 30 }, soldCount: { $lte: 5 } })
      .sort({ stock: -1, createdAt: 1 })
      .limit(12)
      .select('title sku stock soldCount price salePrice categories brand')
      .lean(),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: validOrderStatuses } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$totals.grandTotal' },
          avgOrderValue: { $avg: '$totals.grandTotal' }
        }
      }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: validOrderStatuses } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$product.categories', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$product.categories', 'Khác'] },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]),
    Order.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderNumber orderStatus paymentStatus totals.grandTotal createdAt items.title items.quantity')
      .lean(),
    Product.countDocuments({ isApproved: false })
  ]);

  return {
    periodDays: Number(days || 30),
    generatedAt: new Date().toISOString(),
    orderStats: orderStats[0] || { orders: 0, revenue: 0, avgOrderValue: 0 },
    statusDistribution,
    topProducts,
    categorySales,
    inventory: {
      lowStockProducts,
      outOfStockProducts,
      slowMovingProducts,
      totalLowStock: lowStockProducts.length,
      totalOutOfStock: outOfStockProducts.length
    },
    recentOrders,
    pendingProducts
  };
};

const buildAdminFallbackInsight = (data) => {
  const top = data.topProducts?.[0];
  const lowStockCount = data.inventory?.totalLowStock || 0;
  const outStockCount = data.inventory?.totalOutOfStock || 0;

  return {
    source: GEMINI_API_KEY ? 'local_analysis_after_ai_error' : 'local_analysis',
    summary: top
      ? `Trong ${data.periodDays} ngày gần đây, sản phẩm nổi bật nhất là "${top.title}" với ${top.unitsSold || 0} sản phẩm bán ra và doanh thu ${Number(top.revenue || 0).toLocaleString('vi-VN')}đ. Kho hiện có ${lowStockCount} sản phẩm sắp hết và ${outStockCount} sản phẩm đã hết hàng.`
      : `Trong ${data.periodDays} ngày gần đây chưa có đủ dữ liệu bán hàng để dự đoán mạnh. Nên tập trung làm sạch tồn kho và kiểm tra sản phẩm chờ duyệt.`,
    trendScore: Math.min(100, Math.round(((top?.unitsSold || 0) * 8) + ((data.orderStats?.orders || 0) / 2))),
    opportunities: (data.topProducts || []).slice(0, 5).map((product) => ({
      title: product.title,
      reason: `Đã bán ${product.unitsSold || 0}, doanh thu ${Number(product.revenue || 0).toLocaleString('vi-VN')}đ`,
      action: 'Ưu tiên hiển thị, flash sale nhẹ, combo hoặc voucher để tăng chuyển đổi'
    })),
    risks: [
      ...(data.inventory?.outOfStockProducts || []).slice(0, 3).map((product) => ({
        title: product.title,
        reason: 'Đã hết hàng',
        action: 'Nhập thêm hoặc tạm ẩn khỏi chiến dịch quảng bá'
      })),
      ...(data.inventory?.lowStockProducts || []).slice(0, 3).map((product) => ({
        title: product.title,
        reason: `Tồn kho còn ${product.stock}`,
        action: 'Nhắc seller bổ sung kho trước khi chạy khuyến mãi'
      }))
    ],
    inventoryActions: [
      ...((data.inventory?.lowStockProducts || []).slice(0, 5).map((product) => ({
        title: product.title,
        currentStock: product.stock,
        soldCount: product.soldCount || 0,
        action: 'Bổ sung kho'
      }))),
      ...((data.inventory?.slowMovingProducts || []).slice(0, 3).map((product) => ({
        title: product.title,
        currentStock: product.stock,
        soldCount: product.soldCount || 0,
        action: 'Xả tồn bằng voucher/combo'
      })))
    ]
  };
};

export const predictAdminTrends = async (options = {}) => {
  const data = await buildAdminAIData(options.days || 30);
  const fallback = buildAdminFallbackInsight(data);

  if (!GEMINI_API_KEY) {
    return { ...fallback, data };
  }

  try {
    const prompt = `Bạn là AI vận hành marketplace cho admin.
Phân tích dữ liệu thật bên dưới và trả về JSON hợp lệ, không markdown.

Yêu cầu JSON:
{
  "summary": "nhận định ngắn",
  "trendScore": 0-100,
  "opportunities": [{"title":"...", "reason":"...", "action":"..."}],
  "risks": [{"title":"...", "reason":"...", "action":"..."}],
  "inventoryActions": [{"title":"...", "currentStock":0, "soldCount":0, "action":"..."}],
  "ideas": ["ý tưởng tăng doanh thu/kho/voucher"]
}

Dữ liệu:
${JSON.stringify(data).slice(0, 18000)}`;

    const text = cleanJsonText(await generateGeminiText(prompt));
    const parsed = JSON.parse(text);
    return { source: 'gemini', ...fallback, ...parsed, data };
  } catch (error) {
    logger.error(`Admin trend prediction error: ${error.message}`);
    return { ...fallback, data };
  }
};

export const askAdminAI = async ({ question, days = 30 }) => {
  const data = await buildAdminAIData(days);
  const fallback = buildAdminFallbackInsight(data);

  if (!question?.trim()) {
    return { answer: fallback.summary, source: fallback.source, suggestions: fallback.ideas || [], data };
  }

  if (!GEMINI_API_KEY) {
    return {
      answer: `${fallback.summary}\n\nGợi ý nhanh: hãy kiểm tra nhóm sắp hết hàng, đẩy các sản phẩm bán chạy và xả tồn nhóm bán chậm.`,
      source: fallback.source,
      suggestions: ['Sản phẩm nào bán chạy nhất?', 'Mặt hàng nào sắp hết kho?', 'Nên chạy voucher cho nhóm nào?'],
      data
    };
  }

  try {
    const prompt = `Bạn là AI quản trị marketplace cho Admin.
Bạn có quyền phân tích dữ liệu kho, sản phẩm, đơn hàng, doanh thu, bán chạy, tồn thấp và bán chậm.
Trả lời bằng tiếng Việt, rõ ràng, có số liệu cụ thể từ dữ liệu. Không bịa số ngoài dữ liệu.
Nếu admin hỏi ý tưởng, hãy đề xuất hành động cụ thể: nhập kho, giảm giá, voucher, flash sale, ẩn sản phẩm, ưu tiên hiển thị.

Dữ liệu vận hành ${data.periodDays} ngày:
${JSON.stringify(data).slice(0, 18000)}

Câu hỏi admin: ${question}

Trả lời dạng ngắn gọn, có bullet khi cần.`;

    const answer = await generateGeminiText(prompt);
    return {
      answer,
      source: 'gemini',
      suggestions: ['Sản phẩm nào bán chạy nhất?', 'Mặt hàng nào sắp hết kho?', 'Nên nhập thêm sản phẩm nào?', 'Ý tưởng voucher tuần này là gì?'],
      data
    };
  } catch (error) {
    logger.error(`Admin AI ask error: ${error.message}`);
    return {
      answer: `${fallback.summary}\n\nHệ thống phân tích đang tạm thời gián đoạn nên mình trả về tổng hợp nhanh từ dữ liệu hiện có. Bạn có thể xem top bán chạy, tồn thấp và bán chậm trong bảng dữ liệu.`,
      source: fallback.source,
      suggestions: ['Sản phẩm nào bán chạy nhất?', 'Mặt hàng nào sắp hết kho?', 'Nên chạy voucher cho nhóm nào?'],
      data
    };
  }
};

void legacyChatbotResponse;
void legacyPredictAdminTrends;

export default {
  getRecommendations,
  generateTextEmbedding,
  searchByImage,
  transcribeAudio,
  virtualTryOn,
  virtualTryOnFiles,
  chatbotResponse,
  generateProductEmbeddings,
  semanticSearch,
  predictAdminTrends,
  askAdminAI
};
