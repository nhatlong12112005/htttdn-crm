import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaBaseService } from 'src/common/service/prisma-base.service';
import { CreateProductVariantDto } from './dto/createProductVariant.dto';
import { UpdateProductVariantDto } from './dto/updateProductVariant.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ProductVariantService extends PrismaBaseService<'productVariant'> {
  constructor(
    private readonly prismaDb: PrismaService,
    private readonly realtime: RealtimeService,
  ) {
    super(prismaDb, 'productVariant');
  }

  async createProductVariant(
    createProductVariantDto: CreateProductVariantDto,
    _vendorId?: string,
  ) {
    const { productColorId, size, price, stock = 0 } = createProductVariantDto;

    await this.getActiveProductColor(productColorId);

    const existing = await this.prismaDb.extended.productVariant.findUnique({
      where: { productColorId_size: { productColorId, size } },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(`Size "${size}" đã tồn tại trong màu này`);
    }

    if (existing) {
      const restored = await this.extended.update({
        where: { id: existing.id },
        data: { deletedAt: null, price, stock },
      });
      await this.emitForColor(productColorId);
      return restored;
    }

    const created = await this.extended.create({
      data: {
        size,
        price,
        stock,
        productColor: {
          connect: {
            id: productColorId,
          },
        },
      },
    });
    await this.emitForColor(productColorId);
    return created;
  }

  async getProductVariantsByProductColorId(productColorId: string) {
    await this.getActiveProductColor(productColorId);

    return this.extended.findMany({
      where: { productColorId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateProductVariant(
    id: string,
    data: UpdateProductVariantDto,
    _vendorId?: string,
  ) {
    const variant = await this.getActiveVariant(id);

    if (data.size !== undefined && data.size !== variant.size) {
      await this.checkDuplicateSize(variant.productColorId, data.size, id, true);
    }

    const updated = await this.extended.update({
      where: { id, productColorId: variant.productColorId, deletedAt: null },
      data,
    });
    await this.emitForColor(variant.productColorId);
    return updated;
  }

  async deleteProductVariant(id: string, _vendorId?: string) {
    const variant = await this.getActiveVariant(id);

    const deleted = await this.extended.update({
      where: { id, productColorId: variant.productColorId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.emitForColor(variant.productColorId);
    return deleted;
  }

  private async emitForColor(productColorId: string) {
    const color = await this.prismaDb.extended.productColor.findUnique({
      where: { id: productColorId },
      select: { productId: true },
    });
    if (color) this.realtime.emitProductUpdated(color.productId, null);
  }

  private async getActiveProductColor(productColorId: string) {
    const productColor = await this.prismaDb.extended.productColor.findFirst({
      where: {
        id: productColorId,
        product: { deletedAt: null },
      },
      select: { id: true },
    });

    if (!productColor) {
      throw new NotFoundException('Màu sản phẩm không tồn tại');
    }

    return productColor;
  }

  private async getActiveVariant(id: string) {
    const variant = await this.extended.findFirst({
      where: {
        id,
        deletedAt: null,
        productColor: {
          deletedAt: null,
          product: { deletedAt: null },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }

    return variant;
  }

  private async checkDuplicateSize(
    productColorId: string,
    size: string,
    excludingId?: string,
    includeDeleted = false,
  ) {
    const duplicate = await this.prismaDb.extended.productVariant.findFirst({
      where: {
        productColorId,
        size,
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
      select: { id: true, deletedAt: true },
    });

    if (duplicate) {
      throw new ConflictException(
        duplicate.deletedAt
          ? `Size "${size}" từng tồn tại trong màu này, hãy tạo lại size đó để khôi phục`
          : `Size "${size}" đã tồn tại trong màu này`,
      );
    }
  }
}
