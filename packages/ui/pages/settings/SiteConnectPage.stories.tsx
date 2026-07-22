/**
 * Design System/Templates/Settings/Site Connect — 사이트 연동 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/settings/site-connect` → 메뉴 en = "Settings"(시스템 설정),
 * 화면 en = "Site Connect" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Settings 그룹의
 * `['/settings/site-connect', '사이트 연동', 'Site Connect']`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/site-connect/SiteConnectPage.tsx
 * (라우트 /settings/site-connect) 와 그 규칙(rules.ts) · 데이터(data-source.ts) ·
 * 공용 껍데기(settings/_shared/SettingsFormShell).
 *
 * [이 화면이 답하는 질문] B2C 홈페이지가 붙으면 주문·문의·회원에 대해 가장 먼저 나오는 질문은
 * 하나다: **"이거 어디서 왔어요?"** 문의의 `channel`(상품 페이지·전화·이메일…)은 그 질문에 답하지
 * 않는다 — 그건 **접점**(어느 창구로 말을 걸었나)이고, 유입원은 **출처**(어디서 왔나)다. 둘을 한
 * 필드에 뭉치면 '전화로 문의한 인스타 광고 유입' 을 표현할 수 없다.
 *
 * [키는 저장 여부만 보인다] 평문을 담을 자리를 만들지 않는 것이 방어다. 화면이 그리는 고정 길이
 * 글리프는 '가린 표시' 가 아니라 **우리가 가진 정보의 전부**다 — 마지막 4자도, 자릿수도 남기지
 * 않는다(길이도 정보다). 저장하면 입력 칸은 다시 비워진다.
 *
 * [가드는 저장이 아니라 **토글**에 걸린다 — 이 화면에서 가장 중요한 판단] 저장 버튼을 막으면
 * 도메인만 고치러 들어온 운영자까지 저장을 못 하게 되고, 그때 화면은 아무 이유도 말하지 못한다.
 * 막아야 하는 것은 저장이 아니라 **성립하지 않는 연동**이다. 그래서 '켤 수 없는 상태' 를 애초에
 * 만들지 않고, 잠긴 토글은 왜 잠겼는지를 그 자리에서 말한다. 이미 켜져 있는 연동은 끌 수 있어야
 * 하므로 잠금은 '켜려 할 때' 에만 건다.
 *
 * [유입 데이터에 편집 표면이 없다] 관측값이기 때문이다. 운영자가 '이건 인스타 같은데' 하며 고칠
 * 수 있으면 이 데이터는 측정이 아니라 의견이 되고, 광고비 판단의 근거로 쓸 수 없다.
 * 채널은 8종 + `direct` 이고, **`direct` 는 아홉 번째 채널이 아니라 나머지 전부를 받는 자리**다:
 * '알 수 없음' 이라는 값을 만들면 운영자가 그것을 채널로 읽고 '알 수 없음 유입 30%' 라는 문장을
 * 만든다. 리퍼러가 없는 유입은 직접 유입이 맞다(즐겨찾기·주소창·앱).
 *
 * [최초 접점만 남긴다] 마지막 접점으로 덮어쓰면 '인스타 광고를 보고 알게 됐다가 며칠 뒤 브랜드명
 * 검색으로 들어와 구매' 한 사람의 공이 전부 검색에게 돌아가고, 그 숫자를 보고 광고를 끄면 검색
 * 유입도 함께 마른다 — 애초에 그 검색어를 만든 것이 광고였기 때문이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 조각은 DS 표면으로 갈음한다:
 *   SettingsFormShell → Card + 토큰 <h2> + 저장 푸터(Button ×2) + Alert
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   설정 카드 · 제목            → Card + 토큰 <h2>
 *   연동 사용 토글(잠김 + 사유)   → ToggleSwitch(disabled) + Alert(info)
 *   홈페이지 도메인             → TextField(type=url)
 *   추가 허용 출처              → FormField + 토큰 <textarea>
 *   연동 키 저장 여부            → StatusBadge(저장됨 / 저장된 키 없음) + 토큰 <span>(고정 글리프)
 *   새 연동 키                  → TextField(type=password)
 *   읽기 전용 안내 · 규칙 거절     → Alert(info · danger)
 *   마지막 변경(감사)            → 토큰 <p>
 *   저장 확인                   → ConfirmDialog(intent=update)
 *   최근 유입 관측 표            → Card + Table (조회 전용 · 행 클릭 없음)
 *   채널 배지                   → StatusBadge (direct 는 neutral, 나머지는 info)
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
  StatusBadge,
  Table,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Site Connect',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 rules.ts · shared/domain/traffic-source 미러) ───────────────────────── */

