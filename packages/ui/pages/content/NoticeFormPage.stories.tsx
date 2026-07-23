/**
 * Design System/Templates/Content/Notice Form — 공지 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/notices/new` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Notices"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 `['/content/notices', '공지사항', 'Notices']` 의 하위 화면).
 *
 * 대응 실화면: apps/admin/src/pages/content/notices/NoticeFormPage.tsx
 * (라우트 /content/notices/new · /content/notices/:id/edit). **하나의 폼이 등록과 수정을 겸한다** —
 * :id 가 있으면 기존 값을 불러와 채우고, 없으면 빈 폼이다. 카드 하나에 6개 입력만 있는 얕은 폼이라
 * 좌측 구획 목차(상품 폼의 SECTIONS)가 없다. 검증 규칙의 정본은 zod 스키마(validation.ts)이고 화면은
 * 판정 결과만 인라인으로 읽는다 — 특히 게시일은 **상태가 '예약'일 때만** 필수이자 활성이다.
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
 *   제목(100자)             → TextField (required · maxLength · error)
 *   분류 · 상태 select       → FormField + SelectField
 *   게시일(예약 전용)        → FormField + input[type=date] (예약이 아니면 disabled + hint 전환)
 *   목록 상단 고정 체크박스   → Checkbox
 *   본문(5000자 · 카운터)    → TextareaField
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
  title: 'Design System/Templates/Content/Notice Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 content/notices/types.ts 미러) ─────────────────────────────────────── */

const TITLE_MAX_LENGTH = 100;
const BODY_MAX_LENGTH = 5000;

type NoticeCategory = 'notice' | 'event' | 'maintenance';
type NoticeStatus = 'published' | 'draft' | 'scheduled';

/** 폼 select 의 선택지 — 목록 필터와 달리 '전체' 가 없는 순수 값이다 */
const CATEGORY_OPTIONS: readonly { readonly id: NoticeCategory; readonly label: string }[] = [
  { id: 'notice', label: '공지' },
  { id: 'event', label: '이벤트' },
  { id: 'maintenance', label: '점검' },
];

const STATUS_OPTIONS: readonly { readonly id: NoticeStatus; readonly label: string }[] = [
  { id: 'published', label: '게시' },
  { id: 'draft', label: '임시저장' },
  { id: 'scheduled', label: '예약' },
];

/** 문자열 → 도메인 유니온(캐스팅 금지 — 허용 목록은 select 가 그리는 항목 전체다) */
const isCategory = (value: string): value is NoticeCategory =>
  CATEGORY_OPTIONS.some((option) => option.id === value);
const isStatus = (value: string): value is NoticeStatus =>
  STATUS_OPTIONS.some((option) => option.id === value);

/* ── 폼 값(실화면 NoticeFormValues 미러) ─────────────────────────────────────────────────────── */

interface SeedValues {
  readonly title: string;
  readonly category: NoticeCategory;
  readonly status: NoticeStatus;
  readonly pinned: boolean;
  /** 'YYYY-MM-DD' — 예약 상태에서만 쓰인다 */
  readonly publishedAt: string;
  readonly body: string;
}

/** 등록 기본값 — 실화면 EMPTY 미러(상태는 임시저장에서 시작한다) */
const EMPTY_SEED: SeedValues = {
  title: '',
  category: 'notice',
  status: 'draft',
  pinned: false,
  publishedAt: '',
  body: '',
};

/** 수정 시드 — 목록 픽스처 NT-001 을 폼 값으로 되돌린 형태 */
const EDIT_SEED: SeedValues = {
  title: '[중요] 개인정보 처리방침 개정 안내',
  category: 'notice',
  status: 'published',
  pinned: true,
  publishedAt: '2026-07-20',
  body:
    '개인정보 처리방침 개정 관련 상세 내용입니다.\n\n' +
    '안녕하세요. 콘텐츠 운영팀입니다. 아래 내용을 확인해 주세요.\n' +
    '· 적용 일자: 2026년 8월 1일\n' +
    '· 적용 대상: 전체 회원\n' +
    '· 문의: 고객센터 1:1 문의\n\n' +
    '감사해요.',
};

/** 예약 시드 — 게시일이 필수이자 활성이 되는 유일한 상태 */
const SCHEDULED_SEED: SeedValues = {
  title: '정기 점검 안내 (07/25 02:00~05:00)',
  category: 'maintenance',
  status: 'scheduled',
  pinned: false,
  publishedAt: '',
  body: '',
};

