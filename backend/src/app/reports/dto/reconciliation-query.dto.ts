import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ReconciliationQueryDto extends createZodDto(
  z.object({
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    itemPerPage: z.coerce.number().int().min(1).max(100).default(20),
    kind: z.enum(['all', 'gmv', 'paid', 'refund', 'net']).optional(),
  }),
) {}
