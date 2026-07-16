// 사이트 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// [화면은 규칙을 갖지 않는다] 입력을 막지 않고, 제출 시점에 스키마가 판정한다. 같은 규칙이
// 화면 세 곳에 흩어지지 않고, 백엔드가 붙어도 그대로 계약 검증에 쓴다 (customer-settings 선례).
import * as z from 'zod/mini';

import { optionalText, requiredEmail, requiredPhone, requiredText } from '../_shared/validation';

export const SITE_NAME_MAX = 60;
export const SITE_DESCRIPTION_MAX = 160;
export const MAINTENANCE_MESSAGE_MAX = 200;

/**
 * 표시 시간대 — 모든 timestamp 를 어느 벽시계로 보여줄지의 단일 출처 (ERP-09).
 * 목록이 짧은 이유: 이 값은 '운영진이 보는 시각' 이지 사용자별 로컬 타임존이 아니다.
 */
export const TIMEZONE_OPTIONS = [
  { id: 'Asia/Seoul', label: '(GMT+09:00) 서울' },
  { id: 'UTC', label: '(GMT+00:00) UTC' },
] as const;

const TIMEZONE_IDS = ['Asia/Seoul', 'UTC'] as const;

/** 기본 URL — https 만 받는다. 사이트 주소가 http 면 로그인 쿠키가 평문으로 흐른다 */
const HTTPS_URL_RE = /^https:\/\/[^\s/]+\S*$/;

export const siteSettingsSchema = z
  .object({
    siteName: requiredText(SITE_NAME_MAX, {
      missing: '사이트명을 입력하세요.',
      tooLong: `사이트명은 ${String(SITE_NAME_MAX)}자를 넘을 수 없습니다.`,
    }),
    siteDescription: optionalText(
      SITE_DESCRIPTION_MAX,
      `사이트 설명은 ${String(SITE_DESCRIPTION_MAX)}자를 넘을 수 없습니다.`,
    ),
    baseUrl: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '기본 URL을 입력하세요.' }),
      z.refine((value) => HTTPS_URL_RE.test(value.trim()), {
        error: '기본 URL은 https:// 로 시작해야 합니다.',
      }),
    ),
    contactEmail: requiredEmail({
      missing: '대표 이메일을 입력하세요.',
      malformed: '대표 이메일 형식이 올바르지 않습니다.',
    }),
    contactPhone: requiredPhone({
      missing: '대표 전화번호를 입력하세요.',
      malformed: '대표 전화번호 형식이 올바르지 않습니다. 예: 02-1234-5678',
    }),
    timezone: z.enum(TIMEZONE_IDS),
    signupEnabled: z.boolean(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string(),
  })
  .check((ctx) => {
    const draft = ctx.value;

    // 유지보수 모드를 켜면 방문자는 이 문구만 보게 된다 — 빈 화면을 내보내지 않는다
    if (draft.maintenanceMode && draft.maintenanceMessage.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: draft.maintenanceMessage,
        path: ['maintenanceMessage'],
        message: '유지보수 모드를 켜면 방문자에게 보여줄 안내 문구가 필요합니다.',
      });
    }

    if (draft.maintenanceMessage.trim().length > MAINTENANCE_MESSAGE_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: draft.maintenanceMessage,
        path: ['maintenanceMessage'],
        message: `안내 문구는 ${String(MAINTENANCE_MESSAGE_MAX)}자를 넘을 수 없습니다.`,
      });
    }
  });

export type SiteSettingsValues = z.infer<typeof siteSettingsSchema>;
