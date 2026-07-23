/**
 * Design System/Templates/Settings/Site Settings — 기본(사이트) 설정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['시스템 설정', 'Settings', '/settings', …]` · 화면 `['/settings/site', '사이트 설정', 'Site']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/settings/site/SiteSettingsPage.tsx (라우트 /settings/site) 와
 * 그 하위 조립(_shared/SettingsFormShell · components/SettingLayout · CountedInput · AssetField · Previews).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   설정 폼 껍데기(SettingsFormShell) → Card + 로컬 h2 제목 + 저장 툴바(Button)  ·  경고/안내 → Alert
 *   카운트 입력(CountedInput)          → TextField(trailing 슬롯에 글자/바이트 카운터)
 *   전용 이름·이용 옵션 토글           → ToggleSwitch
 *   자산 자리(AssetField)              → FileChip + FileDropzone
 *   공개 범위 선택(RadioCardGroup)     → RadioCardGroup (실화면과 같은 승격 컴포넌트)
 *   대표 이미지 도움말                  → HelpTip
 *   브라우저 탭·OG 카드 미리보기(Previews) → 토큰만 쓴 로컬 목업 + 인라인 SVG data: URI
 *   첫 로딩                            → Skeleton
 *
 * [DS 갭 메모] 실화면은 app-local SettingLayout 으로 '라벨 왼쪽 / 컨트롤 오른쪽' 2단 행을 그린다.
 * DS 에는 2단 필드 래퍼가 없어, 라벨을 컨트롤 위에 얹는 스택형(섹션 제목 + 필드)으로 갈음했다 —
 * 담는 정보(라벨·설명·카운터·오류·미리보기)는 모두 그대로 실린다. CountedInput 도 대응 DS 가 없어
 * TextField 의 trailing 슬롯으로 카운터를 옮겼다(신규 DS 아님 · 기존 슬롯 재사용).
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * (미리보기 목업의 색은 인라인 SVG data: URI 안에서만 쓴다 — 이미지 콘텐츠라 토큰 규칙 밖이다.)
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FileChip,
  FileDropzone,
  HelpTip,
  RadioCardGroup,
  Skeleton,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Site Settings',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ────────────────────────────────────────────────────────────────────────────
 * 상수·유틸 (px/hex 리터럴 금지 — space 토큰의 calc 배수와 순수 계산만 쓴다)
 * ──────────────────────────────────────────────────────────────────────────── */

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 쓴다 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

const SITE_NAME_MAX = 20;
const SITE_DESCRIPTION_MAX = 100;
const MESSAGING_NAME_MAX_BYTES = 40;

/** EUC-KR 바이트 셈 — 한글 등 비ASCII 1자 = 2byte (실화면 byteLengthOf 규약 미러) */
const byteLengthOf = (value: string): number => {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code > 127 ? 2 : 1;
  }
  return bytes;
};

/** 파비콘 미리보기용 인라인 SVG(16x16) — 이미지 콘텐츠라 토큰 규칙 밖이다 */
const FAVICON_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' rx='3' fill='steelblue'/%3E%3Ctext x='8' y='12' font-size='10' fill='white' text-anchor='middle' font-family='sans-serif'%3ET%3C/text%3E%3C/svg%3E";

/** 대표(OG) 이미지 미리보기용 인라인 SVG(가로:세로 ≈ 2:1) */
const OG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Crect width='240' height='120' fill='slategray'/%3E%3Ctext x='120' y='66' font-size='18' fill='white' text-anchor='middle' font-family='sans-serif'%3ESpacePlanning%3C/text%3E%3C/svg%3E";

/** 공개 범위 선택지 — 실화면 VISIBILITY_OPTIONS 미러 */
type SiteVisibility = 'public' | 'private';
const VISIBILITY_OPTIONS: readonly {
  readonly value: SiteVisibility;
  readonly label: string;
  readonly description: string;
}[] = [
  { value: 'public', label: '전체 공개', description: '누구나 내 사이트에 접속할 수 있어요' },
  { value: 'private', label: '비공개', description: '관리자만 접근할 수 있어요' },
];

function toVisibility(value: string): SiteVisibility | undefined {
  return VISIBILITY_OPTIONS.find((option) => option.value === value)?.value;
}

/** 걸린 자산 1건 — 파일명·용량(byte)·표시 URL */
interface SiteAsset {
  readonly name: string;
  readonly size: number;
  readonly url: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 로컬 레이아웃 (신규 DS 컴포넌트 아님 — 토큰만 쓴 표면/타이포)
 * ──────────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
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

const sectionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  paddingTop: cssVar('space.5'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.subtle'),
};

const sectionTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const counterStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
};

const labelHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const assetRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const footerHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const calloutListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  paddingLeft: cssVar('space.4'),
};

/** 섹션 — 왼쪽 위 제목 + 필드 스택 */
function SettingSection({
  title,
  children,
  first = false,
}: {
  title: string;
  children: ReactNode;
  first?: boolean;
}) {
  const titleId = useId();
  return (
    <section
      style={first ? { ...sectionStyle, borderTopStyle: 'none', paddingTop: 0 } : sectionStyle}
      aria-labelledby={titleId}
    >
      <h3 id={titleId} style={sectionTitleStyle}>
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 미리보기 목업 — 브라우저 탭 / 공유 카드(OG). 장식이라 목업 본체는 aria-hidden.
 * ──────────────────────────────────────────────────────────────────────────── */

const figureStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  minWidth: 0,
};

const captionStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const tabChromeStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: size(7),
  boxSizing: 'border-box',
  padding: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const tabStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  maxWidth: size(4),
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderTopLeftRadius: cssVar('radius.md'),
  borderTopRightRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const tabIconStyle: CSSProperties = {
  width: cssVar('space.4'),
  height: cssVar('space.4'),
  flexShrink: 0,
  borderRadius: cssVar('radius.sm'),
  objectFit: 'cover',
};

const tabIconEmptyStyle: CSSProperties = {
  ...tabIconStyle,
  display: 'inline-block',
  background: cssVar('color.surface.disabled'),
};

const tabTitleStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.default'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const addressBarStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.muted'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function BrowserTabPreview({
  faviconUrl,
  siteName,
  siteUrl,
}: {
  faviconUrl: string;
  siteName: string;
  siteUrl: string;
}) {
  return (
    <figure style={figureStyle}>
      <figcaption style={captionStyle}>브라우저 탭 미리보기</figcaption>
      <div style={tabChromeStyle} aria-hidden="true">
        <div style={tabStyle}>
          {faviconUrl === '' ? (
            <span style={tabIconEmptyStyle} />
          ) : (
            <img src={faviconUrl} alt="" style={tabIconStyle} />
          )}
          <span style={tabTitleStyle}>{siteName === '' ? '사이트 이름' : siteName}</span>
        </div>
        <div style={addressBarStyle}>{siteUrl}</div>
      </div>
    </figure>
  );
}

const ogCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: size(6),
  boxSizing: 'border-box',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const ogImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: size(3),
  objectFit: 'cover',
  background: cssVar('color.surface.disabled'),
};

const ogImageEmptyStyle: CSSProperties = {
  ...ogImageStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const ogBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
};

const ogTitleStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const ogMutedStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function OgCardPreview({
  imageUrl,
  siteName,
  siteDescription,
  siteUrl,
}: {
  imageUrl: string;
  siteName: string;
  siteDescription: string;
  siteUrl: string;
}) {
  return (
    <figure style={figureStyle}>
      <figcaption style={captionStyle}>공유 카드 미리보기 (카카오톡 · Facebook 등)</figcaption>
      <div style={ogCardStyle} aria-hidden="true">
        {imageUrl === '' ? (
          <span style={ogImageEmptyStyle}>대표 이미지가 없어요</span>
        ) : (
          <img src={imageUrl} alt="" style={ogImageStyle} />
        )}
        <div style={ogBodyStyle}>
          <span style={ogTitleStyle}>{siteName === '' ? '사이트 이름' : siteName}</span>
          <span style={ogMutedStyle}>
            {siteDescription === '' ? '사이트 설명이 비어 있어요.' : siteDescription}
          </span>
          <span style={ogMutedStyle}>{siteUrl}</span>
        </div>
      </div>
    </figure>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 자산 자리 — FileChip(걸린 파일) + FileDropzone (실화면 AssetField 미러)
 * ──────────────────────────────────────────────────────────────────────────── */

function AssetField({
  label,
  asset,
  dropTitle,
  dropMeta,
  accept,
  disabled,
  onClear,
}: {
  label: string;
  asset: SiteAsset | null;
  dropTitle: string;
  dropMeta: string;
  accept: string;
  disabled: boolean;
  onClear: () => void;
}) {
  return (
    <div style={assetRowStyle}>
      {asset !== null && (
        <FileChip
          src={asset.url}
          name={asset.name}
          size={asset.size}
          disabled={disabled}
          onRemove={onClear}
        />
      )}
      <FileDropzone
        label={label}
        title={dropTitle}
        meta={dropMeta}
        accept={accept}
        disabled={disabled}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 데모 데이터
 * ──────────────────────────────────────────────────────────────────────────── */

const DEMO_SITE_URL = 'https://spaceplanning.ai';
const DEMO_FAVICON: SiteAsset = { name: 'favicon.ico', size: 4096, url: FAVICON_DATA_URI };
const DEMO_OG: SiteAsset = { name: 'og-cover.png', size: 184320, url: OG_DATA_URI };

interface ScreenProps {
  readonly loading?: boolean;
  readonly saving?: boolean;
  readonly canUpdate?: boolean;
  readonly initialVisibility?: SiteVisibility;
  /** 편집됨(dirty) — 저장 버튼을 활성화하고 안내 문구를 바꾼다 */
  readonly initialDirty?: boolean;
}

/**
 * 사이트 설정 화면 조립 — 제어 상태(입력값·토글·공개 범위)는 이 Capitalized 컴포넌트의 useState 가
 * 소유한다 (rules-of-hooks: Decorator 화살표가 아니라 컴포넌트 안에서 다룬다).
 */
function SiteSettingsScreen({
  loading = false,
  saving = false,
  canUpdate = true,
  initialVisibility = 'public',
  initialDirty = false,
}: ScreenProps) {
  const [siteName, setSiteName] = useState('TDS 스페이스플래닝');
  const [siteDescription, setSiteDescription] = useState(
    '공간 기획·설계·시공을 한 팀이 맡는 종합 공간 솔루션',
  );
  const [messagingEnabled, setMessagingEnabled] = useState(true);
  const [messagingName, setMessagingName] = useState('스페이스플래닝 고객센터');
  const [favicon, setFavicon] = useState<SiteAsset | null>(DEMO_FAVICON);
  const [ogImage, setOgImage] = useState<SiteAsset | null>(DEMO_OG);
  const [privateImage, setPrivateImage] = useState<SiteAsset | null>(null);
  const [visibility, setVisibility] = useState<SiteVisibility>(initialVisibility);
  const [copyProtection, setCopyProtection] = useState(true);
  const [mobileZoom, setMobileZoom] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [dirty, setDirty] = useState(initialDirty);

  const touch = (): void => setDirty(true);
  const disabled = saving || loading || !canUpdate;
  const privateEditable = visibility === 'private';

  const messagingBytes = byteLengthOf(messagingName);

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        사이트 정보와 관련된 기본적인 설정을 해요. 검색엔진 최적화를 위해 사이트 설명을 입력해
        주세요.
      </p>

      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>기본 설정</h2>

          {!canUpdate && (
            <Alert tone="info">
              조회 권한만 있어요. 기본 설정을 바꾸려면 시스템 설정 수정 권한이 필요해요.
            </Alert>
          )}

          {visibility === 'private' && (
            <Alert tone="warning">
              사이트가 비공개로 설정되어 있어요. 저장하면 관리자를 제외한 방문자는 사이트에 접속할
              수 없어요.
            </Alert>
          )}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <div style={sectionsStyle}>
              {/* ── 섹션 1 · 사이트 기본 정보 ── */}
              <SettingSection title="사이트 기본 정보" first>
                <div style={fieldStyle}>
                  <TextField
                    id="site-name"
                    label="사이트 이름"
                    value={siteName}
                    disabled={disabled}
                    placeholder="예: TDS 스페이스플래닝"
                    trailing={
                      <span
                        style={counterStyle}
                      >{`${String(siteName.length)}/${String(SITE_NAME_MAX)}`}</span>
                    }
                    onChange={(event) => {
                      setSiteName(event.target.value.slice(0, SITE_NAME_MAX));
                      touch();
                    }}
                  />
                  <p style={hintStyle}>브라우저 탭이나 소셜 미디어에 공유할 때 표시돼요.</p>
                </div>

                <div style={fieldStyle}>
                  <TextField
                    id="site-description"
                    label="사이트 설명"
                    value={siteDescription}
                    disabled={disabled}
                    placeholder="예: 공간 기획·설계·시공을 한 팀이 맡는 종합 공간 솔루션"
                    trailing={
                      <span
                        style={counterStyle}
                      >{`${String(siteDescription.length)}/${String(SITE_DESCRIPTION_MAX)}`}</span>
                    }
                    onChange={(event) => {
                      setSiteDescription(event.target.value.slice(0, SITE_DESCRIPTION_MAX));
                      touch();
                    }}
                  />
                  <p style={hintStyle}>사이트를 대표하는 문장이나 키워드 사용을 추천해요.</p>
                </div>

                <div style={fieldStyle}>
                  <div style={toggleRowStyle}>
                    <span style={fieldLabelStyle}>메일·SMS 전용 사이트 이름</span>
                    <ToggleSwitch
                      checked={messagingEnabled}
                      label="메일·SMS 전용 사이트 이름 사용"
                      disabled={disabled}
                      onChange={(next) => {
                        setMessagingEnabled(next);
                        touch();
                      }}
                    />
                  </div>
                  <p style={hintStyle}>전용 이름을 지정하지 않으면 사이트 이름으로 적용돼요.</p>

                  {/* 전용 이름 칸은 스위치를 켰을 때만 의미가 있다 — 글자가 아니라 바이트로 센다 */}
                  {messagingEnabled && (
                    <TextField
                      id="messaging-name"
                      label="전용 이름"
                      value={messagingName}
                      disabled={disabled}
                      placeholder="예: TDS 스페이스플래닝 고객센터"
                      {...(messagingBytes > MESSAGING_NAME_MAX_BYTES
                        ? {
                            error: `전용 이름은 ${String(MESSAGING_NAME_MAX_BYTES)}byte 를 넘을 수 없어요. 한글은 1자가 2byte 예요.`,
                          }
                        : {})}
                      trailing={
                        <span
                          style={counterStyle}
                        >{`${String(messagingBytes)}/${String(MESSAGING_NAME_MAX_BYTES)} byte`}</span>
                      }
                      onChange={(event) => {
                        setMessagingName(event.target.value);
                        touch();
                      }}
                    />
                  )}
                </div>
              </SettingSection>

              {/* ── 섹션 2 · 사이트 표시 이미지 ── */}
              <SettingSection title="사이트 표시 이미지">
                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>파비콘</span>
                  <p style={hintStyle}>내 웹사이트를 볼 때 브라우저 탭에 표시되는 아이콘이에요.</p>
                  <AssetField
                    label="파비콘"
                    asset={favicon}
                    dropTitle="파일 선택 또는 끌어다 놓기"
                    dropMeta="최소 16x16 / ICO"
                    accept=".ico,image/x-icon,image/vnd.microsoft.icon"
                    disabled={disabled}
                    onClear={() => {
                      setFavicon(null);
                      touch();
                    }}
                  />
                  <BrowserTabPreview
                    faviconUrl={favicon?.url ?? ''}
                    siteName={siteName}
                    siteUrl={DEMO_SITE_URL}
                  />
                </div>

                <div style={fieldStyle}>
                  <span style={labelHeadStyle}>
                    <span style={fieldLabelStyle}>대표 이미지</span>
                    <HelpTip label="대표 이미지 설명">
                      링크를 공유하면 이 이미지와 함께 사이트 이름·설명이 카드로 보여요. 가로가
                      세로의 약 2배인 이미지를 권장해요 — 비율이 다르면 가장자리가 잘려요.
                    </HelpTip>
                  </span>
                  <p style={hintStyle}>
                    카카오톡 또는 Facebook 등에서 링크와 함께 나타날 이미지를 설정해요.
                  </p>
                  <AssetField
                    label="대표 이미지"
                    asset={ogImage}
                    dropTitle="파일을 선택 하거나 끌어다 놓기"
                    dropMeta="PNG, JPG, GIF"
                    accept="image/png,image/jpeg,image/gif"
                    disabled={disabled}
                    onClear={() => {
                      setOgImage(null);
                      touch();
                    }}
                  />
                  <OgCardPreview
                    imageUrl={ogImage?.url ?? ''}
                    siteName={siteName}
                    siteDescription={siteDescription}
                    siteUrl={DEMO_SITE_URL}
                  />
                </div>
              </SettingSection>

              {/* ── 섹션 3 · 공개 범위 ── */}
              <SettingSection title="공개 범위">
                <RadioCardGroup
                  name="site-visibility-choice"
                  legend="사이트 접근 범위"
                  value={visibility}
                  options={VISIBILITY_OPTIONS}
                  disabled={disabled}
                  onChange={(next) => {
                    const narrowed = toVisibility(next);
                    if (narrowed === undefined) return;
                    setVisibility(narrowed);
                    touch();
                  }}
                />

                <div style={fieldStyle}>
                  <span
                    style={
                      privateEditable
                        ? fieldLabelStyle
                        : { ...fieldLabelStyle, color: cssVar('color.text.disabled') }
                    }
                  >
                    비공개용 이미지
                  </span>
                  <p style={hintStyle}>
                    비공개 상태인 내 사이트에 방문했을 때 표시할 이미지를 설정해요.
                  </p>
                  <AssetField
                    label="비공개용 이미지"
                    asset={privateImage}
                    dropTitle="파일을 선택 하거나 끌어다 놓기"
                    dropMeta="PNG, JPG, GIF"
                    accept="image/png,image/jpeg,image/gif"
                    disabled={disabled || !privateEditable}
                    onClear={() => {
                      setPrivateImage(null);
                      touch();
                    }}
                  />
                  {!privateEditable && (
                    <p style={hintStyle}>
                      공개 범위를 비공개로 바꾸면 설정할 수 있어요. 지금 올려 둔 이미지는 그대로
                      보관돼요.
                    </p>
                  )}
                  <Alert tone="info">
                    <ul style={calloutListStyle}>
                      <li>모바일을 고려해 HD 처리하여 50% 크기로 적용돼요.</li>
                      <li>이미지를 등록하면 밝은 회색 배경에 적용돼요.</li>
                      <li>이미지를 등록하지 않으면 기본 비공개 페이지가 표시돼요.</li>
                    </ul>
                  </Alert>
                </div>
              </SettingSection>

              {/* ── 섹션 4 · 사이트 이용 옵션 ── */}
              <SettingSection title="사이트 이용 옵션">
                <div style={fieldStyle}>
                  <div style={toggleRowStyle}>
                    <span style={fieldLabelStyle}>복사 방지</span>
                    <ToggleSwitch
                      checked={copyProtection}
                      label="복사 방지"
                      disabled={disabled}
                      onChange={(next) => {
                        setCopyProtection(next);
                        touch();
                      }}
                    />
                  </div>
                  <p style={hintStyle}>
                    마우스 오른쪽 버튼과 복사 단축키로 콘텐츠를 복사할 수 없게 하는 기능이에요.
                  </p>
                </div>

                <div style={fieldStyle}>
                  <div style={toggleRowStyle}>
                    <span style={fieldLabelStyle}>모바일 확대 허용</span>
                    <ToggleSwitch
                      checked={mobileZoom}
                      label="모바일 확대 허용"
                      disabled={disabled}
                      onChange={(next) => {
                        setMobileZoom(next);
                        touch();
                      }}
                    />
                  </div>
                  <p style={hintStyle}>
                    방문자 브라우저 설정에 따라 확대 허용 방지가 동작하지 않을 수 있어요.
                  </p>
                </div>

                <div style={fieldStyle}>
                  <div style={toggleRowStyle}>
                    <span style={fieldLabelStyle}>로그인 상태 유지</span>
                    <ToggleSwitch
                      checked={keepSignedIn}
                      label="로그인 상태 유지"
                      disabled={disabled}
                      onChange={(next) => {
                        setKeepSignedIn(next);
                        touch();
                      }}
                    />
                  </div>
                  <p style={hintStyle}>
                    사이트 로그인시 자동 로그인에 대한 기본값을 설정 할 수 있어요.
                  </p>
                </div>
              </SettingSection>
            </div>
          )}

          {/* 저장 툴바 — 수정 권한이 없으면 저장 컨트롤 자체가 없다(눌러 보고 403 받는 자리를 안 만든다) */}
          {canUpdate && (
            <div style={footerStyle}>
              <p style={footerHintStyle}>
                {saving
                  ? '저장하는 중이에요…'
                  : dirty
                    ? '저장하지 않은 변경 사항이 있어요.'
                    : '변경 사항이 없어요.'}
              </p>
              <Button
                type="submit"
                variant="primary"
                disabled={!dirty || saving || loading}
                onClick={() => setDirty(false)}
              >
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** 정상 — 값이 모두 채워진 기본 설정(전체 공개 · 변경 없음) */
export const Default: Story = {
  render: () => <SiteSettingsScreen />,
};

/** 최초 로드: 카드 안 스켈레톤(첫 조회에서만 · STATE-01) */
export const Loading: Story = {
  render: () => <SiteSettingsScreen loading />,
};

/** 편집됨: 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다' */
export const Edited: Story = {
  render: () => <SiteSettingsScreen initialDirty />,
};

/** 저장 중: 폼 잠금 + 저장 버튼 '저장 중…' */
export const Saving: Story = {
  render: () => <SiteSettingsScreen saving initialDirty />,
};

/** 비공개: 공개 범위 private → 경고 배너 + 비공개용 이미지 자리 활성 (EXC 미러) */
export const PrivateVisibility: Story = {
  render: () => <SiteSettingsScreen initialVisibility="private" initialDirty />,
};

/** 읽기 전용: 수정 권한 없음 → 저장 컨트롤 없음 + 안내 배너 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <SiteSettingsScreen canUpdate={false} />,
};
