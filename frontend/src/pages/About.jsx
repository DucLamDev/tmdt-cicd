import { FiTarget, FiAward, FiUsers, FiTrendingUp } from 'react-icons/fi';

const About = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Về chúng tôi</h1>
            <p className="text-xl text-primary-100">
              Nền tảng thương mại điện tử thông minh với trải nghiệm mua sắm hiện đại tại Việt Nam
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                  <FiTarget className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-3xl font-bold">Sứ mệnh</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Chúng tôi cam kết mang đến trải nghiệm mua sắm thông minh và tiện lợi nhất cho người Việt Nam. 
                Với các công cụ tìm kiếm và gợi ý thông minh, chúng tôi giúp kết nối người mua và người bán một cách hiệu quả nhất.
              </p>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                  <FiAward className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-3xl font-bold">Tầm nhìn</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Trở thành nền tảng thương mại điện tử hàng đầu Việt Nam, dẫn đầu về trải nghiệm mua sắm online tiện lợi. 
                Tạo ra một hệ sinh thái công nghệ toàn diện cho người dùng và đối tác.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Con số ấn tượng</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">1M+</div>
              <p className="text-gray-600">Người dùng</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">100K+</div>
              <p className="text-gray-600">Sản phẩm</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">50K+</div>
              <p className="text-gray-600">Người bán</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">99%</div>
              <p className="text-gray-600">Hài lòng</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Điểm nổi bật</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrendingUp className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Tìm kiếm thông minh</h3>
              <p className="text-gray-600">
                Tìm sản phẩm bằng hình ảnh, giọng nói hoặc mô tả văn bản một cách thông minh
              </p>
            </div>

            <div className="card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Cộng đồng lớn</h3>
              <p className="text-gray-600">
                Hàng triệu người dùng và người bán tin cậy trên khắp Việt Nam
              </p>
            </div>

            <div className="card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAward className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Uy tín cao</h3>
              <p className="text-gray-600">
                Cam kết bảo vệ quyền lợi người mua với chính sách đổi trả linh hoạt
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Đội ngũ lãnh đạo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-1">Nguyễn Văn A</h3>
              <p className="text-primary-600 mb-2">CEO & Founder</p>
              <p className="text-gray-600 text-sm">10+ năm kinh nghiệm trong lĩnh vực E-commerce</p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-1">Trần Thị B</h3>
              <p className="text-primary-600 mb-2">CTO</p>
              <p className="text-gray-600 text-sm">Chuyên gia công nghệ dữ liệu và sản phẩm số</p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-1">Lê Văn C</h3>
              <p className="text-primary-600 mb-2">COO</p>
              <p className="text-gray-600 text-sm">Chuyên gia vận hành và logistics</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">
            Tham gia cùng chúng tôi
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Trở thành một phần của cộng đồng Marketplace
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="/register"
              className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3"
            >
              Đăng ký ngay
            </a>
            <a
              href="/contact"
              className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-3"
            >
              Liên hệ với chúng tôi
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