/** 검증 오류 시드 — 필수 항목이 빈 채 상태만 예약으로 두고 제출한 순간 */
const ERROR_SEED: SeedValues = { ...EMPTY_SEED, status: 'scheduled' };

/** 검증 오류 데모 — 실화면 zod 스키마(validation.ts)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly publishedAt?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  publishedAt: '예약하려면 게시일을 YYYY-MM-DD 형식으로 입력하세요.',
  body: '본문을 입력하세요.',
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

interface NoticeFormScreenProps {
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

function NoticeFormScreen({
  isEdit = false,
  loadingDetail = false,
  saving = false,
  errors = {},
  serverError = null,
  seed = EMPTY_SEED,
}: NoticeFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [category, setCategory] = useState<NoticeCategory>(seed.category);
  const [status, setStatus] = useState<NoticeStatus>(seed.status);
  const [pinned, setPinned] = useState(seed.pinned);
  const [publishedAt, setPublishedAt] = useState(seed.publishedAt);
  const [body, setBody] = useState(seed.body);

  const disabled = saving || loadingDetail;
  const scheduled = status === 'scheduled';

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '공지 수정' : '공지 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 상태를 &apos;예약&apos;으로 두면 게시일 이후 자동으로 게시돼요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="공지 정보">
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <TextField
            id="notice-title"
            label="제목"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX_LENGTH}
            placeholder="예: 서비스 이용 안내"
            disabled={disabled}
            error={errors.title ?? ''}
          />

          <div style={formRowStyle}>
            <FormField htmlFor="notice-category" label="분류" required>
              <SelectField
                id="notice-category"
                value={category}
                disabled={disabled}
                onChange={(event) => {
                  if (isCategory(event.target.value)) setCategory(event.target.value);
                }}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField htmlFor="notice-status" label="상태" required>
              <SelectField
                id="notice-status"
                value={status}
                disabled={disabled}
                onChange={(event) => {
                  if (isStatus(event.target.value)) setStatus(event.target.value);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField
              htmlFor="notice-published-at"
              label="게시일"
              required={scheduled}
              hint={scheduled ? '예약 게시할 날짜' : '예약 상태에서만 사용돼요.'}
              {...(errors.publishedAt !== undefined && { error: errors.publishedAt })}
            >
              <input
                id="notice-published-at"
                type="date"
                style={controlStyle(errors.publishedAt !== undefined)}
                value={publishedAt}
                disabled={disabled || !scheduled}
                aria-invalid={errors.publishedAt !== undefined}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </FormField>
          </div>

          <Checkbox
            id="notice-pinned"
            label="목록 상단에 고정"
            checked={pinned}
            disabled={disabled}
            onChange={(event) => setPinned(event.target.checked)}
          />

          <TextareaField
            label="본문"
            required
            value={body}
            onChange={setBody}
            maxLength={BODY_MAX_LENGTH}
            disabled={disabled}
            placeholder="공지 본문을 입력하세요."
            error={errors.body ?? ''}
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

/** 정상(등록): 빈 폼 — 상태 기본값은 임시저장이라 게시일 입력이 잠겨 있다 */
export const Default: Story = {
  render: () => <NoticeFormScreen />,
};

/** 수정: 기존 공지(NT-001)를 불러와 채운 폼 — 고정 체크 + 본문이 들어 있다 */
export const Edit: Story = {
  render: () => <NoticeFormScreen isEdit seed={EDIT_SEED} />,
};

/** 예약: 상태를 예약으로 두면 게시일이 **필수이자 활성**이 되고 힌트 문구가 바뀐다 */
export const Scheduled: Story = {
  render: () => <NoticeFormScreen seed={SCHEDULED_SEED} />,
};

/** 로딩(수정 진입): 상세 조회 중 — 실화면은 스켈레톤 대신 모든 입력을 잠근다(loadingDetail) */
export const Loading: Story = {
  render: () => <NoticeFormScreen isEdit loadingDetail seed={EDIT_SEED} />,
};

/** 검증 오류 + 저장 실패: 필수 항목을 비운 채 예약 제출 → 인라인 오류 3건 + 상단 Alert(danger) */
export const ValidationError: Story = {
  render: () => (
    <NoticeFormScreen
      seed={ERROR_SEED}
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
    />
  ),
};
