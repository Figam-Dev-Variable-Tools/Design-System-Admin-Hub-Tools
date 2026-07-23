/**
 * Design System/Templates/Content/FAQ Detail — FAQ 상세 조회 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/faq/:id` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "FAQ"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 `['/content/faq', 'FAQ', 'FAQ']` 의 하위 화면).
 *
 * 대응 실화면: apps/admin/src/pages/content/faq/FaqDetailPage.tsx (라우트 /content/faq/:id).
 * 패턴은 공지 상세와 같다 — **읽기 전용 뷰 + 상단 액션 두 개**(수정 → 폼 / 삭제 → 확인 다이얼로그).
 * 공지 상세보다 메타가 얕다: FAQ 는 작성자·조회수가 없고 카테고리와 정렬 순서만 있으며, 노출 여부가
 * 제목 옆 배지 하나로 요약된다(숨김이면 사용자 화면에 나타나지 않는다는 사실이 여기서만 보인다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)               → 토큰만 쓴 <h2> + Card aria-labelledby (DS Card 는 표면만 소유)
 *   dlStyle/dtStyle/ddStyle(앱) → 토큰만 쓴 dl/dt/dd 격자
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로(뒤로가기)     → Button(ghost) + Icon(chevron-left)
 *   수정 · 삭제 상단 액션   → Button(secondary) · Button(danger)
 *   본문 카드              → Card (제목 <h2> 는 토큰 레이아웃으로 조립)
 *   노출 여부 배지         → StatusBadge (노출=success · 숨김=neutral)
 *   카테고리 · 정렬 순서    → dl/dt/dd (토큰 레이아웃)
 *   답변(줄바꿈 보존)      → 토큰만 쓴 <p>(white-space: pre-wrap)
 *   조회 중                → Card + Skeleton ×4 (aria-busy)
 *   조회 실패              → Alert(danger) + 다시 시도 / 목록으로 Button
 *   삭제 확인              → ConfirmDialog(intent=delete)
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
  title: 'Design System/Templates/Content/FAQ Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 규칙(실화면 content/faq/types.ts 미러 — @tds/ui 경계라 값으로 복사) ─────────────── */

/** 노출 여부의 색 의도 — 노출=성공, 숨김=중립 */
const visibilityTone = (visible: boolean): StatusBadgeTone => (visible ? 'success' : 'neutral');
const visibilityLabel = (visible: boolean): string => (visible ? '노출' : '숨김');

/* ── 데모 데이터(실화면 Faq = 목록 행 + 답변(answer)) ───────────────────────────────────────── */

interface DemoFaq {
  readonly id: string;
  readonly question: string;
  readonly categoryLabel: string;
  readonly visible: boolean;
  readonly order: number;
  /** 답변 — 목록 응답에는 없고 상세에서만 내려온다 */
  readonly answer: string;
}

const VISIBLE_FAQ: DemoFaq = {
  id: 'FAQ-002',
  question: '결제 수단은 무엇이 있나요',
  categoryLabel: '결제',
  visible: true,
  order: 2,
  answer:
    '신용·체크카드, 계좌이체, 간편결제(카카오페이·네이버페이·토스페이)를 지원합니다.\n\n' +
    '· 무이자 할부는 카드사 정책에 따라 매월 달라져요.\n' +
    '· 해외 발행 카드는 일부 결제가 제한될 수 있어요.\n\n' +
    '고객센터 운영 시간(평일 09:00~18:00)에 1:1 문의를 남기시면 순차적으로 안내해 드려요.',
};

const HIDDEN_FAQ: DemoFaq = {
  id: 'FAQ-006',
  question: '결제 취소는 언제까지 가능한가요',
  categoryLabel: '결제',
  visible: false,
  order: 6,
  answer:
    '결제 취소 정책 개정 작업 중이라 잠시 숨겨 둔 항목입니다.\n\n' +
    '· 배송 준비 전: 즉시 전액 취소\n' +
    '· 배송 시작 후: 반품 절차로 진행\n\n' +
    '개정 확정 후 노출로 전환해 주세요.',
};

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계라 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

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

const answerTextStyle: CSSProperties = {
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

interface FaqDetailScreenProps {
  readonly state?: ScreenState;
  readonly faq?: DemoFaq;
}

function FaqDetailScreen({ state = 'default', faq = VISIBLE_FAQ }: FaqDetailScreenProps) {
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
            <span>FAQ 를 불러오지 못했어요.</span>
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
            {[0, 1, 2, 3].map((row) => (
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
            {faq.question}
            <StatusBadge tone={visibilityTone(faq.visible)} label={visibilityLabel(faq.visible)} />
          </span>
        }
      >
        <dl style={dlStyle}>
          <dt style={dtStyle}>카테고리</dt>
          <dd style={ddStyle}>{faq.categoryLabel}</dd>

          <dt style={dtStyle}>정렬 순서</dt>
          <dd style={ddStyle}>{fmt(faq.order)}</dd>
        </dl>

        <p style={answerTextStyle}>{faq.answer}</p>
      </TitledCard>

      {confirming && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 삭제"
          message={`'${faq.question}' FAQ 를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="FAQ 삭제"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** 정상: 노출 중인 FAQ — 노출 배지 + 카테고리/정렬 순서 + 줄바꿈을 보존한 답변 */
export const Default: Story = {
  render: () => <FaqDetailScreen />,
};

/** 숨김: 노출 배지가 중립으로 바뀐다 — 사용자 화면에 나타나지 않는다는 사실이 여기서만 보인다 */
export const Hidden: Story = {
  render: () => <FaqDetailScreen faq={HIDDEN_FAQ} />,
};

/** 조회 중: 카드 본문 스켈레톤(aria-busy) — 데이터가 아직 **없을** 때만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <FaqDetailScreen state="loading" />,
};

/** 삭제 확인: 상단 삭제 → ConfirmDialog(intent=delete) — 되돌릴 수 없음을 문구가 직접 말한다 */
export const ConfirmDelete: Story = {
  render: () => <FaqDetailScreen state="confirmDelete" />,
};

/** 조회 실패: 인라인 Alert(danger) + 다시 시도 / 목록으로 — 화면이 비어 사라지면 안 되는 실패 */
export const LoadError: Story = {
  render: () => <FaqDetailScreen state="error" />,
};
