/**
 * Design System/Templates/Products/Review Detail — 리뷰 상세 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/reviews/:id` → 메뉴 en = "Products"(상품 관리), 화면 en = "Reviews"
 * (packages/ui/pages/_data/pages.ts — Products 그룹의 `['/products/reviews', '리뷰', 'Reviews']`).
 *
 * 대응 실화면: apps/admin/src/pages/products/reviews/ReviewDetailPage.tsx (라우트 /products/reviews/:id)
 * 와 그 하위 조각(components/ReviewPreview). 왼쪽=리뷰 메타 + 노출 토글 + 답변 편집, 오른쪽=고객 화면
 * 렌더 미리보기의 2단 그리드.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 앱 전용 조각/스타일은 DS 표면 + 토큰 로컬 레이아웃으로 갈음한다:
 *   shared/ui CardTitle·dl/dt/dd·pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   ReviewPreview(앱 전용)                     → 토큰 미리보기 박스 + ImageThumb(포토)
 *
 * 실화면 논리 ↔ DS 컴포넌트 매핑:
 *   화면 제목/목록 복귀 → <h1> + Icon(chevron-left) 링크(토큰)
 *   리뷰 정보 카드      → Card + 로컬 CardTitle + dl/dt/dd + 별점(토큰 span)
 *   신고 접수           → Alert(warning) (신고 사유)   ·   저장 실패 → Alert(danger)
 *   노출 상태 토글      → ToggleSwitch   ·   관리자 답변 → TextareaField
 *   삭제/목록/저장      → Button(danger/secondary/primary)   ·   삭제 확인 → ConfirmDialog(intent=delete)
 *   고객 화면 미리보기   → Card + 로컬 미리보기(별점·작성자·본문·ImageThumb·판매자 답변·숨김 안내)
 *
 * 이미지(포토리뷰)는 인라인 SVG data: URI 로 만든다 — 원격 자원 금지(CSP). hex 리터럴을 피하려
 * SVG 내부도 CSS 이름 색만 쓴다. 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰과 calc 만 참조한다.
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
  ImageThumb,
  StatusBadge,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Review Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터 ──────────────────────────────────────────────────────────────────────────── */

type ReviewRating = 1 | 2 | 3 | 4 | 5;

const REVIEW_REPLY_MAX = 500;

/** 별점 → 채운 별 문자열(장식) — 실화면 starText 미러 */
const starText = (rating: ReviewRating): string =>
  '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);

/** 포토리뷰 이미지 — 인라인 SVG data: URI(원격 자원 금지). hex 회피 위해 CSS 이름 색만 사용 */
const photo = (label: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='whitesmoke'/><text x='60' y='64' font-size='14' text-anchor='middle' fill='slategray'>${label}</text></svg>`,
  )}`;

interface DemoReview {
  readonly productName: string;
  readonly author: string;
  readonly rating: ReviewRating;
  readonly content: string;
  readonly imageUrls: readonly string[];
  readonly createdAt: string;
  readonly reported: boolean;
  readonly reportReason: string;
}

const BASE_REVIEW: DemoReview = {
  productName: '베이직 크루넥 니트',
  author: '하루***',
  rating: 5,
  content:
    '핏이 딱 맞고 도톰해서 좋아요. 세탁 후에도 늘어나지 않고 보풀도 없네요. 재구매 의사 있습니다!',
  imageUrls: [photo('포토 1'), photo('포토 2')],
  createdAt: '2026-07-19',
  reported: false,
  reportReason: '',
};

/* ── 스타일(토큰·calc 만) ─────────────────────────────────────────────────────────────────── */

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
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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

const listStarStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  letterSpacing: '0.05em',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const rightActionsStyle: CSSProperties = {
  display: 'inline-flex',
  gap: cssVar('space.2'),
};

/* 미리보기(실화면 ReviewPreview 미러 — 토큰만 쓴 표면/타이포) */
const stageStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  padding: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const previewHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const previewStarStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  letterSpacing: '0.1em',
  ...typography('typography.label.md'),
};

const previewAuthorStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const previewContentStyle: CSSProperties = {
  margin: 0,
  ...typography('typography.body.md'),
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const photoRowStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const replyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  padding: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const replyLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const replyTextStyle: CSSProperties = {
  margin: 0,
  ...typography('typography.caption.md'),
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const hiddenNoteStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

/* ── 로컬 조립(신규 DS 컴포넌트 아님) ────────────────────────────────────────────────────────── */

function DetailCard({ title, children }: { title: ReactNode; children: ReactNode }) {
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

/** 고객 상품 페이지에 리뷰가 어떻게 보이는지 그대로 비춘다 — 실화면 ReviewPreview 미러 */
function ReviewPreview({
  review,
  reply,
  visible,
}: {
  review: DemoReview;
  reply: string;
  visible: boolean;
}) {
  return (
    <div style={stageStyle}>
      <div style={{ ...previewCardStyle, opacity: visible ? 1 : 0.55 }}>
        <div style={previewHeadStyle}>
          <span
            style={previewStarStyle}
            role="img"
            aria-label={`5점 만점에 ${String(review.rating)}점`}
          >
            {starText(review.rating)}
          </span>
          <span style={previewAuthorStyle}>
            {review.author} · {review.createdAt}
          </span>
        </div>

        <p style={previewContentStyle}>
          {review.content.trim() === '' ? '리뷰 내용' : review.content}
        </p>

        {review.imageUrls.length > 0 && (
          <div style={photoRowStyle}>
            {review.imageUrls.map((url, index) => (
              <ImageThumb
                key={`${url}-${String(index)}`}
                src={url}
                alt={`포토리뷰 ${String(index + 1)}`}
              />
            ))}
          </div>
        )}

        {reply.trim() !== '' && (
          <div style={replyStyle}>
            <span style={replyLabelStyle}>판매자 답변</span>
            <p style={replyTextStyle}>{reply}</p>
          </div>
        )}
      </div>

      {!visible && <p style={hiddenNoteStyle}>숨김 상태 — 고객 상품 페이지에 노출되지 않아요.</p>}
    </div>
  );
}

/* ── 화면 조립 ────────────────────────────────────────────────────────────────────────────── */

interface ReviewDetailScreenProps {
  /** 상세 데이터 — undefined 면 로딩(불러오는 중 카드) */
  readonly review?: DemoReview;
  /** 초기 노출 여부 */
  readonly initialVisible?: boolean;
  /** 초기 답변 */
  readonly initialReply?: string;
  /** 조회 실패 — 표 대신 목록 복귀 배너 */
  readonly errored?: boolean;
}

function ReviewDetailScreen({
  review,
  initialVisible = true,
  initialReply = '',
  errored = false,
}: ReviewDetailScreenProps) {
  const [reply, setReply] = useState(initialReply);
  const [visible, setVisible] = useState(initialVisible);
  const [confirming, setConfirming] = useState(false);

  if (errored) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>리뷰를 불러오지 못했어요. </span>
          <Button variant="secondary">목록으로</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <a href="#review-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <h1 style={pageTitleStyle}>리뷰 상세</h1>

      {review === undefined ? (
        <Card>
          <p style={hintStyle}>불러오는 중…</p>
        </Card>
      ) : (
        <div style={layoutStyle}>
          <DetailCard title="리뷰 정보">
            <dl style={dlStyle}>
              <dt style={dtStyle}>상품</dt>
              <dd style={ddStyle}>{review.productName}</dd>
              <dt style={dtStyle}>작성자</dt>
              <dd style={ddStyle}>{review.author}</dd>
              <dt style={dtStyle}>별점</dt>
              <dd style={ddStyle}>
                <span
                  style={listStarStyle}
                  role="img"
                  aria-label={`5점 만점에 ${String(review.rating)}점`}
                >
                  {starText(review.rating)}
                </span>
              </dd>
              <dt style={dtStyle}>작성일</dt>
              <dd style={ddStyle}>{review.createdAt}</dd>
            </dl>

            {review.reported && (
              <Alert tone="warning">
                <span>
                  신고 접수됨 — {review.reportReason === '' ? '사유 미기재' : review.reportReason}
                </span>
              </Alert>
            )}

            <div style={fieldStyle}>
              <span style={fieldLabelStyle}>노출 상태</span>
              <ToggleSwitch
                checked={visible}
                onChange={setVisible}
                label="리뷰 노출 여부"
                onLabel="노출"
                offLabel="숨김"
              />
            </div>

            <TextareaField
              label="관리자 답변"
              value={reply}
              onChange={setReply}
              maxLength={REVIEW_REPLY_MAX}
              placeholder="고객에게 보일 판매자 답변을 입력하세요. 비우면 답변이 노출되지 않아요."
              rows={5}
            />

            <div style={actionsStyle}>
              <Button variant="danger" onClick={() => setConfirming(true)}>
                리뷰 삭제
              </Button>
              <span style={rightActionsStyle}>
                <Button variant="secondary">목록으로</Button>
                <Button variant="primary" size="md">
                  저장
                </Button>
              </span>
            </div>
          </DetailCard>

          <DetailCard
            title={
              <>
                고객 화면 미리보기
                {review.reported && <StatusBadge tone="danger" label="신고" />}
              </>
            }
          >
            <ReviewPreview review={review} reply={reply} visible={visible} />
          </DetailCard>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          intent="delete"
          title="리뷰 삭제"
          message={`${review?.productName ?? ''} 리뷰를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="리뷰 삭제"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** 정상: 노출 중 · 포토리뷰 · 판매자 답변이 달린 리뷰(미리보기에 그대로 반영) */
export const Default: Story = {
  render: () => (
    <ReviewDetailScreen
      review={BASE_REVIEW}
      initialReply="소중한 후기 감사합니다. 앞으로도 좋은 상품으로 보답하겠습니다."
    />
  ),
};

/** 신고됨: 신고 사유 Alert(warning) + 미리보기 제목에 신고 배지(danger) */
export const Reported: Story = {
  render: () => (
    <ReviewDetailScreen
      review={{
        ...BASE_REVIEW,
        productName: '레더 스니커즈',
        author: '유진***',
        rating: 1,
        content: '한 번 신었는데 밑창이 벌어졌어요. 실망입니다.',
        imageUrls: [photo('신고 사진')],
        reported: true,
        reportReason: '허위·비방성 내용 신고',
      }}
      initialReply="불편을 드려 죄송합니다. 교환 또는 환불 도와드리겠습니다."
    />
  ),
};

/** 숨김: 노출 off — 미리보기가 흐려지고 '숨김 상태' 안내가 붙는다 */
export const Hidden: Story = {
  render: () => <ReviewDetailScreen review={BASE_REVIEW} initialVisible={false} />,
};

/** 로딩: 상세 데이터 미도착 — '불러오는 중…' 카드 */
export const Loading: Story = {
  render: () => <ReviewDetailScreen />,
};

/** 조회 실패: 표 대신 목록 복귀 배너(Alert danger) */
export const LoadError: Story = {
  render: () => <ReviewDetailScreen errored />,
};