/**
 * 채널 카탈로그 — 운영자가 발명하지 않는다. 자유 입력이면 같은 채널이 'naver'·'Naver'·'네이버'
 * 네 갈래로 쌓이고, 그 순간 유입 통계는 합계를 낼 수 없는 문자열 더미가 된다.
 * 8개 채널 + `direct`. `direct` 는 **나머지 전부를 받는 자리**다(머리말).
 */
const TRAFFIC_CHANNELS = [
  { id: 'direct', label: '직접 유입' },
  { id: 'naver', label: '네이버' },
  { id: 'naver-shopping', label: '네이버쇼핑' },
  { id: 'google', label: '구글' },
  { id: 'daum', label: '다음' },
  { id: 'kakao', label: '카카오' },
  { id: 'instagram', label: '인스타그램' },
  { id: 'facebook', label: '페이스북' },
  { id: 'youtube', label: '유튜브' },
] as const;

type TrafficChannel = (typeof TRAFFIC_CHANNELS)[number]['id'];

const trafficChannelLabel = (channel: TrafficChannel): string =>
  TRAFFIC_CHANNELS.find((entry) => entry.id === channel)?.label ?? '직접 유입';

/**
 * 한 사람이 우리에게 처음 닿은 접점.
 * campaign·referrer 가 `string | null` 인 이유: **빈 문자열은 값이 아니다.** '' 를 허용하면
 * '캠페인 없음' 과 '이름이 빈칸으로 저장됨' 이 같은 모양이 되고, 집계가 '' 를 하나의 캠페인으로 센다.
 */
interface TrafficSource {
  readonly channel: TrafficChannel;
  readonly campaign: string | null;
  readonly referrer: string | null;
  /** 이 접점이 관측된 시각 — 표기는 저장한 그대로다 */
  readonly landedAt: string;
}

interface TrafficObservation {
  readonly id: string;
  /** 마스킹된 대상 표시값 */
  readonly subjectLabel: string;
  readonly domain: 'order' | 'inquiry' | 'member';
  readonly source: TrafficSource;
}

/** 저장 문서 — **평문 키는 담기지 않는다.** 입력이 있으면 '저장돼 있다' 는 사실만 남는다 */
interface SiteConnectValues {
  readonly enabled: boolean;
  readonly siteUrl: string;
  /** 줄바꿈으로 나눈 허용 출처 원문 */
  readonly allowedOrigins: string;
  readonly hasSecret: boolean;
  /** 새 키 입력 — 비워 두면 저장된 키가 그대로 유지된다 */
  readonly secretInput: string;
}

/** 입력 상한 — 실화면 validation.ts 미러. TextField 는 native maxLength 를 그대로 통과시킨다 */
const SITE_URL_MAX = 200;
const SECRET_MAX = 200;

/** 저장된 연동 키의 표시 — 마지막 4자도 자릿수도 남기지 않는다 */
const MASKED_SECRET_TEXT = '••••••••••••';

const parseAllowedOrigins = (raw: string): readonly string[] =>
  raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

