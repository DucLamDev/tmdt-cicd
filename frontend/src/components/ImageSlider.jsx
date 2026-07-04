/**
 * IMAGE SLIDER COMPONENT - Slider ảnh tự động trượt
 * 
 * Props:
 * @param {Array} slides - Mảng các slide, mỗi slide có { image, title, description, badge, buttonText, buttonLink }
 * @param {number} autoPlayInterval - Thời gian tự động chuyển slide (ms), mặc định 5000ms = 5s
 * 
 * Chức năng:
 * - Tự động chuyển slide sau mỗi X giây
 * - Nút Previous/Next (hiện khi hover)
 * - Dots indicator để chọn slide trực tiếp
 * - Nút Play/Pause để tạm dừng auto-play
 * - Hiệu ứng chuyển slide mượt mà (transform)
 */

import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ImageSlider = ({ slides, autoPlayInterval = 5000 }) => {
  // State lưu index của slide hiện tại (0, 1, 2, ...)
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State kiểm soát auto-play (true = đang tự động chạy)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  /**
   * useEffect: Xử lý auto-play
   * - Chạy mỗi khi currentIndex, isAutoPlaying, slides thay đổi
   * - Tạo interval để tự động chuyển slide
   * - Cleanup interval khi component unmount hoặc dependencies thay đổi
   */
  useEffect(() => {
    // Nếu không auto-play hoặc chỉ có 1 slide thì không cần chạy
    if (!isAutoPlaying || slides.length <= 1) return;

    // Tạo interval để chuyển slide
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        // Nếu đang ở slide cuối thì quay về slide đầu, ngược lại + 1
        prevIndex === slides.length - 1 ? 0 : prevIndex + 1
      );
    }, autoPlayInterval);

    // Cleanup: Clear interval khi component unmount
    return () => clearInterval(intervalId);
  }, [currentIndex, isAutoPlaying, slides.length, autoPlayInterval]);

  /**
   * Chuyển về slide trước
   * - Tắt auto-play
   * - Nếu đang ở slide đầu thì quay về slide cuối
   */
  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === 0 ? slides.length - 1 : currentIndex - 1);
  };

  /**
   * Chuyển sang slide tiếp theo
   * - Tắt auto-play
   * - Nếu đang ở slide cuối thì quay về slide đầu
   */
  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === slides.length - 1 ? 0 : currentIndex + 1);
  };

  /**
   * Nhảy đến slide cụ thể theo index
   * - Tắt auto-play
   * - Set currentIndex = index được chọn
   */
  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  // Nếu không có slides thì không render gì
  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-[500px] group overflow-hidden">
      {/* Container của tất cả slides - Dùng translateX để chuyển slide */}
      <div 
        className="flex transition-transform duration-700 ease-out h-full"
        // Transform: Di chuyển theo currentIndex (0 = 0%, 1 = -100%, 2 = -200%,...)
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {/* Map qua tất cả slides để render */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className="min-w-full h-full relative"
          >
            {/* Background Image - Ảnh nền của slide */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${slide.image})`,
              }}
            >
              {/* Overlay - Lớp phủ tối để text dễ đọc */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
            </div>

            {/* Content - Nội dung text trên slide */}
            <div className="relative h-full container flex items-center">
              <div className="max-w-2xl text-white">
                {/* Badge - Chỉ hiện nếu có (Mới, Sale,...) */}
                {slide.badge && (
                  <span className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full mb-4">
                    {slide.badge}
                  </span>
                )}
                <h2 className="text-5xl font-bold mb-4 leading-tight">
                  {slide.title}
                </h2>
                <p className="text-xl mb-6 text-gray-200">
                  {slide.description}
                </p>
                {/* CTA Button - Chỉ hiện nếu có buttonText và buttonLink */}
                {slide.buttonText && slide.buttonLink && (
                  <a
                    href={slide.buttonLink}
                    className="inline-block px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {slide.buttonText}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nút Previous - Hiện khi hover vào slider (opacity-0 -> opacity-100) */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous slide"
      >
        <FiChevronLeft className="w-6 h-6" />
      </button>

      {/* Nút Next - Hiện khi hover vào slider */}
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next slide"
      >
        <FiChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Indicator - Các chấm ở dưới để chọn slide */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            // Dot đang active sẽ dài hơn (w-8) và trắng hơn
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-white w-8' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Nút Play/Pause - Bật/tắt auto-play */}
      <button
        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm"
      >
        {isAutoPlaying ? '⏸ Tạm dừng' : '▶ Phát'}
      </button>
    </div>
  );
};

export default ImageSlider;
