import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Image,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import { productsApi, categoriesApi, productColorsApi } from '../../api';
import { formatCurrency } from '../../utils/formatHelpers';
import { Button, Input, Select, Badge } from '../../components/ui';
import ProductFormModal from './ProductFormModal';
import ProductDetailModal from './ProductDetailModal';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToView, setProductToView] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoriesApi.getCategories({ itemPerPage: 100 });
      setCategories(res.data?.list || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, itemPerPage: 10 };
      if (search) params.search = search;
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (statusFilter === 'all') params.status = 'all';

      const res = await productsApi.getProducts(params);
      const data = res.data || {};
      setProducts(data.list || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    window.addEventListener('miva:categories', fetchCategories);
    return () => window.removeEventListener('miva:categories', fetchCategories);
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    window.addEventListener('miva:products', fetchProducts);
    return () => window.removeEventListener('miva:products', fetchProducts);
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const getCategoryName = (product) => {
    if (product?.category?.name) return product.category.name;
    const cat = categories.find((c) => c.id === product?.categoryId);
    return cat?.name || '-';
  };

  const handleAddClick = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleViewClick = async (product) => {
    try {
      let colors = product.colors || [];
      if (!colors.length) {
        const colorsRes = await productColorsApi.getByProductId(product.id);
        colors = colorsRes.data || [];
      }

      setProductToView({
        ...product,
        colors,
        categoryName: getCategoryName(product),
      });
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching product details:', err);
      setProductToView({
        ...product,
        colors: product.colors || [],
        categoryName: getCategoryName(product),
      });
      setIsDetailModalOpen(true);
    }
  };

  const handleEditClick = async (product) => {
    try {
      let rawColors = product.colors || [];
      if (!rawColors.length) {
        const colorsRes = await productColorsApi.getByProductId(product.id);
        rawColors = colorsRes.data || [];
      }
      const colors = rawColors.map((c) => ({
        ...c,
        colorName: c.color || c.colorName,
        variants: (c.variants || []).map((v) => ({
          ...v,
          price: Number(v.price) || 0,
          stock: Number(v.stock) || 0,
        })),
      }));
      setProductToEdit({ ...product, colors });
    } catch {
      setProductToEdit({ ...product, colors: [] });
    }
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (productId) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      try {
        await productsApi.deleteProduct(productId);
        fetchProducts();
      } catch (err) {
        alert(err.response?.data?.message || 'Xóa sản phẩm thất bại');
      }
    }
  };

  const handleSaveProduct = async (savedData) => {
    try {
      const payload = {
        name: savedData.name?.trim(),
        description: savedData.description?.trim() || null,
        status: savedData.status || 'active',
        categoryId: savedData.categoryId,
        category: { connect: { id: savedData.categoryId } },
        colors: (savedData.colors || []).map((c) => ({
          ...(c.id && !String(c.id).startsWith('temp-') ? { id: c.id } : {}),
          color: (c.colorName || c.color || 'Mặc định').trim(),
          imageUrls: (c.imageUrls || []).filter(Boolean),
          variants: (c.variants || []).map((v) => ({
            ...(v.id && !String(v.id).startsWith('temp-') ? { id: v.id } : {}),
            size: String(v.size || '').trim() || 'Tiêu chuẩn',
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0,
          })),
        })),
      };

      if (productToEdit) {
        await productsApi.updateProduct(productToEdit.id, payload);
      } else {
        await productsApi.createProduct(payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Lưu sản phẩm thất bại');
      throw err;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Quản lý Sản phẩm
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tổng cộng {totalItems} sản phẩm trong hệ thống
          </p>
        </div>
        <Button icon={Plus} onClick={handleAddClick}>
          Thêm sản phẩm mới
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc slug sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'Tất cả danh mục' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-52"
          />
          <Select
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang bán (Active)' },
              { value: 'inactive', label: 'Tạm ẩn (Inactive)' },
              { value: 'draft', label: 'Bản nháp (Draft)' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-slate-500">Đang tải danh sách sản phẩm...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              Không tìm thấy sản phẩm nào. Nhấn &ldquo;Thêm sản phẩm mới&rdquo; để tạo sản phẩm đầu tiên.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Sản phẩm
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Danh mục
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Giá bán
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Tồn kho
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const imgUrl =
                    product.thumbnail ||
                    product.colors?.find((c) => c.imageUrls && c.imageUrls.length > 0)
                      ?.imageUrls?.[0] ||
                    product.colors?.[0]?.imageUrls?.[0];

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={product.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 mr-3 bg-white shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3 shrink-0 only:flex [&:not(:only-child)]:hidden">
                            <Image className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {product.slug || `#${product.id?.substring(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {getCategoryName(product)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {product.minPrice ? (
                          product.maxPrice && product.maxPrice !== product.minPrice ? (
                            `${formatCurrency(Number(product.minPrice))} - ${formatCurrency(Number(product.maxPrice))}`
                          ) : (
                            formatCurrency(Number(product.minPrice))
                          )
                        ) : (
                          <span className="text-slate-400 italic">Chưa cấu hình giá</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            (product.totalStock ?? 0) > 10
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : (product.totalStock ?? 0) > 0
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {product.totalStock ?? 0} SP ({product.colors?.length || 0} màu)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={product.status === 'active' ? 'success' : 'default'}>
                          {product.status === 'active'
                            ? 'Đang bán'
                            : product.status === 'inactive'
                              ? 'Tạm ẩn'
                              : 'Bản nháp'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            className="text-slate-400 hover:text-blue-600"
                            onClick={() => handleViewClick(product)}
                            title="Xem chi tiết"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            className="text-slate-400 hover:text-amber-600"
                            onClick={() => handleEditClick(product)}
                            title="Chỉnh sửa"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteClick(product.id)}
                            title="Xóa sản phẩm"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trang {page} / {totalPages} ({totalItems} sản phẩm)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
        categories={categories}
      />

      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={productToView}
      />
    </div>
  );
}
