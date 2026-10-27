import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  SurveyAudienceType,
  SurveyQuestionType,
  SurveyResponseStatus,
  SurveyScope,
  SurveyStatus,
  SurveyTriggerType,
} from '@prisma/client';

import { RealtimeService } from 'src/app/realtime/realtime.service';
import type { UserInfo } from 'src/common/decorators/user.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  formatPaginatedList,
  normalizePagination,
} from 'src/common/utils/paginaton-util/pagintion-util.service';
import {
  CreateSurveyDto,
  type SurveyQuestionInput,
} from './dto/create-survey.dto';
import {
  GetSurveyResultsQueryDto,
  GetSurveysQueryDto,
} from './dto/get-survey.dto';
import {
  SubmitSurveyDto,
  type SubmitSurveyAnswerInput,
} from './dto/submit-survey.dto';
import { GetSurveyInboxQueryDto } from './dto/survey-campaign.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { CLIENT_TEMPLATES } from './survey-templates.data';

type DatabaseClient = PrismaService | Prisma.TransactionClient;
type SubmissionQuestion = {
  id: string;
  question: string;
  type: SurveyQuestionType;
  required: boolean;
  position: number;
  options: Array<{ id: string; content: string; position: number }>;
};
type NotificationPayload = {
  id: string;
  clientId: string | null;
  title: string;
  content: string | null;
  surveyId: string | null;
  surveyResponseId: string | null;
  createdAt: Date;
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  getTemplates(_target?: string) {
    return {
      topics: CLIENT_TEMPLATES.map((t) => t.topic),
      templates: CLIENT_TEMPLATES,
    };
  }

  async create(dto: CreateSurveyDto, user: UserInfo) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên mới được tạo khảo sát');
    }
    const { questions, audienceType, recipientIds, triggerType, scope, status, ...fields } =
      dto;
    const resolvedAudience = audienceType ?? SurveyAudienceType.all_users;
    const resolvedTrigger = triggerType ?? SurveyTriggerType.manual;
    this.assertRecipientSelection(resolvedAudience, resolvedTrigger, recipientIds ?? []);
    const startDate = this.toDate(fields.startDate);
    const endDate = this.toDate(fields.endDate);
    this.assertDateRange(startDate, endDate);

    return this.prisma.extended.survey.create({
      data: {
        ...fields,
        imageUrl: fields.imageUrl || null,
        startDate,
        endDate,
        audienceType: resolvedAudience,
        recipientIds: resolvedAudience === SurveyAudienceType.selected_users ? recipientIds : [],
        triggerType: resolvedTrigger,
        scope: scope ?? SurveyScope.platform,
        status: status ?? SurveyStatus.draft,
        adminId: user.userID,
        questions: {
          create: questions.map((question) =>
            this.questionCreateData(question),
          ),
        },
      },
      include: this.managementInclude(),
    });
  }

  listMine(user: UserInfo, query: GetSurveysQueryDto) {
    return this.listManagement({ adminId: user.userID }, query);
  }

  listAll(query: GetSurveysQueryDto) {
    return this.listManagement({}, query);
  }

  async getManagementDetail(id: string, user: UserInfo) {
    const survey = await this.getSurveyForManagement(id);
    this.assertOwnerOrAdmin(user);
    return survey;
  }

  async update(id: string, dto: UpdateSurveyDto, user: UserInfo) {
    const current = await this.getSurveyForManagement(id);
    this.assertOwnerOrAdmin(user);
    if (current.status !== SurveyStatus.draft) {
      throw new BadRequestException(
        'Chỉ được sửa khảo sát đang ở trạng thái nháp',
      );
    }
    if (dto.questions && current._count.responses > 0) {
      throw new ConflictException(
        'Không thể thay câu hỏi khi khảo sát đã có người tham gia',
      );
    }
    const audienceType = dto.audienceType ?? current.audienceType;
    const triggerType = dto.triggerType ?? current.triggerType;
    const recipientIds = dto.recipientIds ?? (
      audienceType === SurveyAudienceType.selected_users ? current.recipientIds : []
    );
    this.assertRecipientSelection(audienceType, triggerType, recipientIds);
    const startDate =
      dto.startDate === undefined
        ? current.startDate
        : this.toDate(dto.startDate);
    const endDate =
      dto.endDate === undefined ? current.endDate : this.toDate(dto.endDate);
    this.assertDateRange(startDate, endDate);
    const data = this.surveyUpdateData(dto);
    if (audienceType !== SurveyAudienceType.selected_users) data.recipientIds = [];

    return this.prisma.extendedTransaction(async (tx) => {
      if (dto.questions) {
        await tx.surveyQuestion.deleteMany({ where: { surveyId: id } });
        data.questions = {
          create: dto.questions.map((question) =>
            this.questionCreateData(question),
          ),
        };
      }
      return tx.survey.update({
        where: { id },
        data,
        include: this.managementInclude(),
      });
    });
  }

  async changeStatus(
    id: string,
    status: SurveyStatus,
    user: UserInfo,
    recipientIds?: string[],
  ) {
    const survey = await this.getSurveyForManagement(id);
    this.assertOwnerOrAdmin(user);
    if (survey.status === status && !recipientIds?.length) return survey;
    if (status === SurveyStatus.active) {
      this.assertPublishable(survey);
      const selectedIds = recipientIds ?? survey.recipientIds;
      this.assertRecipientSelection(survey.audienceType, survey.triggerType, selectedIds);
      const manualRecipientIds = survey.audienceType === SurveyAudienceType.selected_users
        ? selectedIds
        : undefined;
      const result = await this.prisma.extendedTransaction(async (tx) => {
        const activeSurvey = await tx.survey.update({
          where: { id },
          data: {
            status: SurveyStatus.active,
            ...(manualRecipientIds ? { recipientIds: manualRecipientIds } : {}),
          },
          include: {
            admin: { select: { id: true, fullName: true } },
          },
        });
        const notifications = activeSurvey.triggerType === SurveyTriggerType.manual
          ? await this.createResponses(
              tx,
              activeSurvey,
              await this.resolveManualRecipientIds(tx, manualRecipientIds),
            )
          : [];
        return { activeSurvey, notifications };
      });
      this.emitNotifications(result.notifications);
      return {
        ...result.activeSurvey,
        deliveredCount: result.notifications.length,
      };
    }
    if (
      status === SurveyStatus.closed &&
      survey.status === SurveyStatus.draft
    ) {
      throw new BadRequestException('Khảo sát nháp chưa thể đóng');
    }
    return this.prisma.extended.survey.update({
      where: { id },
      data: { status },
      include: this.managementInclude(),
    });
  }

  async remove(id: string, user: UserInfo) {
    const survey = await this.getSurveyForManagement(id);
    this.assertOwnerOrAdmin(user);
    return this.prisma.extended.survey.update({
      where: { id: survey.id },
      data: { status: SurveyStatus.closed, deletedAt: new Date() },
    });
  }

  private resolveActor(actor: UserInfo | string): {
    userId: string;
    role: UserInfo['role'];
  } {
    if (typeof actor === 'string') {
      return { userId: actor, role: 'client' };
    }
    return { userId: actor.userID, role: actor.role };
  }

  async listInbox(actor: UserInfo | string, query: GetSurveyInboxQueryDto) {
    const { userId } = this.resolveActor(actor);
    const { status } = query;
    const { page, itemPerPage, skip } = normalizePagination({
      page: query.page,
      itemPerPage: query.itemPerPage,
    });
    const where: Prisma.SurveyResponseWhereInput = {
      clientId: userId,
      ...(status ? { status } : {}),
      survey: { deletedAt: null },
    };
    const [totalItems, list] = await Promise.all([
      this.prisma.extended.surveyResponse.count({ where }),
      this.prisma.extended.surveyResponse.findMany({
        where,
        skip,
        take: itemPerPage,
        select: this.responsePromptSelect(),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return formatPaginatedList(list, totalItems, { page, itemPerPage });
  }

  async getInboxDetail(responseId: string, actor: UserInfo | string) {
    const { userId } = this.resolveActor(actor);
    return this.getResponse(responseId, userId);
  }

  async openResponse(responseId: string, actor: UserInfo | string) {
    const { userId } = this.resolveActor(actor);
    const response = await this.getResponse(responseId, userId);
    if (!response.openedAt) {
      const now = new Date();
      await this.prisma.extended.surveyResponse.updateMany({
        where: { id: responseId, clientId: userId, openedAt: null },
        data: { openedAt: now },
      });
      await this.prisma.extended.notification.updateMany({
        where: { surveyResponseId: responseId, clientId: userId },
        data: { isRead: true, readAt: now },
      });
      return this.getResponse(responseId, userId);
    }
    return response;
  }

  async submitResponse(
    responseId: string,
    actor: UserInfo | string,
    dto: SubmitSurveyDto,
  ) {
    const { userId } = this.resolveActor(actor);
    try {
      return await this.prisma.extendedTransaction(async (tx) => {
        const response = await tx.surveyResponse.findFirst({
          where: { id: responseId, clientId: userId },
          include: {
            survey: {
              include: {
                questions: {
                  orderBy: { position: 'asc' },
                  include: { options: { orderBy: { position: 'asc' } } },
                },
              },
            },
            answers: { select: { id: true }, take: 1 },
          },
        });
        if (!response) throw new NotFoundException('Khảo sát không tồn tại');
        this.assertResponseAvailable(response);
        if (response.answers.length) {
          throw new ConflictException('Khảo sát đã được trả lời');
        }
        const answers = this.buildAnswerRows(
          response.survey.questions,
          dto.answers,
        );
        const now = new Date();
        const updated = await tx.surveyResponse.update({
          where: { id: responseId },
          data: {
            status: SurveyResponseStatus.submitted,
            submittedAt: now,
            answers: { createMany: { data: answers } },
          },
          include: {
            answers: {
              include: { question: true, option: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        await tx.notification.updateMany({
          where: { surveyResponseId: responseId, clientId: userId },
          data: { isRead: true, readAt: now },
        });
        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Khảo sát đã được trả lời');
      }
      throw error;
    }
  }

  async skipResponse(responseId: string, actor: UserInfo | string) {
    const { userId } = this.resolveActor(actor);
    const response = await this.getResponse(responseId, userId);
    this.assertResponseAvailable(response);
    const now = new Date();
    return this.prisma.extendedTransaction(async (tx) => {
      const updated = await tx.surveyResponse.update({
        where: { id: responseId },
        data: { status: SurveyResponseStatus.skipped, skippedAt: now },
      });
      await tx.notification.updateMany({
        where: { surveyResponseId: responseId, clientId: userId },
        data: { isRead: true, readAt: now },
      });
      return updated;
    });
  }

  async listPendingForOrder(orderId: string, clientId: string) {
    const order = await this.prisma.extended.order.findFirst({
      where: { id: orderId, clientId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return this.prisma.extended.surveyResponse.findMany({
      where: {
        orderId,
        clientId,
        status: SurveyResponseStatus.pending,
        survey: this.availableWhere(),
      },
      select: this.responsePromptSelect(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async submit(
    surveyId: string,
    orderId: string,
    clientId: string,
    dto: SubmitSurveyDto,
  ) {
    const response = await this.findOrderResponse(surveyId, orderId, clientId);
    return this.submitResponse(response.id, clientId, dto);
  }

  async skip(surveyId: string, orderId: string, clientId: string) {
    const response = await this.findOrderResponse(surveyId, orderId, clientId);
    return this.skipResponse(response.id, clientId);
  }

  async getMyResponse(surveyId: string, orderId: string, clientId: string) {
    const response = await this.prisma.extended.surveyResponse.findFirst({
      where: {
        surveyId,
        orderId,
        clientId,
        status: SurveyResponseStatus.submitted,
      },
      include: {
        survey: { select: { id: true, title: true, status: true } },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                required: true,
                position: true,
              },
            },
            option: { select: { id: true, content: true, position: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!response) {
      throw new NotFoundException('Bạn chưa trả lời khảo sát này cho đơn hàng');
    }
    const grouped = new Map<
      string,
      {
        question: (typeof response.answers)[number]['question'];
        textAnswer: string | null;
        ratingValue: number | null;
        options: Array<{ id: string; content: string; position: number }>;
      }
    >();
    for (const answer of response.answers) {
      const item = grouped.get(answer.questionId) ?? {
        question: answer.question,
        textAnswer: null,
        ratingValue: null,
        options: [],
      };
      item.textAnswer ??= answer.textAnswer;
      item.ratingValue ??= answer.ratingValue;
      if (answer.option) item.options.push(answer.option);
      grouped.set(answer.questionId, item);
    }
    return {
      id: response.id,
      survey: response.survey,
      submittedAt: response.submittedAt,
      answers: [...grouped.values()].sort(
        (left, right) => left.question.position - right.question.position,
      ),
    };
  }

  async getResults(
    id: string,
    user: UserInfo,
    query: GetSurveyResultsQueryDto,
  ) {
    const { page, itemPerPage, skip } = normalizePagination({
      page: query.page,
      itemPerPage: query.itemPerPage,
    });
    const survey = await this.getSurveyForManagement(id);
    this.assertOwnerOrAdmin(user);

    const interactionGroups =
      await this.prisma.extended.surveyResponse.groupBy({
        by: ['status'],
        where: { surveyId: id },
        _count: { _all: true },
      });
    const interactionCounts = Object.fromEntries(
      Object.values(SurveyResponseStatus).map((status) => [
        status,
        interactionGroups.find((item) => item.status === status)?._count._all ??
          0,
      ]),
    ) as Record<SurveyResponseStatus, number>;
    const responseCount = interactionCounts[SurveyResponseStatus.submitted];
    const invitedCount = survey._count.responses;
    const pendingCount = interactionCounts[SurveyResponseStatus.pending] ?? 0;
    const openedCount = this.prisma.extended.surveyResponse.count
      ? await this.prisma.extended.surveyResponse.count({
          where: {
            surveyId: id,
            OR: [
              { openedAt: { not: null } },
              { status: SurveyResponseStatus.submitted },
            ],
          },
        })
      : responseCount;
    const completionRate = invitedCount > 0 ? responseCount / invitedCount : 0;

    const questions = await Promise.all(
      survey.questions.map(async (question) => {
        const base = {
          id: question.id,
          question: question.question,
          type: question.type,
          required: question.required,
          position: question.position,
        };
        const answerScope: Prisma.SurveyAnswerWhereInput = {
          questionId: question.id,
          response: { surveyId: id },
        };
        if (question.type === SurveyQuestionType.text) {
          const where: Prisma.SurveyAnswerWhereInput = {
            ...answerScope,
            textAnswer: { not: null },
          };
          const [totalItems, answers] = await Promise.all([
            this.prisma.extended.surveyAnswer.count({ where }),
            this.prisma.extended.surveyAnswer.findMany({
              where,
              skip,
              take: itemPerPage,
              select: {
                id: true,
                textAnswer: true,
                createdAt: true,
                response: {
                  select: { client: { select: { id: true, fullName: true } } },
                },
              },
              orderBy: { createdAt: 'desc' },
            }),
          ]);
          return {
            ...base,
            result: formatPaginatedList(answers, totalItems, {
              page,
              itemPerPage,
            }),
          };
        }
        if (question.type === SurveyQuestionType.rating) {
          const groups = await this.prisma.extended.surveyAnswer.groupBy({
            by: ['ratingValue'],
            where: { ...answerScope, ratingValue: { not: null } },
            _count: { _all: true },
          });
          const distribution = [1, 2, 3, 4, 5].map((value) => ({
            value,
            count:
              groups.find((group) => group.ratingValue === value)?._count
                ._all ?? 0,
          }));
          const answeredCount = distribution.reduce(
            (sum, item) => sum + item.count,
            0,
          );
          return {
            ...base,
            result: {
              answeredCount,
              average: answeredCount
                ? distribution.reduce(
                    (sum, item) => sum + item.value * item.count,
                    0,
                  ) / answeredCount
                : 0,
              distribution,
            },
          };
        }
        const groups = await this.prisma.extended.surveyAnswer.groupBy({
          by: ['optionId'],
          where: { ...answerScope, optionId: { not: null } },
          _count: { _all: true },
        });
        const counts = new Map(
          groups.map((group) => [group.optionId, group._count._all]),
        );
        return {
          ...base,
          result: {
            options: question.options.map((option) => {
              const count = counts.get(option.id) ?? 0;
              return {
                ...option,
                count,
                percentage: responseCount ? (count / responseCount) * 100 : 0,
              };
            }),
          },
        };
      }),
    );
    return {
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        scope: survey.scope,
        audienceType: survey.audienceType,
        triggerType: survey.triggerType,
        startDate: survey.startDate,
        endDate: survey.endDate,
      },
      summary: {
        invitedCount,
        openedCount,
        responseCount,
        pendingCount,
        completionRate,
      },
      responseCount,
      interactionCounts,
      responseRate: completionRate * 100,
      questions,
    };
  }

  async deliverForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    triggerType: SurveyTriggerType,
  ) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { id: true, clientId: true },
    });
    const surveys = await tx.survey.findMany({
      where: {
        ...this.availableWhere(),
        triggerType,
        audienceType: {
          in: [SurveyAudienceType.all_users, SurveyAudienceType.all_system],
        },
      },
      include: {
        admin: { select: { id: true, fullName: true } },
      },
    });
    const notifications: NotificationPayload[] = [];
    for (const survey of surveys) {
      notifications.push(
        ...(await this.createResponses(tx, survey, [
          { clientId: order.clientId, orderId },
        ])),
      );
    }
    return notifications;
  }

  emitNotifications(notifications: NotificationPayload[]) {
    for (const notification of notifications) {
      const targetUserId = notification.clientId;
      if (!targetUserId) continue;
      this.realtime?.emitToUser(targetUserId, 'notification:created', {
        id: notification.id,
        type: NotificationType.survey_invitation,
        title: notification.title,
        content: notification.content,
        surveyId: notification.surveyId,
        responseId: notification.surveyResponseId ?? notification.id,
        createdAt: notification.createdAt,
      });
    }
  }

  private async createResponses(
    tx: Prisma.TransactionClient,
    survey: any,
    entries: Array<{ clientId: string; orderId?: string | null }>,
  ): Promise<NotificationPayload[]> {
    const clientEntries = entries.filter((e) => e.clientId);
    if (!clientEntries.length) return [];
    const now = new Date();

    const rows = clientEntries.map((entry) => ({
      surveyId: survey.id,
      clientId: entry.clientId,
      orderId: entry.orderId ?? null,
      deliveryKey: `${survey.id}:${entry.clientId}:${entry.orderId ?? 'manual'}`,
      status: SurveyResponseStatus.pending,
      notifiedAt: now,
      expiresAt: survey.endDate,
    }));
    await tx.surveyResponse.createMany({ data: rows, skipDuplicates: true });
    const responses = await tx.surveyResponse.findMany({
      where: { deliveryKey: { in: rows.map((r) => r.deliveryKey) } },
      select: {
        id: true,
        clientId: true,
        orderId: true,
        notification: { select: { id: true } },
      },
    });
    const withoutNotification = responses.filter((r) => !r.notification);
    if (withoutNotification.length) {
      await tx.notification.createMany({
        data: withoutNotification.map((response) => ({
          clientId: response.clientId,
          surveyId: survey.id,
          surveyResponseId: response.id,
          type: NotificationType.survey_invitation,
          title: survey.title,
          content:
            survey.description ||
            'Mời bạn tham gia khảo sát để đóng góp ý kiến.',
          data: {
            responseId: response.id,
            surveyId: survey.id,
            orderId: response.orderId,
          },
          expiresAt: survey.endDate,
        })),
        skipDuplicates: true,
      });
    }

    return tx.notification.findMany({
      where: { surveyId: survey.id },
      select: {
        id: true,
        clientId: true,
        title: true,
        content: true,
        surveyId: true,
        surveyResponseId: true,
        createdAt: true,
      },
    });
  }

  private async resolveManualRecipientIds(
    tx: Prisma.TransactionClient,
    recipientIds?: string[],
  ): Promise<Array<{ clientId: string; orderId: null }>> {
    const clients = await tx.client.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        ...(recipientIds?.length ? { id: { in: recipientIds } } : {}),
      },
      select: { id: true },
    });
    if (recipientIds && clients.length !== new Set(recipientIds).size) {
      throw new BadRequestException('Có khách hàng được chọn không còn hoạt động hoặc không tồn tại');
    }
    return clients.map((c) => ({ clientId: c.id, orderId: null }));
  }

  private assertDeliveryRules(audienceType: SurveyAudienceType) {
    if (
      audienceType !== SurveyAudienceType.all_users &&
      audienceType !== SurveyAudienceType.selected_users &&
      audienceType !== SurveyAudienceType.all_system
    ) {
      throw new BadRequestException('Nhóm người nhận không hợp lệ');
    }
  }

  private assertRecipientSelection(
    audienceType: SurveyAudienceType,
    triggerType: SurveyTriggerType,
    recipientIds: string[],
  ) {
    this.assertDeliveryRules(audienceType);
    if (audienceType !== SurveyAudienceType.selected_users && recipientIds.length) {
      throw new BadRequestException('Danh sách khách hàng chỉ dùng cho khảo sát chọn khách hàng cụ thể');
    }
    if (audienceType === SurveyAudienceType.selected_users) {
      if (triggerType !== SurveyTriggerType.manual) {
        throw new BadRequestException('Khảo sát chọn khách hàng chỉ hỗ trợ gửi thủ công');
      }
      if (!recipientIds.length) {
        throw new BadRequestException('Vui lòng chọn ít nhất một khách hàng nhận khảo sát');
      }
    }
  }

  private async findOrderResponse(
    surveyId: string,
    orderId: string,
    clientId: string,
  ) {
    const response = await this.prisma.extended.surveyResponse.findFirst({
      where: { surveyId, orderId, clientId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!response) {
      throw new BadRequestException('Khảo sát không dành cho đơn hàng này');
    }
    return response;
  }

  private async getResponse(id: string, clientId: string) {
    const response = await this.prisma.extended.surveyResponse.findFirst({
      where: { id, clientId },
      select: this.responsePromptSelect(),
    });
    if (!response) throw new NotFoundException('Khảo sát không tồn tại');
    return response;
  }

  private assertResponseAvailable(response: {
    status: SurveyResponseStatus;
    expiresAt: Date | null;
    survey: {
      status: SurveyStatus;
      startDate: Date | null;
      endDate: Date | null;
    };
  }) {
    if (response.status !== SurveyResponseStatus.pending) {
      throw new BadRequestException('Khảo sát này đã được trả lời trước đó');
    }
    if (response.survey.status !== SurveyStatus.active) {
      throw new BadRequestException(
        'Khảo sát hiện không hoạt động hoặc đã đóng',
      );
    }
    const now = new Date();
    if (response.survey.startDate && response.survey.startDate > now) {
      throw new BadRequestException('Khảo sát chưa đến ngày bắt đầu');
    }
  }

  private async listManagement(
    baseWhere: Prisma.SurveyWhereInput,
    query: GetSurveysQueryDto,
  ) {
    const { search, status } = query;
    const { page, itemPerPage, skip } = normalizePagination({
      page: query.page,
      itemPerPage: query.itemPerPage,
    });
    const where: Prisma.SurveyWhereInput = {
      ...baseWhere,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalItems, list] = await Promise.all([
      this.prisma.extended.survey.count({ where }),
      this.prisma.extended.survey.findMany({
        where,
        skip,
        take: itemPerPage,
        include: {
          admin: { select: { id: true, fullName: true } },
          _count: { select: { questions: true, responses: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return formatPaginatedList(list, totalItems, { page, itemPerPage });
  }

  private async getSurveyForManagement(id: string) {
    const survey = await this.prisma.extended.survey.findFirst({
      where: { id, deletedAt: null },
      include: this.managementInclude(),
    });
    if (!survey) throw new NotFoundException('Khảo sát không tồn tại');
    return survey;
  }

  private assertOwnerOrAdmin(user: UserInfo) {
    if (user.role === 'admin') return;
    throw new ForbiddenException('Bạn không có quyền quản lý khảo sát này');
  }

  private assertPublishable(survey: {
    questions: Array<SubmissionQuestion>;
    startDate: Date | null;
    endDate: Date | null;
  }) {
    if (!survey.questions.length) {
      throw new BadRequestException('Khảo sát phải có ít nhất một câu hỏi');
    }
    this.assertDateRange(survey.startDate, survey.endDate);
    if (survey.endDate && survey.endDate <= new Date()) {
      throw new BadRequestException('Ngày kết thúc khảo sát đã qua');
    }
  }

  private buildAnswerRows(
    questions: SubmissionQuestion[],
    submittedAnswers: SubmitSurveyAnswerInput[],
  ) {
    const questionsById = new Map(
      questions.map((question) => [question.id, question]),
    );
    const answersByQuestionId = new Map(
      submittedAnswers.map((answer) => [answer.questionId, answer]),
    );
    for (const answer of submittedAnswers) {
      if (!questionsById.has(answer.questionId)) {
        throw new BadRequestException(
          'Câu trả lời chứa câu hỏi không thuộc khảo sát',
        );
      }
    }
    const missing = questions.find(
      (question) => question.required && !answersByQuestionId.has(question.id),
    );
    if (missing) {
      throw new BadRequestException(
        `Câu hỏi "${missing.question}" là bắt buộc`,
      );
    }
    const rows: Array<{
      questionId: string;
      optionId?: string;
      textAnswer?: string;
      ratingValue?: number;
    }> = [];
    for (const question of questions) {
      const answer = answersByQuestionId.get(question.id);
      if (!answer) continue;
      if (question.type === SurveyQuestionType.text) {
        if (answer.textAnswer === undefined) {
          throw new BadRequestException(
            `Câu hỏi "${question.question}" yêu cầu câu trả lời văn bản`,
          );
        }
        rows.push({ questionId: question.id, textAnswer: answer.textAnswer });
        continue;
      }
      if (question.type === SurveyQuestionType.rating) {
        if (answer.ratingValue === undefined) {
          throw new BadRequestException(
            `Câu hỏi "${question.question}" yêu cầu điểm đánh giá`,
          );
        }
        rows.push({ questionId: question.id, ratingValue: answer.ratingValue });
        continue;
      }
      if (!answer.optionIds?.length) {
        throw new BadRequestException(
          `Câu hỏi "${question.question}" yêu cầu chọn phương án`,
        );
      }
      if (
        question.type === SurveyQuestionType.single_choice &&
        answer.optionIds.length !== 1
      ) {
        throw new BadRequestException(
          `Câu hỏi "${question.question}" chỉ được chọn một phương án`,
        );
      }
      const validOptionIds = new Set(
        question.options.map((option) => option.id),
      );
      if (answer.optionIds.some((id) => !validOptionIds.has(id))) {
        throw new BadRequestException(
          `Câu hỏi "${question.question}" chứa phương án không hợp lệ`,
        );
      }
      rows.push(
        ...answer.optionIds.map((optionId) => ({
          questionId: question.id,
          optionId,
        })),
      );
    }
    return rows;
  }

  private availableWhere(): Prisma.SurveyWhereInput {
    const now = new Date();
    return {
      deletedAt: null,
      status: SurveyStatus.active,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    };
  }

  private responsePromptSelect() {
    return {
      id: true,
      orderId: true,
      status: true,
      notifiedAt: true,
      openedAt: true,
      submittedAt: true,
      skippedAt: true,
      expiresAt: true,
      createdAt: true,
      answers: {
        select: {
          id: true,
          questionId: true,
          optionId: true,
          textAnswer: true,
          ratingValue: true,
        },
      },
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          status: true,
          scope: true,
          startDate: true,
          endDate: true,
          admin: { select: { id: true, fullName: true } },
          questions: {
            orderBy: { position: 'asc' as const },
            select: {
              id: true,
              question: true,
              type: true,
              required: true,
              position: true,
              options: {
                orderBy: { position: 'asc' as const },
                select: { id: true, content: true, position: true },
              },
            },
          },
        },
      },
    } satisfies Prisma.SurveyResponseSelect;
  }

  private surveyUpdateData(dto: UpdateSurveyDto): Prisma.SurveyUpdateInput {
    const data: Prisma.SurveyUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.audienceType !== undefined) data.audienceType = dto.audienceType;
    if (dto.recipientIds !== undefined) data.recipientIds = dto.recipientIds;
    if (dto.triggerType !== undefined) data.triggerType = dto.triggerType;
    if (dto.startDate !== undefined)
      data.startDate = this.toDate(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = this.toDate(dto.endDate);
    return data;
  }

  private assertDateRange(
    startDate: Date | null | undefined,
    endDate: Date | null | undefined,
  ) {
    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
  }

  private toDate(value: string | null | undefined): Date | null | undefined {
    if (value === null || value === undefined || value === '') return null;
    return new Date(value);
  }

  private questionCreateData(question: SurveyQuestionInput) {
    return {
      question: question.question,
      type: question.type,
      required: question.required,
      position: question.position,
      options: question.options.length
        ? {
            create: question.options.map((option) => ({
              content: option.content,
              position: option.position,
            })),
          }
        : undefined,
    };
  }

  private managementInclude() {
    return {
      admin: { select: { id: true, fullName: true } },
      questions: {
        orderBy: { position: 'asc' as const },
        include: { options: { orderBy: { position: 'asc' as const } } },
      },
      _count: { select: { responses: true } },
    } satisfies Prisma.SurveyInclude;
  }
}
