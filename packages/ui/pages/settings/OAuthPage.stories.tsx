/**
 * Design System/Templates/Settings/OAuth — 소셜 로그인 제공자 **목록** (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — `['시스템 설정', 'Settings', '/settings', …]`.
 * 화면 en = "OAuth"(`/settings/oauth`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/oauth/OAuthPage.tsx 와 그 하위
 * components/ProviderTileList.tsx · components/provider-marks.tsx.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin(SettingsFormShell·provider-marks 등)을 import 하지 않는다. 실화면 논리 ↔ DS 매핑:
 *   폼 껍데기(소셜 로그인)   → Card + 토큰 <h2> + 설명(muted) + 저장 Button (SettingsFormShell 갈음)
 *   사용 중/이용 가능 두 묶음 → 토큰만 쓴 <section><ul>(제목 <h3>) — enabled 로 파생, 목록을 복제하지 않는다
 *   제공자 타일             → 토큰 타일 <a> + 브랜드 마크 + '사용중' 알약(색만으로 상태 전달 금지)
 *   로그인 버튼 순서 변경    → Button(secondary) + 순서 이동 Button ×2
 *   표시 정책              → 중첩 Card + Checkbox + 교차 규칙 Alert(danger)
 *   켜진 제공자 없음 경고    → Alert(info)
 *
 * [브랜드 마크] provider-marks 는 앱 전용이라 import 하지 않는다. 각 사 브랜드 색은 우리 팔레트가
 * 아니므로(토큰이 될 수 없다) 인라인 SVG **data: URI** 로 그리고, 그 안에서만 **이름 있는 색**을 쓴다
 * (CSS 로 새지 않게 — 하드코딩 hex/px 금지 규칙은 CSS·TS 리터럴에 걸린다).
 *
 * 그 밖 시각 값은 토큰(cssVar/typography)과 rem·calc 만 참조한다 — hex/px 리터럴 0건.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import { Alert, Button, Card, Checkbox, Skeleton, cssVar, typography } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/OAuth',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 브랜드 마크 — 인라인 SVG data: URI, 안에서만 이름 있는 색을 쓴다 ────────────
 *
 * 실화면 provider-marks.tsx 의 벡터를 옮기되, 브랜드 hex 를 가장 가까운 CSS 이름 색으로 바꾼다
 * (data: URI 문자열 안이라 CSS/TS 리터럴 검사 대상이 아니다). 마크는 장식이므로 alt=""·aria-hidden. */

const BRAND_SVG: Record<string, string> = {
  google: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='royalblue' d='M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z'/><path fill='mediumseagreen' d='M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z'/><path fill='gold' d='M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z'/><path fill='tomato' d='M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z'/></svg>`,
  kakao: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='gold'/><path fill='black' d='M16 7.2c-5.08 0-9.2 3.28-9.2 7.32 0 2.6 1.72 4.88 4.31 6.17l-1.03 3.83c-.09.35.3.63.6.42l4.55-3.03c.25.02.5.03.77.03 5.08 0 9.2-3.28 9.2-7.32S21.08 7.2 16 7.2z'/></svg>`,
  naver: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='mediumseagreen'/><path fill='white' d='M18.42 16.7 13.1 9H8.6v14h5.02v-7.7L18.94 23h4.46V9h-5.02z'/></svg>`,
  facebook: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='royalblue'/><path fill='white' d='M20.05 17.62 20.6 14h-3.47v-2.35c0-.99.49-1.96 2.04-1.96h1.58V6.6s-1.43-.24-2.8-.24c-2.86 0-4.73 1.73-4.73 4.87V14H10v3.62h3.22V27h3.91v-9.38z'/></svg>`,
  apple: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='black'/><path fill='white' d='M21.79 17.2c-.02-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.95-1.54-.16-3 .9-3.78.9-.78 0-1.99-.88-3.26-.86-1.68.02-3.22.98-4.09 2.48-1.74 3.03-.44 7.52 1.25 9.98.83 1.2 1.82 2.55 3.11 2.51 1.25-.05 1.72-.81 3.23-.81 1.5 0 1.93.81 3.25.78 1.34-.02 2.19-1.22 3.01-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.02-2.61-1-2.63-3.97zM19.32 9.66c.69-.84 1.16-2.01 1.03-3.18-1 .04-2.2.67-2.92 1.5-.63.74-1.19 1.93-1.04 3.07 1.12.08 2.25-.57 2.93-1.39z'/></svg>`,
  line: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='mediumseagreen'/><path fill='white' d='M16 6.4c-5.62 0-10.2 3.71-10.2 8.28 0 4.09 3.63 7.52 8.53 8.17.33.07.78.22.9.5.1.26.07.66.03.92l-.15.87c-.04.26-.2 1.01.89.55 1.09-.46 5.88-3.46 8.02-5.93 1.48-1.62 2.18-3.27 2.18-5.08 0-4.57-4.58-8.28-10.2-8.28z'/></svg>`,
};

