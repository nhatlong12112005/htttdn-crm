import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '../../components/ui';

export default function CategoryFormModal({ isOpen, onClose, categoryToEdit, onSave }) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name || '',
        description: categoryToEdit.description || '',
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = async () => {
    const name = formData.name.trim();
    if (!name) {
      alert('Tên danh mục là bắt buộc');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name,
        description: formData.description.trim() || null,
      });
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
              </span>
            ) : categoryToEdit ? (
              'Lưu thay đổi'
            ) : (
              'Tạo danh mục'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Tên danh mục *"
          placeholder="VD: Giày thể thao, Quần áo, Phụ kiện..."
          value={formData.name}
          maxLength={255}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Mô tả danh mục
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-400"
            rows={4}
            placeholder="Nhập mô tả chi tiết cho danh mục sản phẩm này (ví dụ: phong cách thiết kế, chất liệu, phân loại sản phẩm...)"
            value={formData.description}
            maxLength={2000}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-400">
              Mô tả giúp phân loại và hiển thị thông tin rõ ràng cho khách hàng
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {(formData.description || '').length}/2000
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
