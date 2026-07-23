/**
 * Design System/Templates/Content/FAQ Form — FAQ 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/faq/new` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "FAQ"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 `['/content/faq', 'FAQ', 'FAQ']` 의 하위 화면).
 *
 * 대응 실화면: apps/admin/src/pages/content/faq/FaqFormPage.tsx
 * (라우트 /content/faq/new · /content/faq/:id/edit). 공지 폼과 같은 결로 **하나의 폼이 등록과 수정을
 * 겸한다**(:id 유무로 갈린다). 다른 점 둘: (1) 카테고리 선택지는 서버가 만드는 값이라 select 가 비어 있을
 * 수 있고 빈 값 옵션('카테고리를 선택하세요')이 필요하다, (2) **정렬 순서는 신규 등록 시 현재 최대 + 1 로
 * 자동으로 채워진다** — 사용자가 고칠 수 있는 기본값이다. 검증 규칙의 정본은 zod 스키마(validation.ts)이고
 * 화면은 판정 결과만 인라인으로 읽는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)          → 토큰만 쓴 <h2> + Card aria-labelledby (DS Card 는 표면만 소유)
 *   controlStyle(앱)       → 토큰만 쓴 input 스타일 함수(오류 시 danger 테두리)
 *   useUnsavedChangesDialog(앱) → 템플릿에는 없음(라우팅 가드는 앱의 사실)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   페이지 제목 · 안내       → 토큰만 쓴 <h1>(title.lg) + <p>(label.md)
 *   폼 카드 · 카드 제목      → Card + 토큰만 쓴 <h2>
 *   저장 실패 배너           → Alert(danger)
 *   질문(200자)             → TextField (required · maxLength · error)
 *   카테고리 select          → FormField + SelectField (빈 값 옵션 + isInvalid)
 *   정렬 순서(0 이상 정수)    → FormField + input[type=number] (자동 채움 + hint)
 *   사용자 화면에 노출 체크    → Checkbox
 *   답변(5000자 · 카운터)    → TextareaField
 *   취소 · 등록/저장         → Button(secondary) · Button(primary)
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
  Checkbox,
  FormField,
  formRowStyle,
  SelectField,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/FAQ Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 content/faq/types.ts · data-source.ts 미러) ────────────────────────── */

const QUESTION_MAX_LENGTH = 200;
const ANSWER_MAX_LENGTH = 5000;

interface DemoCategory {
  readonly id: string;
  readonly label: string;
}

/** 카테고리는 서버가 만든다 — 컴파일 시점의 유니온이 없어 문자열 id 를 그대로 쓴다(캐스팅이 아니다) */
const FAQ_CATEGORIES: readonly DemoCategory[] = [
  { id: 'account', label: '계정' },
  { id: 'payment', label: '결제' },
  { id: 'delivery', label: '배송' },
  { id: 'etc', label: '기타' },
];

/** 신규 등록의 정렬 순서 기본값 = 현재 최대 + 1 (실화면 nextOrder 미러 — 픽스처 12건 기준) */
const NEXT_ORDER = '13';

/* ── 폼 값(실화면 FaqFormValues 미러 — order 는 number input 이지만 문자열로 다룬다) ─────────── */

interface SeedValues {
  readonly question: string;
  readonly categoryId: string;
  readonly answer: string;
  readonly visible: boolean;
  readonly order: string;
}

/** 등록 기본값 — 실화면 EMPTY + 정렬 순서 자동 채움 */
const EMPTY_SEED: SeedValues = {
  question: '',
  categoryId: '',
  answer: '',
  visible: true,
  order: NEXT_ORDER,
};

/** 수정 시드 — 목록 픽스처 FAQ-002 를 폼 값으로 되돌린 형태 */
const EDIT_SEED: SeedValues = {
  question: '결제 수단은 무엇이 있나요',
  categoryId: 'payment',
  answer:
    '신용·체크카드, 계좌이체, 간편결제(카카오페이·네이버페이·토스페이)를 지원합니다.\n\n' +
    '· 무이자 할부는 카드사 정책에 따라 매월 달라져요.\n' +
    '· 해외 발행 카드는 일부 결제가 제한될 수 있어요.\n\n' +
    '고객센터 운영 시간(평일 09:00~18:00)에 1:1 문의를 남겨 주세요.',
  visible: true,
  order: '2',
};

/** 검증 오류 시드 — 필수 항목이 빈 채로 제출한 순간(정렬 순서는 정수가 아닌 값) */
const ERROR_SEED: SeedValues = {
  question: '',
  categoryId: '',
  answer: '',
  visible: true,
  order: '',
};

