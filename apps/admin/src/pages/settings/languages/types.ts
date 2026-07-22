// 다국어 설정의 모델 (라우트: /settings/languages)
//
// ┌ 다국어는 번역이 아니라 **사이트 축**이다 ──────────────────────────────────┐
// │ 다국어 사이트를 여는 일은 문장을 옮기는 일이 아니다. 언어와 함께 지역·시간대·  │
// │ 통화·사이트명·도메인이 통째로 갈린다 — 한국어 사이트의 '2026. 7. 22 · 12,000원' │
// │ 은 미국 사이트에서 '7/22/2026 · $8.60' 이어야 하고, 그 둘은 번역기가 아니라    │
// │ **지역 설정**이 만든다.                                                     │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 통화·시간대는 **언어가 아니라 지역**에 붙는다 ─────────────────────────────┐
// │ 'en' 은 통화를 정하지 못한다 — 미국이면 USD, 영국이면 GBP, 호주면 AUD 다.     │
// │ 반대로 'zh' 하나에 CNY 를 매달면 대만·홍콩 사이트가 위안화로 값을 매긴다.      │
// │ 그래서 통화·시간대는 `REGIONS` 가 갖고, 로케일은 그것을 **참조만** 한다 —      │
// │ 로케일에 통화 칸을 두면 지역과 어긋난 값이 저장될 자리가 생긴다.               │
// └──────────────────────────────────────────────────────────────────────────┘
import type { StatusTone } from '../../../shared/ui';

/* ── 언어 ────────────────────────────────────────────────────────────────── */

interface LanguageDef {
  readonly id: string;
  readonly label: string;
  /** 그 언어 사용자가 보는 이름 — 언어 선택기는 자기 언어로 적힌 이름을 보여 줘야 한다 */
  readonly nativeLabel: string;
}

export const LANGUAGES = [
  { id: 'ko', label: '한국어', nativeLabel: '한국어' },
  { id: 'en', label: '영어', nativeLabel: 'English' },
  { id: 'ja', label: '일본어', nativeLabel: '日本語' },
  { id: 'zh', label: '중국어(간체)', nativeLabel: '简体中文' },
  { id: 'vi', label: '베트남어', nativeLabel: 'Tiếng Việt' },
] as const satisfies readonly LanguageDef[];

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export function languageLabel(id: string): string {
  return LANGUAGES.find((language) => language.id === id)?.label ?? id;
}

/* ── 지역 — 통화·시간대의 소유자 ─────────────────────────────────────────── */

interface RegionDef {
  readonly id: string;
  readonly label: string;
  /** ISO 4217 */
  readonly currency: string;
  readonly currencyLabel: string;
  /** IANA 시간대 */
  readonly timeZone: string;
}

export const REGIONS = [
  { id: 'KR', label: '대한민국', currency: 'KRW', currencyLabel: '원', timeZone: 'Asia/Seoul' },
  { id: 'US', label: '미국', currency: 'USD', currencyLabel: '달러', timeZone: 'America/New_York' },
  { id: 'JP', label: '일본', currency: 'JPY', currencyLabel: '엔', timeZone: 'Asia/Tokyo' },
  { id: 'CN', label: '중국', currency: 'CNY', currencyLabel: '위안', timeZone: 'Asia/Shanghai' },
  { id: 'TW', label: '대만', currency: 'TWD', currencyLabel: '대만달러', timeZone: 'Asia/Taipei' },
  { id: 'VN', label: '베트남', currency: 'VND', currencyLabel: '동', timeZone: 'Asia/Ho_Chi_Minh' },
  {
    id: 'SG',
    label: '싱가포르',
    currency: 'SGD',
    currencyLabel: '싱가포르달러',
    timeZone: 'Asia/Singapore',
  },
] as const satisfies readonly RegionDef[];

export type RegionId = (typeof REGIONS)[number]['id'];

