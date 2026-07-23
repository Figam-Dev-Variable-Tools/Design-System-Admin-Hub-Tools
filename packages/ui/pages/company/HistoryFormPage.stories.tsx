/**
 * Design System/Templates/Company/History Form — 연혁 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/history/new` → 메뉴 en = "Company"(기업 관리), 화면 en =
 * "History" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/history', '연혁', 'History']`. 등록/수정은 그 화면의 하위 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/company/history/HistoryFormPage.tsx
 * (라우트 /company/history/new · /company/history/:id/edit). 연혁 1건은 연도·월·내용 셋뿐이라
 * 구획을 나눌 게 없다 — 카드 한 장에 다 담긴다. 연도·월은 한 줄에 나란히 서고(연월이 한 덩어리로
 * 읽힌다), 내용만 아래로 넓게 편다. 실화면은 목록형 3종(연혁·인증서·ESG)이 공유하는 FormPageShell
 * 위에 필드만 얹는다: 목록으로 → 제목(등록/수정) → 안내 → 카드(필드) → 취소/저장 + 이탈 가드.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FormPageShell → Card + 토큰만 쓴 <h1>/<h2> + 취소/저장 Button + Alert(danger)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로(FormPageShell)   → Button(ghost) + Icon(chevron-left)
 *   페이지 제목               → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   연도(1900~2200 정수)      → FormField + input[type=number](controlStyle)
 *   월(1~12 선택)             → FormField + SelectField
 *   내용(최대 300자 · 4행)     → TextareaField (라벨·글자수 카운터·오류를 스스로 소유)
 *   저장 실패 배너            → Alert(danger)
 *   상세 조회 실패(404/5xx)    → Alert(danger) + Button(secondary) — 404 는 재시도를 권하지 않는다(EXC-12)
 *   상세 조회 스켈레톤         → Skeleton ×4
 *   저장/취소                 → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/History Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 history/types 미러) ────────────────────────────────────────────────────────── */

const CONTENT_MAX_LENGTH = 300;
const YEAR_MIN = 1900;
const YEAR_MAX = 2200;

/** 1~12월 — 실화면 MONTHS 미러 */
const MONTHS: readonly number[] = Array.from({ length: 12 }, (_, index) => index + 1);

/* ── 데모 데이터(실화면 toValues 가 HistoryItem 을 폼 값으로 되돌린 형태) ─────────────────────── */

interface HistoryFormValues {
  /** 폼에서는 전부 문자열이다 — 저장 직전 toInput 이 숫자로 정규화한다 */
  readonly year: string;
  readonly month: string;
  readonly content: string;
}

const EMPTY_VALUES: HistoryFormValues = { year: '', month: '', content: '' };

/** 수정 시드 — data-source 의 history-3 을 폼 값으로 되돌린 것 */
const EDIT_VALUES: HistoryFormValues = {
  year: '2021',
  month: '5',
  content: '기업부설 연구소 설립',
};

/** 검증 오류 데모 — 실화면 historySchema(zod) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly year?: string;
  readonly month?: string;
  readonly content?: string;
}

const DEMO_ERRORS: FieldErrors = {
  year: `연도는 ${String(YEAR_MIN)} ~ ${String(YEAR_MAX)} 범위여야 해요.`,
  month: '월을 입력하세요.',
  content: '내용을 입력하세요.',
};

/** 범위를 벗어난 값이 남아 있는 상태 — 오류 시연용 시드 */
const INVALID_VALUES: HistoryFormValues = { year: '1800', month: '', content: '' };

/** 상세 조회 실패의 갈래 — 404 와 5xx 는 복구 수단이 다르다(EXC-12) */
type LoadFailure = 'not-found' | 'unavailable';

