/**
 * Design System/Templates/Settings/Languages — 다국어 설정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/settings/languages` → 메뉴 en = "Settings"(시스템 설정),
 * 화면 en = "Languages" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Settings 그룹의
 * `['/settings/languages', '다국어 설정', 'Languages']`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/languages/LanguagesPage.tsx
 * (라우트 /settings/languages) 와 그 모델(types.ts) · 규칙(rules.ts) · 데이터(data-source.ts).
 *
 * [다국어는 번역이 아니라 **사이트 축**이다] 다국어 사이트를 여는 일은 문장을 옮기는 일이
 * 아니다. 언어와 함께 지역·시간대·통화·사이트명·도메인이 통째로 갈린다 — 한국어 사이트의
 * '2026. 7. 22 · 12,000원' 은 미국 사이트에서 '7/22/2026 · $8.60' 이어야 하고, 그 둘은 번역기가
 * 아니라 **지역 설정**이 만든다.
 *
 * [통화·시간대 입력 칸이 없는 것이 실수가 아니다] 그 둘은 **지역**이 갖는다. 'en' 하나로는 USD 인지
 * GBP 인지 정할 수 없고, 반대로 'zh' 하나에 CNY 를 매달면 대만·홍콩 사이트가 위안화로 값을 매긴다.
 * 로케일에 통화 칸을 두면 지역과 어긋난 값이 저장될 자리가 생기고, 어긋난 날 어느 쪽이 사실인지
 * 아무도 모른다.
 *
 * [URL 전략은 사이트당 하나다] 경로 접두(`/en/…`)와 서브도메인(`en.example.com`)을 동시에 열면
 * 같은 문서가 두 주소로 존재하고 검색엔진이 중복으로 본다 — 어느 쪽도 제대로 색인되지 않는다.
 *
 * [기본 언어는 지울 수 없다] 미번역 항목이 돌아갈 곳이기 때문이다. 비공개 언어는 기본이 될 수
 * 없다 — 미번역 항목이 방문자에게 보이지 않는 언어로 떨어진다.
 *
 * [번역 대상 목록을 못 읽으면 '0건' 이 아니다] 미배선이면 **모른다**고 말한다. 0건이라고 적으면
 * 운영자는 번역이 끝났다고 판단한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   주소 전략(하나만)         → RadioCardGroup
 *   기준 도메인               → FormField + 토큰 <input>
 *   로케일 행(사이트명·URL 키)  → 토큰 <input> ×2 (aria-label 로 행을 구분)
 *   기본 언어 / 공개 배지       → StatusBadge (info · success/neutral)
 *   URL 미리보기              → 토큰 <span>(code 타이포)
 *   공개 토글                 → ToggleSwitch
 *   기본으로 / 삭제            → Button(secondary · ghost) + Icon(trash)
 *   언어·지역 추가            → SelectField ×2 + Button(secondary) + Icon(plus-circle)
 *   규칙 거절 · 읽기 전용        → Alert(danger · info)
 *   번역 현황 표              → Table + StatusBadge(번역됨 · 미번역)
 *   번역 대상 판정 불가         → Alert(warning)
 *   저장 확인                 → ConfirmDialog(intent=update)
 *   최초 로드                 → Skeleton
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Icon,
  RadioCardGroup,
  SelectField,
  Skeleton,
  StatusBadge,
  Table,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Languages',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 언어 · 지역(실화면 types.ts 미러) ─────────────────────────────────────────────────────── */

interface LanguageDef {
  readonly id: string;
  readonly label: string;
  /** 그 언어 사용자가 보는 이름 — 언어 선택기는 자기 언어로 적힌 이름을 보여 줘야 한다 */
  readonly nativeLabel: string;
}

const LANGUAGES: readonly LanguageDef[] = [
  { id: 'ko', label: '한국어', nativeLabel: '한국어' },
  { id: 'en', label: '영어', nativeLabel: 'English' },
  { id: 'ja', label: '일본어', nativeLabel: '日本語' },
  { id: 'zh', label: '중국어(간체)', nativeLabel: '简体中文' },
  { id: 'vi', label: '베트남어', nativeLabel: 'Tiếng Việt' },
];

const languageLabel = (id: string): string =>
  LANGUAGES.find((language) => language.id === id)?.label ?? id;

/** 통화·시간대의 소유자는 **지역**이다(머리말) */
interface RegionDef {
  readonly id: string;
  readonly label: string;
  /** ISO 4217 */
  readonly currency: string;
  readonly currencyLabel: string;
  /** IANA 시간대 */
  readonly timeZone: string;
}