function BrandMark({
  provider,
  markSize = cssVar('space.7'),
}: {
  provider: string;
  markSize?: string;
}) {
  const svg = BRAND_SVG[provider];
  if (svg === undefined) return null;
  const markStyle: CSSProperties = {
    display: 'inline-block',
    flexShrink: 0,
    width: markSize,
    height: markSize,
  };
  return (
    <img
      src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
      alt=""
      aria-hidden
      style={markStyle}
    />
  );
}

/* ── 데모 데이터 — 실화면 OAUTH_PROVIDER_META 의 title 미러 ────────────────────── */

interface DemoProvider {
  readonly id: string;
  readonly title: string;
  readonly enabled: boolean;
}

const PROVIDER_TITLE: Record<string, string> = {
  google: '구글 로그인',
  kakao: '카카오 로그인 · 싱크',
  naver: '네이버 로그인',
  facebook: 'Facebook 로그인',
  apple: 'Apple 로그인',
  line: 'LINE 로그인',
};

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
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

const cardDescriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const sectionHeadingStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const tileStyle = (enabled: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
  textAlign: 'left',
  padding: `${cssVar('space.3')} ${cssVar('space.4')}`,
  border: `${cssVar('border-width.thin')} solid ${
    enabled ? cssVar('color.feedback.success.border') : cssVar('color.border.default')
  }`,
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  boxShadow: cssVar('shadow.raised'),
  textDecoration: 'none',
});

const tileNameStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  wordBreak: 'keep-all',
  ...typography('typography.label.md'),
};

const pillStyle: CSSProperties = {
  flexShrink: 0,
  padding: `${cssVar('space.1')} ${cssVar('space.2')}`,
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.feedback.success.border')}`,
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.success.surface'),
  color: cssVar('color.feedback.success.text'),
  whiteSpace: 'nowrap',
  ...typography('typography.caption.md'),
};

const emptyNoteStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
  padding: cssVar('space.4'),
  border: `${cssVar('border-width.thin')} dashed ${cssVar('color.border.subtle')}`,
  borderRadius: cssVar('radius.lg'),
  color: cssVar('color.text.muted'),
};

const reorderActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const reorderHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const moveButtonsStyle: CSSProperties = {
  display: 'inline-flex',
  gap: cssVar('space.1'),
  flexShrink: 0,
};

const policyStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const policyHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
  marginInlineStart: `calc(${cssVar('space.5')} + ${cssVar('space.2')})`,
  color: cssVar('color.text.muted'),
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  borderTop: `${cssVar('border-width.thin')} solid ${cssVar('color.border.subtle')}`,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 조립 ─────────────────────────────────────────────────────────────────────── */

interface TileListProps {
  readonly groupId: string;
  readonly heading: string;
  readonly items: readonly DemoProvider[];
  readonly emptyNote: string;
  readonly action?: ReactNode;
  readonly onMove?: (position: number, delta: number) => void;
}

