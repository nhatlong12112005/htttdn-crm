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
});
