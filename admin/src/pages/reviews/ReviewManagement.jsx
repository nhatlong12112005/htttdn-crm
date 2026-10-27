import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MessageSquareReply,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { reviewsApi } from '../../api';
import { formatDate } from '../../utils/formatHelpers';
import { Button, Modal } from '../../components/ui';

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Reply Modal State
  const [replyModalReview, setReplyModalReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.getReviews({
        page,
        itemPerPage: itemsPerPage,
      });
      const data = res.data;
      setReviews(data.list || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenReply = (review) => {
    setReplyModalReview(review);
    setReplyText(review.adminReply || '');
  };

  const handleSaveReply = async () => {
    if (!replyModalReview) return;
    if (!replyText.trim()) {
      alert('Vui lòng nhập nội dung phản hồi gửi khách hàng');
      return;
    }
    setSubmittingReply(true);
    try {
      await reviewsApi.replyReview(replyModalReview.id, replyText.trim());
      setReplyModalReview(null);
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi phản hồi thất bại');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;
    try {
      await reviewsApi.deleteReview(id);
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa phản hồi thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            Tiếp nhận & Xử lý Phản hồi Khách hàng (CRM)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tiếp nhận ý kiến đánh giá của khách hàng về sản phẩm và gửi phản hồi chăm sóc khách hàng ({totalItems} phản hồi)
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-500">Đang tải danh sách phản hồi...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              Chưa có phản hồi nào từ khách hàng.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Sản phẩm
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Mức độ hài lòng
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Nội dung phản hồi & Trả lời của Quản lý
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Ngày gửi
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const userName = review.client?.fullName || review.user?.fullName || 'Khách hàng';
                  const userEmail = review.client?.email || '';
                  const productName = review.product?.name || 'Sản phẩm';
                  const hasReplied = Boolean(review.adminReply);
                  return (
                    <tr
                      key={review.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
                        <div className="font-semibold">{userName}</div>
                        {userEmail && (
                          <div className="text-xs text-slate-400 dark:text-slate-500">{userEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[200px]">
                        {productName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-md">
                        <p className="whitespace-pre-line">{review.content || 'Không có lời bình'}</p>
                        {review.adminReply && (
                          <div className="mt-2 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">
                              Phản hồi từ Quản lý CRM:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {review.adminReply}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasReplied ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã phản hồi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            Chờ xử lý
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={MessageSquareReply}
                            onClick={() => handleOpenReply(review)}
                          >
                            {hasReplied ? 'Sửa trả lời' : 'Phản hồi'}
                          </Button>
                          <button
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Xóa phản hồi"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trang {page} / {totalPages}
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

      {/* Modal Tiếp nhận & Phản hồi Khách hàng */}
      <Modal
        isOpen={!!replyModalReview}
        onClose={() => setReplyModalReview(null)}
        title="Tiếp nhận & Trả lời Phản hồi Khách hàng"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setReplyModalReview(null)}
              disabled={submittingReply}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveReply} disabled={submittingReply}>
              {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi cho khách hàng'}
            </Button>
          </>
        }
      >
        {replyModalReview && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Khách hàng: {replyModalReview.client?.fullName || 'Khách hàng'}
                </span>
                <span className="text-amber-500 font-bold">
                  {'★'.repeat(replyModalReview.rating)}{'☆'.repeat(5 - replyModalReview.rating)}
                </span>
              </div>
              <div className="text-slate-500">
                Sản phẩm: <strong>{replyModalReview.product?.name || 'Sản phẩm'}</strong>
              </div>
              <p className="text-slate-700 dark:text-slate-200 italic pt-1">
                "{replyModalReview.content}"
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nội dung phản hồi từ Người Quản lý CRM *
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Cảm ơn quý khách đã gửi phản hồi về sản phẩm. Bộ phận CSKH xin ghi nhận và..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