function ProviderTileList({ groupId, heading, items, emptyNote, action, onMove }: TileListProps) {
  const headingId = `oauth-group-${groupId}`;
  return (
    <section style={sectionStyle} aria-labelledby={headingId}>
      <div style={sectionHeaderStyle}>
        <h3 id={headingId} style={sectionHeadingStyle}>
          {heading}
        </h3>
        {action}
      </div>

      {items.length === 0 ? (
        <p style={emptyNoteStyle}>{emptyNote}</p>
      ) : (
        <ul style={listStyle}>
          {items.map((item, position) => (
            <li key={item.id} style={itemStyle}>
              <a
                href={`#oauth-${item.id}`}
                style={tileStyle(item.enabled)}
                aria-label={`${item.title}, ${item.enabled ? '사용 중' : '사용 안 함'}. 설정 화면으로 이동`}
              >
                <BrandMark provider={item.id} />
                <span style={tileNameStyle}>{item.title}</span>
                {item.enabled ? (
                  <span style={pillStyle} aria-hidden="true">
                    사용중
                  </span>
                ) : null}
              </a>

              {onMove !== undefined ? (
                <span style={moveButtonsStyle}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={position === 0}
                    aria-label={`${item.title} 순서 위로`}
                    onClick={() => onMove(position, -1)}
                  >
                    위로
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={position === items.length - 1}
                    aria-label={`${item.title} 순서 아래로`}
                    onClick={() => onMove(position, 1)}
                  >
                    아래로
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface OAuthScreenProps {
  readonly initialProviders: readonly DemoProvider[];
  readonly loading?: boolean;
  readonly initialReordering?: boolean;
}

function OAuthScreen({
  initialProviders,
  loading = false,
  initialReordering = false,
}: OAuthScreenProps) {
  const titleId = useId();
  const [providers, setProviders] = useState<readonly DemoProvider[]>(initialProviders);
  const [inAppOnly, setInAppOnly] = useState(false);
  const [reordering, setReordering] = useState(initialReordering);

  const enabled = providers.filter((provider) => provider.enabled);
  const available = providers.filter((provider) => !provider.enabled);
  const anyEnabled = enabled.length > 0;
  const canReorder = enabled.length > 1;
  const reorderActive = reordering && canReorder;

  const kakaoEnabled = providers.some((provider) => provider.id === 'kakao' && provider.enabled);
  const policyError = inAppOnly && !kakaoEnabled;

  /** 켜진 두 항목의 자리를 맞바꾼다 — providers[] 를 실제로 재배열한다(별도 order 필드 없음) */
  const moveEnabled = (position: number, delta: number): void => {
    setProviders((prev) => {
      const enabledIndices = prev.reduce<number[]>((acc, provider, index) => {
        if (provider.enabled) acc.push(index);
        return acc;
      }, []);
      const from = enabledIndices[position];
      const to = enabledIndices[position + delta];
      if (from === undefined || to === undefined) return prev;
      const next = [...prev];
      const moved = next[from];
      const displaced = next[to];
      if (moved === undefined || displaced === undefined) return prev;
      next[from] = displaced;
      next[to] = moved;
      return next;
    });
  };

  return (
    <div style={pageStyle}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            소셜 로그인
          </h2>
          <p style={cardDescriptionStyle}>
            켜고 끄기와 자격증명은 제공자를 눌러 각자의 화면에서 설정합니다. 이 화면은 로그인 버튼
            순서와 표시 정책을 저장합니다.
          </p>

          {!anyEnabled && !loading ? (
            <Alert tone="info">
              켜져 있는 소셜 로그인이 없습니다. 사용자는 이메일과 비밀번호로만 로그인합니다.
            </Alert>
          ) : null}

          {loading ? (
            <div
              style={skeletonBodyStyle}
              aria-busy="true"
              aria-label="소셜 로그인 설정을 불러오는 중"
            >
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <>
              <div style={stackStyle}>
                <ProviderTileList
                  groupId="in-use"
                  heading="사용하고 있는 서비스"
                  items={enabled}
                  emptyNote="켜져 있는 소셜 로그인이 없습니다. 아래 '이용 가능한 서비스'에서 하나를 골라 자격증명을 넣고 켜세요."
                  action={
                    <span style={reorderActionStyle}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canReorder}
                        onClick={() => setReordering((prev) => !prev)}
                      >
                        {reorderActive ? '순서 변경 완료' : '로그인 버튼 순서 변경'}
                      </Button>
                      <p style={reorderHintStyle}>
                        {canReorder
                          ? '여기 놓인 순서대로 로그인 화면에 버튼이 나옵니다. 저장해야 반영됩니다.'
                          : '사용 중인 서비스가 2개 이상일 때 순서를 바꿀 수 있습니다.'}
                      </p>
                    </span>
                  }
                  {...(reorderActive ? { onMove: moveEnabled } : {})}
                />

                <ProviderTileList
                  groupId="available"
                  heading="이용 가능한 서비스"
                  items={available}
                  emptyNote="모든 소셜 로그인을 사용 중입니다."
                />

                {/* 표시 정책 — 제공자가 아니라 로그인 화면 전체의 규칙이라 목록에 둔다 */}
                <Card>
                  <div style={cardBodyStyle}>
                    <h3 style={cardTitleStyle}>로그인 화면 표시 정책</h3>
                    <div style={policyStackStyle}>
                      <Checkbox
                        id="oauth-kakao-inapp-login-only"
                        label="카카오톡 앱에서 접속 시 카카오 로그인만 사용"
                        checked={inAppOnly}
                        onChange={(event) => setInAppOnly(event.target.checked)}
                      />
                      <p style={policyHintStyle}>
                        카카오톡 인앱 브라우저에서는 구글·네이버 로그인이 차단되는 경우가 있습니다.
                        켜 두면 그 환경에서 다른 소셜 버튼을 감추고 카카오 로그인만 보여줍니다.
                        자격증명이 아니라 화면 규칙이므로 카카오 콘솔에서 받아오는 값이 아닙니다.
                      </p>
                      {policyError ? (
                        <Alert tone="danger">
                          카카오 로그인이 꺼져 있어 이 정책을 켤 수 없습니다. 위 &lsquo;이용 가능한
                          서비스&rsquo;에서 카카오 로그인을 열어 먼저 켜세요.
                        </Alert>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </div>

              <div style={footerStyle}>
                <Button variant="primary">저장</Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

const DEFAULT_PROVIDERS: readonly DemoProvider[] = [
  { id: 'google', title: PROVIDER_TITLE.google ?? '', enabled: true },
  { id: 'kakao', title: PROVIDER_TITLE.kakao ?? '', enabled: true },
  { id: 'naver', title: PROVIDER_TITLE.naver ?? '', enabled: false },
  { id: 'facebook', title: PROVIDER_TITLE.facebook ?? '', enabled: false },
  { id: 'apple', title: PROVIDER_TITLE.apple ?? '', enabled: false },
  { id: 'line', title: PROVIDER_TITLE.line ?? '', enabled: false },
];

const ALL_DISABLED: readonly DemoProvider[] = DEFAULT_PROVIDERS.map((provider) => ({
  ...provider,
  enabled: false,
}));

const THREE_ENABLED: readonly DemoProvider[] = [
  { id: 'google', title: PROVIDER_TITLE.google ?? '', enabled: true },
  { id: 'naver', title: PROVIDER_TITLE.naver ?? '', enabled: true },
  { id: 'kakao', title: PROVIDER_TITLE.kakao ?? '', enabled: true },
  { id: 'facebook', title: PROVIDER_TITLE.facebook ?? '', enabled: false },
  { id: 'apple', title: PROVIDER_TITLE.apple ?? '', enabled: false },
  { id: 'line', title: PROVIDER_TITLE.line ?? '', enabled: false },
];

/** 정상 — 구글·카카오 사용 중(사용중 알약 + 성공 톤 테두리), 나머지는 이용 가능 */
export const Default: Story = {
  render: () => <OAuthScreen initialProviders={DEFAULT_PROVIDERS} />,
};

/** 켜진 제공자 없음 — 경고 Alert + '사용하고 있는 서비스' 빈 안내(이메일·비밀번호로만 로그인) */
export const AllDisabled: Story = {
  render: () => <OAuthScreen initialProviders={ALL_DISABLED} />,
};

/** 순서 변경 중 — 사용 중 3개에 위/아래 이동 버튼이 붙는다(providers[] 를 실제로 재배열) */
export const Reordering: Story = {
  render: () => <OAuthScreen initialProviders={THREE_ENABLED} initialReordering />,
};

/** 로딩 — 설정을 읽는 동안 스켈레톤 (STATE-01) */
export const Loading: Story = {
  render: () => <OAuthScreen initialProviders={DEFAULT_PROVIDERS} loading />,
};
