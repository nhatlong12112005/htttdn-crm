import { Modal, Button, Badge } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatHelpers';
import { 
  CheckCircle2, 
  Truck, 
  Package, 
  Clock, 
  ShieldAlert,
  User,
  MapPin,
  FileText,
} from 'lucide-react';

export default function OrderDetailModal({ isOpen, onClose, order, onStatusChange }) {
  if (!order) return null;

  const orderItems = (order.details || []).map((od) => ({
    ...od,
    productName: od.productName || od.productVariant?.productColor?.product?.name || 'Sản phẩm',
    colorName: od.colorName || od.productVariant?.productColor?.color || '',
    size: od.sizeName || od.productVariant?.size || '',
    image: od.imageUrl || od.productVariant?.productColor?.imageUrls?.[0] || '',
  }));

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'confirmed':
      case 'processing':
      case 'shipping': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <Badge variant="success">Đã thanh toán</Badge>;
      case 'refunded': return <Badge variant="warning">Đã hoàn tiền</Badge>;
      case 'cancelled': return <Badge variant="error">Đã hủy thanh toán</Badge>;
      case 'pending': return <Badge variant="info">Chờ thanh toán</Badge>;
      case 'failed': return <Badge variant="error">Thanh toán lỗi</Badge>;
      default: return <Badge variant="default">{status || 'Chưa rõ'}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết đơn hàng #${order.orderCode || order.id}`}
      maxWidth="max-w-4xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          {onStatusChange && (
            <div className="flex flex-wrap gap-2 ml-auto">
              {order.status === 'pending' && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => onStatusChange(order.id, 'confirmed', 'Xác nhận đơn hàng')}
                >
                  Duyệt đơn (Confirmed)
                </Button>
              )}
              {order.status === 'confirmed' && (
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                  onClick={() => onStatusChange(order.id, 'processing', 'Đang chuẩn bị hàng và đóng gói')}
                >
                  <Package className="w-4 h-4 mr-1.5 inline" />
                  Đóng gói hàng (Processing)
                </Button>
              )}
              {order.status === 'processing' && (
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white" 
                  onClick={() => onStatusChange(order.id, 'shipping', 'Đã bàn giao cho đơn vị vận chuyển')}
                >
                  <Truck className="w-4 h-4 mr-1.5 inline" />
                  Giao vận chuyển (Shipping)
                </Button>
              )}
              {order.status === 'shipping' && (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => onStatusChange(order.id, 'completed', 'Xác nhận giao hàng thành công')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5 inline" />
                  Xác nhận giao thành công (Completed)
                </Button>
              )}
              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <Button 
                  variant="danger" 
                  onClick={() => {
                    const reason = prompt('Nhập lý do hủy đơn hàng (sẽ tự động hoàn kho, hoàn voucher):', 'Khách hàng hoặc Quản lý hủy đơn');
                    if (reason !== null && reason.trim()) {
                      onStatusChange(order.id, 'cancelled', reason.trim());
                    }
                  }}
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5 inline" />
                  Hủy đơn & Hoàn kho (Cancel)
                </Button>
              )}
            </div>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Top Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Thông tin đơn hàng
            </h4>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-slate-500 dark:text-slate-400">Mã đơn:</span> <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{order.orderCode || order.id}</span></p>
              <p><span className="text-slate-500 dark:text-slate-400">Ngày tạo:</span> <span className="font-medium text-slate-800 dark:text-slate-100">{formatDate(order.createdAt)}</span></p>
              <p className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span> 
                <Badge variant={getStatusBadgeVariant(order.status)}>{order.status.toUpperCase()}</Badge>
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Thanh toán:</span>
                  <span className="font-medium uppercase text-xs text-slate-700 dark:text-slate-300">
                    {order.payment?.method || order.paymentMethod || 'COD'}
                  </span>
                </div>
                <div>
                  {getPaymentStatusBadge(order.payment?.status)}
                  {order.payment?.paidAt && (
                    <span className="block text-[11px] text-slate-400 text-right mt-0.5">
                      {formatDate(order.payment.paidAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Thông tin người nhận
            </h4>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-slate-500 dark:text-slate-400">Họ tên:</span> <span className="font-medium text-slate-800 dark:text-slate-100">{order.userName || order.client?.fullName || order.receiverName || 'Khách hàng'}</span></p>
              {order.client?.email && <p><span className="text-slate-500 dark:text-slate-400">Email:</span> <span className="font-medium text-slate-800 dark:text-slate-100">{order.client.email}</span></p>}
              {(order.receiverPhone || order.client?.phone) && <p><span className="text-slate-500 dark:text-slate-400">Số ĐT:</span> <span className="font-medium text-slate-800 dark:text-slate-100">{order.receiverPhone || order.client?.phone}</span></p>}
              <p className="flex items-start gap-1">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-800 dark:text-slate-100">{order.shippingAddress || 'Chưa cung cấp địa chỉ'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div>
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            Sản phẩm trong đơn ({orderItems.length})
          </h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 font-medium">Đơn giá</th>
                  <th className="px-4 py-3 font-medium">Số lượng</th>
                  <th className="px-4 py-3 font-medium text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 transition-colors">
                {orderItems.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="w-10 h-10 rounded object-cover border border-slate-200 dark:border-slate-800" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 dark:border-slate-800"></div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{item.productName || 'Sản phẩm'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.colorName} • Size {item.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">x{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Tạm tính</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{formatCurrency(order.subtotalAmount || order.totalAmount)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Giảm giá Voucher</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Phí vận chuyển</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {Number(order.shippingFee) > 0 ? formatCurrency(order.shippingFee) : 'Miễn phí'}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Tổng cộng</span>
              <span className="font-bold text-blue-600 text-lg">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Order Status History / Audit Trail */}
        {(order.statusHistory || []).length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              Lịch sử đơn hàng & Ghi vết xử lý ({order.statusHistory.length})
            </h4>
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 max-h-56 overflow-y-auto">
              {order.statusHistory.map((hist, index) => {
                const actorLabel = hist.admin 
                  ? `Quản lý (${hist.admin.fullName})` 
                  : hist.client
                    ? `Khách hàng (${hist.client.fullName})`
                    : 'Hệ thống tự động';

                return (
                  <div key={hist.id || index} className="text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {actorLabel}
                      </span>
                      <span>{formatDate(hist.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        {hist.fromStatus || 'MỚI'} &rarr; {hist.toStatus}
                      </span>
                    </div>
                    {hist.note && (
                      <p className="mt-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded">
                        {hist.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