const REGIONS: readonly RegionDef[] = [
  { id: 'KR', label: '대한민국', currency: 'KRW', currencyLabel: '원', timeZone: 'Asia/Seoul' },
  { id: 'US', label: '미국', currency: 'USD', currencyLabel: '달러', timeZone: 'America/New_York' },
  { id: 'JP', label: '일본', currency: 'JPY', currencyLabel: '엔', timeZone: 'Asia/Tokyo' },
  { id: 'CN', label: '중국', currency: 'CNY', currencyLabel: '위안', timeZone: 'Asia/Shanghai' },
  { id: 'TW', label: '대만', currency: 'TWD', currencyLabel: '대만달러', timeZone: 'Asia/Taipei' },
  { id: 'VN', label: '베트남', currency: 'VND', currencyLabel: '동', timeZone: 'Asia/Ho_Chi_Minh' },
];

const regionOf = (id: string): RegionDef | undefined => REGIONS.find((region) => region.id === id);

/** 통화·시간대는 여기서 고칠 수 있는 값이 아니다 — 지역에서 읽어 온 사실을 그대로 적는다 */
function regionSummaryOf(regionId: string): string | null {
  const region = regionOf(regionId);
  if (region === undefined) return null;
  return `${region.currencyLabel} (${region.currency}) · ${region.timeZone}`;
}

type UrlStrategy = 'path-prefix' | 'subdomain';

