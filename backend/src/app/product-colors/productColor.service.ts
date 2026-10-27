import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaBaseService } from 'src/common/service/prisma-base.service';

import { CreateProductColorDto } from './dto/create-productColor.dto';
import { UpdateProductColorDto } from './dto/update-productColor.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ProductColorService extends PrismaBaseService<'productColor'> {
  private readonly maxImages = 20;

  constructor(
    private readonly prismaDb: PrismaService,
    private readonly realtime: RealtimeService,
  ) {
    super(prismaDb, 'productColor');
  }

  private removeDuplicateImageUrls(imageUrls: string[]): string[] {
    return [
      ...new Set(imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean)),
    ];
  }

  private validateImageLimit(imageUrls: string[]) {
    if (imageUrls.length > this.maxImages) {
      throw new BadRequestException(
        `Mỗi màu chỉ được có tối đa ${this.maxImages} ảnh`,
      );
    }
  }

  async createProductColor(dto: CreateProductColorDto, _vendorId?: string) {
    const { productId, color, imageUrls = [] } = dto;
    const uniqueImageUrls = this.removeDuplicateImageUrls(imageUrls);
    this.validateImageLimit(uniqueImageUrls);

    const product = await this.prismaDb.extended.product.findFirst({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const existingColor = await this.extended.findUnique({
      where: {
        productId_color: {
          productId,
          color: dto.color,
        },
      },
    });

    if (existingColor && !existingColor.deletedAt) {
      throw new ConflictException(
        `Màu "${dto.color}" đã tồn tại trong sản phẩm`,
      );
    }

    if (existingColor?.deletedAt) {
      const restored = await this.extended.update({
        where: { id: existingColor.id },
        data: {
          color,
          deletedAt: null,
          ...(uniqueImageUrls.length > 0 && { imageUrls: uniqueImageUrls }),
        },
      });
      this.realtime.emitProductUpdated(productId, null);
      return restored;
    }

    const created = await this.extended.create({
      data: {
        color,
        imageUrls: uniqueImageUrls,
        product: { connect: { id: productId } },
      },
    });
    this.realtime.emitProductUpdated(productId, null);
    return created;
  }

  async getProductColorsByProductId(productId: string) {
    const product = await this.prismaDb.extended.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    return this.extended.findMany({
      where: { productId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        variants: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getProductColorById(where: Prisma.ProductColorWhereUniqueInput) {
    const productColor = await this.prismaDb.extended.productColor.findFirst({
      where: { ...where, product: { deletedAt: null } },
    });

    if (!productColor || productColor.deletedAt) {
      throw new NotFoundException('Màu sản phẩm không tồn tại');
    }

    return productColor;
  }

  async updateProductColor(params: {
    id: string;
    data: UpdateProductColorDto;
    vendorId?: string;
  }) {
    const { id, data: updateDto } = params;
    const currentColor = await this.getOwnedActiveColor(id);
    const { color, imageUrls } = updateDto;

    if (color && color !== currentColor.color) {
      const duplicateColor = await this.extended.findUnique({
        where: {
          productId_color: {
            productId: currentColor.productId,
            color,
          },
        },
      });

      if (duplicateColor && duplicateColor.id !== currentColor.id) {
        throw new ConflictException(
          `Màu "${color}" đã từng tồn tại trong sản phẩm`,
        );
      }
    }

    let uniqueImageUrls: string[] | undefined;
    if (imageUrls !== undefined) {
      uniqueImageUrls = this.removeDuplicateImageUrls(imageUrls);
      this.validateImageLimit(uniqueImageUrls);
    }

    const updated = await this.extended.update({
      where: { id, productId: currentColor.productId, deletedAt: null },
      data: {
        ...(color !== undefined && { color }),
        ...(uniqueImageUrls !== undefined && { imageUrls: uniqueImageUrls }),
      },
    });
    this.realtime.emitProductUpdated(currentColor.productId, null);
    return updated;
  }

  async addImages(id: string, newImageUrls: string[], _vendorId?: string) {
    const cleanedNewImageUrls = this.removeDuplicateImageUrls(newImageUrls);

    if (!cleanedNewImageUrls.length) {
      throw new BadRequestException('Bạn chưa chọn ảnh');
    }

    const productColor = await this.getOwnedActiveColor(id);
    const combinedImageUrls = [
      ...productColor.imageUrls,
      ...cleanedNewImageUrls,
    ];
    const uniqueImageUrls = this.removeDuplicateImageUrls(combinedImageUrls);
    this.validateImageLimit(uniqueImageUrls);

    const updated = await this.extended.update({
      where: { id, productId: productColor.productId, deletedAt: null },
      data: { imageUrls: uniqueImageUrls },
    });
    this.realtime.emitProductUpdated(productColor.productId, null);
    return updated;
  }

  async deleteProductColor(id: string, _vendorId?: string) {
    const productColor = await this.getOwnedActiveColor(id);

    const deleted = await this.extended.update({
      where: { id, productId: productColor.productId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    this.realtime.emitProductUpdated(productColor.productId, null);
    return deleted;
  }

  async restoreProductColor(id: string, _vendorId?: string) {
    const productColor = await this.prismaDb.extended.productColor.findFirst({
      where: { id, product: { deletedAt: null } },
    });

    if (!productColor) {
      throw new NotFoundException('Màu sản phẩm không tồn tại');
    }

    if (!productColor.deletedAt) {
      throw new ConflictException('Màu sản phẩm chưa bị xóa');
    }

    const restored = await this.extended.update({
      where: { id, productId: productColor.productId },
      data: { deletedAt: null },
    });
    this.realtime.emitProductUpdated(productColor.productId, null);
    return restored;
  }

  private async getOwnedActiveColor(id: string) {
    const productColor = await this.extended.findFirst({
      where: {
        id,
        product: { deletedAt: null },
      },
    });

    if (!productColor) {
      throw new NotFoundException('Màu sản phẩm không tồn tại');
    }

    return productColor;
  }
}
