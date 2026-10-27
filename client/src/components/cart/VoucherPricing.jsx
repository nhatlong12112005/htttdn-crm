import { useState } from 'react';
import { useVoucherOffers } from '../../hooks/useVoucherOffers';
import { formatPrice } from '../../utils/formatPrice';

export default function VoucherPricing({ items, pricing }) {
  const [draft, setDraft] = useState(null);
  const offers = useVoucherOffers(items.map(item => item.productVariant?.productColor?.product?.id))
    .filter(offer => offer.scope === 'platform');
  const code = pricing.codes[0] || '';
  const apply = nextCode => {
    const normalized = nextCode.trim().toUpperCase();
    pricing.setCodes(normalized ? [normalized] : []);
    setDraft(normalized);
  };

  return (
    <section aria-label="Mã giảm giá" className="space-y-2 border-t border-light-border dark:border-dark-border pt-4">
      <h3 className="font-bold text-light-text dark:text-dark-text">Mã giảm giá</h3>
      <label htmlFor="voucher-platform" className="block text-sm text-light-text dark:text-dark-text">Voucher MIVA</label>
      <div className="flex gap-2">
        <input id="voucher-platform" aria-label="Mã giảm giá MIVA" placeholder="Nhập mã giảm giá" value={draft ?? code} onChange={event => setDraft(event.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-lg border p-2 bg-transparent text-light-text dark:text-dark-text" />
        <button type="button" className="text-primary font-semibold" onClick={() => apply(draft ?? code)}>Áp dụng</button>
      </div>
      <p className="text-xs text-light-muted dark:text-dark-muted">Tối đa 1 mã giảm giá cho mỗi đơn.</p>
      {code && <button type="button" className="text-xs text-rose-600" onClick={() => apply('')}>Bỏ mã: {code}</button>}
      <div className="flex flex-wrap gap-1">
        {offers.map(offer => <button key={offer.id} type="button" className="rounded border border-primary/30 px-2 py-1 text-xs text-primary" title={`${offer.name}${offer.minOrderAmount ? ` · Đơn từ ${formatPrice(offer.minOrderAmount)}` : ''}${offer.maxDiscountAmount ? ` · Giảm tối đa ${formatPrice(offer.maxDiscountAmount)}` : ''}`} onClick={() => apply(offer.code)}>Dùng mã {offer.code}</button>)}
      </div>
      {pricing.data && <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400"><span>Sau giảm {formatPrice(pricing.data.discountAmount)}</span><strong>{formatPrice(pricing.data.totalAmount)}</strong></div>}
      {pricing.loading && <p role="status" className="text-xs text-light-muted dark:text-dark-muted">Đang tính giá sau giảm...</p>}
      {pricing.error && <div role="alert" className="text-sm text-rose-600">{pricing.error} <button type="button" className="underline" onClick={pricing.refresh}>Thử lại</button></div>}
    </section>
  );
}
