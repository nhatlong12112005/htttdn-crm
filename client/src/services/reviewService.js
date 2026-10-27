import { apiClient } from './apiClient';

export const reviewService = {
  createReview: async ({ productId, orderDetailId, rating, content }) => {
    return await apiClient.post('/reviews', {
      ...(productId ? { productId } : {}),
      ...(orderDetailId ? { orderDetailId } : {}),
      rating,
      content,
    });
  },
  getByProduct: async (productId) => {
    return await apiClient.get(`/reviews/product/${productId}`);
  },
};
