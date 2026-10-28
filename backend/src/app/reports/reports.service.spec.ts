import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService reconciliation', () => {
  it('uses payment and refund dates while GMV uses completed orders', async () => {
    const orders = [
      {
        id: 'one',
        orderCode: 'A',
        client: { id: 'client', fullName: 'A' },
        status: OrderStatus.completed,
        createdAt: new Date('2026-10-28T08:00:00Z'),
        totalAmount: 100,
        payment: {
          amount: 100,
          method: 'cod',
          status: PaymentStatus.paid,
          paidAt: new Date('2026-10-28T09:00:00Z'),
          refundedAt: null,
        },
      },
      {
        id: 'two',
        orderCode: 'B',
        client: { id: 'client', fullName: 'B' },
        status: OrderStatus.shipping,
        createdAt: new Date('2026-10-27T08:00:00Z'),
        totalAmount: 50,
        payment: {
          amount: 50,
          method: 'vnpay',
          status: PaymentStatus.refunded,
          paidAt: new Date('2026-10-28T09:00:00Z'),
          refundedAt: new Date('2026-10-28T10:00:00Z'),
        },
      },
    ];
    const prisma = {
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 100 } }),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue(orders),
      },
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 150 } })
          .mockResolvedValueOnce({ _sum: { amount: 50 } }),
      },
    };
    Object.assign(prisma, { extended: prisma });
    const service = new ReportsService(prisma as unknown as PrismaService);
    const result = await service.reconciliation({
      startDate: '2026-10-28',
      endDate: '2026-10-28',
      page: 1,
      itemPerPage: 20,
    });
    expect(result.summary).toEqual({
      totalGmv: 100,
      grossCashIn: 150,
      refundedAmount: 50,
      netCashIn: 100,
      difference: 0,
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });
});
