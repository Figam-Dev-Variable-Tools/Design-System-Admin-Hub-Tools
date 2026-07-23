/**
 * Design System/Templates/Admins/Admin Detail — 운영자 상세 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Admins` 다 — _data/pages.ts 의 Users 그룹에서 이 화면(`/users/admins/:id`)의
 * 영문명은 "Admins", 스크린명은 "Admin Detail" 이다.
 *
 * 대응 실화면: apps/admin/src/pages/admins/AdminDetailPage.tsx (라우트 /users/admins/:id) 와 그 하위
 * 읽기 카드 3장(components/AdminProfileCards: 기본 정보 · 소속·권한 · 관리자 메모).
 *
 * [이 화면이 회원 상세와 다른 것] 운영자에게는 등급·적립금·쿠폰·동의 개념이 **없다**. 계정·닉네임·
 * 연락처·부서·직급·그룹(발신 프로필)·역할·가입일·메모만 보여 준다(실화면 머리말 §이 화면이 새로 생긴 이유).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 논리 카드 ↔ DS 컴포넌트 매핑:
 *   목록 복귀 버튼            → 토큰만 쓴 <button> + Icon(chevron-left)
 *   제목 + 수정/삭제 액션     → 토큰 <h1> + Button(secondary/danger) + Icon(pencil/trash)
 *   삭제 잠금 사유 배너       → Alert(tone="info")   ·   조회 실패     → Alert(tone="danger")
 *   각 카드 표면             → Card (제목은 대응 DS 컴포넌트가 없어 토큰만 쓴 <h2> 로 조립)
 *   현재 로그인 계정 / 시스템 역할 → StatusBadge(info / warning)
 *   기본 정보·소속·권한       → dl/dt/dd (토큰만 쓴 로컬 레이아웃 — 신규 DS 컴포넌트 아님)
 *   로딩 스켈레톤            → Card + Skeleton ×6
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { Alert, Button, Card, Icon, inlineBadgeRowStyle, Skeleton, StatusBadge } from '../../src';
import { cssVar, typography } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/Admins/Admin Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터 — 실화면 AdminUser + 배정 역할(Role)을 대표값으로 인라인 ─────────────────────── */

interface DemoAdmin {
  readonly nickname: string;
  readonly account: string;
  readonly group: string;
  readonly roleName: string;
  readonly roleSystem: boolean;
  readonly joinedAt: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly memo: string;
}

const ADMIN: DemoAdmin = {
  nickname: '김운영',
  account: 'operator@tds.local',
  group: '최고 관리자',
  roleName: '최고 관리자',
  roleSystem: true,
  joinedAt: '2025-01-04',
  department: '운영본부',
  position: '본부장',
  phone: '010-1234-5678',
  memo: '전사 운영 총괄. 인수인계 문서는 사내 위키 /ops/handbook 참조.\n야간 장애 1차 대응 담당(온콜 로테이션 A조).',
};

/* ── 로컬 레이아웃 조립 (신규 DS 컴포넌트 아님 — 토큰만 쓴 표면/타이포) ────────────────────────── */

