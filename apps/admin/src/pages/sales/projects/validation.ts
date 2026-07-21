// 프로젝트 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 확률·진척은 0~100, 예상매출은 숫자, 기간 역전 금지, 실주 단계는 실주사유 필수, 마일스톤은 이름·목표일.
import * as z from 'zod/mini';

import { isCalendarDate, topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import { PROJECT_NAME_MAX } from './types';

const INT_RE = /^\d+$/;

const milestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  dueDate: z.string(),
  done: z.boolean(),
});

const percentString = (label: string) =>
  z.string().check(
    z.refine((value) => INT_RE.test(value.trim()), {
      error: `${label}${topicParticle(label)} 숫자만 입력할 수 있습니다.`,
    }),
    z.refine((value) => !INT_RE.test(value.trim()) || Number(value.trim()) <= 100, {
      error: `${label}${topicParticle(label)} 0~100 사이여야 합니다.`,
    }),
  );

export const projectSchema = z
  .object({
    name: requiredText('프로젝트명', PROJECT_NAME_MAX),
    // 거래처 마스터 참조 — 빈 문자열(미등록)을 허용하는 이유는 contracts/validation 과 같다.
    accountId: z.string(),
    accountName: requiredText('거래처', 60),
    stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
    probability: percentString('확률'),
    expectedRevenue: z.string().check(
      z.refine((value) => INT_RE.test(value.trim()), {
        error: '예상매출은 숫자만 입력할 수 있습니다.',
      }),
    ),
    startAt: z.string(),
    endAt: z.string(),
    ownerName: z.string(),
    progress: percentString('진척률'),
    milestones: z.array(milestoneSchema),
    deliverables: z.array(z.string()),
    lostReason: z.string(),
    note: z.string(),
  })
  .check((ctx) => {
    // 기간 — 실재 날짜 + 종료 ≥ 시작.
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start) || !isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (end < start) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endAt,
        path: ['endAt'],
        message: '종료일은 시작일보다 빠를 수 없습니다.',
      });
    }
  })
  .check((ctx) => {
    // 실주 단계는 실주사유 필수.
    if (ctx.value.stage === 'lost' && ctx.value.lostReason.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.lostReason,
        path: ['lostReason'],
        message: '실주 사유를 입력하세요.',
      });
    }
  })
  .check((ctx) => {
    // 마일스톤 — 각 행 이름·목표일 필수.
    const milestones = ctx.value.milestones;
    if (milestones.some((milestone) => milestone.name.trim() === '')) {
      ctx.issues.push({
        code: 'custom',
        input: milestones,
        path: ['milestones'],
        message: '모든 마일스톤의 이름을 입력하세요.',
      });
      return;
    }
    if (milestones.some((milestone) => !isCalendarDate(milestone.dueDate))) {
      ctx.issues.push({
        code: 'custom',
        input: milestones,
        path: ['milestones'],
        message: '모든 마일스톤의 목표일을 입력하세요.',
      });
    }
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;
