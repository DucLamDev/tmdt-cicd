import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../api/products';
import ProductCard from '../components/ProductCard';
import {
  FiBox,
  FiChevronDown,
  FiCpu,
  FiFilter,
  FiLayers,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiStar
} from 'react-icons/fi';
import AIProductSearch from '../components/AIProductSearch';
import SmartRecommendations from '../components/SmartRecommendations';

const readFiltersFromSearchParams = (params) => ({
  query: params.get('query') || '',
  category: params.get('category') || '',
  minPrice: params.get('minPrice') || '',
  maxPrice: params.get('maxPrice') || '',
  sort: params.get('sort') || '-createdAt',
  page: parseInt(params.get('page'), 10) || 1,
});

const filtersEqual = (a, b) => (
  a.query === b.query
  && a.category === b.category
  && a.minPrice === b.minPrice
  && a.maxPrice === b.maxPrice
  && a.sort === b.sort
  && Number(a.page) === Number(b.page)
);

const buildSearchParams = (nextFilters) => {
  const params = new URLSearchParams();
  Object.entries(nextFilters).forEach(([key, value]) => {
    if (value && !(key === 'sort' && value === '-createdAt') && !(key === 'page' && Number(value) === 1)) {
      params.set(key, value);
    }
  });
  return params;
};

const priceRanges = [
  ['Dưới 500K', '', '500000'],
  ['500K - 2 triệu', '500000', '2000000'],
  ['2 - 10 triệu', '2000000', '10000000'],
  ['Trên 10 triệu', '10000000', ''],
];

