import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.js';
import Shop from '../../src/models/Shop.js';
import Product from '../../src/models/Product.js';
import Conversation from '../../src/models/Conversation.js';

let app;
let mongoServer;

beforeAll(async () => {
  process.env.GEMINI_API_KEY = '';
  process.env.GEMINI_MODEL = '';

  ({ default: app } = await import('../../src/app.js'));

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Conversation.deleteMany({});
  await Product.deleteMany({});
  await Shop.deleteMany({});
  await User.deleteMany({});
});

const createProduct = (sellerId, overrides) => Product.create({
  sellerId,
  title: 'Sản phẩm test',
  description: 'Mô tả sản phẩm test',
  price: 1000000,
  stock: 10,
  images: ['image.jpg'],
  isActive: true,
  isApproved: true,
  ...overrides
});

describe('AI Chat Controller', () => {
  test('only returns relevant device products for a web-browsing electronics query', async () => {
    const seller = await User.create({
      name: 'Seller',
      email: 'seller-ai@example.com',
      passwordHash: 'password123',
      roles: ['customer', 'seller'],
      approvalStatus: 'approved'
    });

    const shop = await Shop.create({
      ownerId: seller._id,
      shopName: 'AI Test Shop',
      email: 'ai-shop@example.com',
      phone: '0123456789'
    });

    await Promise.all([
      createProduct(shop._id, {
        title: 'iPhone 15 Pro Max 256GB',
        description: 'Điện thoại smartphone phù hợp lướt web, xem tin tức',
        categories: ['Điện thoại'],
        brand: 'Apple',
        tags: ['smartphone', 'web'],
        price: 32990000,
        soldCount: 80,
        ratingAvg: 4.9
      }),
      createProduct(shop._id, {
        title: 'Laptop Dell Inspiron 14',
        description: 'Laptop mỏng nhẹ phục vụ học tập, làm việc và duyệt web',
        categories: ['Laptop'],
        brand: 'Dell',
        tags: ['laptop', 'web'],
        price: 15990000,
        soldCount: 40,
        ratingAvg: 4.6
      }),
      createProduct(shop._id, {
        title: 'Ghế công thái học SMA Evo',
        description: 'Ghế văn phòng thoải mái',
        categories: ['Nội thất'],
        tags: ['ghế', 'chair'],
        price: 2799000,
        soldCount: 500,
        ratingAvg: 5
      }),
      createProduct(shop._id, {
        title: 'Đầm chữ A màu trắng',
        description: 'Đầm thời trang thanh lịch',
        categories: ['Thời trang'],
        tags: ['đầm', 'dress'],
        price: 459000,
        soldCount: 450,
        ratingAvg: 5
      })
    ]);

    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        message: 'Tôi muốn mua 1 sản phẩm điện tử phục vụ việc lướt web nhưng chưa biết mua cái gì'
      })
      .expect(200);

    const products = response.body.data.products;
    expect(products.length).toBeGreaterThan(0);
    expect(products.length).toBeLessThanOrEqual(3);

    const titles = products.map((product) => product.title);
    expect(titles).toEqual(expect.arrayContaining([
      expect.stringMatching(/iPhone|Laptop/)
    ]));
    expect(titles).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/Ghế|Đầm/)
    ]));
  });
});
