import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { voucherService } from '../services/voucherService';

export function useCheckoutPricing(items, initialCodes = [], enabled = true) {
  const userId = useSelector(state => state.auth.user?.id);
  const [codes, setCodes] = useState(() => initialCodes.slice(0, 1));
  const payload = { cartItemIds: items.map(item => item.id), voucherCodes: codes };
  const fingerprint = items.map(item => `${item.id}:${item.quantity}:${item.productVariant?.price}`).join('|');
  const query = useQuery({
    queryKey: ['checkout-preview', userId, fingerprint, codes.join('|')],
    queryFn: () => voucherService.previewCheckout(payload),
    enabled: Boolean(userId) && items.length > 0 && enabled,
    retry: false,
    refetchInterval: 30000,
  });
  const data = query.isError ? null : query.data;
  return {
    codes, payload, data, loading: query.isFetching || (items.length > 0 && query.isPending),
    ready: Boolean(data) && !query.isFetching && !query.isError,
    error: query.error?.response?.data?.errors?.[0]?.message || query.error?.response?.data?.message || (query.isError ? 'Không tính được giá. Vui lòng thử lại.' : ''),
    setCodes: nextCodes => setCodes(nextCodes.slice(0, 1)),
    refresh: query.refetch,
  };
}