const ORIGIN_RE = /^https:\/\/[^\s/?#]+\.[^\s/?#]+$/;

/**
 * 형식이 틀린 출처의 첫 줄 — 없으면 null.
 * 경로가 붙은 값도 거절한다: 출처(origin)는 스킴+호스트까지이고, 경로를 넣으면 브라우저가 보내는
 * Origin 헤더와 영영 일치하지 않아 **모든 이벤트가 조용히 거절된다.**
 */
const firstInvalidOrigin = (raw: string): string | null =>
  parseAllowedOrigins(raw).find((origin) => !ORIGIN_RE.test(origin)) ?? null;

/**
 * 연동을 **켤 수 없는 이유** — 켤 수 있으면 null.
 * 가드가 저장이 아니라 토글에 걸리는 이유는 머리말에 있다.
 */
function enableBlock(values: SiteConnectValues): string | null {
  if (values.siteUrl.trim() === '') {
    return '홈페이지 도메인을 입력해야 연동을 켤 수 있습니다. 어느 사이트에서 온 이벤트인지 확인할 방법이 없습니다.';
  }
  const invalid = firstInvalidOrigin(values.allowedOrigins);
  if (invalid !== null) {
    return `추가 허용 출처 ‘${invalid}’ 의 형식이 올바르지 않습니다. https://호스트 형태로, 경로 없이 적어 주세요.`;
  }
  if (!values.hasSecret && values.secretInput.trim() === '') {
    return '연동 키가 저장돼 있지 않습니다. 키 없이 연동을 켜면 들어오는 이벤트를 검증할 수 없어 모두 거절됩니다.';
  }
  return null;
}

/**
 * 저장해도 되는가 — 저장 경로가 마지막으로 보는 술어.
 * 토글이 이미 막고 있는데 또 보는 이유: 폼 값은 다른 탭·개발자도구에서 바뀔 수 있고, 거절의
 * 책임은 화면이 아니라 저장 경로가 진다.
 */
function saveBlock(values: SiteConnectValues): string | null {
  const invalid = firstInvalidOrigin(values.allowedOrigins);
  if (invalid !== null) {
    return `추가 허용 출처 ‘${invalid}’ 의 형식이 올바르지 않습니다. https://호스트 형태로, 경로 없이 적어 주세요.`;
  }
  return values.enabled ? enableBlock(values) : null;
}

/* ── 데모 데이터(실화면 data-source.ts 미러 — 실명 0건 · example.com 만) ───────────────────── */

/**
 * 초기값은 **연동 꺼짐**이다. 픽스처로 '이미 연동된 것처럼' 채우지 않는다: 그러면 아무것도
 * 설정하지 않은 계정이 유입 통계를 사실로 읽는다.
 */
const EMPTY_VALUES: SiteConnectValues = {
  enabled: false,
  siteUrl: '',
  allowedOrigins: '',
  hasSecret: false,
  secretInput: '',
};

const CONNECTED_VALUES: SiteConnectValues = {
  enabled: true,
  siteUrl: 'https://shop.example.com',
  allowedOrigins: 'https://www.example.com\nhttps://stage.example.com',
  hasSecret: true,
  secretInput: '',
};

/** 도메인은 넣었지만 키가 없다 — 토글이 잠기는 두 번째 사유를 밟는다 */
const NO_SECRET_VALUES: SiteConnectValues = {
  ...EMPTY_VALUES,
  siteUrl: 'https://shop.example.com',
};

/** 경로가 붙은 허용 출처 — 저장은 되지만 연동은 켤 수 없다 */
const BAD_ORIGIN_VALUES: SiteConnectValues = {
  ...CONNECTED_VALUES,
  enabled: false,
  allowedOrigins: 'https://www.example.com\nhttps://shop.example.com/kr',
};

/**
 * 관측 픽스처 — 세 도메인(주문·문의·회원)이 **같은 한 벌**을 쓴다는 사실이 여기서부터 보인다.
 * 리퍼러가 없는 유입(obs-3)은 '알 수 없음' 이라는 열 번째 채널을 만들지 않고 direct 로 흡수한다.
 */
const DEMO_OBSERVATIONS: readonly TrafficObservation[] = [
  {
    id: 'obs-3',
    subjectLabel: '문의 INQ-0142',
    domain: 'inquiry',
    source: { channel: 'direct', campaign: null, referrer: null, landedAt: '2026-07-13 08:40' },
  },
  {
    id: 'obs-2',
    subjectLabel: '주문 ORD-20260705-0021',
    domain: 'order',
    source: {
      channel: 'naver-shopping',
      campaign: null,
      referrer: 'https://search.example.com/?q=공간',
      landedAt: '2026-07-05 14:02',
    },
  },
  {
    id: 'obs-4',
    subjectLabel: '유** (y***@example.com)',
    domain: 'member',
    source: {
      channel: 'google',
      campaign: 'always-on-search',
      referrer: 'https://search.example.org/',
      landedAt: '2026-04-21 16:31',
    },
  },
  {
    id: 'obs-1',
    subjectLabel: '한** (h***@example.com)',
    domain: 'member',
    source: {
      channel: 'instagram',
      campaign: 'spring-brand',
      referrer: 'https://ads.example.com/c/1',
      landedAt: '2026-03-11 11:14',
    },
  },
];

const AUDIT = { updatedBy: '김운영', updatedAt: '2026-07-10 10:20' };

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 사이트 연동을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const PAGE_DESCRIPTION =
  'B2C 홈페이지를 이 어드민에 연결하고, 주문·문의·회원이 어디서 왔는지를 함께 받습니다. 연동 키는 저장 여부만 표시하며 값은 다시 보여 주지 않습니다.';

/* ── 표 열 정의(조회 전용 · 선택 열도 행 액션도 없다) ─────────────────────────────────────── */

const OBSERVATION_COLUMNS: TableProps['columns'] = [
  { id: 'subject', header: '대상' },
  { id: 'channel', header: '채널', nowrap: true },
  { id: 'campaign', header: '캠페인', nowrap: true },
  { id: 'referrer', header: '직전 페이지' },
  { id: 'landedAt', header: '최초 접점', nowrap: true },
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

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 고정 길이 글리프 — 가린 표시가 아니라 우리가 가진 정보의 전부다 */
const maskStyle: CSSProperties = {
  ...typography('typography.code.md'),
  color: cssVar('color.text.muted'),
  letterSpacing: cssVar('space.1'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const mutedCellStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const stampStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface SiteConnectScreenProps {
  readonly seed?: SiteConnectValues;
  readonly canUpdate?: boolean;
  readonly observations?: readonly TrafficObservation[];
  /** 저장 확인 다이얼로그를 세워 둔 상태 */
  readonly confirmOpen?: boolean;
}

function SiteConnectScreen({
  seed = EMPTY_VALUES,
  canUpdate = true,
  observations = DEMO_OBSERVATIONS,
  confirmOpen = false,
}: SiteConnectScreenProps) {
  const [values, setValues] = useState<SiteConnectValues>(seed);
  const [dirty, setDirty] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const [pending, setPending] = useState<SiteConnectValues | null>(confirmOpen ? seed : null);

  const patch = (next: Partial<SiteConnectValues>): void => {
    setValues((current) => ({ ...current, ...next }));
    setDirty(true);
    setRejected(null);
  };

  // 토글의 disabled 와 저장의 거절이 읽는 **같은 술어**
  const blockReason = enableBlock(values);

  const submit = (): void => {
    const block = saveBlock(values);
    if (block !== null) {
      setRejected(block);
      return;
    }
    setRejected(null);
    setPending(values);
  };

  const rows: TableProps['rows'] = observations.map((observation) => ({
    id: observation.id,
    cells: [
      <span key="subject">{observation.subjectLabel}</span>,
      <StatusBadge
        key="channel"
        tone={observation.source.channel === 'direct' ? 'neutral' : 'info'}
        label={trafficChannelLabel(observation.source.channel)}
      />,
      // 없는 값은 '—' 다 — 빈 칸을 만들면 '값이 빈 문자열' 과 구분되지 않는다
      <span key="campaign">{observation.source.campaign ?? '—'}</span>,
      <span key="referrer" style={mutedCellStyle}>
        {observation.source.referrer ?? '—'}
      </span>,
      <span key="landedAt" style={stampStyle}>
        {observation.source.landedAt}
      </span>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>사이트 연동</h1>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>사이트 연동</h2>
            <p style={hintStyle}>{PAGE_DESCRIPTION}</p>

            {!canUpdate && <Alert tone="info">{READ_ONLY_NOTICE}</Alert>}

            {/* 규칙이 거절한 사유는 저장 실패(서버)와 성격이 달라 자리를 나눈다 */}
            {rejected !== null ? (
              <Alert tone="danger">{rejected}</Alert>
            ) : values.enabled ? null : (
              <Alert tone="info">
                연동이 꺼져 있습니다. 홈페이지에서 보내는 유입·주문·문의 이벤트는 모두 거절됩니다.
              </Alert>
            )}

            <div style={toggleRowStyle}>
              <span style={hintStyle}>
                연동 사용 — 켜려면 홈페이지 도메인과 연동 키가 모두 있어야 합니다.
              </span>
              <ToggleSwitch
                checked={values.enabled}
                label="사이트 연동 사용"
                onLabel="사용"
                offLabel="사용 안 함"
                // 이미 켜져 있는 연동은 끌 수 있어야 한다 — 잠금은 '켜려 할 때' 만 건다
                disabled={!canUpdate || (!values.enabled && blockReason !== null)}
                onChange={(next) => patch({ enabled: next })}
              />
            </div>

            {/* 잠긴 토글은 이유를 그 자리에서 말한다 — 이유 없는 disabled 는 고장으로 읽힌다 */}
            {!values.enabled && blockReason !== null && <Alert tone="info">{blockReason}</Alert>}

            <TextField
              id="site-connect-url"
              label="홈페이지 도메인"
              type="text"
              value={values.siteUrl}
              disabled={!canUpdate}
              maxLength={SITE_URL_MAX}
              placeholder="https://shop.example.com"
              onChange={(event) => patch({ siteUrl: event.target.value })}
            />
            <p style={hintStyle}>
              https:// 로 시작하는 주소입니다. 이 도메인에서 온 이벤트만 받습니다.
            </p>

            <FormField
              htmlFor="site-connect-origins"
              label="추가 허용 출처"
              hint="서브도메인·스테이징을 한 줄에 하나씩 적습니다. 경로는 붙이지 않습니다."
              {...(firstInvalidOrigin(values.allowedOrigins) !== null && {
                error: `‘${firstInvalidOrigin(values.allowedOrigins) ?? ''}’ 는 경로가 붙어 있거나 형식이 올바르지 않습니다.`,
              })}
            >
              <textarea
                id="site-connect-origins"
                rows={3}
                style={controlStyle(firstInvalidOrigin(values.allowedOrigins) !== null)}
                disabled={!canUpdate}
                aria-invalid={firstInvalidOrigin(values.allowedOrigins) !== null}
                placeholder={'https://www.example.com\nhttps://stage.example.com'}
                value={values.allowedOrigins}
                onChange={(event) => patch({ allowedOrigins: event.target.value })}
              />
            </FormField>

            <div style={secretRowStyle}>
              <span style={hintStyle}>연동 키</span>
              {values.hasSecret ? (
                <>
                  <StatusBadge tone="success" label="저장됨" />
                  <span style={maskStyle}>{MASKED_SECRET_TEXT}</span>
                </>
              ) : (
                <StatusBadge tone="neutral" label="저장된 키 없음" />
              )}
            </div>

            <TextField
              id="site-connect-secret"
              label={values.hasSecret ? '새 연동 키 (교체할 때만 입력)' : '연동 키'}
              type="password"
              value={values.secretInput}
              disabled={!canUpdate}
              maxLength={SECRET_MAX}
              onChange={(event) => patch({ secretInput: event.target.value })}
            />
            <p style={hintStyle}>
              {values.hasSecret
                ? '비워 두면 저장된 키가 그대로 유지됩니다. 저장된 키는 다시 보여 드릴 수 없습니다.'
                : '홈페이지에서 이벤트를 보낼 때 서명에 쓰는 키입니다. 저장 후에는 다시 보여 드릴 수 없습니다.'}
            </p>

            <p style={hintStyle}>{`마지막 변경: ${AUDIT.updatedBy} · ${AUDIT.updatedAt}`}</p>

            {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 — 눌러 보고 403 을 받는 자리를 만들지 않는다 */}
            {canUpdate && (
              <div style={footerStyle}>
                <p style={hintStyle}>
                  {dirty ? '저장하지 않은 변경 사항이 있습니다.' : '변경 사항이 없습니다.'}
                </p>
                <Button variant="secondary" type="button">
                  취소
                </Button>
                <Button variant="primary" type="button" disabled={!dirty} onClick={submit}>
                  저장
                </Button>
              </div>
            )}
          </div>
        </Card>
      </form>

      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>최근 유입 관측</h2>
          <p style={hintStyle}>
            주문·문의·회원의 <strong>최초 접점</strong>입니다. 마지막 접점으로 덮어쓰지 않습니다 —
            그러면 광고 기여도가 마지막 클릭으로 뭉개집니다. 관측값이므로 이 화면에서 고칠 수
            없습니다.
          </p>

          {observations.length === 0 ? (
            <p style={hintStyle}>아직 도착한 유입 이벤트가 없습니다.</p>
          ) : (
            <div style={tableScrollStyle}>
              <Table
                caption="최초 접점 기준 최신순 — 조회 전용입니다. 관측값이라 편집 표면이 없습니다."
                columns={OBSERVATION_COLUMNS}
                rows={rows}
              />
            </div>
          )}
        </div>
      </Card>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="사이트 연동 저장"
          message={
            pending.enabled
              ? '저장하는 즉시 이 도메인에서 오는 이벤트를 받기 시작합니다. 저장할까요?'
              : '연동이 꺼진 채로 저장합니다. 홈페이지에서 보내는 이벤트는 모두 거절됩니다. 저장할까요?'
          }
          onConfirm={() => {
            // 저장된 문서가 새 기준선이다 — 키 입력 칸은 다시 비워진다(평문을 들고 있지 않는다)
            setValues((current) => ({
              ...current,
              hasSecret: current.hasSecret || current.secretInput.trim() !== '',
              secretInput: '',
            }));
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
 * 정상(초기): 연동 꺼짐 · 도메인 없음 · 키 없음. 토글은 **잠겨 있고 왜 잠겼는지를 말한다** —
 * 가드가 저장이 아니라 토글에 걸린다는 사실이 여기서 보인다.
 */
export const Default: Story = {
  render: () => <SiteConnectScreen />,
};

/**
 * 연결됨: 키는 **저장 여부만** 보인다 — 고정 길이 글리프는 가린 표시가 아니라 우리가 가진
 * 정보의 전부다. 유입 관측은 채널 8종 + direct 로만 들어온다.
 */
export const Connected: Story = {
  render: () => <SiteConnectScreen seed={CONNECTED_VALUES} />,
};

/** 키 없음: 도메인은 넣었지만 서명을 검증할 키가 없어 아직 켤 수 없다 — 사유가 그 자리에 선다 */
export const SecretMissing: Story = {
  render: () => <SiteConnectScreen seed={NO_SECRET_VALUES} />,
};

/**
 * 잘못된 허용 출처: 경로가 붙은 값은 브라우저의 Origin 헤더와 영영 일치하지 않아 **모든 이벤트가
 * 조용히 거절된다.** 그래서 저장이 아니라 연동을 켜는 것이 막힌다.
 */
export const InvalidOrigin: Story = {
  render: () => <SiteConnectScreen seed={BAD_ORIGIN_VALUES} />,
};

/** 저장 확인: 켜는 순간부터 이벤트를 받기 시작한다 — 클릭 한 번으로 바뀌지 않게 한 번 더 묻는다 */
export const SaveConfirm: Story = {
  render: () => <SiteConnectScreen seed={CONNECTED_VALUES} confirmOpen />,
};

/** 조회 권한만: 저장 컨트롤 자체가 없고 모든 입력이 잠긴다(EXC-03) */
export const ReadOnly: Story = {
  render: () => <SiteConnectScreen seed={CONNECTED_VALUES} canUpdate={false} />,
};

/** 아직 도착한 이벤트가 없음: 웹훅 수신을 흉내 내지 않는다 — 없으면 없다고 말한다 */
export const NoObservations: Story = {
  render: () => <SiteConnectScreen seed={CONNECTED_VALUES} observations={[]} />,
};
