import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaBaseService } from 'src/common/service/prisma-base.service';
import { PaginationUtilService } from 'src/common/utils/paginaton-util/pagintion-util.service';
import { QueryUtilService } from 'src/common/utils/query-util/query-util.service';
import { StringUtilService } from 'src/common/utils/string-util/string-util.service';
import { RealtimeService } from '../realtime/realtime.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesPaginationDto } from './dto/get-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService extends PrismaBaseService<'category'> {
  constructor(
    prismaService: PrismaService,
    private readonly paginationUtilService: PaginationUtilService,
    private readonly queryUtil: QueryUtilService,
    private readonly stringUtilService: StringUtilService,
    private readonly realtime: RealtimeService,
  ) {
    super(prismaService, 'category');
  }

  /**
   * Danh sách category:
   * - phân trang
   * - tìm kiếm theo tên, slug, mô tả
   */
  async getCategories({
    page = 1,
    itemPerPage = 10,
    search,
  }: GetCategoriesPaginationDto) {
    const searchCondition = this.queryUtil.createStringSearchCondition(search, [
      'name',
      'slug',
      'description',
    ]) as Prisma.CategoryWhereInput;

    const where: Prisma.CategoryWhereInput = {
      ...searchCondition,
    };

    const totalItems = await this.extended.count({
      where,
    });

    const paging = this.paginationUtilService.paging({
      page,
      itemPerPage,
      totalItems,
    });

    const list = await this.extended.findMany({
      where,
      skip: paging.skip,
      take: itemPerPage,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formatted = paging.format(list);
    return {
      ...formatted,
      list: (formatted.list || []).map((cat: any) => ({
        ...cat,
        status: cat.deletedAt ? 'inactive' : 'active',
      })),
    };
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const slug = this.stringUtilService.toSlug(createCategoryDto.name);

    const existingCategory = await this.extended.findUnique({
      where: { slug },
    });

    if (existingCategory?.deletedAt) {
      const category = await this.extended.update({
        where: { id: existingCategory.id },
        data: {
          name: createCategoryDto.name,
          description: createCategoryDto.description ?? null,
          deletedAt: null,
        },
      });
      this.realtime.emitCategoryUpdated(category.id);
      return {
        ...category,
        status: 'active',
      };
    }

    if (existingCategory) {
      throw new ConflictException(
        `Danh mục "${createCategoryDto.name}" đã tồn tại`,
      );
    }

    const category = await this.extended.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description ?? null,
      },
    });
    this.realtime.emitCategoryUpdated(category.id);
    return {
      ...category,
      status: 'active',
    };
  }

  async updateCategory(params: {
    where: Prisma.CategoryWhereUniqueInput;
    data: UpdateCategoryDto;
  }) {
    const { where, data: dataUpdate } = params;
    const dataToUpdate: Prisma.CategoryUpdateInput = {};

    if (dataUpdate.name !== undefined) {
      dataToUpdate.name = dataUpdate.name;
      dataToUpdate.slug = this.stringUtilService.toSlug(dataUpdate.name);
    }

    if (dataUpdate.description !== undefined) {
      dataToUpdate.description = dataUpdate.description;
    }

    if (dataUpdate.status === 'inactive') {
      dataToUpdate.deletedAt = new Date();
    } else if (dataUpdate.status === 'active') {
      dataToUpdate.deletedAt = null;
    }

    const data = await this.extended.update({
      data: dataToUpdate,
      where,
    });
    this.realtime.emitCategoryUpdated(data.id);
    return {
      ...data,
      status: data.deletedAt ? 'inactive' : 'active',
    };
  }

  async deleteCategory(where: Prisma.CategoryWhereUniqueInput) {
    const data = await this.extended.softDelete(where);
    if (data.count) this.realtime.emitCategoryUpdated(where.id);
    return data;
  }
}
