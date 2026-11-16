import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateCategorySchema = z
  .object({
    name: z
      .string({ error: 'Tên danh mục phải là chuỗi' })
      .trim()
      .min(1, 'Tên danh mục là bắt buộc')
      .max(255, 'Tên danh mục không được vượt quá 255 ký tự')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Mô tả không được vượt quá 2000 ký tự')
      .optional()
      .nullable(),
    status: z
      .string()
      .optional()
      .nullable(),
  })
  .strict();

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
