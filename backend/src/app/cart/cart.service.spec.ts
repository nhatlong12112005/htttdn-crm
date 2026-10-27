import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CartService } from './cart.service';

describe('CartService', () => {
  const clientId = '11111111-1111-4111-8111-111111111111';
  const cartId = '22222222-2222-4222-8222-222222222222';
  const variantId = '33333333-3333-4333-8333-333333333333';
  const itemId = '44444444-4444-4444-8444-444444444444';

  const makeMockPrisma = () => {
    const extended = {
      cart: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
      },
    };
    return { extended };
  };

  it('fetches cart without referencing removed vendor relation on Product', async () => {
    const prisma = makeMockPrisma();
    prisma.extended.cart.upsert.mockResolvedValue({
      id: cartId,
      clientId,
      items: [
        {
          id: itemId,
          quantity: 2,
          productVariant: {
            id: variantId,
            price: 250000,
            stock: 10,
            productColor: {
              color: 'Đen',
              product: {
                id: 'prod-1',
                name: 'Áo Polo MIVA',
                category: { id: 'cat-1', name: 'Áo Nam' },
              },
            },
          },
        },
      ],
    });

    const service = new CartService(prisma as any);
    const result = await service.get(clientId);

    expect(result.totalQuantity).toBe(2);
    expect(result.subtotalAmount).toBe('500000.00');

    const callArg = prisma.extended.cart.upsert.mock.calls[0][0];
    const productInclude =
      callArg.include.items.include.productVariant.include.productColor.include
        .product.include;
    expect(productInclude).toEqual({ category: true });
    expect(productInclude.vendor).toBeUndefined();
  });

  it('adds item to cart when stock is sufficient and rejects when exceeding stock', async () => {
    const prisma = makeMockPrisma();
    prisma.extended.productVariant.findFirst.mockResolvedValue({
      id: variantId,
      stock: 5,
      price: 199000,
    });
    prisma.extended.cart.upsert
      .mockResolvedValueOnce({ id: cartId })
      .mockResolvedValueOnce({
        id: cartId,
        clientId,
        items: [
          {
            id: itemId,
            quantity: 3,
            productVariant: { id: variantId, price: 199000 },
          },
        ],
      });
    prisma.extended.cartItem.findUnique.mockResolvedValue({ quantity: 1 });
    prisma.extended.cartItem.upsert.mockResolvedValue({ id: itemId, quantity: 3 });

    const service = new CartService(prisma as any);
    const added = await service.add(clientId, {
      productVariantId: variantId,
      quantity: 2,
    });

    expect(added.totalQuantity).toBe(3);
    expect(added.subtotalAmount).toBe('597000.00');

    // Exceeding stock should throw BadRequestException
    prisma.extended.cart.upsert.mockResolvedValueOnce({ id: cartId });
    prisma.extended.cartItem.findUnique.mockResolvedValueOnce({ quantity: 4 });
    await expect(
      service.add(clientId, { productVariantId: variantId, quantity: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when variant does not exist', async () => {
    const prisma = makeMockPrisma();
    prisma.extended.productVariant.findFirst.mockResolvedValue(null);
    const service = new CartService(prisma as any);

    await expect(
      service.add(clientId, { productVariantId: variantId, quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
