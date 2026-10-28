import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class SurveyScheduleDto extends createZodDto(
  z.object({ endDate: z.iso.datetime({ offset: true }) }).strict(),
) {}
