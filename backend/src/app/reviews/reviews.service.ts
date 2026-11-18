import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationType, OrderStatus, ProductStatus } from '@prisma/client';
import { RealtimeService } from 'src/app/realtime/realtime.service';

import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  formatPaginatedList,
  normalizePagination,
} from 'src/common/utils/paginaton-util/pagintion-util.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetReviewsPaginationDto } from './dto/get-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async listAll(query: GetReviewsPaginationDto) {
    const { page, itemPerPage, skip } = normalizePagination(query);
    const where = { deletedAt: null };
    const totalItems = await this.prisma.extended.review.count({ where });
    const list = await this.prisma.extended.review.findMany({
      where,
      skip,
      take: itemPerPage,
      include: {
        client: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return formatPaginatedList(list, totalItems, { page, itemPerPage });
  }

  async getAdminReview(id: string) {
    const review = await this.prisma.extended.review.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!review) throw new NotFoundException('Phản hồi không tồn tại');
    return review;
  }

  listByProduct(productId: string) {
    return this.prisma.extended.review.findMany({
      where: {
        productId,
        deletedAt: null,
        product: { deletedAt: null, status: ProductStatus.active },
      },
      include: {
        client: { select: { id: true, fullName: true, avatarUrl: true } },
        orderDetail: {
          select: {
            productVariant: {
              select: {
                size: true,
                productColor: { select: { color: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(clientId: string, dto: CreateReviewDto) {
    if (dto.orderDetailId) {
      const detail = await this.prisma.extended.orderDetail.findFirst({
        where: {
          id: dto.orderDetailId,
          order: { clientId, status: OrderStatus.completed },
        },
        include: {
          review: true,
          productVariant: { include: { productColor: true } },
        },
      });
      if (!detail)
        throw new ForbiddenException(
          'Chỉ được đánh giá sản phẩm trong đơn đã hoàn thành',
        );
      if (detail.review)
        throw new ConflictException('Sản phẩm trong đơn này đã được đánh giá');
      const review = await this.prisma.extended.review.create({
        data: {
          clientId,
          orderDetailId: detail.id,
          productId: detail.productVariant.productColor.productId,
          rating: dto.rating,
          content: dto.content,
        },
        include: {
          client: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });
      await this.notifyManagers(review.id).catch((error) =>
        this.logger.warn(`Không thể tạo thông báo phản hồi sản phẩm: ${error}`),
      );
      return review;
    }

    const product = await this.prisma.extended.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const review = await this.prisma.extended.review.create({
      data: {
        clientId,
        productId: product.id,
        orderDetailId: null,
        rating: dto.rating,
        content: dto.content,
      },
      include: {
        client: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    await this.notifyManagers(review.id).catch((error) =>
      this.logger.warn(`Không thể tạo thông báo phản hồi sản phẩm: ${error}`),
    );
    return review;
  }

  private async notifyManagers(reviewId: string) {
    const managers = await this.prisma.extended.admin.findMany({
      where: { roleCode: 'CRM_MANAGER', status: 'active', deletedAt: null },
      select: { id: true },
    });
    if (!managers.length) return;
    await this.prisma.extended.notification.createMany({
      data: managers.map((manager) => ({
        adminId: manager.id,
        type: NotificationType.system,
        title: 'Có phản hồi sản phẩm mới',
        content: 'Mở phản hồi để xem và trả lời khách hàng.',
        data: { kind: 'review', reviewId },
      })),
    });
    this.realtime?.emitToAdmins('notification:created', {
      kind: 'review',
      reviewId,
    });
  }

  async replyReview(id: string, adminReply: string) {
    const review = await this.prisma.extended.review.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        orderDetail: {
          select: {
            id: true,
            order: { select: { id: true, orderCode: true } },
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Phản hồi không tồn tại');
    const trimmedReply = adminReply.trim();
    const updated = await this.prisma.extended.review.update({
      where: { id },
      data: {
        adminReply: trimmedReply,
        repliedAt: new Date(),
      },
      include: {
        client: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    try {
      const productName = review.product?.name || 'sản phẩm';
      const orderCode = review.orderDetail?.order?.orderCode;
      const orderText = orderCode ? ` cho đơn hàng #${orderCode}` : '';

      await this.prisma.extended.notification.create({
        data: {
          clientId: review.clientId,
          type: NotificationType.system,
          title: 'Quản lý CRM đã phản hồi về đánh giá của bạn',
          content: `Quản lý CRM đã trả lời đánh giá của bạn cho ${productName}${orderText}: "${trimmedReply}"`,
          data: {
            kind: 'review_reply',
            reviewId: updated.id,
            productId: review.productId,
            slug: review.product?.slug,
            orderId: review.orderDetail?.order?.id,
            orderCode: orderCode || null,
          },
        },
      });

      this.realtime?.emitToUser(review.clientId, 'notification:created', {
        kind: 'review_reply',
        reviewId: updated.id,
        orderCode: orderCode || null,
      });
    } catch (error) {
      this.logger.warn(`Không thể tạo thông báo trả lời đánh giá cho khách: ${error}`);
    }

    return updated;
  }

  async update(clientId: string, id: string, dto: UpdateReviewDto) {
    await this.getOwned(clientId, id);
    return this.prisma.extended.review.update({ where: { id }, data: dto });
  }

  async remove(clientId: string, id: string) {
    await this.getOwned(clientId, id);
    return this.prisma.extended.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async moderateRemove(id: string) {
    const review = await this.prisma.extended.review.findFirst({
      where: { id, deletedAt: null },
    });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    return this.prisma.extended.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async getOwned(clientId: string, id: string) {
    const review = await this.prisma.extended.review.findFirst({
      where: { id, clientId, deletedAt: null },
    });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    return review;
  }
}
