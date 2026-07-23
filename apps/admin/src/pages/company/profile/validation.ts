// 회사 정보 폼 검증 규칙 (검증의 정본은 이 zod 스키마다. 진입점은 zod/mini)
import * as z from 'zod/mini';

import { topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import {
  ADDRESS_DETAIL_MAX_LENGTH,
  ADDRESS_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  CONTACT_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from './types';

/** 사업자등록번호 — 3-2-5 숫자 */
const BUSINESS_NUMBER_RE = /^\d{3}-\d{2}-\d{5}$/;

export const companyProfileSchema = z.object({
  companyName: requiredText('회사명', COMPANY_NAME_MAX_LENGTH),
  businessNumber: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '사업자등록번호를 입력하세요.' }),
    z.refine((value) => BUSINESS_NUMBER_RE.test(value.trim()), {
      error: '사업자등록번호 형식이 올바르지 않아요. (예: 123-45-67890)',
    }),
  ),
  address: requiredText('주소', ADDRESS_MAX_LENGTH),
  // 상세주소는 선택 — 층·호수가 없는 단독 건물도 있다(오시는 길과 같은 규칙)
  addressDetail: z.string().check(
    z.refine((value) => value.length <= ADDRESS_DETAIL_MAX_LENGTH, {
      error: `상세주소${topicParticle('상세주소')} ${String(ADDRESS_DETAIL_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
  ceoName: requiredText('대표자명', NAME_MAX_LENGTH),
  contact: requiredText('연락처', CONTACT_MAX_LENGTH),
  // 로고는 선택 — 업로드 결과(object/data URL)라 형식은 강제하지 않는다. 비우면 로고 없음.
  logoUrl: z.string(),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;
