import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateReviewSchema = z
  .object({
    orderDetailId: z.uuid().optional(),
    productId: z.uuid().optional(),
    rating: z.number().int().min(1).max(5),
    content: z.string().trim().max(3000).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.orderDetailId || data.productId), {
    message: 'Cần cung cấp productId hoặc orderDetailId để gửi phản hồi',
  });

export class CreateReviewDto extends createZodDto(CreateReviewSchema) {}

export const ReplyReviewSchema = z
  .object({
    adminReply: z.string().trim().min(1, 'Nội dung phản hồi không được để trống').max(3000),
  })
  .strict();

export class ReplyReviewDto extends createZodDto(ReplyReviewSchema) {}
