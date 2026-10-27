import { SurveyStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SurveyStatusSchema = z
  .object({
    status: z.enum([SurveyStatus.active, SurveyStatus.closed]),
    recipientIds: z.array(z.uuid()).min(1).max(1000).optional(),
  })
  .strict();

export class SurveyStatusDto extends createZodDto(SurveyStatusSchema) {}