/* ── 스타일(토큰·rem·calc 만) ──────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backRowStyle: CSSProperties = {
  display: 'flex',
  alignSelf: 'flex-start',
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
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

/** 연도·월이 나란히 서는 행 — 실화면 formRowStyle(auto-fit minmax) 미러 */
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

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const alertActionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface HistoryFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 상세 조회 실패 — 폼 대신 배너만 그린다 */
  readonly loadFailure?: LoadFailure | null;
  readonly saving?: boolean;
  readonly serverError?: string | null;
  readonly errors?: FieldErrors;
  readonly seed?: HistoryFormValues;
}

function HistoryFormScreen({
  isEdit = false,
  loadingDetail = false,
  loadFailure = null,
  saving = false,
  serverError = null,
  errors = {},
  seed = EMPTY_VALUES,
}: HistoryFormScreenProps) {
  const [year, setYear] = useState(seed.year);
  const [month, setMonth] = useState(seed.month);
  const [content, setContent] = useState(seed.content);

  const disabled = saving || loadingDetail;

  if (loadFailure !== null) {
    // [EXC-12] 404 는 재시도를 권하지 않는다 — 재시도해도 영원히 없다
    const notFound = loadFailure === 'not-found';
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '연혁을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '연혁을 불러오지 못했어요.'}
            </span>
            {!notFound && <Button variant="secondary">다시 시도</Button>}
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={backRowStyle}>
        <Button variant="ghost" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '연혁 수정' : '연혁 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 연도·월과 내용을 입력하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>연혁 정보</h2>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <div style={cardBodyStyle}>
                <div style={formRowStyle}>
                  <FormField
                    htmlFor="history-year"
                    label="연도"
                    required
                    hint={`${String(YEAR_MIN)} ~ ${String(YEAR_MAX)}`}
                    {...(errors.year !== undefined && { error: errors.year })}
                  >
                    <input
                      id="history-year"
                      type="number"
                      min={YEAR_MIN}
                      max={YEAR_MAX}
                      style={controlStyle(errors.year !== undefined)}
                      placeholder="예: 2024"
                      disabled={disabled}
                      aria-invalid={errors.year !== undefined}
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    htmlFor="history-month"
                    label="월"
                    required
                    {...(errors.month !== undefined && { error: errors.month })}
                  >
                    <SelectField
                      id="history-month"
                      isInvalid={errors.month !== undefined}
                      disabled={disabled}
                      aria-invalid={errors.month !== undefined}
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                    >
                      <option value="">선택</option>
                      {MONTHS.map((value) => (
                        <option key={value} value={String(value)}>
                          {`${String(value)}월`}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </div>

                <TextareaField
                  label="내용"
                  required
                  value={content}
                  maxLength={CONTENT_MAX_LENGTH}
                  disabled={disabled}
                  error={errors.content ?? ''}
                  placeholder="예: 기업부설 연구소 설립"
                  rows={4}
                  onChange={setContent}
                />
              </div>
            )}

            <div style={actionsStyle}>
              <Button type="button" variant="secondary" size="md" disabled={saving}>
                취소
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={saving || loadingDetail}>
                {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 새 연혁 한 줄을 입력한다 */
export const Default: Story = {
  render: () => <HistoryFormScreen />,
};

/** 수정: 기존 연혁(2021년 5월 · 기업부설 연구소 설립)이 채워진 폼 — 저장 버튼 라벨이 '저장'이 된다 */
export const Edit: Story = {
  render: () => <HistoryFormScreen isEdit seed={EDIT_VALUES} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <HistoryFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 범위를 벗어난 연도 + 빈 월·내용으로 제출 — zod 문구가 각 필드 아래 인라인으로 붙는다 */
export const ValidationError: Story = {
  render: () => <HistoryFormScreen seed={INVALID_VALUES} errors={DEMO_ERRORS} />,
};

/** 상세 없음(404): 이미 지워진 연혁의 링크 — 재시도를 권하지 않고 목록으로만 빠져나간다(EXC-12) */
export const NotFound: Story = {
  render: () => <HistoryFormScreen isEdit loadFailure="not-found" />,
};
