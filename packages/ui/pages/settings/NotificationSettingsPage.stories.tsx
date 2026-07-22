/**
 * Design System/Templates/Settings/Notifications — 알림 설정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/settings/notifications` → 메뉴 en = "Settings"(시스템 설정),
 * 화면 en = "Notifications" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Settings 그룹의
 * `['/settings/notifications', '알림 설정', 'Notifications']`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/notifications/NotificationSettingsPage.tsx
 * (라우트 /settings/notifications) 와 알림 층의 카탈로그·문서(shared/notifications).
 *
 * [이 화면이 하는 일은 하나다] 알림 종류마다 **받을지 말지**를 정한다. 종류를 만들거나 문구를
 * 고치는 자리가 아니다 — 종류는 코드가 아는 사실이고 상수 카탈로그가 정본이다. 운영자가 알림
 * 종류를 발명하기 시작하면 같은 사건이 세 이름으로 쌓이고, '문의 알림만 끄기' 같은 설정은 만들
 * 수 없게 된다.
 *
 * [끈 알림은 만들어지지도 않는다] 목록에서 감추는 것이 아니라 애초에 넣지 않는다 — 감추기만
 * 하면 안읽음 수는 계속 오르고, 벨에 점이 떠 있는데 열면 아무것도 없는 상태가 된다. 그래서
 * 하나라도 꺼 두면 화면이 **그 결과를 미리 말한다**: 그 사건들은 목록을 직접 새로고침해야 안다.
 *
 * [권한이 언제나 먼저다] 여기서 켜 두어도 그 화면의 조회 권한이 없으면 알림은 오지 않는다.
 * 수신 설정은 '보고 싶은가' 이고 권한은 '볼 수 있는가' 다 — 순서가 바뀌면 알림이 권한 우회로가
 * 된다.
 *
 * [경로는 nav 에서 파생된다] 각 종류는 사이드바 잎 하나를 가리키고, 상세 주소는 그 잎 + 항목
 * id 로 만든다. 알림이 자기 경로를 통째로 들고 있으면 메뉴가 옮겨진 날 알림만 옛 주소로 가고,
 * 그 사실은 사용자가 404 를 만나고 나서야 알려진다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   설정 카드 · 제목        → Card + 토큰 <h2>
 *   기한 경고 종류 배지      → StatusBadge(warning)
 *   종류별 수신 토글        → ToggleSwitch
 *   조회 권한 안내 · 끈 종류 경고 → Alert(info · warning)
 *   조회 실패 + 다시 시도     → Alert(danger) + Button(secondary)
 *   최초 로드               → Skeleton
 *   저장                   → Button(primary) + 토큰 <p>(변경 여부 안내)
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
  Skeleton,
  StatusBadge,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Notifications',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 알림 종류 카탈로그(실화면 shared/notifications/catalog.ts 미러) ────────────────────────── */

/** 색 의도 — 기한 초과처럼 이미 늦은 것과 방금 도착한 것을 눈으로 가른다 */
type NotificationSeverity = 'info' | 'warning';

interface NotificationKindDef {
  readonly id: string;
  readonly label: string;
  /** 이 종류가 무엇을 알리는지 — 설정 화면이 그대로 보여 준다 */
  readonly description: string;
  /** 이 알림이 데려가는 **사이드바 잎**. 상세 주소는 그 잎 + 항목 id 로 만든다 */
  readonly leafPath: string;
  readonly severity: NotificationSeverity;
}

/**
 * 알림 종류 8종.
 * 고른 기준: **운영자가 모르면 손해가 나는 것**만. '상품이 수정되었습니다' 처럼 운영자가 직접
 * 한 일은 알림이 아니다 — 자기가 방금 한 일을 다시 알려 주는 것은 소음이고, 소음이 쌓이면
 * 정말 중요한 알림도 함께 무시된다.
 */
const NOTIFICATION_KINDS: readonly NotificationKindDef[] = [
  {
    id: 'product-inquiry-new',
    label: '상품 문의 접수',
    description: '새 상품 문의가 들어오면 알립니다.',
    leafPath: '/products/inquiries',
    severity: 'info',
  },
  {
    id: 'product-inquiry-sla',
    label: '상품 문의 응답 기한 임박',
    description: '약속한 응답 기한(3일)을 넘길 상품 문의를 알립니다.',
    leafPath: '/products/inquiries',
    severity: 'warning',
  },
  {
    id: 'program-inquiry-new',
    label: '프로그램 문의 접수',
    description: '새 프로그램 문의가 들어오면 알립니다.',
    leafPath: '/programs/inquiries',
    severity: 'info',
  },
  {
    id: 'program-inquiry-sla',
    label: '프로그램 문의 응답 기한 임박',
    description: '약속한 응답 기한(2일)을 넘길 프로그램 문의를 알립니다.',
    leafPath: '/programs/inquiries',
    severity: 'warning',
  },
  {
    id: 'order-new',
    label: '주문 접수',
    description: '새 주문이 들어오면 알립니다.',
    leafPath: '/orders',
    severity: 'info',
  },
  {
    id: 'order-claim',
    label: '취소·교환·반품 요청',
    description: '클레임이 접수되면 알립니다.',
    leafPath: '/orders/claims',
    severity: 'warning',
  },
  {
    id: 'member-signup',
    label: '신규 회원가입',
    description: '새 회원이 가입하면 알립니다.',
    leafPath: '/users/members',
    severity: 'info',
  },
  {
    id: 'support-ticket-new',
    label: '1:1 문의 접수',
    description: '새 1:1 문의가 들어오면 알립니다.',
    leafPath: '/support/tickets',
    severity: 'info',
  },
];

