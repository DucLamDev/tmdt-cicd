import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useCartStore from '../../store/cartStore';
import { getProductImage } from '../../utils/productHelpers';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data.data.products || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Không tải được danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`http://localhost:5000/api/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã xóa khỏi danh sách yêu thích');
      fetchWishlist();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleAddToCart = (product) => {
    addItem(product, 1);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="spinner border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <FiHeart className="mr-3 text-red-500" />
        Danh sách yêu thích
      </h1>

      {wishlist.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart className="mx-auto w-20 h-20 text-gray-300 mb-4" />
          <p className="text-xl text-gray-600 mb-4">Danh sách yêu thích trống</p>
          <Link to="/products" className="btn-primary px-6 py-3 inline-block">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-gray-600">
            {wishlist.length} sản phẩm
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const product = item.productId;
              if (!product) return null;
              
              return (
                <div key={product._id} className="card overflow-hidden group">
                  <Link to={`/products/${product.slug}`} className="block relative">
                    <img 
                      src={getProductImage(product)}
                      alt={product.title} 
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    {product.salePrice && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-bold">
                        -{Math.round((1 - product.salePrice / product.price) * 100)}%
                      </div>
                    )}
                  </Link>
                  
                  <div className="p-4">
                    <Link to={`/products/${product.slug}`}>
                      <h3 className="font-medium line-clamp-2 mb-2 hover:text-primary-600">
                        {product.title}
                      </h3>
                    </Link>
                    
                    <div className="mb-4">
                      <div className="text-lg font-bold text-primary-600">
                        {(product.salePrice || product.price).toLocaleString()} ₫
                      </div>
                      {product.salePrice && (
                        <div className="text-sm text-gray-500 line-through">
                          {product.price.toLocaleString()} ₫
                        </div>
                      )}
                    </div>

                    {product.stock > 0 ? (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleAddToCart(product)}
                          className="btn-primary flex-1 py-2 text-sm flex items-center justify-center"
                        >
                          <FiShoppingCart className="mr-1" />
                          Thêm vào giỏ
                        </button>
                        <button 
                          onClick={() => removeFromWishlist(product._id)}
                          className="btn-secondary p-2 hover:bg-red-100 hover:text-red-600"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-red-600 font-medium mb-2">Hết hàng</div>
                        <button 
                          onClick={() => removeFromWishlist(product._id)}
                          className="btn-secondary w-full py-2 text-sm"
                        >
                          <FiTrash2 className="inline mr-1" />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;
