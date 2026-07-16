// 언어 설정 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [백엔드 0] 실제 HTTP 호출은 없다. 실패/충돌 재현:
//   /settings/languages?fail=load · ?fail=save · ?fail=conflict
import { createRevisionedStore } from '../_shared/store';
import type { LanguageSettingsValues } from './validation';

export const languageSettingsKey = ['settings', 'languages'] as const;

/**
 * 현재 값 — **한국어 하나만 켜져 있다.** 이 앱의 사실을 그대로 반영한 픽스처다
 * (영어를 켜 두면 화면은 '지원함' 이라 말하는데 번역이 없어 거짓말이 된다).
 */
const DEFAULT_LANGUAGE_SETTINGS: LanguageSettingsValues = {
  defaultLanguage: 'ko',
  supported: ['ko'],
  fallback: 'ko',
};

// TODO(backend): GET /api/settings/languages · PUT /api/settings/languages
//   PUT 요청: If-Match: <revision> + 바디 { defaultLanguage, supported[], fallback }
//   응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌 / 422 → 검증 실패
export const languageSettingsStore = createRevisionedStore<LanguageSettingsValues>(
  'languages',
  DEFAULT_LANGUAGE_SETTINGS,
  { updatedBy: '박관리', updatedAt: '2026-06-28T05:40:00.000Z' },
);

/** 충돌 다이얼로그가 짚을 항목 라벨 — 필드 키와 1:1 */
export const LANGUAGE_FIELD_LABELS: Readonly<Record<keyof LanguageSettingsValues, string>> = {
  defaultLanguage: '기본 언어',
  supported: '지원 언어',
  fallback: '폴백 언어',
};
