// 다국어 설정의 순수 규칙 (라우트: /settings/languages)
//
// [가드는 사유를 돌려준다] 버튼의 disabled 와 저장의 거절이 **같은 술어**를 읽는다. 이유를
// 말하지 않는 disabled 는 운영자에게 '고장' 으로 보인다.
//
// [파생값을 저장하지 않는다] 미번역 여부·폴백 문자열·URL 미리보기는 전부 계산이다.
import type { TranslatableEntry } from '../../../shared/domain/translatable-catalog';
import { localeIdOf, regionOf, translationKey } from './types';
import type {
  LanguageSettingsDoc,
  LocaleEntry,
  TranslationIndex,
  TranslationState,
  UrlStrategy,
} from './types';

/* ── ① 기본 언어는 지울 수 없다 ──────────────────────────────────────────── */

/**
 * 이 로케일을 지울 수 없는 이유 — 지울 수 있으면 null.
 *
 * 기본 언어는 **미번역이 떨어지는 바닥**이다. 지우면 번역이 없는 항목이 갈 곳을 잃고,
 * 방문자는 빈 페이지를 본다. 지우기 전에 다른 로케일을 기본으로 세워야 한다.
 */
export function removeLocaleBlock(doc: LanguageSettingsDoc, localeId: string): string | null {
  if (doc.defaultLocaleId === localeId) {
    return '기본 언어는 삭제할 수 없습니다. 번역되지 않은 항목이 돌아갈 곳이 없어집니다 — 다른 언어를 먼저 기본으로 지정하세요.';
  }
  if (doc.locales.length <= 1) {
    return '언어를 하나도 남기지 않을 수는 없습니다.';
  }
  return null;
}

/**
 * 이 로케일을 기본으로 세울 수 없는 이유 — 세울 수 있으면 null.
 *
 * 비공개 로케일을 기본으로 세우면 폴백 대상이 방문자에게 보이지 않는 사이트가 된다 —
 * 그 순간 미번역 항목은 어디에서도 읽을 수 없다.
 */
export function setDefaultBlock(locale: LocaleEntry): string | null {
  if (!locale.published) {
    return '비공개 언어는 기본 언어가 될 수 없습니다. 번역되지 않은 항목이 방문자에게 보이지 않는 언어로 떨어집니다.';
  }
  return null;
}

/* ── 추가 ────────────────────────────────────────────────────────────────── */

/** 이미 있는 언어×지역 조합인가 — 있으면 사유, 없으면 null */
export function addLocaleBlock(
  locales: readonly LocaleEntry[],
  languageId: string,
  regionId: string,
): string | null {
  if (languageId === '' || regionId === '') return '언어와 지역을 모두 고르세요.';
  if (locales.some((locale) => locale.id === localeIdOf(languageId, regionId))) {
    return '이미 추가된 언어·지역 조합입니다.';
  }
  return null;
}

/* ── ④ URL 전략 ──────────────────────────────────────────────────────────── */

const URL_KEY_RE = /^[a-z0-9-]+$/;

/**
 * 저장 전 마지막 관문 — 전략과 로케일이 서로 맞는가.
 *
 * 서브도메인 전략에서 urlKey 가 비면 그 로케일은 **주소를 갖지 못한다**. 저장은 되는데 열리지
 * 않는 사이트가 생기고, 그 사실은 방문자가 404 를 만나야 알려진다.
 */
export function saveBlock(doc: LanguageSettingsDoc): string | null {
  if (doc.baseHost.trim() === '') {
    return '기준 도메인을 입력하세요. 언어별 주소를 만들 수 없습니다.';
  }

  const withoutDefault = doc.locales.find((locale) => locale.id === doc.defaultLocaleId);
  if (withoutDefault === undefined) {
    return '기본 언어가 목록에 없습니다. 기본 언어를 다시 지정하세요.';
  }

  const blocked = setDefaultBlock(withoutDefault);
  if (blocked !== null) return blocked;

  for (const locale of doc.locales) {
    const key = locale.urlKey.trim();
    if (key === '' || !URL_KEY_RE.test(key)) {
      return `‘${locale.id}’ 의 URL 키가 올바르지 않습니다. 영문 소문자·숫자·하이픈만 쓸 수 있습니다.`;
    }
  }

  const keys = doc.locales.map((locale) => locale.urlKey.trim());
  const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
  if (duplicate !== undefined) {
    return `URL 키 ‘${duplicate}’ 가 두 번 쓰였습니다. 같은 주소를 두 언어가 나눠 가질 수 없습니다.`;
  }

  return null;
}

/**
 * 이 로케일의 공개 주소 — 전략 하나만 반영한다.
 *
 * 기본 언어의 경로 접두는 붙이지 않는다: `example.com` 과 `example.com/ko` 가 같은 문서를
 * 가리키면 중복 색인이 되고, 그것이 이 앱이 전략을 하나만 고르게 한 이유와 같은 문제다.
 */
export function localeUrlOf(
  strategy: UrlStrategy,
  baseHost: string,
  locale: LocaleEntry,
  isDefault: boolean,
): string {
  const host = baseHost
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const key = locale.urlKey.trim();

  if (strategy === 'subdomain') {
    return isDefault ? `https://${host}/` : `https://${key}.${host}/`;
  }
  return isDefault ? `https://${host}/` : `https://${host}/${key}/`;
}

/* ── ②⑤ 번역 대상과 폴백 ────────────────────────────────────────────────── */

export interface TranslationRow {
  readonly entryId: string;
  readonly kindLabel: string;
  /** 이 로케일에서 실제로 보이는 제목 — 미번역이면 기본 언어의 제목이 그대로 온다 */
  readonly title: string;
  readonly state: TranslationState;
  readonly publishedAt: string;
}

/**
 * 한 로케일의 번역 현황 — **발행된 항목만** 들어온다(조회기 계약).
 *
 * 미번역이면 기본 언어의 제목을 그대로 쓰고 상태를 'missing' 으로 남긴다. 빈 칸으로 두지
 * 않는 이유: 방문자에게도 폴백이 보이기 때문이다. 화면이 빈 칸을 보여 주면 운영자는 실제
 * 사이트도 비어 있다고 믿는다.
 */
export function translationRowsOf(
  entries: readonly TranslatableEntry[],
  localeId: string,
  index: TranslationIndex,
): readonly TranslationRow[] {
  return entries.map((entry) => ({
    entryId: entry.id,
    kindLabel: entry.kindLabel,
    title: entry.title,
    state: index.has(translationKey(entry.id, localeId)) ? 'translated' : 'missing',
    publishedAt: entry.publishedAt,
  }));
}

/** 미번역 수 — **파생값이다(저장하지 않는다)** */
export function missingCountOf(rows: readonly TranslationRow[]): number {
  return rows.filter((row) => row.state === 'missing').length;
}

/* ── 표시 보조 ───────────────────────────────────────────────────────────── */

/** '원 (KRW) · Asia/Seoul' — 지역이 없으면 null(통화를 지어내지 않는다) */
export function regionSummaryOf(regionId: string): string | null {
  const region = regionOf(regionId);
  if (region === undefined) return null;
  return `${region.currencyLabel} (${region.currency}) · ${region.timeZone}`;
}
