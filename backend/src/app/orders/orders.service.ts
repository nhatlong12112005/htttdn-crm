import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SurveyResponseStatus,
  SurveyTriggerType,
} from '@prisma/client';

import type { UserInfo } from 'src/common/decorators/user.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  formatPaginatedList,
  normalizePagination,
} from 'src/common/utils/paginaton-util/pagintion-util.service';
import { RealtimeService } from 'src/app/realtime/realtime.service';
import { SurveysService } from 'src/app/surveys/surveys.service';
import { VouchersService } from 'src/app/vouchers/vouchers.service';
import { CheckoutDto, PreviewCheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersPaginationDto } from './dto/get-order.dto';

const orderInclude = {
  client: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
    },
  },
  details: {
    include: {
      productVariant: {
        include: {
          productColor: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      review: true,
    },
  },
  payment: true,
  voucherDetails: {
    where: { productId: null },
    include: { voucher: true },
    orderBy: { sequence: 'asc' as const },
  },
  statusHistory: {
    include: {
      admin: { select: { id: true, fullName: true, email: true } },
      client: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

const surveyPromptSelect = {
  id: true,
  orderId: true,
  status: true,
  createdAt: true,
  survey: {
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      startDate: true,
      endDate: true,
      admin: { select: { id: true } },
      questions: {
        orderBy: { position: 'asc' as const },
        select: {
          id: true,
          question: true,
          type: true,
          required: true,
          position: true,
          options: {
            orderBy: { position: 'asc' as const },
            select: { id: true, content: true, position: true },
          },
        },
      },
    },
  },
} satisfies Prisma.SurveyResponseSelect;

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: [OrderStatus.confirmed, OrderStatus.cancelled],
  confirmed: [OrderStatus.processing, OrderStatus.cancelled],
  processing: [OrderStatus.shipping, OrderStatus.cancelled],
  shipping: [OrderStatus.completed, OrderStatus.cancelled],
  completed: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
    private readonly realtime: RealtimeService,
    private readonly surveysService: SurveysService,
  ) {}

  private async prepareCheckout(
    tx: Prisma.TransactionClient,
    clientId: string,
    dto: PreviewCheckoutDto,
  ) {
    const cart = await tx.cart.findUnique({
      where: { clientId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { productColor: { include: { product: true } } },
            },
          },
        },
      },
    });
    if (!cart?.items.length)
      throw new BadRequestException('Giỏ hàng đang trống');
    let targetItems = cart.items;
    if (dto.cartItemIds?.length) {
      targetItems = cart.items.filter((item) =>
        dto.cartItemIds!.includes(item.id),
      );
      if (new Set(dto.cartItemIds).size !== targetItems.length)
        throw new BadRequestException(
          'Sản phẩm trong giỏ đã thay đổi, vui lòng chọn lại',
        );
    }
    if (!targetItems.length)
      throw new BadRequestException(
        'Không tìm thấy sản phẩm hợp lệ để đặt hàng',
      );

    const requestedCodes = dto.voucherSelections
      ? [
          ...new Set(
            dto.voucherSelections.flatMap((s) =>
              s.codes.map((code) => code.trim().toUpperCase()),
            ),
          ),
        ]
      : (dto.voucherCodes || []).map((code) => code.trim().toUpperCase());

    if (
      !dto.voucherSelections &&
      new Set(requestedCodes).size !== requestedCodes.length
    ) {
      throw new BadRequestException('Voucher bị trùng lặp');
    }

    if (requestedCodes.length) {
      const vouchers = await tx.voucher.findMany({
        where: { code: { in: requestedCodes }, deletedAt: null },
        select: { code: true },
      });
      if (vouchers.length !== requestedCodes.length) {
        throw new BadRequestException('Voucher không tồn tại');
      }
    }

    return { targetItems, requestedCodes };
  }

  async previewCheckout(clientId: string, dto: PreviewCheckoutDto) {
    return this.prisma.extendedTransaction(
      async (tx) => {
        const { targetItems, requestedCodes } = await this.prepareCheckout(
          tx,
          clientId,
          dto,
        );
        const calculated = await this.vouchersService.calculate(
          requestedCodes,
          clientId,
          targetItems.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
          tx,
        );
        const packages = [
          {
            vendorId: 'platform',
            subtotalAmount: calculated.subtotalAmount,
            discountAmount: calculated.discountAmount,
            totalAmount: calculated.totalAmount,
            applications: calculated.applications,
          },
        ];
        return {
          packages,
          subtotalAmount: calculated.subtotalAmount,
          discountAmount: calculated.discountAmount,
          totalAmount: calculated.totalAmount,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async checkout(clientId: string, dto: CheckoutDto) {
    let result:
      | { orders: any[]; order: any; surveyNotifications: any[] }
      | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await this.prisma.extendedTransaction(
          async (tx) => {
            const { targetItems, requestedCodes } = await this.prepareCheckout(
              tx,
              clientId,
              dto,
            );
            const calculated = await this.vouchersService.calculate(
              requestedCodes,
              clientId,
              targetItems.map((item) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              })),
              tx,
            );

            const order = await tx.order.create({
              data: {
                clientId,
                subtotalAmount: calculated.subtotalAmount,
                discountAmount: calculated.discountAmount,
                shippingFee: 0,
                totalAmount: calculated.totalAmount,
                receiverName: dto.receiverName,
                receiverPhone: dto.receiverPhone,
                shippingAddress: dto.shippingAddress,
                notes: dto.notes,
              },
            });

            for (const item of calculated.items) {
              const changed = await tx.productVariant.updateMany({
                where: {
                  id: item.productVariantId,
                  deletedAt: null,
                  stock: { gte: item.quantity },
                },
                data: { stock: { decrement: item.quantity } },
              });
              if (!changed.count) {
                throw new ConflictException(
                  `Sản phẩm "${item.variant.productColor.product.name}" vừa thay đổi tồn kho, vui lòng thử lại`,
                );
              }

              await tx.orderDetail.create({
                data: {
                  orderId: order.id,
                  productVariantId: item.productVariantId,
                  quantity: item.quantity,
                  price: item.variant.price,
                  productName: item.variant.productColor.product.name,
                  colorName: item.variant.productColor.color,
                  sizeName: item.variant.size,
                  imageUrl: item.variant.productColor.imageUrls[0],
                },
              });
            }

            for (const application of calculated.applications) {
              const reserved = await tx.voucher.updateMany({
                where: {
                  id: application.voucherId,
                  usedQuantity: application.expectedUsedQuantity,
                  quantity: { gt: application.expectedUsedQuantity },
                  status: 'active',
                },
                data: { usedQuantity: { increment: 1 } },
              });
              if (!reserved.count) {
                throw new ConflictException('Voucher vừa hết lượt sử dụng');
              }
              await tx.voucherDetail.create({
                data: {
                  voucherId: application.voucherId,
                  orderId: order.id,
                  eligibleAmount: application.eligibleAmount,
                  discountAmount: application.discountAmount,
                  sequence: application.sequence,
                },
              });
            }

            await tx.payment.create({
              data: {
                orderId: order.id,
                method: dto.paymentMethod,
                amount: calculated.totalAmount,
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                clientId,
                toStatus: OrderStatus.pending,
              },
            });

            const surveyNotifications =
              await this.surveysService.deliverForOrder(
                tx,
                order.id,
                SurveyTriggerType.after_checkout,
              );

            const createdOrder = await tx.order.findUniqueOrThrow({
              where: { id: order.id },
              include: orderInclude,
            });

            const surveyPrompts = await tx.surveyResponse.findMany({
              where: {
                orderId: order.id,
                clientId,
                status: SurveyResponseStatus.pending,
              },
              select: surveyPromptSelect,
              orderBy: { createdAt: 'asc' },
            });

            const createdOrders = [{ ...createdOrder, surveyPrompts }];

            if (dto.expectedTotalAmount !== undefined) {
              const actualTotal = createdOrders.reduce(
                (sum, o) => sum.plus(o.totalAmount),
                new Prisma.Decimal(0),
              );
              if (!actualTotal.equals(dto.expectedTotalAmount))
                throw new ConflictException(
                  'Giá hoặc voucher vừa thay đổi. Vui lòng kiểm tra tổng tiền và xác nhận lại.',
                );
            }

            const checkedOutItemIds = targetItems.map((i) => i.id);
            await tx.cartItem.deleteMany({
              where: {
                id: { in: checkedOutItemIds },
              },
            });

            return {
              orders: createdOrders,
              order: createdOrders[0],
              surveyNotifications,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          if (attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, 10 * (attempt + 1)),
            );
            continue;
          }
          throw new ConflictException(
            'Dữ liệu vừa thay đổi, vui lòng thực hiện checkout lại',
          );
        }
        throw error;
      }
    }
    if (!result)
      throw new ConflictException(
        'Dữ liệu vừa thay đổi, vui lòng thực hiện checkout lại',
      );

    for (const o of result.orders) {
      this.emitOrder(o, 'order:created');
    }
    if (
      dto.voucherCodes?.length ||
      dto.voucherSelections?.some((selection) => selection.codes.length)
    ) {
      this.realtime.emitToCatalog('voucher:updated', {});
    }
    this.surveysService.emitNotifications(result.surveyNotifications);

    return {
      ...result.order,
      orders: result.orders,
      orderIds: result.orders.map((o) => o.id),
      totalOrders: result.orders.length,
    };
  }

  listMine(clientId: string) {
    return this.prisma.extended.order.findMany({
      where: { clientId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(query: GetOrdersPaginationDto, _user?: UserInfo) {
    const { search, status } = query;
    const { page, itemPerPage, skip } = normalizePagination({
      page: query.page,
      itemPerPage: query.itemPerPage,
    });
    const baseWhere: Prisma.OrderWhereInput = {};

    const [
      countAll,
      countPending,
      countConfirmed,
      countProcessing,
      countShipping,
      countCompleted,
      countCancelled,
    ] = await Promise.all([
      this.prisma.extended.order.count({ where: baseWhere }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.pending }] },
      }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.confirmed }] },
      }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.processing }] },
      }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.shipping }] },
      }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.completed }] },
      }),
      this.prisma.extended.order.count({
        where: { AND: [baseWhere, { status: OrderStatus.cancelled }] },
      }),
    ]);

    const countsByStatus = {
      all: countAll,
      pending: countPending,
      confirmed: countConfirmed,
      processing: countProcessing,
      shipping: countShipping,
      completed: countCompleted,
      cancelled: countCancelled,
    };

    const whereConditions: Prisma.OrderWhereInput[] = [baseWhere];

    if (status && status !== 'all') {
      whereConditions.push({ status: status as OrderStatus });
    }

    if (search && search.trim()) {
      const q = search.trim().replace(/^#/, '');
      whereConditions.push({
        OR: [
          { orderCode: { contains: q, mode: 'insensitive' } },
          { receiverName: { contains: q, mode: 'insensitive' } },
          { receiverPhone: { contains: q, mode: 'insensitive' } },
          {
            details: {
              some: {
                OR: [
                  { productName: { contains: q, mode: 'insensitive' } },
                  {
                    productVariant: {
                      productColor: {
                        product: {
                          name: { contains: q, mode: 'insensitive' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    const where: Prisma.OrderWhereInput =
      whereConditions.length === 1
        ? whereConditions[0]
        : { AND: whereConditions };

    const totalItems = await this.prisma.extended.order.count({ where });
    const list = await this.prisma.extended.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: itemPerPage,
    });

    return {
      ...formatPaginatedList(list, totalItems, { page, itemPerPage }),
      countsByStatus,
    };
  }

  async getById(id: string, user: UserInfo) {
    const order = await this.prisma.extended.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    this.assertCanView(order, user);
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, user: UserInfo) {
    const current = await this.getById(id, user);

    if (user.role === 'client') {
      if (
        dto.status !== OrderStatus.cancelled ||
        current.status !== OrderStatus.pending
      ) {
        throw new ForbiddenException(
          'Khách hàng chỉ được hủy đơn đang chờ xác nhận',
        );
      }
    }

    if (
      dto.status !== current.status &&
      !transitions[current.status].includes(dto.status)
    ) {
      throw new BadRequestException(
        `Không thể chuyển từ ${current.status} sang ${dto.status}`,
      );
    }
    if (
      dto.status === current.status &&
      (current.status === OrderStatus.cancelled ||
        current.status === OrderStatus.completed)
    )
      return current;

    const result = await this.prisma.extendedTransaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: current.status },
        data: {
          status: dto.status,
          cancelledAt:
            dto.status === OrderStatus.cancelled ? new Date() : undefined,
        },
      });
      if (!claimed.count)
        throw new ConflictException(
          'Đơn hàng vừa được cập nhật. Vui lòng tải lại và thử lại',
        );
      if (dto.status === OrderStatus.cancelled) {
        for (const detail of current.details) {
          await tx.productVariant.update({
            where: { id: detail.productVariantId },
            data: { stock: { increment: detail.quantity } },
          });
        }
        const usages = current.voucherDetails.filter(
          (detail) => !detail.reversedAt,
        );
        for (const usage of usages) {
          await tx.voucherDetail.update({
            where: { id: usage.id },
            data: { reversedAt: new Date() },
          });
          await tx.voucher.updateMany({
            where: { id: usage.voucherId, usedQuantity: { gt: 0 } },
            data: { usedQuantity: { decrement: 1 } },
          });
        }
        await tx.payment.update({
          where: { orderId: id },
          data: {
            status:
              current.payment?.status === PaymentStatus.paid
                ? PaymentStatus.refunded
                : PaymentStatus.cancelled,
          },
        });
      }
      if (
        dto.status === OrderStatus.completed &&
        current.payment?.method === PaymentMethod.cod &&
        current.payment.status === PaymentStatus.pending
      ) {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: PaymentStatus.paid, paidAt: new Date() },
        });
      }

      const actorData: {
        adminId?: string;
        clientId?: string;
      } = {};
      if (user.role === 'admin') {
        actorData.adminId = user.userID;
      } else if (user.role === 'client') {
        actorData.clientId = user.userID;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          ...actorData,
          fromStatus: current.status,
          toStatus: dto.status,
          note: dto.note,
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      const surveyNotifications =
        dto.status === OrderStatus.completed
          ? await this.surveysService.deliverForOrder(
              tx,
              id,
              SurveyTriggerType.after_order_completed,
            )
          : [];
      return { updated, surveyNotifications };
    });

    this.emitOrder(result.updated, 'order:updated');
    this.surveysService.emitNotifications(result.surveyNotifications);
    return result.updated;
  }

  private assertCanView(order: { clientId: string }, user: UserInfo) {
    if (user.role === 'admin' || order.clientId === user.userID) return;
    throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
  }

  private emitOrder(
    order: {
      id: string;
      orderCode: string;
      clientId: string;
      status: OrderStatus;
      details: Array<{
        productVariant: {
          productColor: { product: { id: string } };
        };
      }>;
    },
    event: string,
  ) {
    const payload = {
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
    };
    this.realtime.emitToUser(order.clientId, event, payload);
    this.realtime.emitToAdmins(event, payload);
    for (const product of new Map(
      order.details.map((item) => {
        const product = item.productVariant.productColor.product;
        return [product.id, product] as const;
      }),
    ).values()) {
      if (product.id) this.realtime.emitProductUpdated(product.id, null);
    }
  }
}
