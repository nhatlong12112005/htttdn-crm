import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

type TestUser = Parameters<OrdersService['updateStatus']>[2];
const adminUser = { userID: 'admin-id', role: 'admin' } as unknown as TestUser;

function setup(parentStatus: OrderStatus = 'pending') {
  const parent = {
    id: '33333333-3333-4333-8333-333333333333',
    orderCode: 'TEST-FULFILLMENT',
    clientId: 'client-id',
    status: parentStatus,
    voucherDetails: [] as any[],
    payment: { status: 'pending', method: 'cod' },
    details: [
      {
        id: 'detail-id',
        price: 100,
        quantity: 2,
        productVariantId: 'variant-id',
        productVariant: { productColor: { product: { id: 'product-id' } } },
      },
    ],
  };

  const tx = {
    order: {
      update: jest.fn().mockImplementation(({ data }) => ({ ...parent, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(parent),
      findUniqueOrThrow: jest.fn().mockResolvedValue(parent),
    },
    orderStatusHistory: { create: jest.fn() },
    orderDetail: { update: jest.fn() },
    productVariant: { update: jest.fn() },
    voucherDetail: { update: jest.fn() },
    voucher: { updateMany: jest.fn() },
    payment: { update: jest.fn() },
  };

  const prisma = {
    order: { findUnique: jest.fn().mockResolvedValue(parent) },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  Object.assign(prisma, {
    extended: prisma,
    extendedTransaction: prisma.$transaction,
  });

  const realtime = {
    emitToUser: jest.fn(),
    emitToAdmins: jest.fn(),
    emitProductUpdated: jest.fn(),
  };

  const service = new OrdersService(
    prisma as any,
    {} as any,
    realtime as any,
    {
      emitNotifications: jest.fn(),
      deliverForOrder: jest.fn().mockResolvedValue([]),
    } as any,
  );
  return { service, tx, prisma, realtime, parent };
}

describe('Admin order status fulfillment synchronization', () => {
  it.each([
    ['pending', 'confirmed'],
    ['confirmed', 'processing'],
    ['processing', 'shipping'],
    ['shipping', 'completed'],
  ] as const)(
    'updates order status from %s to %s and records history',
    async (currentStatus, nextStatus) => {
      const { service, parent, tx, realtime } = setup(currentStatus);
      jest.spyOn(service, 'getById').mockResolvedValue(parent as any);
      await service.updateStatus(
        parent.id,
        { status: nextStatus },
        adminUser,
      );
      expect(tx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: parent.id, status: currentStatus },
          data: expect.objectContaining({ status: nextStatus }),
        }),
      );
      expect(tx.orderStatusHistory.create).toHaveBeenCalled();
      expect(realtime.emitToUser).toHaveBeenCalled();
      expect(realtime.emitToAdmins).toHaveBeenCalled();
    },
  );

  it('restores variant stock when a pending order is cancelled', async () => {
    const { service, parent, tx } = setup('pending');
    jest.spyOn(service, 'getById').mockResolvedValue(parent as any);
    await service.updateStatus(parent.id, { status: 'cancelled' }, adminUser);
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: parent.id, status: 'pending' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-id' },
      data: { stock: { increment: 2 } },
    });
  });
});
