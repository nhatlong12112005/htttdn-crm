import { PrismaService } from 'src/common/prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService notifications', () => {
  it('links a new product review notification to the exact review', async () => {
    const reviewId = '33333333-3333-4333-8333-333333333333';
    const prisma = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'product' }) },
      review: { create: jest.fn().mockResolvedValue({ id: reviewId }) },
      admin: { findMany: jest.fn().mockResolvedValue([{ id: 'manager' }]) },
      notification: { createMany: jest.fn() },
    };
    Object.assign(prisma, { extended: prisma });
    const service = new ReviewsService(prisma as unknown as PrismaService);
    await service.create('client', {
      productId: 'product',
      rating: 5,
      content: 'Tốt',
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            adminId: 'manager',
            data: { kind: 'review', reviewId },
          }),
        ],
      }),
    );
  });

  it('notifies client when CRM manager replies to a review', async () => {
    const reviewId = '33333333-3333-4333-8333-333333333333';
    const clientId = '44444444-4444-4444-4444-444444444444';
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue({
          id: reviewId,
          clientId,
          productId: 'product-1',
          product: { id: 'product-1', name: 'Apple Watch Series 9', slug: 'apple-watch-9' },
          orderDetail: { id: 'od-1', order: { id: 'order-1', orderCode: 'ORD123' } },
        }),
        update: jest.fn().mockResolvedValue({
          id: reviewId,
          clientId,
          adminReply: 'Cảm ơn bạn đã phản hồi!',
        }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };
    Object.assign(prisma, { extended: prisma });
    const realtime = {
      emitToUser: jest.fn(),
    };
    const service = new ReviewsService(prisma as unknown as PrismaService, realtime as any);

    await service.replyReview(reviewId, 'Cảm ơn bạn đã phản hồi!');

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId,
          title: 'Quản lý CRM đã phản hồi về đánh giá của bạn',
          content: expect.stringContaining('Apple Watch Series 9'),
          data: expect.objectContaining({
            kind: 'review_reply',
            reviewId,
          }),
        }),
      }),
    );
    expect(realtime.emitToUser).toHaveBeenCalledWith(
      clientId,
      'notification:created',
      expect.objectContaining({ kind: 'review_reply', reviewId }),
    );
  });
});
