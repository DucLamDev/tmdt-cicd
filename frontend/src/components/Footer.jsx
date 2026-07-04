import { Link } from 'react-router-dom';
import { FiFacebook, FiInstagram, FiTwitter } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-blue-700 via-sky-700 to-cyan-600 text-blue-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">Về Marketplace</h3>
            <p className="mb-4 text-sm">
              Nền tảng thương mại điện tử với tìm kiếm thông minh, trợ lý mua sắm và trải nghiệm hiện đại.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary-400"><FiFacebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-primary-400"><FiInstagram className="h-5 w-5" /></a>
              <a href="#" className="hover:text-primary-400"><FiTwitter className="h-5 w-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-white">Liên kết</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-primary-400">Sản phẩm</Link></li>
              <li><Link to="/about" className="hover:text-primary-400">Giới thiệu</Link></li>
              <li><Link to="/contact" className="hover:text-primary-400">Liên hệ</Link></li>
              <li><Link to="/help" className="hover:text-primary-400">Trợ giúp</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-white">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shipping" className="hover:text-primary-400">Vận chuyển</Link></li>
              <li><Link to="/returns" className="hover:text-primary-400">Đổi trả</Link></li>
              <li><Link to="/warranty" className="hover:text-primary-400">Bảo hành</Link></li>
              <li><Link to="/faq" className="hover:text-primary-400">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-white">Liên hệ</h3>
            <ul className="space-y-2 text-sm">
              <li>Email: support@marketplace.com</li>
              <li>Hotline: 1900 4747</li>
              <li>Địa chỉ: 147 Nguyễn Huệ, Sài Gòn, Hồ Chí Minh, Việt Nam</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-8 text-center text-sm">
          <p>&copy; 2024 Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
