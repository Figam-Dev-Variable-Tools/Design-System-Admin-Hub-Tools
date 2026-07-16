// 언어 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// ┌ 이 화면이 하는 일과 하지 않는 일 ─────────────────────────────────────────┐
// │ **한다**: 기본 언어 · 지원 언어 목록 · 폴백 언어를 정해서 저장한다.           │
// │ **하지 않는다**: 실제 번역을 적용하지 않는다.                                │
// │                                                                          │
// │ 이 앱은 **한국어 단일**이다. i18n 라이브러리(i18next·react-intl)를 들이지     │
// │ 않는다 — 지금 들이면 번들과 모든 문자열 호출부가 바뀌는데, 정작 번역할 두 번째  │
// │ 언어가 없다. 그래서 설정만 모델링하고, 적용은 심으로 남긴다.                   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// TODO(lib): i18n — 두 번째 로케일이 실제로 필요해지는 시점에 라이브러리를 도입한다.
//   그때 이 모델이 라이브러리 설정의 입력이 된다:
//     defaultLanguage → i18n.language (초기 로케일)
//     supported       → i18n.supportedLngs
//     fallback        → i18n.fallbackLng (번역 키가 빠졌을 때 대신 읽을 로케일)
//   문자열 추출(EXC-17: named interpolation whole string)이 선행 조건이다 — 문장을 조각내
//   이어 붙인 copy 가 남아 있으면 추출이 기계적으로 되지 않는다.
import * as z from 'zod/mini';

/** 지원 후보 로케일 — BCP 47 태그를 그대로 쓴다(라이브러리가 붙어도 그대로 넘어간다) */
const LANGUAGE_CODES = ['ko', 'en', 'ja', 'zh-CN'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

interface LanguageMeta {
  readonly code: LanguageCode;
  /** 운영자가 읽는 이름 */
  readonly label: string;
  /** 그 언어 화자가 읽는 이름 — 목록에서 무엇을 켜는지 오해가 없게 함께 보인다 */
  readonly native: string;
}

export const LANGUAGE_META: readonly LanguageMeta[] = [
  { code: 'ko', label: '한국어', native: '한국어' },
  { code: 'en', label: '영어', native: 'English' },
  { code: 'ja', label: '일본어', native: '日本語' },
  { code: 'zh-CN', label: '중국어(간체)', native: '简体中文' },
];

export function languageLabel(code: LanguageCode): string {
  return LANGUAGE_META.find((meta) => meta.code === code)?.label ?? code;
}

export const languageSettingsSchema = z
  .object({
    defaultLanguage: z.enum(LANGUAGE_CODES),
    /** 사이트가 노출할 언어. 기본 언어와 폴백은 반드시 이 안에 있어야 한다 */
    supported: z.array(z.enum(LANGUAGE_CODES)),
    fallback: z.enum(LANGUAGE_CODES),
  })
  .check((ctx) => {
    const draft = ctx.value;

    // 지원 언어가 하나도 없으면 사이트가 아무 언어로도 뜨지 않는다
    if (draft.supported.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: draft.supported,
        path: ['supported'],
        message: '지원 언어를 하나 이상 선택하세요.',
      });
      return;
    }

    // 기본 언어를 지원하지 않으면 첫 화면을 그릴 로케일이 없다
    if (!draft.supported.includes(draft.defaultLanguage)) {
      ctx.issues.push({
        code: 'custom',
        input: draft.defaultLanguage,
        path: ['defaultLanguage'],
        message: '기본 언어는 지원 언어 목록에 있어야 합니다.',
      });
    }

    // 폴백을 지원하지 않으면 번역이 빠졌을 때 읽을 곳이 없다
    if (!draft.supported.includes(draft.fallback)) {
      ctx.issues.push({
        code: 'custom',
        input: draft.fallback,
        path: ['fallback'],
        message: '폴백 언어는 지원 언어 목록에 있어야 합니다.',
      });
    }
  });

export type LanguageSettingsValues = z.infer<typeof languageSettingsSchema>;
