import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  SurveyQuestionType,
  SurveyAudienceType,
  SurveyResponseStatus,
  SurveyScope,
  SurveyStatus,
  SurveyTriggerType,
} from '@prisma/client';

import type { UserInfo } from 'src/common/decorators/user.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SurveysService } from './surveys.service';

describe('SurveysService', () => {
  const adminId = '11111111-1111-4111-8111-111111111111';
  const customerId = '22222222-2222-4222-8222-222222222222';
  const surveyId = '33333333-3333-4333-8333-333333333333';
  const questionId = '44444444-4444-4444-8444-444444444444';
  const optionOneId = '55555555-5555-4555-8555-555555555555';
  const optionTwoId = '66666666-6666-4666-8666-666666666666';

  const user = (userID: string, role: 'admin' | 'client'): UserInfo => ({
    userID,
    userEmail: `${role}@example.com`,
    fullName: role,
    phone: null,
    avatar: null,
    gender: null,
    address: null,
    role,
  });

  const managementSurvey = (createdById = adminId) => ({
    id: surveyId,
    adminId: createdById,
    title: 'Khảo sát',
    description: null,
    imageUrl: null,
    scope: SurveyScope.platform,
    audienceType: SurveyAudienceType.all_users,
    recipientIds: [],
    triggerType: SurveyTriggerType.manual,
    status: SurveyStatus.draft,
    startDate: null,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdByAdmin: { id: createdById, fullName: 'CRM Manager' },
    questions: [],
    _count: { responses: 0 },
  });

  it('creates an admin/CRM survey as draft and assigns ownership from JWT', async () => {
    const create = jest.fn().mockResolvedValue(managementSurvey());
    const service = new SurveysService({
      extended: { survey: { create } },
    } as unknown as PrismaService);

    await service.create(
      {
        title: 'Mức độ hài lòng',
        triggerType: SurveyTriggerType.manual,
        questions: [
          {
            question: 'Bạn hài lòng không?',
            type: SurveyQuestionType.rating,
            required: true,
            position: 0,
            options: [],
          },
        ],
      },
      user(adminId, 'admin'),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId,
          status: SurveyStatus.draft,
          questions: {
            create: [
              expect.objectContaining({
                type: SurveyQuestionType.rating,
                required: true,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('does not let a client create or edit surveys', async () => {
    const prisma = {
      survey: { findFirst: jest.fn().mockResolvedValue(managementSurvey()) },
    };
    Object.assign(prisma, { extended: prisma });
    const service = new SurveysService(prisma as unknown as PrismaService);

    await expect(
      service.update(
        surveyId,
        { title: 'Nội dung đã sửa' },
        user(customerId, 'client'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a selected-customer draft without saved recipients', async () => {
    const service = new SurveysService({
      extended: {
        survey: {
          findFirst: jest.fn().mockResolvedValue({
            ...managementSurvey(),
            audienceType: SurveyAudienceType.selected_users,
            questions: [
              {
                id: questionId,
                question: 'Đánh giá',
                type: SurveyQuestionType.rating,
                required: true,
                position: 1,
                options: [],
              },
            ],
          }),
        },
      },
    } as unknown as PrismaService);

    await expect(
      service.changeStatus(
        surveyId,
        SurveyStatus.active,
        user(adminId, 'admin'),
      ),
    ).rejects.toThrow('Vui lòng chọn ít nhất một khách hàng nhận khảo sát');
  });

  it('stores every selected option of a multiple-choice answer in its own row', async () => {
    const tx = {
      surveyResponse: {
        findFirst: jest.fn().mockResolvedValue({
          id: '77777777-7777-4777-8777-777777777777',
          status: SurveyResponseStatus.pending,
          expiresAt: null,
          answers: [],
          survey: {
            ...managementSurvey(),
            status: SurveyStatus.active,
            questions: [
              {
                id: questionId,
                question: 'Chọn màu yêu thích',
                type: SurveyQuestionType.multiple_choice,
                required: true,
                position: 0,
                options: [
                  { id: optionOneId, content: 'Đen', position: 0 },
                  { id: optionTwoId, content: 'Trắng', position: 1 },
                ],
              },
            ],
          },
        }),
        update: jest.fn().mockResolvedValue({ id: 'response-id' }),
      },
      notification: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
      surveyResponse: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ surveyId, survey: { title: 'Khảo sát' } }),
      },
      admin: { findMany: jest.fn().mockResolvedValue([{ id: adminId }]) },
      notification: { createMany: jest.fn() },
    };
    Object.assign(prisma, {
      extended: prisma,
      extendedTransaction: prisma.$transaction,
    });
    const service = new SurveysService(prisma as unknown as PrismaService);

    await service.submitResponse(
      '77777777-7777-4777-8777-777777777777',
      customerId,
      {
        answers: [{ questionId, optionIds: [optionOneId, optionTwoId] }],
      },
    );

    expect(tx.surveyResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submittedAt: expect.any(Date) as Date,
          answers: {
            createMany: {
              data: [
                { questionId, optionId: optionOneId },
                { questionId, optionId: optionTwoId },
              ],
            },
          },
        }),
      }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            data: {
              kind: 'survey_response',
              surveyId,
              responseId: '77777777-7777-4777-8777-777777777777',
            },
          }),
        ],
      }),
    );
  });

  it('rejects a submission that omits a required question', async () => {
    const tx = {
      surveyResponse: {
        findFirst: jest.fn().mockResolvedValue({
          id: '77777777-7777-4777-8777-777777777777',
          status: SurveyResponseStatus.pending,
          expiresAt: null,
          answers: [],
          survey: {
            ...managementSurvey(),
            status: SurveyStatus.active,
            questions: [
              {
                id: questionId,
                question: 'Nhận xét',
                type: SurveyQuestionType.text,
                required: true,
                position: 0,
                options: [],
              },
            ],
          },
        }),
        update: jest.fn(),
      },
      notification: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    Object.assign(prisma, {
      extended: prisma,
      extendedTransaction: prisma.$transaction,
    });
    const service = new SurveysService(prisma as unknown as PrismaService);

    await expect(
      service.submitResponse(
        '77777777-7777-4777-8777-777777777777',
        customerId,
        { answers: [] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.surveyResponse.update).not.toHaveBeenCalled();
  });

  it('counts invitations separately from submitted answers and exclusive viewing stages', async () => {
    const survey = {
      ...managementSurvey(),
      questions: [],
      _count: { responses: 2 },
    };
    const prisma = {
      survey: { findFirst: jest.fn().mockResolvedValue(survey) },
      surveyResponse: {
        groupBy: jest.fn().mockResolvedValue([
          { status: SurveyResponseStatus.pending, _count: { _all: 1 } },
          { status: SurveyResponseStatus.submitted, _count: { _all: 1 } },
        ]),
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
      },
    };
    Object.assign(prisma, { extended: prisma });
    const service = new SurveysService(prisma as unknown as PrismaService);
    const result = await service.getResults(
      surveyId,
      user(adminId, 'admin'),
      {} as never,
    );
    expect(result.summary).toMatchObject({
      invitedCount: 2,
      unopenedCount: 1,
      openedPendingCount: 0,
      responseCount: 1,
      completionRate: 0.5,
    });
  });

  it('extends only unanswered invitations and their notification deadline', async () => {
    const oldEnd = new Date('2026-10-27T16:59:59.999Z');
    const newEnd = '2027-10-31T16:59:59.999Z';
    const tx = {
      survey: {
        update: jest.fn(),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: surveyId, endDate: new Date(newEnd) }),
      },
      surveyResponse: { updateMany: jest.fn() },
      notification: { updateMany: jest.fn() },
    };
    const prisma = {
      survey: {
        findFirst: jest.fn().mockResolvedValue({
          ...managementSurvey(),
          status: SurveyStatus.active,
          endDate: oldEnd,
        }),
      },
      extendedTransaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    Object.assign(prisma, { extended: prisma });
    const service = new SurveysService(prisma as unknown as PrismaService);
    await service.extendSchedule(surveyId, newEnd, user(adminId, 'admin'));
    expect(tx.surveyResponse.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          surveyId,
          status: {
            in: [SurveyResponseStatus.pending, SurveyResponseStatus.expired],
          },
        },
        data: {
          expiresAt: new Date(newEnd),
          status: SurveyResponseStatus.pending,
        },
      }),
    );
    expect(tx.notification.updateMany).toHaveBeenCalled();
  });

  it('blocks submission after the survey end date on the server', async () => {
    const tx = {
      surveyResponse: {
        findFirst: jest.fn().mockResolvedValue({
          id: surveyId,
          status: SurveyResponseStatus.pending,
          expiresAt: null,
          answers: [],
          survey: {
            ...managementSurvey(),
            status: SurveyStatus.active,
            endDate: new Date('2020-01-01T00:00:00Z'),
          },
        }),
        update: jest.fn(),
      },
    };
    const prisma = {
      extendedTransaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    Object.assign(prisma, { extended: prisma });
    const service = new SurveysService(prisma as unknown as PrismaService);
    await expect(
      service.submitResponse(surveyId, customerId, { answers: [] }),
    ).rejects.toThrow('Khảo sát đã hết hạn');
    expect(tx.surveyResponse.update).not.toHaveBeenCalled();
  });

  it('reopens a survey without sending an existing invitation again', async () => {
    const tx = {
      survey: {
        update: jest.fn().mockResolvedValue({
          ...managementSurvey(),
          status: SurveyStatus.active,
          triggerType: SurveyTriggerType.manual,
        }),
      },
      client: { findMany: jest.fn().mockResolvedValue([{ id: customerId }]) },
      surveyResponse: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: surveyId,
            clientId: customerId,
            orderId: null,
            notification: { id: 'existing' },
          },
        ]),
      },
      notification: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      survey: {
        findFirst: jest.fn().mockResolvedValue({
          ...managementSurvey(),
          status: SurveyStatus.closed,
          questions: [{ id: questionId }],
        }),
      },
      extendedTransaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    Object.assign(prisma, { extended: prisma });
    const service = new SurveysService(prisma as unknown as PrismaService);
    const result = await service.changeStatus(
      surveyId,
      SurveyStatus.active,
      user(adminId, 'admin'),
    );
    expect(result.deliveredCount).toBe(0);
    expect(tx.surveyResponse.createMany).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});
