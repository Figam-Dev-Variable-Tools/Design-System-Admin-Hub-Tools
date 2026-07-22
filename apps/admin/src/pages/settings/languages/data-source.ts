// 다국어 설정 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/languages/**)
//
// [백엔드 없음] 실제 HTTP 호출은 한 줄도 없다. 아래 // TODO(backend) 가 연동 지점이다.
// [실패/충돌 재현] /settings/languages?fail=load · ?fail=save · ?fail=conflict
import { createRevisionedStore } from '../_shared/store';
import { translationKey } from './types';
import type { LanguageSettingsDoc, TranslationIndex } from './types';

const SCOPE = 'languages';

export const languageSettingsKey = ['settings', 'languages'] as const;

/**
 * 초기값 — **한국어 하나뿐이다.**
 *
 * 픽스처로 5개 언어를 채워 두면 아무것도 설정하지 않은 계정이 '이미 다국어 사이트' 처럼 보인다.
 * 다국어는 켜는 순간 인프라·번역·운영이 함께 붙는 결정이라 기본값이 그것을 대신 내려 주면 안 된다.
 */
const DEFAULT_DOC: LanguageSettingsDoc = {
  defaultLocaleId: 'ko-KR',
  urlStrategy: 'path-prefix',
  baseHost: 'example.com',
  locales: [
    {
      id: 'ko-KR',
      languageId: 'ko',
      regionId: 'KR',
      siteName: '스페이스플래닝(예시)',
      urlKey: 'ko',
      published: true,
    },
  ],
};

// TODO(backend): GET/PUT /api/settings/languages
export const languageSettingsStore = createRevisionedStore<LanguageSettingsDoc>(
  SCOPE,
  DEFAULT_DOC,
  { updatedBy: '김운영', updatedAt: '2026-07-02T04:00:00.000Z' },
);

/** 충돌 다이얼로그가 '무엇이 달라졌는가' 를 짚을 때 쓰는 라벨 (../_shared/diff.ts) */
export const LANGUAGE_FIELD_LABELS: Readonly<Record<keyof LanguageSettingsDoc, string>> = {
  defaultLocaleId: '기본 언어',
  urlStrategy: 'URL 전략',
  baseHost: '기준 도메인',
  locales: '언어 목록',
};

/* ── 번역 원장 ───────────────────────────────────────────────────────────────
 *
 * 무엇이 번역돼 있는지의 사실. 픽스처는 '일부만 번역된' 상태를 담는다 — 전부 번역돼 있으면
 * 미번역 배지와 폴백 문구가 화면에 한 번도 나타나지 않아, 그 두 표면이 실제로 도는지 알 수 없다. */

const TRANSLATED: readonly (readonly [entryId: string, localeId: string])[] = [
  ['notice-1', 'en-US'],
  ['notice-1', 'ja-JP'],
  ['faq-2', 'en-US'],
];

// TODO(backend): GET /api/translations?localeId= — 번역 본문은 여기 오지 않는다.
//   이 화면이 답하는 질문은 '무엇이 아직 안 됐나' 이고, 본문 편집은 각 작성 화면의 일이다.
export function fetchTranslationIndex(): TranslationIndex {
  return new Set(TRANSLATED.map(([entryId, localeId]) => translationKey(entryId, localeId)));
}
