/**
 * Design System/Templates/Content/Notice Detail — 공지 상세 조회 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/notices/:id` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Notices"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 `['/content/notices', '공지사항', 'Notices']` 의 하위 화면).
 *
 * 대응 실화면: apps/admin/src/pages/content/notices/NoticeDetailPage.tsx (라우트 /content/notices/:id).
 * 상세는 **읽기 전용 뷰 + 상단 액션 두 개**다 — 수정은 폼(/content/notices/:id/edit)으로 보내고 삭제는
 * 확인 다이얼로그를 거친다. 저장이 없는 화면이라 폼 컨트롤이 하나도 없고, 본문은 줄바꿈을 보존한
 * 평문(pre-wrap)으로만 그린다. 조회 실패는 화면이 비어 버리므로 사라지는 토스트가 아니라 인라인
 * 배너(다시 시도 · 목록으로)로 남긴다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)   → 토큰만 쓴 <h2> + Card aria-labelledby (DS Card 는 표면만 소유)
 *   dlStyle/dtStyle/ddStyle(앱) → 토큰만 쓴 dl/dt/dd 격자
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로(뒤로가기)         → Button(ghost) + Icon(chevron-left)
 *   수정 · 삭제 상단 액션       → Button(secondary) · Button(danger)
 *   본문 카드                  → Card (제목 <h2> 는 토큰 레이아웃으로 조립)
 *   상단 고정 표식             → StatusBadge(warning, '고정')
 *   게시 상태 배지             → StatusBadge (게시=success · 임시저장=neutral · 예약=info)
 *   분류·작성자·게시일·조회수   → dl/dt/dd (토큰 레이아웃)
 *   본문(줄바꿈 보존)          → 토큰만 쓴 <p>(white-space: pre-wrap)
 *   조회 중                    → Card + Skeleton ×5 (aria-busy)
 *   조회 실패                  → Alert(danger) + 다시 시도 / 목록으로 Button
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  inlineBadgeRowStyle,
  Skeleton,
  StatusBadge,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Notice Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 라벨·톤(실화면 content/notices/types.ts 미러 — @tds/ui 경계라 값으로 복사) ─────────── */

type NoticeCategory = 'notice' | 'event' | 'maintenance';
type NoticeStatus = 'published' | 'draft' | 'scheduled';

const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  notice: '공지',
  event: '이벤트',
  maintenance: '점검',
};

const STATUS_LABEL: Record<NoticeStatus, string> = {
  published: '게시',
  draft: '임시저장',
  scheduled: '예약',
};

const STATUS_TONE: Record<NoticeStatus, StatusBadgeTone> = {
  published: 'success',
  draft: 'neutral',
  scheduled: 'info',
};

/* ── 데모 데이터(실화면 Notice = 목록 행 + 본문(body)) ───────────────────────────────────────── */

interface DemoNotice {
  readonly id: string;
  readonly title: string;
  readonly category: NoticeCategory;
  readonly status: NoticeStatus;
  readonly pinned: boolean;
  readonly author: string;
  readonly publishedAtIso: string;
  readonly views: number;
  /** 본문 — 목록 응답에는 없고 상세에서만 내려온다 */
  readonly body: string;
}

const PUBLISHED_NOTICE: DemoNotice = {
  id: 'NT-001',
  title: '[중요] 개인정보 처리방침 개정 안내',
  category: 'notice',
  status: 'published',
  pinned: true,
  author: '콘텐츠 운영팀',
  publishedAtIso: '2026-07-20T09:00:00',
  views: 3820,
  body:
    '개인정보 처리방침 개정 관련 상세 내용입니다.\n\n' +
    '안녕하세요. 콘텐츠 운영팀입니다. 아래 내용을 확인해 주세요.\n' +
    '· 적용 일자: 2026년 8월 1일\n' +
    '· 주요 변경: 위탁 업체 추가, 보관 기간 명확화\n' +
    '· 적용 대상: 전체 회원\n' +
    '· 문의: 고객센터 1:1 문의\n\n' +
    '개정 내용에 동의하지 않으시는 경우 서비스 탈퇴가 가능해요. 감사해요.',
};