/** 종류 id → 수신 여부. 저장되는 문서는 이것 하나뿐이다 */
type NotificationPrefs = Readonly<Record<string, boolean>>;

/** 기본값은 전부 받음 — 조회에 실패해도 이 기준선을 그린다(빈 목록을 그리지 않는다) */
const ALL_ON: NotificationPrefs = Object.fromEntries(
  NOTIFICATION_KINDS.map((kind) => [kind.id, true]),
);

/** 둘을 꺼 둔 상태 — 끈 종류가 있으면 화면이 그 결과를 미리 말한다 */
const SOME_OFF: NotificationPrefs = {
  ...ALL_ON,
  'member-signup': false,
  'order-new': false,
};

/** 초안이 서버 값과 다른가 — 파생값이므로 저장하지 않는다 */
const keyOf = (prefs: NotificationPrefs): string =>
  NOTIFICATION_KINDS.map((kind) => `${kind.id}:${String(prefs[kind.id] ?? true)}`).join('|');

const fmt = (value: number): string => value.toLocaleString('ko-KR');

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

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface NotificationSettingsScreenProps {
  readonly seed?: NotificationPrefs;
  readonly canUpdate?: boolean;
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
}

function NotificationSettingsScreen({
  seed = ALL_ON,
  canUpdate = true,
  loading = false,
  loadFailed = false,
}: NotificationSettingsScreenProps) {
  const [draft, setDraft] = useState<NotificationPrefs>(seed);

  const dirty = keyOf(draft) !== keyOf(seed);
  const offCount = NOTIFICATION_KINDS.filter((kind) => draft[kind.id] === false).length;

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>알림 설정</h1>
      <p style={descriptionStyle}>
        어떤 일이 일어났을 때 헤더의 알림 벨에 표시할지 정합니다. 끈 종류는 목록에서 감추는 것이
        아니라 <strong>애초에 만들지 않습니다</strong>.
      </p>

      {/* 조회 실패와 '설정이 없음' 은 다른 사실이다 — 실패를 따로 말하고 기본값을 그린다 */}
      {loadFailed && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>알림 설정을 불러오지 못했습니다. 아래는 기본값(전부 받음)입니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      )}

      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>알림 종류</h2>

          <p style={hintStyle}>
            여기서 켜 두어도 그 화면의 조회 권한이 없으면 알림은 오지 않습니다 — 알림이 권한
            우회로가 되지 않도록 권한이 언제나 먼저입니다.
          </p>

          {!canUpdate && (
            <Alert tone="info">조회 권한만 있어 알림 설정을 변경할 수 없습니다.</Alert>
          )}
          {offCount > 0 && (
            <Alert tone="warning">
              {`${fmt(offCount)}개 종류를 받지 않도록 설정했습니다. 그 사건들은 목록을 직접 새로고침해야 알 수 있습니다.`}
            </Alert>
          )}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true" aria-label="알림 설정을 불러오는 중">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            NOTIFICATION_KINDS.map((kind) => (
              <div key={kind.id} style={rowStyle}>
                <span style={infoStyle}>
                  <span style={titleRowStyle}>
                    <span style={labelStyle}>{kind.label}</span>
                    {kind.severity === 'warning' && (
                      <StatusBadge tone="warning" label="기한 경고" />
                    )}
                  </span>
                  <span style={hintStyle}>{kind.description}</span>
                  <span style={hintStyle}>{`이동 위치: ${kind.leafPath}`}</span>
                </span>

                <ToggleSwitch
                  checked={draft[kind.id] ?? true}
                  label={`${kind.label} 알림 받기`}
                  onLabel="받음"
                  offLabel="받지 않음"
                  disabled={!canUpdate || loading}
                  onChange={(next) => setDraft((current) => ({ ...current, [kind.id]: next }))}
                />
              </div>
            ))
          )}

          {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 — 눌러 보고 403 을 받는 자리를 만들지 않는다 */}
          {canUpdate && (
            <div style={actionsStyle}>
              <p style={hintStyle}>
                {dirty ? '저장하지 않은 변경 사항이 있습니다.' : '변경 사항이 없습니다.'}
              </p>
              <Button variant="primary" size="md" disabled={!dirty || loading}>
                저장
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** 정상: 8종 전부 받는 상태 — 기한 경고 종류는 배지로 갈려 보인다 */
export const Default: Story = {
  render: () => <NotificationSettingsScreen />,
};

/** 최초 로드: 종류 목록 자리에 스켈레톤 — 저장 버튼은 그동안 눌리지 않는다(STATE-01) */
export const Loading: Story = {
  render: () => <NotificationSettingsScreen loading />,
};

/**
 * 일부 꺼 둠: 끈 종류는 감춰지는 것이 아니라 **애초에 만들어지지 않는다.** 그래서 화면이 그
 * 결과(목록을 직접 새로고침해야 안다)를 미리 말한다.
 */
export const SomeDisabled: Story = {
  render: () => <NotificationSettingsScreen seed={SOME_OFF} />,
};

/** 조회 권한만: 토글이 전부 잠기고 저장 컨트롤 자체가 없다(EXC-03) */
export const ReadOnly: Story = {
  render: () => <NotificationSettingsScreen canUpdate={false} />,
};

/** 조회 실패: '설정이 없음' 과 다른 사실이라 실패를 따로 말하고 기본값(전부 받음)을 그린다 */
export const LoadFailed: Story = {
  render: () => <NotificationSettingsScreen loadFailed />,
};