const URL_STRATEGIES: readonly {
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

const isUrlStrategy = (value: string): value is UrlStrategy =>
  value === 'path-prefix' || value === 'subdomain';

/**
 * 사이트 한 벌 = 언어 × 지역. 통화·시간대 칸이 **없다** — 지역이 갖는다(머리말).
 */
interface LocaleEntry {
  /** 'ko-KR' — 언어와 지역에서 파생되지만 저장한다(참조 키라 안정적이어야 한다) */
  readonly id: string;
  readonly languageId: string;
  readonly regionId: string;
  /** 이 사이트의 이름 — 지역마다 다르게 쓰는 회사가 흔하다 */
  readonly siteName: string;
  /** 서브도메인 전략일 때의 호스트 접두('en'). 경로 접두 전략에서도 같은 값이 경로가 된다 */
  readonly urlKey: string;
  readonly published: boolean;
}

interface LanguageSettingsDoc {
  /** 기본 언어 — 지울 수 없고, 미번역이 폴백하는 곳이다 */
  readonly defaultLocaleId: string;
  readonly urlStrategy: UrlStrategy;
  readonly baseHost: string;
  readonly locales: readonly LocaleEntry[];
}

const localeIdOf = (languageId: string, regionId: string): string => `${languageId}-${regionId}`;

const localeLabelOf = (locale: LocaleEntry): string =>
  `${languageLabel(locale.languageId)} · ${regionOf(locale.regionId)?.label ?? locale.regionId}`;

/* ── 순수 규칙(실화면 rules.ts 미러 — 버튼과 저장이 같은 술어를 읽는다) ────────────────────── */

function removeLocaleBlock(doc: LanguageSettingsDoc, localeId: string): string | null {
  if (doc.defaultLocaleId === localeId) {
    return '기본 언어는 삭제할 수 없습니다. 번역되지 않은 항목이 돌아갈 곳이 없어집니다 — 다른 언어를 먼저 기본으로 지정하세요.';
  }
  if (doc.locales.length <= 1) return '언어를 하나도 남기지 않을 수는 없습니다.';
  return null;
}

function setDefaultBlock(locale: LocaleEntry): string | null {
  if (!locale.published) {
    return '비공개 언어는 기본 언어가 될 수 없습니다. 번역되지 않은 항목이 방문자에게 보이지 않는 언어로 떨어집니다.';
  }
  return null;
}

function addLocaleBlock(
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

const URL_KEY_RE = /^[a-z0-9-]+$/;

function saveBlock(doc: LanguageSettingsDoc): string | null {
  if (doc.baseHost.trim() === '') {
    return '기준 도메인을 입력하세요. 언어별 주소를 만들 수 없습니다.';
  }
  const current = doc.locales.find((locale) => locale.id === doc.defaultLocaleId);
  if (current === undefined) return '기본 언어가 목록에 없습니다. 기본 언어를 다시 지정하세요.';
  const blocked = setDefaultBlock(current);
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

/** URL 미리보기 — 파생값이므로 저장하지 않는다 */
function localeUrlOf(
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

/** 이 항목이 이 로케일에서 어떤 상태인가 — **저장하지 않고 파생한다** */
type TranslationState = 'translated' | 'missing';

const translationTone = (state: TranslationState): StatusBadgeTone =>
  state === 'translated' ? 'success' : 'warning';

const translationLabel = (state: TranslationState): string =>
  state === 'translated' ? '번역됨' : '미번역';

/* ── 데모 데이터(실화면 data-source.ts 미러) ───────────────────────────────────────────────── */

const SINGLE_LOCALE_DOC: LanguageSettingsDoc = {
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

const MULTI_LOCALE_DOC: LanguageSettingsDoc = {
  ...SINGLE_LOCALE_DOC,
  locales: [
    ...SINGLE_LOCALE_DOC.locales,
    {
      id: 'en-US',
      languageId: 'en',
      regionId: 'US',
      siteName: 'Spaceplanning (sample)',
      urlKey: 'en',
      published: true,
    },
    {
      id: 'ja-JP',
      languageId: 'ja',
      regionId: 'JP',
      siteName: 'スペースプランニング(例)',
      urlKey: 'ja',
      // 비공개 — 기본 언어가 될 수 없는 상태다(setDefaultBlock)
      published: false,
    },
  ],
};

/** 서브도메인 전략 — 같은 로케일이 다른 주소를 갖는다는 사실이 미리보기에서 보인다 */
const SUBDOMAIN_DOC: LanguageSettingsDoc = { ...MULTI_LOCALE_DOC, urlStrategy: 'subdomain' };

/** URL 키가 겹친 상태 — 저장 경로가 마지막으로 거절하는 경우 */
const DUPLICATE_KEY_DOC: LanguageSettingsDoc = {
  ...MULTI_LOCALE_DOC,
  locales: MULTI_LOCALE_DOC.locales.map((locale) =>
    locale.id === 'ja-JP' ? { ...locale, urlKey: 'en' } : locale,
  ),
};

/** 번역 대상 — 발행된 것만이다. 초안을 번역하면 발행 직전에 원문이 바뀌어 그 작업이 버려진다 */
interface TranslatableEntry {
  readonly id: string;
  readonly kindLabel: string;
  readonly title: string;
}

const DEMO_ENTRIES: readonly TranslatableEntry[] = [
  { id: 'notice-1', kindLabel: '공지사항', title: '서비스 점검 안내' },
  { id: 'notice-2', kindLabel: '공지사항', title: '개인정보 처리방침 개정 안내' },
  { id: 'faq-1', kindLabel: 'FAQ', title: '견적은 어떻게 요청하나요?' },
  { id: 'faq-2', kindLabel: 'FAQ', title: '시공 기간은 얼마나 걸리나요?' },
  { id: 'page-1', kindLabel: '페이지', title: '사업영역' },
];

/** 번역 원장 — `${entryId} ${localeId}` 를 키로 하는 집합. 있으면 번역된 것이다 */
const TRANSLATION_INDEX: ReadonlySet<string> = new Set([
  'notice-1 en-US',
  'notice-1 ja-JP',
  'faq-2 en-US',
]);

const AUDIT = { updatedBy: '김운영', updatedAt: '2026-07-02 13:00' };

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 다국어 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const fmt = (value: number): string => value.toLocaleString('ko-KR');

const TRANSLATION_COLUMNS: TableProps['columns'] = [
  { id: 'kind', header: '종류', nowrap: true },
  { id: 'title', header: '제목' },
  { id: 'state', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.subtle'),
};

const infoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const controlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const addRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const urlStyle: CSSProperties = {
  ...typography('typography.code.md'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const controlStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface LanguagesScreenProps {
  readonly seed?: LanguageSettingsDoc;
  readonly canUpdate?: boolean;
  readonly loading?: boolean;
  /** 번역 대상 조회기가 배선되지 않은 상태 — null 은 '0건' 이 아니라 '모른다' 다 */
  readonly entriesUnavailable?: boolean;
  readonly confirmOpen?: boolean;
}

function LanguagesScreen({
  seed = MULTI_LOCALE_DOC,
  canUpdate = true,
  loading = false,
  entriesUnavailable = false,
  confirmOpen = false,
}: LanguagesScreenProps) {
  const [doc, setDoc] = useState<LanguageSettingsDoc>(seed);
  const [dirty, setDirty] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const [pending, setPending] = useState<LanguageSettingsDoc | null>(confirmOpen ? seed : null);
  const [newLanguage, setNewLanguage] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [viewLocaleId, setViewLocaleId] = useState('');

  const patch = (next: Partial<LanguageSettingsDoc>): void => {
    setDoc((current) => ({ ...current, ...next }));
    setDirty(true);
    setRejected(null);
  };

  const patchLocale = (localeId: string, next: Partial<LocaleEntry>): void => {
    setDoc((current) => ({
      ...current,
      locales: current.locales.map((locale) =>
        locale.id === localeId ? { ...locale, ...next } : locale,
      ),
    }));
    setDirty(true);
    setRejected(null);
  };

  const addLocale = (): void => {
    const block = addLocaleBlock(doc.locales, newLanguage, newRegion);
    if (block !== null) {
      setRejected(block);
      return;
    }
    patch({
      locales: [
        ...doc.locales,
        {
          id: localeIdOf(newLanguage, newRegion),
          languageId: newLanguage,
          regionId: newRegion,
          siteName: '',
          urlKey: newLanguage,
          published: false,
        },
      ],
    });
    setNewLanguage('');
    setNewRegion('');
  };

  const removeLocale = (localeId: string): void => {
    const block = removeLocaleBlock(doc, localeId);
    if (block !== null) {
      setRejected(block);
      return;
    }
    patch({ locales: doc.locales.filter((locale) => locale.id !== localeId) });
  };

  const makeDefault = (locale: LocaleEntry): void => {
    const block = setDefaultBlock(locale);
    if (block !== null) {
      setRejected(block);
      return;
    }
    patch({ defaultLocaleId: locale.id });
  };

  const submit = (): void => {
    const block = saveBlock(doc);
    if (block !== null) {
      setRejected(block);
      return;
    }
    setRejected(null);
    setPending(doc);
  };

  const entries = entriesUnavailable ? null : DEMO_ENTRIES;

  const selectedLocaleId =
    viewLocaleId !== '' && doc.locales.some((locale) => locale.id === viewLocaleId)
      ? viewLocaleId
      : (doc.locales.find((locale) => locale.id !== doc.defaultLocaleId)?.id ?? '');

  const rows =
    entries === null || selectedLocaleId === ''
      ? []
      : entries.map((entry) => ({
          entry,
          state: TRANSLATION_INDEX.has(`${entry.id} ${selectedLocaleId}`)
            ? ('translated' as TranslationState)
            : ('missing' as TranslationState),
        }));

  const missingCount = rows.filter((row) => row.state === 'missing').length;

  const translationRows: TableProps['rows'] = rows.map((row) => ({
    id: row.entry.id,
    cells: [
      <span key="kind">{row.entry.kindLabel}</span>,
      <span key="title">{row.entry.title}</span>,
      <StatusBadge
        key="state"
        tone={translationTone(row.state)}
        label={translationLabel(row.state)}
      />,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>다국어 설정</h1>
      <p style={descriptionStyle}>
        언어와 지역, 기본 언어, 주소 전략을 정합니다. 통화·시간대는 언어가 아니라{' '}
        <strong>지역</strong>이 갖습니다 — 같은 영어라도 미국과 영국의 통화가 다릅니다.
      </p>

      {rejected !== null && <Alert tone="danger">{rejected}</Alert>}
      {!canUpdate && <Alert tone="info">{READ_ONLY_NOTICE}</Alert>}

      {loading ? (
        <div style={skeletonBodyStyle} aria-busy="true" aria-label="다국어 설정을 불러오는 중">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={`row-${String(row)}`} />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <div style={cardBodyStyle}>
              <h2 style={cardTitleStyle}>주소 전략</h2>
              <p style={hintStyle}>
                하나만 고릅니다. 둘 다 열어 두면 같은 문서가 두 주소로 존재해 검색엔진이 중복으로
                봅니다.
              </p>

              <RadioCardGroup
                legend="주소 전략"
                name="languages-url-strategy"
                value={doc.urlStrategy}
                options={URL_STRATEGIES.map((strategy) => ({
                  value: strategy.id,
                  label: strategy.label,
                  description: strategy.description,
                }))}
                disabled={!canUpdate}
                onChange={(value) => {
                  if (isUrlStrategy(value)) patch({ urlStrategy: value });
                }}
              />

              <FormField
                htmlFor="languages-base-host"
                label="기준 도메인"
                required
                hint="언어별 주소가 이것으로 만들어집니다."
              >
                <input
                  id="languages-base-host"
                  type="text"
                  style={controlStyle}
                  value={doc.baseHost}
                  disabled={!canUpdate}
                  placeholder="example.com"
                  onChange={(event) => patch({ baseHost: event.target.value })}
                />
              </FormField>
            </div>
          </Card>

          <Card>
            <div style={cardBodyStyle}>
              <h2 style={cardTitleStyle}>언어 · 지역</h2>
              <p style={hintStyle}>
                기본 언어는 번역되지 않은 항목이 돌아가는 곳입니다 — 지울 수 없습니다.
              </p>

              {doc.locales.map((locale) => {
                const isDefault = locale.id === doc.defaultLocaleId;
                const summary = regionSummaryOf(locale.regionId);
                return (
                  <div key={locale.id} style={rowStyle}>
                    <span style={infoStyle}>
                      <span style={titleRowStyle}>
                        <span style={labelStyle}>{localeLabelOf(locale)}</span>
                        {isDefault && <StatusBadge tone="info" label="기본 언어" />}
                        <StatusBadge
                          tone={locale.published ? 'success' : 'neutral'}
                          label={locale.published ? '공개' : '비공개'}
                        />
                      </span>
                      {/* 통화·시간대는 지역에서 온다 — 여기서 고칠 수 있는 값이 아니다 */}
                      <span style={hintStyle}>{summary ?? '지역 정보를 찾을 수 없습니다.'}</span>
                      <span style={urlStyle}>
                        {localeUrlOf(doc.urlStrategy, doc.baseHost, locale, isDefault)}
                      </span>

                      <input
                        type="text"
                        aria-label={`${localeLabelOf(locale)} 사이트명`}
                        style={controlStyle}
                        value={locale.siteName}
                        disabled={!canUpdate}
                        placeholder="이 지역에서 쓸 사이트명"
                        onChange={(event) =>
                          patchLocale(locale.id, { siteName: event.target.value })
                        }
                      />
                      <input
                        type="text"
                        aria-label={`${localeLabelOf(locale)} URL 키`}
                        style={controlStyle}
                        value={locale.urlKey}
                        disabled={!canUpdate}
                        placeholder="en"
                        onChange={(event) => patchLocale(locale.id, { urlKey: event.target.value })}
                      />
                    </span>

                    <span style={controlsStyle}>
                      <ToggleSwitch
                        checked={locale.published}
                        label={`${localeLabelOf(locale)} 공개`}
                        onLabel="공개"
                        offLabel="비공개"
                        disabled={!canUpdate}
                        onChange={(next) => patchLocale(locale.id, { published: next })}
                      />
                      {canUpdate && !isDefault && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => makeDefault(locale)}>
                            기본으로
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={<Icon name="trash" />}
                            onClick={() => removeLocale(locale.id)}
                          >
                            삭제
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}

              {canUpdate && (
                <div style={addRowStyle}>
                  <span style={selectWrapStyle}>
                    <SelectField
                      value={newLanguage}
                      aria-label="추가할 언어"
                      onChange={(event) => setNewLanguage(event.target.value)}
                    >
                      <option value="">언어 선택</option>
                      {LANGUAGES.map((language) => (
                        <option key={language.id} value={language.id}>
                          {`${language.label} (${language.nativeLabel})`}
                        </option>
                      ))}
                    </SelectField>
                  </span>
                  <span style={selectWrapStyle}>
                    <SelectField
                      value={newRegion}
                      aria-label="추가할 지역"
                      onChange={(event) => setNewRegion(event.target.value)}
                    >
                      <option value="">지역 선택</option>
                      {REGIONS.map((region) => (
                        <option key={region.id} value={region.id}>
                          {`${region.label} · ${region.currency} · ${region.timeZone}`}
                        </option>
                      ))}
                    </SelectField>
                  </span>
                  <Button
                    variant="secondary"
                    size="md"
                    iconLeft={<Icon name="plus-circle" />}
                    onClick={addLocale}
                  >
                    언어 추가
                  </Button>
                </div>
              )}

              {canUpdate && (
                <div style={actionsStyle}>
                  <p style={hintStyle}>
                    {dirty ? '저장하지 않은 변경 사항이 있습니다.' : '변경 사항이 없습니다.'}
                  </p>
                  <Button variant="primary" size="md" disabled={!dirty} onClick={submit}>
                    저장
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div style={cardBodyStyle}>
              <h2 style={cardTitleStyle}>번역 현황</h2>
              <p style={hintStyle}>
                발행된 항목만 번역 대상입니다. 초안을 번역하면 발행 직전에 원문이 바뀌어 그 작업이
                버려집니다. 미번역 항목은 <strong>기본 언어로 폴백</strong>합니다.
              </p>

              {entries === null ? (
                <Alert tone="warning">
                  번역 대상 목록을 확인할 수 없어 현황을 <strong>표시하지 못했습니다</strong>.
                  대상이 없다는 뜻이 아닙니다 — 콘텐츠 연동을 확인해 주세요.
                </Alert>
              ) : selectedLocaleId === '' ? (
                <p style={hintStyle}>기본 언어 외의 언어를 추가하면 번역 현황이 나타납니다.</p>
              ) : (
                <>
                  <span style={selectWrapStyle}>
                    <SelectField
                      value={selectedLocaleId}
                      aria-label="번역 현황을 볼 언어"
                      onChange={(event) => setViewLocaleId(event.target.value)}
                    >
                      {doc.locales
                        .filter((locale) => locale.id !== doc.defaultLocaleId)
                        .map((locale) => (
                          <option key={locale.id} value={locale.id}>
                            {localeLabelOf(locale)}
                          </option>
                        ))}
                    </SelectField>
                  </span>

                  <p style={hintStyle}>
                    {`전체 ${fmt(rows.length)}건 · 미번역 ${fmt(missingCount)}건`}
                  </p>

                  <div style={tableScrollStyle}>
                    <Table
                      caption="번역 현황 — 미번역 항목은 기본 언어의 제목이 그대로 보입니다."
                      columns={TRANSLATION_COLUMNS}
                      rows={translationRows}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>

          <p style={hintStyle}>{`마지막 변경: ${AUDIT.updatedBy} · ${AUDIT.updatedAt}`}</p>
        </>
      )}

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="다국어 설정 저장"
          message="저장하는 즉시 공개된 언어의 주소가 바뀝니다. 기존 주소로 들어온 링크는 더 이상 같은 문서를 가리키지 않을 수 있습니다. 저장할까요?"
          onConfirm={() => {
            setDirty(false);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 한국어(기본·공개) · 영어(공개) · 일본어(비공개). 통화·시간대는 입력 칸이 아니라
 * **지역에서 읽어 온 사실**로 적히고, URL 미리보기는 전략 + 기준 도메인에서 파생된다.
 */
export const Default: Story = {
  render: () => <LanguagesScreen />,
};

/** 최초 로드: 카드 자리에 스켈레톤 — 저장 컨트롤은 그동안 나오지 않는다(STATE-01) */
export const Loading: Story = {
  render: () => <LanguagesScreen loading />,
};

/** 언어가 하나뿐: 번역 현황이 나올 자리가 아직 없다 — 없는 표를 빈 채로 그리지 않는다 */
export const SingleLocale: Story = {
  render: () => <LanguagesScreen seed={SINGLE_LOCALE_DOC} />,
};

/** 서브도메인 전략: 같은 로케일이 다른 주소를 갖는다 — 미리보기가 그 차이를 그 자리에서 보여 준다 */
export const SubdomainStrategy: Story = {
  render: () => <LanguagesScreen seed={SUBDOMAIN_DOC} />,
};

/**
 * URL 키 중복: 같은 주소를 두 언어가 나눠 가질 수 없다 — 저장 경로가 마지막으로 거절하고,
 * 그 사유가 화면 상단에 그대로 선다(저장을 눌러야 나타난다).
 */
export const DuplicateUrlKey: Story = {
  render: () => <LanguagesScreen seed={DUPLICATE_KEY_DOC} />,
};

/**
 * 번역 대상 미배선: '미번역 0건' 이 아니라 **표시하지 못했다**고 말한다. 0건이라고 적으면
 * 운영자는 번역이 끝났다고 판단한다.
 */
export const TranslationCatalogUnavailable: Story = {
  render: () => <LanguagesScreen entriesUnavailable />,
};

/** 저장 확인: 공개된 언어의 주소가 바뀐다 — 클릭 한 번으로 바뀌지 않게 한 번 더 묻는다 */
export const SaveConfirm: Story = {
  render: () => <LanguagesScreen confirmOpen />,
};

/** 조회 권한만: 입력이 전부 잠기고 저장·추가·삭제 컨트롤 자체가 없다(EXC-03) */
export const ReadOnly: Story = {
  render: () => <LanguagesScreen canUpdate={false} />,
};