const sortOptions = [
  ['-createdAt', 'Mới nhất'],
  ['price_asc', 'Giá thấp - cao'],
  ['price_desc', 'Giá cao - thấp'],
  ['popular', 'Bán chạy'],
  ['rating', 'Đánh giá cao'],
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [groupedProducts, setGroupedProducts] = useState({});
  const [categorySearch, setCategorySearch] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const [filters, setFilters] = useState(() => readFiltersFromSearchParams(searchParams));

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const nextFilters = readFiltersFromSearchParams(searchParams);
    setFilters((currentFilters) => (
      filtersEqual(currentFilters, nextFilters) ? currentFilters : nextFilters
    ));
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProducts({ ...filters, limit: 100 });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
      groupProductsByCategory(response.data.products);
      setAiResult(null);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const groupProductsByCategory = (productList) => {
    const grouped = {
      featured: [],
      clothing: [],
      electronics: [],
      furniture: [],
      accessories: [],
      other: []
    };

    productList.forEach(product => {
      if (product.isFeatured) {
        grouped.featured.push(product);
      }

      const categoryStr = product.categories?.join(' ').toLowerCase() || '';
      
      if (categoryStr.includes('áo') || categoryStr.includes('quần') || 
          categoryStr.includes('polo') || categoryStr.includes('hoodie') ||
          categoryStr.includes('tee') || categoryStr.includes('thời trang')) {
        grouped.clothing.push(product);
      } else if (categoryStr.includes('điện thoại') || categoryStr.includes('laptop') || 
                 categoryStr.includes('iphone') || categoryStr.includes('samsung') ||
                 categoryStr.includes('ipad') || categoryStr.includes('macbook') ||
                 categoryStr.includes('smartphone') || categoryStr.includes('máy tính')) {
        grouped.electronics.push(product);
      } else if (categoryStr.includes('ghế') || categoryStr.includes('bàn') ||
                 categoryStr.includes('nội thất') || categoryStr.includes('furniture')) {
        grouped.furniture.push(product);
      } else if (categoryStr.includes('phụ kiện') || categoryStr.includes('tai nghe') ||
                 categoryStr.includes('airpods') || categoryStr.includes('accessories')) {
        grouped.accessories.push(product);
      } else {
        grouped.other.push(product);
      }
    });

    setGroupedProducts(grouped);
  };

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    setSearchParams(buildSearchParams(newFilters));
  };

  const handleFilterChange = (key, value) => {
    updateFilters({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    updateFilters({
      query: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: '-createdAt',
      page: 1,
    });
    setAiResult(null);
  };

  const handleAIResults = ({ products: aiProducts, query, source }) => {
    setProducts(aiProducts);
    setPagination({ total: aiProducts.length, page: 1, pages: 1 });
    groupProductsByCategory(aiProducts);
    setAiResult({ query, source, total: aiProducts.length });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );
  const setPriceRange = (minPrice, maxPrice) => {
    updateFilters({ ...filters, minPrice, maxPrice, page: 1 });
  };

  const activeFilterCount = [
    filters.query,
    filters.category,
    filters.minPrice || filters.maxPrice,
    filters.sort !== '-createdAt' ? filters.sort : ''
  ].filter(Boolean).length;

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="pill mb-3">Marketplace catalog</div>
          <h1 className="section-title text-3xl">Sản phẩm</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Lọc nhanh, tìm thông minh và khám phá sản phẩm phù hợp hơn.</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary px-4 py-2 md:hidden"
        >
          <FiFilter className="w-5 h-5 mr-2" />
          Lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      <AIProductSearch onResults={handleAIResults} />

      {aiResult && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm">
          <span>
            Kết quả tìm kiếm {aiResult.source === 'image' ? 'từ hình ảnh' : 'cho'} "{aiResult.query || 'ảnh mẫu'}": {aiResult.total} sản phẩm
          </span>
          <button
            type="button"
            onClick={fetchProducts}
            className="font-semibold text-blue-700 hover:text-blue-900"
          >
            Xem lại danh sách thường
          </button>
        </div>
      )}

      {!aiResult && (
        <div className="mb-8 rounded-[22px] border border-blue-100 bg-white px-5 shadow-soft">
          <SmartRecommendations title="Gợi ý sản phẩm phù hợp với bạn" limit={4} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside
          className={`${
            showFilters ? 'block' : 'hidden'
          } md:block w-full md:w-[300px] flex-shrink-0`}
        >
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-950">Bộ lọc</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{activeFilterCount || 0} mục đang chọn</p>
              </div>
              {(filters.query || filters.category || filters.minPrice || filters.maxPrice || filters.sort !== '-createdAt') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-extrabold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-200">
              <section className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Từ khóa</h4>
                  {filters.query && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('query', '')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-slate-400">
                  <FiSearch className="h-4 w-4 text-slate-400" />
                  <input
                    value={filters.query}
                    onChange={(e) => handleFilterChange('query', e.target.value)}
                    placeholder="Tên, thương hiệu..."
                    className="h-full w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </section>

              <section className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Danh mục</h4>
                  <span className="text-xs font-bold text-slate-400">{filteredCategories.length}</span>
                </div>
                <div className="mb-3 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
                  <FiSearch className="h-4 w-4 text-slate-400" />
                  <input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Tìm danh mục"
                    className="h-full w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleFilterChange('category', '')}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-bold transition ${
                      !filters.category ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className={`h-4 w-4 rounded-full border ${!filters.category ? 'border-white bg-white shadow-[inset_0_0_0_4px_#2563eb]' : 'border-slate-300'}`} />
                  </button>
                  {filteredCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleFilterChange('category', cat)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-bold transition ${
                        filters.category === cat ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-3">{cat}</span>
                      <span className={`h-4 w-4 flex-shrink-0 rounded-full border ${filters.category === cat ? 'border-white bg-white shadow-[inset_0_0_0_4px_#2563eb]' : 'border-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Khoảng giá</h4>
                  {(filters.minPrice || filters.maxPrice) && (
                    <button
                      type="button"
                      onClick={() => setPriceRange('', '')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {priceRanges.map(([label, min, max]) => {
                    const active = filters.minPrice === min && filters.maxPrice === max;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPriceRange(min, max)}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm font-bold transition ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`h-4 w-4 rounded-full border ${active ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_#eff6ff]' : 'border-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                    placeholder="Từ"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                    placeholder="Đến"
                  />
                </div>
              </section>

              <section className="px-4 py-4">
                <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">Sắp xếp</h4>
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-800 outline-none focus:border-slate-400"
                  >
                    {sortOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </section>
            </div>
          </div>
        </aside>

        {/* Products Grid - Grouped by Category */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner border-primary-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-600">Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="mb-4 text-sm text-gray-600">
                Tìm thấy {pagination.total} sản phẩm
              </div>

              {/* Featured Products Section */}
              {groupedProducts.featured?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-primary-600">
                    <FiStar className="w-6 h-6 text-primary-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Sản phẩm nổi bật</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.featured.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.featured.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Clothing Section */}
              {groupedProducts.clothing?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-blue-600">
                    <FiShoppingBag className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Thời trang & Quần áo</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.clothing.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.clothing.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Electronics Section */}
              {groupedProducts.electronics?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-purple-600">
                    <FiCpu className="w-6 h-6 text-purple-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Điện tử & Công nghệ</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.electronics.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.electronics.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Furniture Section */}
              {groupedProducts.furniture?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-green-600">
                    <FiPackage className="w-6 h-6 text-green-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Nội thất</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.furniture.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.furniture.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Accessories Section */}
              {groupedProducts.accessories?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-orange-600">
                    <FiBox className="w-6 h-6 text-orange-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Phụ kiện</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.accessories.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.accessories.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Other Products Section */}
              {groupedProducts.other?.length > 0 && (
                <section className="category-section">
                  <div className="flex items-center mb-6 pb-3 border-b-2 border-gray-600">
                    <FiLayers className="w-6 h-6 text-gray-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Sản phẩm khác</h2>
                    <span className="ml-3 text-sm text-gray-500">({groupedProducts.other.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.other.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