/** 검증 오류 데모 — 실화면 zod 스키마(validation.ts)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly question?: string;
  readonly categoryId?: string;
  readonly order?: string;
  readonly answer?: string;
}

const DEMO_ERRORS: FieldErrors = {
  question: '질문을 입력하세요.',
  categoryId: '카테고리를 선택하세요.',
  order: '정렬 순서를 입력하세요.',
  answer: '답변을 입력하세요.',
};

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

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
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

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 만들고 aria 로 잇는다) ─────── */

function FormCard({ title, children }: { title: string; children: ReactNode }) {
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

interface FaqFormScreenProps {
  readonly isEdit?: boolean;
  /** 수정 진입 시 상세 조회 중 — 실화면은 스켈레톤이 아니라 **모든 입력을 잠근다**(loadingDetail) */
  readonly loadingDetail?: boolean;
  /** 저장 요청 중 — 제출 버튼 문구가 '저장 중…' 으로 바뀌고 입력이 잠긴다 */
  readonly saving?: boolean;
  readonly errors?: FieldErrors;
  /** 저장 실패 배너 문구 — 실화면 serverError */
  readonly serverError?: string | null;
  readonly seed?: SeedValues;
}

function FaqFormScreen({
  isEdit = false,
  loadingDetail = false,
  saving = false,
  errors = {},
  serverError = null,
  seed = EMPTY_SEED,
}: FaqFormScreenProps) {
  const [question, setQuestion] = useState(seed.question);
  const [categoryId, setCategoryId] = useState(seed.categoryId);
  const [order, setOrder] = useState(seed.order);
  const [visible, setVisible] = useState(seed.visible);
  const [answer, setAnswer] = useState(seed.answer);

  const disabled = saving || loadingDetail;

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? 'FAQ 수정' : 'FAQ 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 노출을 끄면 사용자 화면에서 숨겨져요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="FAQ 정보">
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <TextField
            id="faq-question"
            label="질문"
            required
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={QUESTION_MAX_LENGTH}
            placeholder="예: 비밀번호를 잊어버렸어요"
            disabled={disabled}
            error={errors.question ?? ''}
          />

          <div style={formRowStyle}>
            <FormField
              htmlFor="faq-category"
              label="카테고리"
              required
              {...(errors.categoryId !== undefined && { error: errors.categoryId })}
            >
              <SelectField
                id="faq-category"
                value={categoryId}
                isInvalid={errors.categoryId !== undefined}
                disabled={disabled}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {/* 카테고리는 서버가 만든다 — 빈 값 옵션이 '아직 고르지 않음'을 표현한다 */}
                <option value="">카테고리를 선택하세요</option>
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField
              htmlFor="faq-order"
              label="정렬 순서"
              required
              hint="작을수록 위에 노출돼요. 신규 등록이면 현재 최대 + 1 이 채워져요."
              {...(errors.order !== undefined && { error: errors.order })}
            >
              <input
                id="faq-order"
                type="number"
                min={0}
                style={controlStyle(errors.order !== undefined)}
                value={order}
                disabled={disabled}
                aria-invalid={errors.order !== undefined}
                onChange={(event) => setOrder(event.target.value)}
              />
            </FormField>
          </div>

          <Checkbox
            id="faq-visible"
            label="사용자 화면에 노출"
            checked={visible}
            disabled={disabled}
            onChange={(event) => setVisible(event.target.checked)}
          />

          <TextareaField
            label="답변"
            required
            value={answer}
            onChange={setAnswer}
            maxLength={ANSWER_MAX_LENGTH}
            disabled={disabled}
            placeholder="답변 내용을 입력하세요."
            error={errors.answer ?? ''}
          />

          <div style={actionsStyle}>
            <Button type="button" variant="secondary" disabled={saving}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={disabled}>
              {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
            </Button>
          </div>
        </FormCard>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 카테고리는 미선택, 정렬 순서만 현재 최대 + 1 로 자동으로 채워져 있다 */
export const Default: Story = {
  render: () => <FaqFormScreen />,
};

/** 수정: 기존 FAQ(FAQ-002)를 불러와 채운 폼 — 카테고리·정렬 순서·답변이 들어 있다 */
export const Edit: Story = {
  render: () => <FaqFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩(수정 진입): 상세 조회 중 — 실화면은 스켈레톤 대신 모든 입력을 잠근다(loadingDetail) */
export const Loading: Story = {
  render: () => <FaqFormScreen isEdit loadingDetail seed={EDIT_SEED} />,
};

/** 저장 중: 제출 버튼이 '저장 중…' 으로 바뀌고 입력이 잠긴다(중복 제출 차단) */
export const Saving: Story = {
  render: () => <FaqFormScreen isEdit saving seed={EDIT_SEED} />,
};

/** 검증 오류 + 저장 실패: 필수 4항목을 비운 채 제출 → 인라인 오류 4건 + 상단 Alert(danger) */
export const ValidationError: Story = {
  render: () => (
    <FaqFormScreen
      seed={ERROR_SEED}
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
    />
  ),
};
