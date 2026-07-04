import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import BlogPost from '../models/BlogPost.js';
import logger from '../config/logger.js';

const productImageUrls = {
  1: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
  20: 'https://images.unsplash.com/photo-1705585174953-4c6f3475360e?auto=format&fit=crop&w=900&q=80',
  48: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
  60: 'https://images.unsplash.com/photo-1606741965429-8d76ff50bb2f?auto=format&fit=crop&w=900&q=80',
  30: 'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?auto=format&fit=crop&w=900&q=80',
  96: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
  180: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  225: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  175: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=900&q=80',
  250: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
  399: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  401: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
  407: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
  26: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80',
  28: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80',
  111: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80'
};

const productImageLabels = {
  1: 'iPhone 15 Pro Max', 2: 'iPhone Titanium', 3: 'iPhone Camera',
  20: 'Galaxy S24 Ultra', 21: 'Galaxy S Pen',
  48: 'MacBook Pro 14', 49: 'MacBook M3 Pro',
  60: 'AirPods Pro 2', 61: 'AirPods USB C',
  30: 'iPad Pro 11', 31: 'iPad M2',
  35: 'Galaxy Tab S9 FE',
  96: 'Xiaomi 14 Ultra', 97: 'Xiaomi Leica',
  119: 'OPPO Find X7 Ultra',
  180: 'Dell XPS 15', 181: 'Dell OLED Laptop',
  160: 'ROG Phone 8 Pro',
  225: 'Sony WH 1000XM5',
  175: 'Apple Watch S9',
  250: 'Galaxy Buds3 Pro',
  201: 'ThinkPad X1 Carbon',
  399: 'Ao Polo Nam', 400: 'Polo Cotton',
  401: 'Quan Jean Slim Fit',
  407: 'Vay Midi Hoa',
  26: 'Keychron K8 Pro',
  28: 'Logitech MX Master 3S',
  111: 'Anker Power Bank'
};

const img = (id, w = 600, h = 600) => {
  if (productImageUrls[id]) return productImageUrls[id];
  const label = encodeURIComponent(productImageLabels[id] || 'Marketplace Product');
  return `https://placehold.co/${w}x${h}/f8fafc/111827/png?text=${label}`;
};

const productGalleryUrls = {
  1: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&w=900&q=80'
  ],
  20: [
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80'
  ],
  48: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'
  ],
  60: [
    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80'
  ],
  30: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=900&q=80'
  ],
  35: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=900&q=80'
  ],
  96: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'
  ],
  119: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&w=900&q=80'
  ],
  180: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80'
  ],
  160: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80'
  ],
  225: [
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80'
  ],
  175: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=900&q=80'
  ],
  250: [
    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'
  ],
  201: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80'
  ],
  399: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80'
  ],
  401: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80'
  ],
  407: [
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80'
  ],
  26: [
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80'
  ],
  28: [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1613141412501-9012977f1969?auto=format&fit=crop&w=900&q=80'
  ],
  111: [
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80'
  ]
};

const gallery = (id, w = 600, h = 600) => [...new Set([
  img(id, w, h),
  ...(productGalleryUrls[id] || [])
])].slice(0, 4);

const makeVariant = ({ name, color, sku, stock, images, price, salePrice, extraAttributes = {} }) => ({
  name,
  attributes: { color, ...extraAttributes },
  sku,
  stock,
  images,
  ...(price ? { price } : {}),
  ...(salePrice ? { salePrice } : {})
});

const productVariantData = {
  'IP15PM-256': {
    attributes: { color: 'Titan Đen, Titan Trắng, Titan Xanh', storage: '256GB', ram: '8GB' },
    variants: [
      makeVariant({ name: 'Titan Đen - 256GB', color: 'Titan Đen', sku: 'IP15PM-256-BLK', stock: 18, images: gallery(1), price: 34990000, salePrice: 32990000, extraAttributes: { storage: '256GB', ram: '8GB' } }),
      makeVariant({ name: 'Titan Trắng - 256GB', color: 'Titan Trắng', sku: 'IP15PM-256-WHT', stock: 16, images: gallery(20), price: 34990000, salePrice: 32990000, extraAttributes: { storage: '256GB', ram: '8GB' } }),
      makeVariant({ name: 'Titan Xanh - 256GB', color: 'Titan Xanh', sku: 'IP15PM-256-BLU', stock: 16, images: gallery(96), price: 34990000, salePrice: 32990000, extraAttributes: { storage: '256GB', ram: '8GB' } })
    ]
  },
  'S24U-512': {
    attributes: { color: 'Xám Titan, Đen Titan, Tím Titan', storage: '512GB', ram: '12GB' },
    variants: [
      makeVariant({ name: 'Xám Titan - 512GB', color: 'Xám Titan', sku: 'S24U-512-GRY', stock: 15, images: gallery(20), price: 33990000, salePrice: 31990000, extraAttributes: { storage: '512GB', ram: '12GB' } }),
      makeVariant({ name: 'Đen Titan - 512GB', color: 'Đen Titan', sku: 'S24U-512-BLK', stock: 13, images: gallery(119), price: 33990000, salePrice: 31990000, extraAttributes: { storage: '512GB', ram: '12GB' } }),
      makeVariant({ name: 'Tím Titan - 512GB', color: 'Tím Titan', sku: 'S24U-512-PUR', stock: 12, images: gallery(35), price: 33990000, salePrice: 31990000, extraAttributes: { storage: '512GB', ram: '12GB' } })
    ]
  },
  WHXM5: {
    attributes: { color: 'Đen, Trắng, Bạc' },
    variants: [
      makeVariant({ name: 'Đen', color: 'Đen', sku: 'WHXM5-BLK', stock: 18, images: gallery(225), price: 8490000, salePrice: 7490000 }),
      makeVariant({ name: 'Trắng', color: 'Trắng', sku: 'WHXM5-WHT', stock: 14, images: gallery(60), price: 8490000, salePrice: 7490000 }),
      makeVariant({ name: 'Bạc', color: 'Bạc', sku: 'WHXM5-SLV', stock: 13, images: gallery(250), price: 8490000, salePrice: 7490000 })
    ]
  },
  'AWS9-45': {
    attributes: { color: 'Đen, Hồng, Bạc', size: '45mm' },
    variants: [
      makeVariant({ name: 'Đen - 45mm', color: 'Đen', sku: 'AWS9-45-BLK', stock: 12, images: gallery(175), price: 12990000, salePrice: 11490000, extraAttributes: { size: '45mm' } }),
      makeVariant({ name: 'Hồng - 45mm', color: 'Hồng', sku: 'AWS9-45-PNK', stock: 9, images: gallery(407), price: 12990000, salePrice: 11490000, extraAttributes: { size: '45mm' } }),
      makeVariant({ name: 'Bạc - 45mm', color: 'Bạc', sku: 'AWS9-45-SLV', stock: 9, images: gallery(250), price: 12990000, salePrice: 11490000, extraAttributes: { size: '45mm' } })
    ]
  },
  'POLO-M-01': {
    attributes: { color: 'Trắng, Đen, Xanh', size: 'M,L,XL' },
    variants: [
      makeVariant({ name: 'Trắng', color: 'Trắng', sku: 'POLO-M-01-WHT', stock: 70, images: gallery(399), price: 450000, salePrice: 359000 }),
      makeVariant({ name: 'Đen', color: 'Đen', sku: 'POLO-M-01-BLK', stock: 65, images: gallery(401), price: 450000, salePrice: 359000 }),
      makeVariant({ name: 'Xanh', color: 'Xanh', sku: 'POLO-M-01-BLU', stock: 65, images: gallery(407), price: 450000, salePrice: 359000 })
    ]
  },
  'LG-MXM3S': {
    attributes: { color: 'Graphite, Trắng, Xám' },
    variants: [
      makeVariant({ name: 'Graphite', color: 'Graphite', sku: 'LG-MXM3S-GRA', stock: 13, images: gallery(28), price: 2590000 }),
      makeVariant({ name: 'Trắng', color: 'Trắng', sku: 'LG-MXM3S-WHT', stock: 11, images: gallery(60), price: 2590000 }),
      makeVariant({ name: 'Xám', color: 'Xám', sku: 'LG-MXM3S-GRY', stock: 11, images: gallery(250), price: 2590000 })
    ]
  }
};