const EMPTY_MARK = '—';
const orDash = (value: string): string => (value.trim() === '' ? EMPTY_MARK : value);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  border: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  cursor: 'pointer',
  ...typography('typography.label.md'),
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  margin: 0,
  color: cssVar('color.text.default'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0, max-content) minmax(0, 1fr)`,
  columnGap: cssVar('space.4'),
  rowGap: cssVar('space.3'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const memoStyle: CSSProperties = {
  ...typography('typography.body.md'),
  margin: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  color: cssVar('color.text.default'),
};

const cardsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** DS Card 는 표면만 소유한다(CardTitle 부재) — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다 */
function DetailCard({
  title,
  children,
}: {
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

/* ── 읽기 카드 3장 (실화면 AdminProfileCards 미러 — 전부 읽기 전용) ──────────────────────────── */

function AdminProfileCards({ isSelf }: { readonly isSelf: boolean }) {
  return (
    <div style={cardsStyle}>
      <DetailCard
        title={
          <>
            기본 정보
            {isSelf && <StatusBadge tone="info" label="현재 로그인 계정" />}
          </>
        }
      >
        <dl style={dlStyle}>
          <Row label="계정">{ADMIN.account}</Row>
          <Row label="닉네임">{ADMIN.nickname}</Row>
          <Row label="연락처">{orDash(ADMIN.phone)}</Row>
          <Row label="부서">{orDash(ADMIN.department)}</Row>
          <Row label="직급">{orDash(ADMIN.position)}</Row>
          <Row label="가입일">{ADMIN.joinedAt}</Row>
        </dl>
      </DetailCard>

      <DetailCard title="소속 · 권한">
        <dl style={dlStyle}>
          {/* 그룹은 운영진 그룹이자 메시지 템플릿의 발신 프로필이다(shared/domain/admin-group.ts) */}
          <Row label="그룹(발신 프로필)">{orDash(ADMIN.group)}</Row>
          <Row label="역할">
            <span style={inlineBadgeRowStyle}>
              {ADMIN.roleName}
              {ADMIN.roleSystem && <StatusBadge tone="warning" label="시스템 역할" />}
            </span>
          </Row>
        </dl>
      </DetailCard>

      <DetailCard title="관리자 메모">
        {/* 빈 상태 — 없는 것을 빈 칸으로 두면 '아직 안 불러온 것' 과 구분되지 않는다 */}
        {ADMIN.memo === '' ? (
          <p style={hintStyle}>등록된 메모가 없어요.</p>
        ) : (
          <p style={memoStyle}>{ADMIN.memo}</p>
        )}
      </DetailCard>
    </div>
  );
}

/* ── 화면 조립 ────────────────────────────────────────────────────────────────────────────── */

type DetailState = 'default' | 'loading' | 'error' | 'self-locked';

const blockReasonId = 'admin-delete-block-reason';

function AdminDetailScreen({ state }: { state: DetailState }) {
  const loading = state === 'loading';
  const isSelf = state === 'self-locked';

  // 자기 자신은 삭제할 수 없다(guards.ts) — 잠긴 사유는 버튼 옆이자 배너로 함께 밝힌다
  const blockReason = isSelf
    ? '자기 자신은 삭제할 수 없어요. 다른 시스템 관리자에게 요청하세요.'
    : null;
  const deletable = !loading && blockReason === null;

  // [EXC-12] 404 는 재시도를 권하지 않는다 — 이미 삭제된 운영자에게 '다시 시도' 는 영원히 실패한다
  if (state === 'error') {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>운영자를 찾을 수 없어요. 이미 삭제되었을 수 있어요.</span>
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button type="button" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div style={headerStyle}>
        <h1 style={pageTitleStyle}>{loading ? '운영자 상세' : ADMIN.nickname}</h1>

        {!loading && (
          <div style={actionsStyle}>
            {/* 누를 수 없는 것은 보여 주지 않는다(EXC-03) — 여기서는 권한 있음으로 가정해 둘 다 그린다 */}
            <Button variant="secondary" iconLeft={<Icon name="pencil" />}>
              수정
            </Button>
            {/* 삭제는 권한이 있어도 가드에 걸리면 잠긴다 — 잠긴 버튼 + 사유(aria-describedby) */}
            <Button
              variant="danger"
              iconLeft={<Icon name="trash" />}
              disabled={!deletable}
              {...(blockReason !== null && { 'aria-describedby': blockReasonId })}
            >
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 규칙에 막힌 상태(잠긴 버튼)는 '왜 안 되는지' 를 말해 줘야 한다 — info 배너로 사유를 밝힌다 */}
      {blockReason !== null && (
        <Alert tone="info">
          <span id={blockReasonId}>{blockReason}</span>
        </Alert>
      )}

      {loading ? (
        <Card>
          {/* [STATE-01] 코드가 아니라 데이터가 오는 중이다 — 화면이 스스로 aria-busy 로 알린다 */}
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <AdminProfileCards isSelf={isSelf} />
      )}
    </div>
  );
}

/** 정상 — 읽기 카드 3장이 채워진 운영자 상세(실화면 data 로드 완료) */
export const Default: Story = {
  render: () => <AdminDetailScreen state="default" />,
};

/** 로딩 — data 미도착 시 실화면이 그리는 카드 스켈레톤 6줄(STATE-01: data === undefined) */
export const Loading: Story = {
  render: () => <AdminDetailScreen state="loading" />,
};

/** 에러 — 404: 이미 삭제된 운영자. 재시도 대신 '목록으로' 만 준다(EXC-12) */
export const Error: Story = {
  render: () => <AdminDetailScreen state="error" />,
};

/** 삭제 잠김 — 현재 로그인 본인 상세: '현재 로그인 계정' 배지 + 삭제 버튼 잠금 + info 사유 배너(guards.ts) */
export const SelfLocked: Story = {
  render: () => <AdminDetailScreen state="self-locked" />,
};