const SCHEDULED_NOTICE: DemoNotice = {
  id: 'NT-003',
  title: '정기 점검 안내 (07/25 02:00~05:00)',
  category: 'maintenance',
  status: 'scheduled',
  pinned: false,
  author: '시스템 관리자',
  publishedAtIso: '2027-01-25T02:00:00',
  views: 0,
  body:
    '더 안정적인 서비스 제공을 위해 정기 점검을 진행합니다.\n\n' +
    '· 점검 일시: 2027년 1월 25일(월) 02:00 ~ 05:00 (3시간)\n' +
    '· 점검 대상: 결제 모듈, 주문 조회\n' +
    '· 점검 중에는 결제와 주문 조회가 일시 중단돼요.\n\n' +
    '이용에 불편을 드려 죄송해요.',
};

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계라 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 'YYYY-MM-DD HH:mm' — 실화면 shared/format.formatDateTime 규약 */
const formatDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr)',
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
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const bodyTextStyle: CSSProperties = {
  ...typography('typography.body.md'),
  margin: 0,
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 만들고 aria 로 잇는다) ─────── */

function TitledCard({ title, children }: { title: ReactNode; children: ReactNode }) {
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

type ScreenState = 'default' | 'loading' | 'error' | 'confirmDelete';

interface NoticeDetailScreenProps {
  readonly state?: ScreenState;
  readonly notice?: DemoNotice;
}

function NoticeDetailScreen({
  state = 'default',
  notice = PUBLISHED_NOTICE,
}: NoticeDetailScreenProps) {
  const [confirming, setConfirming] = useState(state === 'confirmDelete');

  const backLink = (
    <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
      목록으로
    </Button>
  );

  if (state === 'error') {
    return (
      <div style={pageStyle}>
        <div style={topRowStyle}>{backLink}</div>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>공지를 불러오지 못했어요.</span>
            <span style={actionsStyle}>
              <Button variant="secondary">다시 시도</Button>
              <Button variant="secondary">목록으로</Button>
            </span>
          </div>
        </Alert>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div style={pageStyle}>
        {/* 상단 수정·삭제는 데이터가 도착한 뒤에만 그린다 — 없는 대상에 액션을 걸 수 없다 */}
        <div style={topRowStyle}>{backLink}</div>
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        {backLink}
        <div style={actionsStyle}>
          <Button variant="secondary">수정</Button>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            삭제
          </Button>
        </div>
      </div>

      <TitledCard
        title={
          <span style={inlineBadgeRowStyle}>
            {notice.pinned && <StatusBadge tone="warning" label="고정" />}
            {notice.title}
            <StatusBadge tone={STATUS_TONE[notice.status]} label={STATUS_LABEL[notice.status]} />
          </span>
        }
      >
        <dl style={dlStyle}>
          <dt style={dtStyle}>분류</dt>
          <dd style={ddStyle}>{CATEGORY_LABEL[notice.category]}</dd>

          <dt style={dtStyle}>작성자</dt>
          <dd style={ddStyle}>{notice.author}</dd>

          <dt style={dtStyle}>게시일</dt>
          <dd style={ddStyle}>{formatDateTime(notice.publishedAtIso)}</dd>

          <dt style={dtStyle}>조회수</dt>
          <dd style={ddStyle}>{fmt(notice.views)}</dd>
        </dl>

        <p style={bodyTextStyle}>{notice.body}</p>
      </TitledCard>

      {confirming && (
        <ConfirmDialog
          intent="delete"
          title="공지 삭제"
          message={`'${notice.title}' 공지를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="공지 삭제"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** 정상: 게시된 고정 공지 — 고정·상태 배지 + 메타 4항목 + 줄바꿈을 보존한 본문 */
export const Default: Story = {
  render: () => <NoticeDetailScreen />,
};

/** 조회 중: 카드 본문 스켈레톤(aria-busy) — 데이터가 아직 **없을** 때만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <NoticeDetailScreen state="loading" />,
};

/** 삭제 확인: 상단 삭제 → ConfirmDialog(intent=delete) — 되돌릴 수 없음을 문구가 직접 말한다 */
export const ConfirmDelete: Story = {
  render: () => <NoticeDetailScreen state="confirmDelete" />,
};

/** 예약 공지: 상태 배지 info + 미래 게시일 + 조회수 0 — 아직 게시되지 않은 공지의 모습 */
export const Scheduled: Story = {
  render: () => <NoticeDetailScreen notice={SCHEDULED_NOTICE} />,
};

/** 조회 실패: 인라인 Alert(danger) + 다시 시도 / 목록으로 — 화면이 비어 사라지면 안 되는 실패 */
export const LoadError: Story = {
  render: () => <NoticeDetailScreen state="error" />,
};