const applyProductVariantData = (product) => {
  const variantData = productVariantData[product.sku];
  if (!variantData) return product;

  return {
    ...product,
    attributes: { ...(product.attributes || {}), ...(variantData.attributes || {}) },
    images: variantData.images || product.images,
    variants: variantData.variants || product.variants
  };
};

const blogFigure = (src, alt, caption) => `
  <figure style="margin:28px 0;border-radius:18px;overflow:hidden;background:#f8fafc;border:1px solid #e2e8f0;">
    <img src="${src}" alt="${alt}" style="width:100%;height:320px;object-fit:cover;display:block;" />
    <figcaption style="padding:10px 14px;color:#64748b;font-size:14px;">${caption}</figcaption>
  </figure>
`;

const blogSection = (title, paragraphs) => `
  <h2 style="font-size:24px;margin:28px 0 12px;color:#0f172a;">${title}</h2>
  ${paragraphs.map((paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`).join('')}
`;

const richBlogContentByTag = {
  'dien-thoai': [
    blogSection('Bắt đầu từ nhu cầu thật', [
      'Một chiếc điện thoại tốt không nhất thiết là mẫu đắt nhất, mà là mẫu giải quyết đúng thói quen sử dụng hằng ngày. Người hay chụp ảnh nên ưu tiên camera chính ổn định, chống rung tốt và màu ảnh dễ chỉnh. Người dùng mạng xã hội cần màn hình sáng, pin bền và bộ nhớ đủ rộng để lưu video.',
      'Nếu mua cho học tập hoặc công việc, hãy xem thêm khả năng ghi chú, chia sẻ file, độ ổn định của hệ điều hành và thời gian cập nhật phần mềm. Các yếu tố này giúp máy dùng lâu hơn, ít lỗi vặt hơn và dễ bán lại khi nâng cấp.'
    ]),
    blogFigure('https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1400&q=82', 'Điện thoại đặt trên bàn', 'So sánh điện thoại nên nhìn cả camera, pin, màn hình và chính sách bảo hành.'),
    blogSection('Cách đọc cấu hình cho dễ chọn', [
      'Chip xử lý quyết định độ mượt khi mở app, chơi game và xử lý ảnh. RAM giúp máy giữ nhiều ứng dụng cùng lúc, còn bộ nhớ trong ảnh hưởng trực tiếp đến trải nghiệm lâu dài. Với người quay video 4K hoặc lưu nhiều ảnh, 256GB thường là mức dễ chịu hơn 128GB.',
      'Màn hình OLED hoặc AMOLED cho màu đen sâu, xem phim đẹp và tiết kiệm pin hơn trong nhiều tình huống. Tần số quét cao như 90Hz hoặc 120Hz giúp cuộn trang mượt, nhưng cũng nên cân bằng với dung lượng pin và tốc độ sạc.'
    ]),
    blogSection('Checklist trước khi chốt đơn', [
      'Hãy xem ảnh thật của sản phẩm, đọc đánh giá có hình, kiểm tra bảo hành và so sánh giá cuối cùng sau voucher. Nếu sản phẩm có nhiều màu, nên mở từng biến thể để xem đúng ảnh màu đó, tránh chọn màu trắng nhưng ảnh minh họa lại là màu đen.',
      'Cuối cùng, hãy cân nhắc phụ kiện đi kèm như ốp, cáp sạc hoặc tai nghe. Một combo hợp lý đôi khi tiết kiệm hơn mua lẻ từng món sau khi nhận máy.'
    ])
  ].join(''),
  laptop: [
    blogSection('Ba nhóm laptop phổ biến', [
      'MacBook phù hợp với người ưu tiên pin dài, trackpad tốt, màn hình đẹp và làm việc trong hệ sinh thái Apple. Ultrabook Windows mạnh ở tính linh hoạt, nhiều cổng kết nối và dễ tương thích phần mềm doanh nghiệp. Laptop gaming phù hợp khi cần GPU rời cho đồ họa, dựng video, 3D hoặc chơi game.',
      'Điểm cần nhớ là mỗi nhóm có đánh đổi riêng. Máy càng mạnh thường càng nóng và nặng hơn. Máy càng mỏng nhẹ thường giới hạn nâng cấp và cổng kết nối. Vì vậy nên chọn theo phần mềm chính bạn dùng mỗi ngày.'
    ]),
    blogFigure('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=82', 'Laptop làm việc trên bàn', 'Laptop làm việc nên cân bằng giữa hiệu năng, màn hình, pin và trọng lượng.'),
    blogSection('Cấu hình nên ưu tiên', [
      'RAM 16GB là mức dễ dùng cho học tập, văn phòng, thiết kế nhẹ và mở nhiều tab trình duyệt. Nếu làm lập trình, dựng video hoặc chạy máy ảo, 32GB sẽ thoải mái hơn. SSD nên từ 512GB để đủ lưu tài liệu, ảnh, project và phần mềm.',
      'Màn hình là phần nhiều người bỏ qua. Độ phân giải cao giúp chữ mịn, nhưng độ sáng, độ phủ màu và chống chói mới ảnh hưởng nhiều khi làm việc lâu. Nếu thường mang máy đi, hãy xem kỹ cân nặng, sạc đi kèm và thời lượng pin thực tế.'
    ]),
    blogSection('Mua online an toàn hơn', [
      'Nên ưu tiên shop có đánh giá rõ, ảnh sản phẩm thật, chính sách đổi trả minh bạch và hóa đơn bảo hành. Với laptop giá trị cao, hãy quay video lúc mở hộp để có bằng chứng nếu cần hỗ trợ.',
      'Nếu đang phân vân giữa hai mẫu, hãy so sánh theo workflow: phần mềm bạn dùng, số tab thường mở, có cần cổng HDMI/USB-A không, và có cần màn hình rời hay không.'
    ])
  ].join(''),
  'flash-sale': [
    blogSection('Đừng chỉ nhìn phần trăm giảm', [
      'Flash Sale hấp dẫn vì giá giảm nhanh, nhưng mức giảm phần trăm không nói hết câu chuyện. Bạn nên so sánh giá sau voucher, phí ship, bảo hành và uy tín shop. Một món rẻ hơn vài chục nghìn nhưng không rõ nguồn gốc có thể khiến trải nghiệm tệ hơn về sau.',
      'Những món đáng săn thường là phụ kiện có nhu cầu rõ: tai nghe, chuột, bàn phím, sạc dự phòng, cáp sạc, củ sạc nhanh và túi chống sốc. Đây là nhóm dễ mua theo combo và ít rủi ro hơn so với sản phẩm cần đo size.'
    ]),
    blogFigure('https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1400&q=82', 'Gói hàng và mua sắm online', 'Săn sale hiệu quả là so giá cuối cùng, không chỉ nhìn nhãn giảm giá.'),
    blogSection('Cách chọn phụ kiện theo nhu cầu', [
      'Tai nghe nên xem chống ồn, độ trễ, micro và thời lượng pin. Chuột nên chọn theo kích thước tay, kiểu cầm và số thiết bị cần kết nối. Bàn phím nên xem layout, switch, độ ồn và khả năng hot-swap nếu muốn dùng lâu.',
      'Với sạc dự phòng và củ sạc, công suất phải phù hợp thiết bị. Laptop cần PD 45W, 65W hoặc cao hơn; điện thoại thường chỉ cần mức thấp hơn nhưng phải có chuẩn an toàn rõ ràng.'
    ]),
    blogSection('Mẹo chốt đơn nhanh', [
      'Trước ngày sale, hãy thêm sản phẩm vào yêu thích, kiểm tra biến thể màu, đọc đánh giá và lưu voucher. Khi sale mở, bạn chỉ cần kiểm tra lại giá cuối cùng rồi thanh toán.',
      'Nếu còn phân vân, ưu tiên món có lượt mua thật và đánh giá kèm ảnh. Những tín hiệu này giúp giảm khả năng chọn nhầm sản phẩm không đúng kỳ vọng.'
    ])
  ].join('')
};

const enrichBlogPost = (post) => {
  const contentKey = Object.keys(richBlogContentByTag).find((tag) => post.tags?.includes(tag));
  if (!contentKey) return post;
  return { ...post, content: richBlogContentByTag[contentKey] };
};

const createExtraBlogPosts = (authorId, products) => {
  const related = (...indexes) => indexes.map((index) => products[index]?._id).filter(Boolean);

  return [
    {
      title: 'Chọn tai nghe chống ồn: nghe nhạc, học tập và làm việc yên tĩnh hơn',
      excerpt: 'Những tiêu chí quan trọng khi mua tai nghe chống ồn: kiểu đeo, ANC, micro, pin, độ trễ và độ thoải mái.',
      content: [
        blogSection('Vì sao chống ồn quan trọng', [
          'Tai nghe chống ồn tốt giúp giảm tiếng quạt, xe cộ, phòng học ồn và tiếng nói nền ở văn phòng. Khi môi trường yên hơn, bạn không cần tăng âm lượng quá cao, tai cũng dễ chịu hơn khi nghe lâu.',
          'Nếu thường học online hoặc họp trực tuyến, micro và khả năng lọc tiếng ồn khi gọi quan trọng không kém chất âm. Một chiếc tai nghe có micro rõ sẽ giúp cuộc gọi chuyên nghiệp hơn nhiều.'
        ]),
        blogFigure('https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1400&q=82', 'Tai nghe chống ồn', 'Tai nghe over-ear thường thoải mái hơn khi cần tập trung lâu.'),
        blogSection('Nên chọn over-ear hay true wireless', [
          'Over-ear như Sony WH-1000XM5 phù hợp khi cần chống ồn mạnh, pin dài và đeo lâu. True wireless nhỏ gọn hơn, tiện mang theo, nhưng thời lượng pin và khả năng chống ồn thường phụ thuộc nhiều vào độ khít của eartip.',
          'Người chơi game nên xem thêm độ trễ. Người nghe nhạc nên thử chất âm hoặc đọc đánh giá về bass, vocal và âm trường. Người hay di chuyển nên xem trọng lượng, hộp đựng và khả năng gập gọn.'
        ]),
        blogSection('Checklist mua nhanh', [
          'Hãy ưu tiên sản phẩm có nhiều ảnh, nhiều biến thể màu rõ ràng, chính sách bảo hành chính hãng và đánh giá có hình. Nếu mua màu trắng hoặc bạc, nên xem ảnh thực tế vì các màu sáng dễ lộ vết bẩn hơn màu đen.'
        ])
      ].join(''),
      coverImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      category: 'review',
      tags: ['tai-nghe', 'sony', 'phu-kien'],
      authorId,
      isPublished: true,
      relatedProducts: related(10, 3, 12)
    },
    {
      title: 'Phối áo polo và jean nam: gọn, dễ mặc nhưng vẫn có điểm nhấn',
      excerpt: 'Gợi ý phối đồ với polo, jean, giày và phụ kiện để dùng cho đi học, đi làm hoặc cuối tuần.',
      content: [
        blogSection('Polo là món dễ mặc', [
          'Áo polo nằm giữa áo thun và sơ mi: đủ lịch sự để đi làm nhẹ, nhưng vẫn thoải mái cho cuối tuần. Khi chọn polo, chất vải, form vai và độ dài áo quyết định nhiều hơn logo hay họa tiết.',
          'Màu trắng cho cảm giác sạch và sáng, màu đen dễ phối và gọn người, màu xanh tạo điểm nhấn trẻ hơn. Nếu sản phẩm có nhiều màu, hãy xem ảnh từng màu trước khi chọn để tránh lệch kỳ vọng.'
        ]),
        blogFigure('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=82', 'Áo polo nam', 'Polo trơn dễ phối với jean, kaki và sneaker.'),
        blogSection('Cách phối với jean', [
          'Polo trắng đi với jean xanh tạo cảm giác sáng và trẻ. Polo đen đi với jean xanh đậm hoặc đen sẽ gọn và nam tính hơn. Nếu muốn đi làm, có thể thêm thắt lưng tối màu và giày loafer hoặc sneaker tối giản.',
          'Với jean slim fit, nên chọn size vừa đủ ôm, không quá bó ở đùi. Độ dài quần vừa chạm giày sẽ gọn hơn khi lên ảnh sản phẩm và khi mặc thật.'
        ]),
        blogSection('Mua thời trang online đỡ sai size', [
          'Hãy đo áo/quần đang mặc vừa nhất rồi so với bảng size của shop. Đọc đánh giá có ảnh sẽ giúp nhận ra form thật rộng hay ôm. Nếu phân vân giữa hai size, nên chọn theo cân nặng, chiều cao và chất vải có co giãn hay không.'
        ])
      ].join(''),
      coverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
      category: 'lifestyle',
      tags: ['thoi-trang', 'polo', 'jean'],
      authorId,
      isPublished: true,
      relatedProducts: related(14, 15)
    },
    {
      title: 'Setup bàn học và bàn làm việc gọn hơn với phụ kiện công nghệ',
      excerpt: 'Từ laptop, bàn phím, chuột đến tai nghe: cách chọn phụ kiện để góc làm việc gọn và hiệu quả.',
      content: [
        blogSection('Gọn trước, đẹp sau', [
          'Một setup tốt giúp bạn bắt đầu công việc nhanh hơn, ít mất thời gian tìm dây sạc, tai nghe hoặc chuột. Hãy bắt đầu bằng các món thật sự dùng mỗi ngày: laptop, bàn phím, chuột, tai nghe và sạc.',
          'Không cần mua quá nhiều đồ trang trí. Một mặt bàn thoáng, dây gọn và ánh sáng đủ thường tạo cảm giác chuyên nghiệp hơn một góc quá nhiều vật dụng.'
        ]),
        blogFigure('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82', 'Góc làm việc gọn gàng', 'Setup hiệu quả ưu tiên thói quen dùng thật, không chỉ nhìn đẹp trên ảnh.'),
        blogSection('Chọn phụ kiện theo thói quen', [
          'Nếu gõ nhiều, bàn phím cơ hoặc bàn phím low-profile sẽ cải thiện cảm giác nhập liệu. Nếu chỉnh ảnh, làm bảng tính hoặc thiết kế, chuột ergonomic giúp cổ tay thoải mái hơn. Nếu học trong môi trường ồn, tai nghe chống ồn sẽ đáng tiền.',
          'Nên ưu tiên phụ kiện kết nối được nhiều thiết bị nếu bạn dùng cả laptop, tablet và điện thoại. Điều này giảm số món phải mang theo khi di chuyển.'
        ]),
        blogSection('Đừng quên sạc và an toàn', [
          'Củ sạc và sạc dự phòng nên có công suất phù hợp thiết bị. Dây sạc nên rõ chuẩn, đủ dòng và không quá dài nếu dùng trên bàn. Những chi tiết nhỏ này giúp setup gọn hơn và giảm rủi ro khi sạc lâu.'
        ])
      ].join(''),
      coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      category: 'tutorial',
      tags: ['setup', 'ban-lam-viec', 'phu-kien'],
      authorId,
      isPublished: true,
      relatedProducts: related(2, 17, 18, 19)
    },
    {
      title: 'Sạc dự phòng và củ sạc nhanh: hiểu đúng công suất trước khi mua',
      excerpt: 'Giải thích dung lượng, công suất PD, số cổng sạc và cách chọn sạc an toàn cho điện thoại, tablet, laptop.',
      content: [
        blogSection('Dung lượng không phải tất cả', [
          'Sạc dự phòng 20000mAh nghe rất lớn, nhưng số lần sạc thực tế còn phụ thuộc hiệu suất chuyển đổi và dung lượng pin thiết bị. Điện thoại có thể sạc nhiều lần, nhưng laptop sẽ cần công suất và dung lượng cao hơn.',
          'Nếu bạn chỉ dùng cho điện thoại, sản phẩm 10000mAh gọn nhẹ có thể đủ. Nếu dùng thêm tablet hoặc laptop, hãy xem mức 20000mAh và công suất PD từ 45W đến 65W.'
        ]),
        blogFigure('https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1400&q=82', 'Sạc dự phòng', 'Công suất PD quyết định thiết bị có nhận sạc nhanh đúng mức hay không.'),
        blogSection('Cổng sạc và chuẩn an toàn', [
          'USB-C hiện là lựa chọn linh hoạt nhất vì vừa sạc vào vừa sạc ra nhanh. Nếu thường sạc nhiều thiết bị, hãy chọn sản phẩm có ít nhất hai cổng và ghi rõ công suất khi dùng đồng thời.',
          'Các chuẩn bảo vệ quá nhiệt, quá dòng và quá áp rất quan trọng. Phụ kiện sạc kém chất lượng có thể gây nóng máy, chai pin hoặc lỗi sạc không ổn định.'
        ]),
        blogSection('Cách đọc thông số nhanh', [
          'Hãy tìm dòng ghi PD, PPS hoặc QC nếu điện thoại/laptop của bạn hỗ trợ. Với laptop USB-C, công suất 65W là mức phổ biến và dễ dùng. Với điện thoại, nên kiểm tra hãng hỗ trợ chuẩn nào để tránh mua sạc nhanh nhưng không tương thích.'
        ])
      ].join(''),
      coverImage: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80',
      category: 'tutorial',
      tags: ['sac-du-phong', 'anker', 'phu-kien'],
      authorId,
      isPublished: true,
      relatedProducts: related(19)
    },
    {
      title: 'Mẹo tìm sản phẩm thông minh: mô tả đúng để nhận gợi ý đúng sản phẩm',
      excerpt: 'Cách mô tả nhu cầu và tìm kiếm bằng hình ảnh để kết quả sát hơn, ít lẫn sản phẩm ngoài chủ đề.',
      content: [
        blogSection('Mô tả càng rõ, gợi ý càng sát', [
          'Khi tìm sản phẩm, hãy nói rõ loại sản phẩm, ngân sách, mục đích sử dụng và yêu cầu quan trọng nhất. Ví dụ: "tai nghe chống ồn dưới 8 triệu để học ở quán cà phê" sẽ tốt hơn "mua tai nghe nào".',
          'Nếu không muốn sản phẩm ngoài chủ đề, hãy thêm ràng buộc rõ như "chỉ gợi ý tai nghe", "không gợi ý bàn ghế" hoặc "ưu tiên thương hiệu Sony". Hệ thống sẽ dễ lọc kết quả hơn.'
        ]),
        blogFigure('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=82', 'Mua sắm online thông minh', 'Tìm kiếm hiệu quả hơn khi có đủ nhu cầu, ngân sách và ngữ cảnh sử dụng.'),
        blogSection('Tìm bằng hình ảnh sao cho chuẩn', [
          'Ảnh nên rõ chủ thể, ít vật nền và đủ sáng. Nếu chụp sản phẩm màu trắng trên nền trắng, hãy để sản phẩm chiếm phần lớn khung hình hoặc thêm góc chụp có chi tiết nhận diện.',
          'Với thời trang, ảnh toàn thân giúp nhận diện kiểu dáng. Với công nghệ, ảnh mặt trước, logo hoặc chi tiết cổng kết nối sẽ hữu ích hơn ảnh quá xa.'
        ]),
        blogSection('Kết hợp bộ lọc sau khi AI gợi ý', [
          'Sau khi có kết quả, hãy lọc tiếp theo giá, thương hiệu, màu sắc và đánh giá. Công cụ tìm kiếm giúp rút ngắn bước tham khảo, còn quyết định cuối vẫn nên dựa trên ảnh, thông số, đánh giá và chính sách bảo hành.'
        ])
      ].join(''),
      coverImage: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1200&q=80',
      category: 'tutorial',
      tags: ['ai-shopping', 'tim-kiem-hinh-anh', 'huong-dan'],
      authorId,
      isPublished: true,
      relatedProducts: related(0, 10, 14, 18)
    }
  ];
};

const seedData = async () => {
  try {
    await connectDB();

    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Shop.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Category.deleteMany({}),
      BlogPost.deleteMany({})
    ]);

    // ── Users ──
    logger.info('Creating users...');
    const admin = await User.create({ name: 'Admin', email: 'admin@marketplace.com', phone: '0901234567', passwordHash: 'admin123', roles: ['admin','customer'], verified: true, isActive: true });
    const seller1 = await User.create({ name: 'TechShop VN', email: 'seller1@marketplace.com', phone: '0902345678', passwordHash: 'seller123', roles: ['seller','customer'], verified: true, isActive: true });
    const seller2 = await User.create({ name: 'Fashion Store', email: 'seller2@marketplace.com', phone: '0907654321', passwordHash: 'seller123', roles: ['seller','customer'], verified: true, isActive: true });
    const customer1 = await User.create({ name: 'Nguyen Van A', email: 'customer1@marketplace.com', phone: '0903456789', passwordHash: 'customer123', roles: ['customer'], verified: true, isActive: true, addresses: [{ label: 'Nhà riêng', recipientName: 'Nguyen Van A', phone: '0903456789', street: '123 Nguyễn Huệ', ward: 'Phường Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh', isDefault: true }] });
    const customer2 = await User.create({ name: 'Tran Thi B', email: 'customer2@marketplace.com', phone: '0904567890', passwordHash: 'customer123', roles: ['customer'], verified: true, isActive: true, addresses: [{ label: 'Văn phòng', recipientName: 'Tran Thi B', phone: '0904567890', street: '456 Lê Lợi', ward: 'Phường Bến Thành', district: 'Quận 1', city: 'TP. Hồ Chí Minh', isDefault: true }] });
    const shipper = await User.create({ name: 'Shipper One', email: 'shipper@marketplace.com', phone: '0905678901', passwordHash: 'shipper123', roles: ['shipper'], verified: true, isActive: true });

    // ── Shops ──
    logger.info('Creating shops...');
    const shop1 = await Shop.create({ ownerId: seller1._id, shopName: 'TechShop Vietnam', slug: 'techshop-vietnam', description: 'Chuyên cung cấp các sản phẩm công nghệ chính hãng', address: { street: '789 Đường 3/2', ward: 'Phường 11', district: 'Quận 10', city: 'TP. Hồ Chí Minh' }, phone: '0902345678', email: 'contact@techshop.vn', isActive: true, isVerified: true, ratingAvg: 4.8 });
    const shop2 = await Shop.create({ ownerId: seller2._id, shopName: 'Fashion Hub', slug: 'fashion-hub', description: 'Thời trang nam nữ cao cấp', address: { street: '321 Hai Bà Trưng', ward: 'Phường 6', district: 'Quận 3', city: 'TP. Hồ Chí Minh' }, phone: '0907654321', email: 'hi@fashionhub.vn', isActive: true, isVerified: true, ratingAvg: 4.5 });

    // ── Categories ──
    logger.info('Creating categories...');
    const catPhone = await Category.create({ name: 'Điện thoại', slug: 'dien-thoai', icon: '📱', level: 0, order: 1 });
    const catLaptop = await Category.create({ name: 'Laptop', slug: 'laptop', icon: '💻', level: 0, order: 2 });
    const catTablet = await Category.create({ name: 'Máy tính bảng', slug: 'may-tinh-bang', icon: '📟', level: 0, order: 3 });
    const catAccessory = await Category.create({ name: 'Phụ kiện', slug: 'phu-kien', icon: '🎧', level: 0, order: 4 });
    const catFashion = await Category.create({ name: 'Thời trang', slug: 'thoi-trang', icon: '👕', level: 0, order: 5 });
    const catHome = await Category.create({ name: 'Gia dụng', slug: 'gia-dung', icon: '🏠', level: 0, order: 6 });

    // ── Products (20+ items) ──
    logger.info('Creating products...');
    const products = await Product.create([
      { sellerId: shop1._id, title: 'iPhone 15 Pro Max 256GB', description: 'iPhone 15 Pro Max với chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6.7 inch. Thiết kế titanium cao cấp.', shortDescription: 'iPhone 15 Pro Max - Đỉnh cao công nghệ', categories: ['Điện thoại','Apple','Smartphone'], brand: 'Apple', tags: ['iphone','apple','flagship','5g'], price: 34990000, salePrice: 32990000, stock: 50, sku: 'IP15PM-256', images: gallery(1), attributes: { color: 'Titan Đen', storage: '256GB', ram: '8GB' }, specifications: { 'Màn hình': '6.7 inch Super Retina XDR', 'Hệ điều hành': 'iOS 17', 'Camera': '48MP + 12MP + 12MP', 'Pin': '4422 mAh', 'Chip': 'A17 Pro' }, shipping: { weight: 500, freeShipping: true }, isActive: true, isApproved: true, isFeatured: true, ratingAvg: 4.8, reviewCount: 125, soldCount: 230 },
      { sellerId: shop1._id, title: 'Samsung Galaxy S24 Ultra 512GB', description: 'Galaxy S24 Ultra với bút S Pen tích hợp, camera 200MP, AI Galaxy, màn hình Dynamic AMOLED 2X 6.8 inch', shortDescription: 'Galaxy S24 Ultra - AI tích hợp', categories: ['Điện thoại','Samsung','Smartphone'], brand: 'Samsung', tags: ['samsung','galaxy','s24','ai'], price: 33990000, salePrice: 31990000, stock: 40, sku: 'S24U-512', images: gallery(20), attributes: { color: 'Xám Titan', storage: '512GB', ram: '12GB' }, specifications: { 'Màn hình': '6.8 inch Dynamic AMOLED 2X', 'Hệ điều hành': 'Android 14', 'Camera': '200MP + 50MP + 12MP + 10MP', 'Pin': '5000 mAh' }, shipping: { weight: 550, freeShipping: true }, isActive: true, isApproved: true, isFeatured: true, ratingAvg: 4.7, reviewCount: 98, soldCount: 180 },
      { sellerId: shop1._id, title: 'MacBook Pro 14 M3 Pro 18GB/512GB', description: 'MacBook Pro 14 inch với chip M3 Pro mạnh mẽ, màn hình Liquid Retina XDR, pin 17 giờ', shortDescription: 'MacBook Pro 14 - Sức mạnh Pro', categories: ['Laptop','Apple','MacBook'], brand: 'Apple', tags: ['macbook','apple','laptop','m3'], price: 52990000, stock: 25, sku: 'MBP14-M3P', images: gallery(48), attributes: { color: 'Space Black', storage: '512GB SSD', ram: '18GB' }, specifications: { 'Màn hình': '14.2 inch Liquid Retina XDR', 'CPU': 'Apple M3 Pro 11-core', 'GPU': '14-core GPU', 'Pin': '70Wh - 17 giờ' }, shipping: { weight: 1600, freeShipping: true }, isActive: true, isApproved: true, isFeatured: true, ratingAvg: 4.9, reviewCount: 67, soldCount: 95 },
      { sellerId: shop1._id, title: 'AirPods Pro 2 USB-C', description: 'AirPods Pro thế hệ 2 với chip H2, chống ồn chủ động thông minh, âm thanh không gian', shortDescription: 'AirPods Pro 2 - Âm thanh hoàn hảo', categories: ['Phụ kiện','Apple','Tai nghe'], brand: 'Apple', tags: ['airpods','apple','wireless','anc'], price: 6990000, salePrice: 5990000, stock: 100, sku: 'APP2-USC', images: gallery(60), attributes: { color: 'Trắng' }, specifications: { 'Kết nối': 'Bluetooth 5.3', 'Pin': '6 giờ (ANC)', 'Sạc': 'USB-C, MagSafe' }, shipping: { weight: 200, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.6, reviewCount: 203, soldCount: 450 },
      { sellerId: shop1._id, title: 'iPad Pro 11 M2 Wi-Fi 128GB', description: 'iPad Pro 11 inch với chip M2, màn hình Liquid Retina, hỗ trợ Apple Pencil 2', shortDescription: 'iPad Pro 11 - Sáng tạo không giới hạn', categories: ['Máy tính bảng','Apple','iPad'], brand: 'Apple', tags: ['ipad','apple','tablet','m2'], price: 23990000, stock: 35, sku: 'IPP11-M2', images: gallery(30), attributes: { color: 'Space Grey', storage: '128GB' }, specifications: { 'Màn hình': '11 inch Liquid Retina', 'Chip': 'Apple M2', 'Camera': '12MP + 10MP' }, shipping: { weight: 470, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.7, reviewCount: 89, soldCount: 156 },
      { sellerId: shop1._id, title: 'Samsung Galaxy Tab S9 FE', description: 'Galaxy Tab S9 FE với bút S Pen, chip Exynos 1380, màn hình 10.9 inch', shortDescription: 'Tab S9 FE giá tốt', categories: ['Máy tính bảng','Samsung'], brand: 'Samsung', tags: ['samsung','tablet'], price: 9990000, salePrice: 8990000, stock: 60, sku: 'TABS9FE', images: gallery(35), attributes: { color: 'Xám' }, specifications: { 'Màn hình': '10.9 inch TFT', 'Chip': 'Exynos 1380', 'Pin': '8000 mAh' }, shipping: { weight: 523, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.4, reviewCount: 52, soldCount: 88 },
      { sellerId: shop1._id, title: 'Xiaomi 14 Ultra 512GB', description: 'Xiaomi 14 Ultra với camera Leica, chip Snapdragon 8 Gen 3, sạc nhanh 90W', shortDescription: 'Xiaomi 14 Ultra - Camera Leica', categories: ['Điện thoại','Xiaomi','Smartphone'], brand: 'Xiaomi', tags: ['xiaomi','leica','flagship'], price: 27990000, salePrice: 25990000, stock: 30, sku: 'XI14U-512', images: gallery(96), attributes: { color: 'Đen', storage: '512GB' }, specifications: { 'Màn hình': '6.73 inch AMOLED 120Hz', 'Chip': 'Snapdragon 8 Gen 3', 'Camera': '50MP Leica x4' }, shipping: { weight: 220, freeShipping: true }, isActive: true, isApproved: true, isFeatured: true, ratingAvg: 4.5, reviewCount: 41, soldCount: 72 },
      { sellerId: shop1._id, title: 'OPPO Find X7 Ultra', description: 'OPPO Find X7 Ultra với Hasselblad camera, chip Dimensity 9300', shortDescription: 'Find X7 Ultra - Camera Hasselblad', categories: ['Điện thoại','OPPO','Smartphone'], brand: 'OPPO', tags: ['oppo','hasselblad'], price: 22990000, stock: 25, sku: 'OFX7U', images: gallery(119), attributes: { color: 'Xanh' }, specifications: { 'Màn hình': '6.82 inch AMOLED', 'Chip': 'Dimensity 9300' }, shipping: { weight: 221, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.3, reviewCount: 28, soldCount: 45 },
      { sellerId: shop1._id, title: 'Dell XPS 15 2024', description: 'Dell XPS 15 với chip Intel Core Ultra 7, màn hình OLED 3.5K 15.6 inch', shortDescription: 'Dell XPS 15 - Ultrabook cao cấp', categories: ['Laptop','Dell'], brand: 'Dell', tags: ['dell','xps','ultrabook'], price: 45990000, salePrice: 42990000, stock: 15, sku: 'DXPS15-24', images: gallery(180), attributes: { color: 'Bạc', storage: '1TB SSD', ram: '32GB' }, specifications: { 'Màn hình': '15.6 inch OLED 3.5K', 'CPU': 'Intel Core Ultra 7', 'GPU': 'Intel Arc', 'Pin': '86Wh' }, shipping: { weight: 1860, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.6, reviewCount: 33, soldCount: 41 },
      { sellerId: shop1._id, title: 'Asus ROG Phone 8 Pro', description: 'Gaming phone với Snapdragon 8 Gen 3, màn hình 165Hz, tản nhiệt AeroActive', shortDescription: 'ROG Phone 8 Pro - Gaming đỉnh cao', categories: ['Điện thoại','Asus','Gaming'], brand: 'Asus', tags: ['asus','rog','gaming'], price: 28990000, stock: 20, sku: 'ROG8P', images: gallery(160), attributes: { color: 'Đen' }, specifications: { 'Màn hình': '6.78 inch AMOLED 165Hz', 'Chip': 'Snapdragon 8 Gen 3', 'RAM': '16GB', 'Pin': '5500 mAh' }, shipping: { weight: 225, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.7, reviewCount: 22, soldCount: 38 },
      { sellerId: shop1._id, title: 'Sony WH-1000XM5', description: 'Tai nghe chống ồn hàng đầu Sony, Auto NC Optimizer, pin 30 giờ', shortDescription: 'Sony XM5 - Chống ồn số 1', categories: ['Phụ kiện','Sony','Tai nghe'], brand: 'Sony', tags: ['sony','headphone','anc'], price: 8490000, salePrice: 7490000, stock: 45, sku: 'WHXM5', images: gallery(225), attributes: { color: 'Đen' }, specifications: { 'Kết nối': 'Bluetooth 5.2', 'Pin': '30 giờ', 'Driver': '30mm' }, shipping: { weight: 250, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.8, reviewCount: 156, soldCount: 312 },
      { sellerId: shop1._id, title: 'Apple Watch Series 9 45mm', description: 'Apple Watch S9 với chip S9 SiP, Double Tap, màn hình Always-On Retina', shortDescription: 'Apple Watch S9 - Sức khỏe thông minh', categories: ['Phụ kiện','Apple','Đồng hồ'], brand: 'Apple', tags: ['apple','watch','smartwatch'], price: 12990000, salePrice: 11490000, stock: 30, sku: 'AWS9-45', images: gallery(175), attributes: { color: 'Đen', size: '45mm' }, specifications: { 'Màn hình': 'Always-On Retina LTPO', 'Chip': 'S9 SiP', 'Chống nước': '50m' }, shipping: { weight: 51, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.5, reviewCount: 74, soldCount: 128 },
      { sellerId: shop1._id, title: 'Samsung Galaxy Buds3 Pro', description: 'Tai nghe true wireless với ANC thông minh, codec SSC HiFi, pin 7 giờ', shortDescription: 'Galaxy Buds3 Pro - ANC thông minh', categories: ['Phụ kiện','Samsung','Tai nghe'], brand: 'Samsung', tags: ['samsung','buds','tws'], price: 5990000, salePrice: 4990000, stock: 55, sku: 'GB3PRO', images: gallery(250), attributes: { color: 'Bạc' }, specifications: { 'ANC': 'Có', 'Pin': '7 giờ', 'Kháng nước': 'IP57' }, shipping: { weight: 50, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.4, reviewCount: 63, soldCount: 195 },
      { sellerId: shop1._id, title: 'Lenovo ThinkPad X1 Carbon Gen 12', description: 'Ultrabook doanh nhân với Intel Core Ultra 7, 14 inch 2.8K OLED', shortDescription: 'ThinkPad X1 Carbon - Doanh nhân', categories: ['Laptop','Lenovo'], brand: 'Lenovo', tags: ['lenovo','thinkpad','ultrabook'], price: 42990000, stock: 12, sku: 'TPX1C-12', images: gallery(201), attributes: { color: 'Đen', ram: '32GB' }, specifications: { 'Màn hình': '14 inch 2.8K OLED', 'CPU': 'Intel Core Ultra 7', 'Pin': '57Wh' }, shipping: { weight: 1080, freeShipping: true }, isActive: true, isApproved: true, ratingAvg: 4.6, reviewCount: 19, soldCount: 27 },
      { sellerId: shop2._id, title: 'Áo Polo nam Premium Cotton', description: 'Áo polo nam chất liệu cotton premium 100%, thoáng mát, form regular fit', shortDescription: 'Polo Premium - Cotton 100%', categories: ['Thời trang','Nam','Áo'], brand: 'Local Brand', tags: ['polo','nam','cotton','thoi-trang'], price: 450000, salePrice: 359000, stock: 200, sku: 'POLO-M-01', images: gallery(399), attributes: { color: 'Trắng', size: 'M,L,XL' }, specifications: { 'Chất liệu': 'Cotton 100%', 'Form': 'Regular Fit', 'Xuất xứ': 'Việt Nam' }, shipping: { weight: 200, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.3, reviewCount: 87, soldCount: 520 },
      { sellerId: shop2._id, title: 'Quần Jean Slim Fit Nam', description: 'Quần jean nam slim fit, co giãn tốt, wash đẹp, phù hợp nhiều phong cách', shortDescription: 'Jean Slim Fit - Co giãn tốt', categories: ['Thời trang','Nam','Quần'], brand: 'Local Brand', tags: ['jean','nam','slim-fit'], price: 650000, salePrice: 499000, stock: 150, sku: 'JEAN-SF-01', images: gallery(401), attributes: { color: 'Xanh đậm', size: '29,30,31,32' }, specifications: { 'Chất liệu': 'Cotton pha Spandex', 'Form': 'Slim Fit' }, shipping: { weight: 500, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.2, reviewCount: 54, soldCount: 310 },
      { sellerId: shop2._id, title: 'Váy Midi Hoa Nữ Thanh Lịch', description: 'Váy midi họa tiết hoa, chất liệu chiffon nhẹ, thích hợp đi làm và dạo phố', shortDescription: 'Váy Midi Hoa - Thanh lịch', categories: ['Thời trang','Nữ','Váy'], brand: 'Local Brand', tags: ['vay','nu','midi','hoa'], price: 550000, salePrice: 429000, stock: 80, sku: 'VAY-MIDI-01', images: gallery(407), attributes: { color: 'Hồng', size: 'S,M,L' }, specifications: { 'Chất liệu': 'Chiffon', 'Form': 'A-line' }, shipping: { weight: 200, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.5, reviewCount: 43, soldCount: 187 },
      { sellerId: shop1._id, title: 'Bàn phím cơ Keychron K8 Pro', description: 'Bàn phím cơ wireless với QMK/VIA, hot-swap, Gateron G Pro switch', shortDescription: 'Keychron K8 Pro - Custom keyboard', categories: ['Phụ kiện','Bàn phím'], brand: 'Keychron', tags: ['keychron','mechanical','keyboard'], price: 2690000, salePrice: 2390000, stock: 40, sku: 'KC-K8P', images: gallery(26), attributes: { color: 'Đen', switch: 'Brown' }, specifications: { 'Kết nối': 'Bluetooth 5.1 / USB-C', 'Switch': 'Gateron G Pro', 'Pin': '4000 mAh' }, shipping: { weight: 900, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.7, reviewCount: 38, soldCount: 92 },
      { sellerId: shop1._id, title: 'Chuột Logitech MX Master 3S', description: 'Chuột không dây cao cấp, cảm biến 8000 DPI, sạc USB-C, kết nối 3 thiết bị', shortDescription: 'MX Master 3S - Ergonomic mouse', categories: ['Phụ kiện','Chuột'], brand: 'Logitech', tags: ['logitech','mouse','ergonomic'], price: 2590000, stock: 35, sku: 'LG-MXM3S', images: gallery(28), attributes: { color: 'Graphite' }, specifications: { 'DPI': '8000', 'Pin': '70 ngày', 'Kết nối': 'Bluetooth / USB Receiver' }, shipping: { weight: 141, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.8, reviewCount: 112, soldCount: 267 },
      { sellerId: shop1._id, title: 'Sạc dự phòng Anker 20000mAh 65W', description: 'Pin sạc dự phòng 20000mAh, sạc nhanh PD 65W, sạc được laptop', shortDescription: 'Anker 20000mAh - Sạc laptop', categories: ['Phụ kiện','Sạc'], brand: 'Anker', tags: ['anker','powerbank','pd'], price: 1490000, salePrice: 1290000, stock: 70, sku: 'ANK-20K', images: gallery(111), attributes: { color: 'Đen' }, specifications: { 'Dung lượng': '20000 mAh', 'Công suất': '65W PD', 'Cổng': '2 USB-C, 1 USB-A' }, shipping: { weight: 500, freeShipping: false }, isActive: true, isApproved: true, ratingAvg: 4.6, reviewCount: 89, soldCount: 340 },
    ].map(applyProductVariantData));

    logger.info('Products created successfully');

    logger.info('Creating blog posts...');
    const blogPosts = await BlogPost.create([
      ...[
      {
        title: 'Cách chọn điện thoại phù hợp trong năm 2026',
        excerpt: 'Các tiêu chí quan trọng khi chọn smartphone: hiệu năng, camera, pin, màn hình và ngân sách.',
        content: 'Khi chọn điện thoại, hãy bắt đầu từ nhu cầu thực tế: chụp ảnh, chơi game, làm việc hay dùng cơ bản. Người dùng cần camera tốt nên ưu tiên cảm biến lớn, chống rung và xử lý ảnh ổn định. Người chơi game nên xem chip, tản nhiệt, màn hình tần số quét cao và dung lượng pin. Với nhu cầu lâu dài, hãy ưu tiên máy còn được cập nhật phần mềm và có chính sách bảo hành rõ ràng.',
        coverImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
        category: 'tutorial',
        tags: ['dien-thoai', 'huong-dan', 'smartphone'],
        authorId: admin._id,
        isPublished: true,
        relatedProducts: [products[0]._id, products[1]._id]
      },
      {
        title: 'Laptop làm việc: nên chọn MacBook, ultrabook hay gaming?',
        excerpt: 'So sánh nhanh các nhóm laptop phổ biến để chọn đúng máy cho học tập, văn phòng và sáng tạo.',
        content: 'MacBook phù hợp với người cần pin tốt, màn hình đẹp và hệ sinh thái Apple. Ultrabook Windows cân bằng giữa tính di động, cổng kết nối và phần mềm doanh nghiệp. Laptop gaming phù hợp khi cần GPU mạnh cho đồ họa, dựng hình hoặc chơi game, đổi lại máy thường nặng hơn và pin ngắn hơn. Trước khi mua, hãy kiểm tra RAM, SSD, màn hình và chế độ bảo hành.',
        coverImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
        category: 'review',
        tags: ['laptop', 'macbook', 'review'],
        authorId: admin._id,
        isPublished: true,
        relatedProducts: [products[2]._id, products[8]._id]
      },
      {
        title: 'Flash Sale phụ kiện: mua gì để tối ưu chi phí?',
        excerpt: 'Tai nghe, sạc dự phòng, chuột và bàn phím là các món phụ kiện dễ mua tốt khi có giảm giá.',
        content: 'Phụ kiện công nghệ thường có mức giảm tốt trong các đợt Flash Sale. Tai nghe nên ưu tiên chống ồn, độ trễ thấp và pin ổn. Sạc dự phòng cần dung lượng thật, công suất phù hợp và đủ chuẩn an toàn. Với chuột và bàn phím, hãy chọn theo thói quen làm việc, kích thước bàn và kiểu kết nối. Đừng chỉ nhìn phần trăm giảm giá, hãy so sánh giá cuối cùng và bảo hành.',
        coverImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
        category: 'promotion',
        tags: ['flash-sale', 'phu-kien', 'khuyen-mai'],
        authorId: admin._id,
        isPublished: true,
        relatedProducts: [products[3]._id, products[10]._id, products[19]._id]
      }
      ].map(enrichBlogPost),
      ...createExtraBlogPosts(admin._id, products)
    ]);

    // ── Summary ──
    logger.info('\n=== SEED DATA SUMMARY ===');
    logger.info('Admin: admin@marketplace.com / admin123');
    logger.info('Seller 1: seller1@marketplace.com / seller123');
    logger.info('Seller 2: seller2@marketplace.com / seller123');
    logger.info('Customer 1: customer1@marketplace.com / customer123');
    logger.info('Customer 2: customer2@marketplace.com / customer123');
    logger.info('Shipper: shipper@marketplace.com / shipper123');
    logger.info(`Shops: ${shop1.shopName}, ${shop2.shopName}`);
    logger.info(`Products: ${products.length}`);
    logger.info(`Blog posts: ${blogPosts.length}`);
    logger.info(`Categories: 6`);
    logger.info('=========================\n');

    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

seedData();
