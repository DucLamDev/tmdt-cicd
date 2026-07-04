import { useState } from 'react';
import { FiClock, FiFacebook, FiInstagram, FiLinkedin, FiMail, FiMapPin, FiPhone, FiTwitter } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Tin nhắn của bạn đã được gửi! Chúng tôi sẽ liên hệ lại sớm.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error(data.message || 'Có lỗi xảy ra. Vui lòng thử lại!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-20 text-white">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold">Liên hệ với chúng tôi</h1>
            <p className="text-xl text-primary-100">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <h2 className="mb-6 text-2xl font-bold">Thông tin liên hệ</h2>

              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <FiMapPin className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Địa chỉ</h3>
                  <p className="text-gray-600">
                    147 Nguyễn Huệ, Sài Gòn<br />
                    Hồ Chí Minh, Việt Nam
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <FiPhone className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Số điện thoại</h3>
                  <p className="text-gray-600">
                    Hotline: 1900 4747<br />
                    Tel: 1900 4747
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <FiMail className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Email</h3>
                  <p className="text-gray-600">
                    support@marketplace.vn<br />
                    contact@marketplace.vn
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <FiClock className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Giờ làm việc</h3>
                  <p className="text-gray-600">
                    Thứ 2 - Thứ 6: 8:00 - 18:00<br />
                    Thứ 7: 8:00 - 12:00<br />
                    Chủ nhật: Nghỉ
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-semibold">Theo dõi chúng tôi</h3>
                <div className="flex space-x-3">
                  <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700">
                    <FiFacebook className="h-5 w-5" />
                  </a>
                  <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-600">
                    <FiTwitter className="h-5 w-5" />
                  </a>
                  <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white transition-colors hover:bg-pink-700">
                    <FiInstagram className="h-5 w-5" />
                  </a>
                  <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white transition-colors hover:bg-blue-800">
                    <FiLinkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="card p-8">
                <h2 className="mb-6 text-2xl font-bold">Gửi tin nhắn cho chúng tôi</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-medium">Họ và tên *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input w-full" placeholder="Nguyễn Văn A" />
                    </div>
                    <div>
                      <label className="mb-2 block font-medium">Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input w-full" placeholder="email@example.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-medium">Số điện thoại</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input w-full" placeholder="0123456789" />
                    </div>
                    <div>
                      <label className="mb-2 block font-medium">Chủ đề *</label>
                      <select name="subject" value={formData.subject} onChange={handleChange} required className="input w-full">
                        <option value="">Chọn chủ đề</option>
                        <option value="general">Câu hỏi chung</option>
                        <option value="support">Hỗ trợ kỹ thuật</option>
                        <option value="partnership">Hợp tác kinh doanh</option>
                        <option value="complaint">Khiếu nại</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">Nội dung tin nhắn *</label>
                    <textarea name="message" value={formData.message} onChange={handleChange} required rows="6" className="input w-full" placeholder="Nhập nội dung tin nhắn của bạn..." />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                    {loading ? 'Đang gửi...' : 'Gửi tin nhắn'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container">
          <h2 className="mb-8 text-center text-3xl font-bold">Vị trí của chúng tôi</h2>
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-200">
            <iframe
              src="https://www.google.com/maps?q=147%20Nguyen%20Hue%2C%20Sai%20Gon%2C%20Ho%20Chi%20Minh%2C%20Viet%20Nam&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="Marketplace location"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Câu hỏi thường gặp</h2>
          <div className="space-y-4">
            <details className="card cursor-pointer p-6">
              <summary className="text-lg font-semibold">Làm thế nào để tạo tài khoản?</summary>
              <p className="mt-3 text-gray-600">Bạn có thể đăng ký tài khoản bằng nút Đăng ký, điền thông tin cá nhân và xác nhận email.</p>
            </details>
            <details className="card cursor-pointer p-6">
              <summary className="text-lg font-semibold">Chính sách giao hàng như thế nào?</summary>
              <p className="mt-3 text-gray-600">Chúng tôi hỗ trợ giao hàng toàn quốc với thời gian từ 2-5 ngày làm việc tùy khu vực.</p>
            </details>
            <details className="card cursor-pointer p-6">
              <summary className="text-lg font-semibold">Tôi có thể đổi trả hàng không?</summary>
              <p className="mt-3 text-gray-600">Bạn có thể gửi yêu cầu đổi trả trong thời hạn chính sách nếu sản phẩm còn đủ điều kiện.</p>
            </details>
            <details className="card cursor-pointer p-6">
              <summary className="text-lg font-semibold">Các phương thức thanh toán được hỗ trợ?</summary>
              <p className="mt-3 text-gray-600">Hệ thống hỗ trợ COD, ví điện tử MoMo/ZaloPay, VNPay và thẻ quốc tế qua Stripe.</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
