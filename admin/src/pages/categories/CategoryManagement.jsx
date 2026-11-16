import { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Lock, Unlock, Plus, Loader2, ChevronLeft, ChevronRight, FolderTree } from 'lucide-react';
import { categoriesApi } from '../../api';
import { formatDate } from '../../utils/formatHelpers';
import { Button, Input, Badge } from '../../components/ui';
import CategoryFormModal from './CategoryFormModal';

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, itemPerPage: 10 };
      if (search) params.search = search;

      const res = await categoriesApi.getCategories(params);
      const data = res.data;
      setCategories(data.list || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    window.addEventListener('miva:categories', fetchCategories);
    return () => window.removeEventListener('miva:categories', fetchCategories);
  }, [fetchCategories]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleAddClick = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (category) => {
    setCategoryToEdit(category);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (category) => {
    const isLocked = category.status === 'inactive';
    const nextStatus = isLocked ? 'active' : 'inactive';
    const actionLabel = isLocked ? 'mở khóa' : 'khóa';
    if (window.confirm(`Bạn có chắc chắn muốn ${actionLabel} danh mục "${category.name}"?`)) {
      try {
        await categoriesApi.updateCategory(category.id, { status: nextStatus });
        fetchCategories();
      } catch (err) {
        alert(err.response?.data?.message || `Không thể ${actionLabel} danh mục`);
      }
    }
  };

  const handleSave = async (savedData) => {
    try {
      if (categoryToEdit) {
        await categoriesApi.updateCategory(categoryToEdit.id, savedData);
      } else {
        await categoriesApi.createCategory(savedData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Lưu danh mục thất bại');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-indigo-600" />
            Quản lý Danh mục Sản phẩm
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý tên, đường dẫn slug, mô tả chi tiết và trạng thái hoạt động của danh mục ({totalItems} danh mục)
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleAddClick}>
          Thêm danh mục mới
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 max-w-md">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục theo tên, slug, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full dark:text-slate-200 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-500">Đang tải danh mục...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              Không tìm thấy danh mục nào. Nhấn &ldquo;Thêm danh mục mới&rdquo; để tạo.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Tên danh mục
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Đường dẫn (Slug)
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Mô tả danh mục
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const isLocked = cat.status === 'inactive';
                  return (
                    <tr
                      key={cat.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {cat.slug}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs">
                        {cat.description ? (
                          <p className="line-clamp-2 text-xs" title={cat.description}>
                            {cat.description}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có mô tả</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isLocked ? 'danger' : 'success'}>
                          {isLocked ? 'Đã khóa' : 'Hoạt động'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(cat.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            className="text-slate-400 hover:text-amber-600"
                            onClick={() => handleEditClick(cat)}
                            title="Chỉnh sửa tên & mô tả"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={isLocked ? Unlock : Lock}
                            className={
                              isLocked
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }
                            onClick={() => handleToggleStatus(cat)}
                            title={isLocked ? 'Mở khóa danh mục' : 'Khóa danh mục'}
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
              Trang {page} / {totalPages} ({totalItems} danh mục)
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

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSave={handleSave}
      />
    </div>
  );
}