/** 지역 정의 — 없으면 undefined(통화를 지어내지 않는다) */
export function regionOf(id: string): RegionDef | undefined {
  return REGIONS.find((region) => region.id === id);
}

/* ── URL 전략 — 하나만 고른다 ────────────────────────────────────────────── */

/**
 * 경로 접두(`/en/…`)와 서브도메인(`en.example.com`)은 **동시에 쓸 수 없다.**
 *
 * 둘 다 열어 두면 같은 문서가 두 주소로 존재하고, 검색엔진은 그것을 중복 문서로 본다 —
 * 어느 쪽도 제대로 색인되지 않는다. 그래서 전략은 사이트당 하나이고, 로케일마다 다르게
 * 고를 수 있는 값이 아니다.
 */
export type UrlStrategy = 'path-prefix' | 'subdomain';

export const URL_STRATEGIES: readonly {
  readonly id: UrlStrategy;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    id: 'path-prefix',
    label: '경로 접두',
    description: 'example.com/en/… — 도메인 하나로 운영하며 설정이 가장 단순합니다.',
  },
  {
    id: 'subdomain',
    label: '서브도메인',
    description: 'en.example.com — 지역별로 인프라·인증서를 나눠야 합니다.',
  },
];

export function isUrlStrategy(value: unknown): value is UrlStrategy {
  return value === 'path-prefix' || value === 'subdomain';
}

/* ── 로케일 ──────────────────────────────────────────────────────────────── */

/**
 * 사이트 한 벌 = 언어 × 지역.
 *
 * 통화·시간대 칸이 **없다** — 지역이 갖는다(머리말). 여기 두면 지역과 어긋난 값이 저장될
 * 자리가 생기고, 어긋난 날 어느 쪽이 사실인지 아무도 모른다.
 */
export interface LocaleEntry {
  /** 'ko-KR' — 언어와 지역에서 파생되지만 저장한다(참조 키라 안정적이어야 한다) */
  readonly id: string;
  readonly languageId: string;
  readonly regionId: string;
  /** 이 사이트의 이름 — 지역마다 다르게 쓰는 회사가 흔하다 */
  readonly siteName: string;
  /** 서브도메인 전략일 때의 호스트 접두('en'). 경로 접두 전략에서도 같은 값이 경로가 된다 */
  readonly urlKey: string;
  /** 공개 여부 — 꺼져 있으면 방문자에게 보이지 않는다 */
  readonly published: boolean;
}

export function localeIdOf(languageId: string, regionId: string): string {
  return `${languageId}-${regionId}`;
}

export function localeLabelOf(locale: LocaleEntry): string {
  const region = regionOf(locale.regionId);
  return `${languageLabel(locale.languageId)} · ${region?.label ?? locale.regionId}`;
}

/** 저장 문서 */
export interface LanguageSettingsDoc {
  /** 기본 언어 — 지울 수 없고, 미번역이 폴백하는 곳이다 */
  readonly defaultLocaleId: string;
  readonly urlStrategy: UrlStrategy;
  /** 공개 사이트의 기준 호스트 — URL 미리보기가 이것으로 만들어진다 */
  readonly baseHost: string;
  readonly locales: readonly LocaleEntry[];
}

/* ── 번역 상태 ───────────────────────────────────────────────────────────── */

/** 이 항목이 이 로케일에서 어떤 상태인가 — **저장하지 않고 파생한다** */
export type TranslationState = 'translated' | 'missing';

export function translationTone(state: TranslationState): StatusTone {
  return state === 'translated' ? 'success' : 'warning';
}

export function translationLabel(state: TranslationState): string {
  return state === 'translated' ? '번역됨' : '미번역';
}

/** 번역 원장 — `${entryId} ${localeId}` 를 키로 하는 집합. 있으면 번역된 것이다 */
export type TranslationIndex = ReadonlySet<string>;

export function translationKey(entryId: string, localeId: string): string {
  return `${entryId} ${localeId}`;
}
