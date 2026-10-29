/* Run against the local demo database and API; remove only records created here. */
require('dotenv').config();
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const baseUrl = process.env.CRM_TEST_API_URL || 'http://localhost:3000/api';
const password = process.env.CRM_TEST_PASSWORD || 'admin123';
let surveyId;
let legacySurveyId;
let reviewId;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function call(path, { method = 'GET', token, body, appRole } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(appRole ? { 'x-app-role': appRole } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    throw new Error(`${method} ${path}: HTTP ${response.status} ${typeof data === 'object' ? data.message || '' : String(data).slice(0, 120)}`);
  }
  return data?.data ?? data;
}

async function login(email, appRole) {
  const result = await call('/auth/sign-in', {
    method: 'POST', appRole, body: { email, password },
  });
  ensure(result.accessToken, `No access token for ${appRole}`);
  return result.accessToken;
}

async function cleanup() {
  if (reviewId) await prisma.review.deleteMany({ where: { id: reviewId } });
  for (const id of [surveyId, legacySurveyId].filter(Boolean)) {
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { surveyId: id } });
      await tx.surveyAnswer.deleteMany({ where: { response: { surveyId: id } } });
      await tx.surveyResponse.deleteMany({ where: { surveyId: id } });
      await tx.surveyOption.deleteMany({ where: { question: { surveyId: id } } });
      await tx.surveyQuestion.deleteMany({ where: { surveyId: id } });
      await tx.survey.deleteMany({ where: { id } });
    });
  }
}

async function main() {
  const client = await prisma.client.findFirst({
    where: { email: process.env.CRM_TEST_CLIENT_EMAIL || 'client1@miva.vn', status: 'active', deletedAt: null },
    select: { id: true },
  });
  ensure(client, 'Demo client account is unavailable');
  const activeClientCount = await prisma.client.count({ where: { status: 'active', deletedAt: null } });
  ensure(activeClientCount > 1, 'At least two active clients are needed to verify targeted delivery');
  const product = await prisma.product.findFirst({
    where: { status: 'active', deletedAt: null }, select: { id: true },
  });
  ensure(product, 'No active product is available for feedback');

  const crmToken = await login(process.env.CRM_TEST_CRM_EMAIL || 'crm@miva.vn', 'crm');
  const clientToken = await login(process.env.CRM_TEST_CLIENT_EMAIL || 'client1@miva.vn', 'client');
  const marker = `CRM live smoke ${randomUUID()}`;

  // A draft created before recipient persistence must never fall back to all clients.
  const legacy = await prisma.survey.create({
    data: {
      title: `${marker} legacy`,
      audienceType: 'selected_users',
      triggerType: 'manual',
      questions: { create: [{ question: 'Đánh giá', type: 'rating', position: 1 }] },
    },
  });
  legacySurveyId = legacy.id;
  const unsafeActivation = await fetch(`${baseUrl}/surveys/${legacySurveyId}/status`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${crmToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'active' }),
  });
  ensure(unsafeActivation.status === 400, 'Legacy draft without recipients was not rejected');
  ensure(await prisma.surveyResponse.count({ where: { surveyId: legacySurveyId } }) === 0,
    'Legacy draft sent to customers unexpectedly');
  await call(`/surveys/${legacySurveyId}`, {
    method: 'PATCH', token: crmToken,
    body: { recipientIds: [client.id], triggerType: 'manual' },
  });
  await call(`/surveys/${legacySurveyId}/status`, {
    method: 'PATCH', token: crmToken, body: { status: 'active' },
  });
  ensure(await prisma.surveyResponse.count({ where: { surveyId: legacySurveyId } }) === 1,
    'Legacy draft could not be safely sent after choosing a recipient');

  const survey = await call('/surveys', {
    method: 'POST', token: crmToken,
    body: {
      title: marker,
      audienceType: 'selected_users',
      recipientIds: [client.id],
      triggerType: 'manual',
      questions: [{ question: 'Bạn hài lòng với MIVA?', type: 'rating', required: true, position: 1, options: [] }],
    },
  });
  surveyId = survey.id;
  ensure(survey.status === 'draft', 'Survey was not saved as a draft');
  ensure(survey.recipientIds?.length === 1 && survey.recipientIds[0] === client.id, 'Draft did not persist its recipient');

  const activated = await call(`/surveys/${surveyId}/status`, {
    method: 'PATCH', token: crmToken, body: { status: 'active' },
  });
  ensure(activated.status === 'active', 'Survey was not activated');
  const recipients = await prisma.surveyResponse.findMany({
    where: { surveyId }, select: { id: true, clientId: true },
  });
  ensure(recipients.length === 1 && recipients[0].clientId === client.id, 'Survey was sent beyond the saved recipient');

  const inbox = await call('/surveys/inbox', { token: clientToken });
  ensure(inbox.list?.some((entry) => entry.id === recipients[0].id), 'Client did not receive the survey');
  const question = await prisma.surveyQuestion.findFirstOrThrow({ where: { surveyId }, select: { id: true } });
  await call(`/surveys/inbox/${recipients[0].id}/responses`, {
    method: 'POST', token: clientToken,
    body: { answers: [{ questionId: question.id, ratingValue: 5 }] },
  });
  const results = await call(`/surveys/${surveyId}/results`, { token: crmToken });
  ensure(results.summary?.invitedCount === 1 && results.summary?.responseCount === 1, 'Survey statistics do not match real responses');
  ensure(results.questions?.[0]?.result?.average === 5, 'Survey rating was not aggregated');

  const review = await call('/reviews', {
    method: 'POST', token: clientToken,
    body: { productId: product.id, rating: 5, content: marker },
  });
  reviewId = review.id;
  const replied = await call(`/reviews/admin/${reviewId}/reply`, {
    method: 'PATCH', token: crmToken,
    body: { adminReply: 'Cảm ơn bạn đã góp ý.' },
  });
  ensure(replied.adminReply === 'Cảm ơn bạn đã góp ý.', 'CRM reply was not saved');

  process.stdout.write(JSON.stringify({ result: 'PASS', database: 'PostgreSQL', invited: recipients.length, submitted: results.summary.responseCount, legacyDraftProtected: true, reviewReplied: true }) + '\n');
}

main()
  .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
  .finally(async () => {
    try { await cleanup(); } catch (error) {
      process.stderr.write(`Cleanup failed: ${error.message}\n`);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
