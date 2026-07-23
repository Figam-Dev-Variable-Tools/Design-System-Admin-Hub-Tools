/**
 * Design System/Templates/Marketing/Event Form — 이벤트 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Marketing"(마케팅 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Marketing 그룹에서 `['/marketing/events', '이벤트', 'Events']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/marketing/events/EventFormPage.tsx
 * (라우트 /marketing/events/new · /:id/edit). 실화면은 공용 CRUD 프레임워크(useCrudForm +
 * FormPageShell) 위에 **입력 카드 한 장**('이벤트 정보')을 얹는다 — 이벤트는 필드가 아홉 개라
 * 구획을 나눌 만큼 길지 않고, 대신 조건부 필드 둘(혜택 상세·연동 배너명)이 토글·선택에 따라
 * 나타났다 사라진다. 검증의 정본은 ./validation(zod)이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기와 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로(FormPageShell)     → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명            → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · 카드 제목        → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   서버 오류(FormServerError)   → Alert(danger)
 *   상세 조회 스켈레톤          → Skeleton ×N
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   이벤트명 / 대상             → TextField (자체 라벨·필수·오류·maxLength)
 *   이벤트 기간(시작~종료)       → DateRangeField (종료≥시작 오류는 스키마가 판정해 error 로 내려온다)
 *   상태(예정/진행/종료)         → FormField + SelectField
 *   혜택 유형                  → FormField + SelectField
 *   혜택 상세(조건부 필수)       → TextField — 혜택 유형이 '혜택 없음' 이 아닐 때만 그린다
 *   배너 연동                  → ToggleSwitch (연동/미연동)
 *   연동 배너명(조건부 필수)     → TextField — 배너 연동이 켜졌을 때만 그린다
 *   설명                       → TextareaField (글자수 카운터 포함)
 *   저장/취소                  → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  DateRangeField,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Event Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 선택지(실화면 events/types.ts · _shared/campaign.ts 미러) ─────────────────── */

type CampaignPhase = 'upcoming' | 'ongoing' | 'ended';
type BenefitType = 'none' | 'coupon' | 'points';

const EVENT_TITLE_MAX = 80;
const EVENT_TARGET_MAX = 60;
const EVENT_DESC_MAX = 1000;

const CAMPAIGN_PHASE_OPTIONS: readonly { readonly id: CampaignPhase; readonly label: string }[] = [
  { id: 'upcoming', label: '예정' },
  { id: 'ongoing', label: '진행' },
  { id: 'ended', label: '종료' },
];

const BENEFIT_TYPE_OPTIONS: readonly { readonly id: BenefitType; readonly label: string }[] = [
  { id: 'none', label: '혜택 없음' },
  { id: 'coupon', label: '쿠폰 발급' },
  { id: 'points', label: '적립금 지급' },
];

/** 혜택 유형이 상세값(쿠폰명·적립액)을 요구하는가 — '없음' 만 상세가 필요 없다 */
const benefitNeedsDetail = (type: BenefitType): boolean => type !== 'none';

/* ── 폼 값 · 데모 시드(실화면 EventFormValues 미러) ──────────────────────────────────────────── */

interface FormValues {
  readonly title: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly phase: CampaignPhase;
  readonly target: string;
  readonly benefitType: BenefitType;
  readonly benefitDetail: string;
  readonly bannerLinked: boolean;
  readonly bannerLabel: string;
  readonly description: string;
}

const EMPTY_SEED: FormValues = {
  title: '',
  startAt: '',
  endAt: '',
  phase: 'upcoming',
  target: '',
  benefitType: 'none',
  benefitDetail: '',
  bannerLinked: false,
  bannerLabel: '',
  description: '',
};

/** 수정 시드 — 실화면 data-source 픽스처 ev-1 을 폼 값으로 되돌린 형태 */
const EDIT_SEED: FormValues = {
  title: '여름맞이 리뷰 이벤트',
  startAt: '2026-07-01',
  endAt: '2026-07-31',
  phase: 'ongoing',
  target: '전체 회원',
  benefitType: 'points',
  benefitDetail: '리뷰 작성 시 3,000 적립금',
  bannerLinked: true,
  bannerLabel: '메인 상단 여름 배너',
  description: '구매 후기 작성 고객에게 적립금을 드리는 이벤트예요.',
};

/** 검증 오류 데모 — 실화면 zod 스키마(validation.ts)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly period?: string;
  readonly target?: string;
  readonly benefitDetail?: string;
  readonly bannerLabel?: string;
  readonly description?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '이벤트명을 입력하세요.',
  period: '이벤트 기간을 YYYY-MM-DD 형식으로 입력하세요.',
  target: '대상을 입력하세요.',
  benefitDetail: '혜택 상세(쿠폰명·적립액)를 입력하세요.',
};

/** 검증 오류 화면의 시드 — 혜택 유형이 '쿠폰 발급' 이라 상세가 필수인데 비어 있다 */
const INVALID_SEED: FormValues = {
  ...EMPTY_SEED,
  startAt: '2026-08-01',
  endAt: '2026-07-01',
  benefitType: 'coupon',
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = { alignSelf: 'flex-start' };

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
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

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

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

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ────── */

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

/* ── 제어형 화면(rules-of-hooks 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface EventFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: FormValues;
}

function EventFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: EventFormScreenProps) {
  const [values, setValues] = useState<FormValues>(seed);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const disabled = loadingDetail;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div style={pageStyle}>
      <div style={backLinkStyle}>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '이벤트 수정' : '이벤트 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 기간·대상·혜택을 확인하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={formStyle}>
        {/* 서버 오류 배너 — 실화면 FormServerError 의 자리 */}
        {hasErrors && (
          <Alert tone="danger">
            입력한 내용을 다시 확인하세요. 표시된 항목을 수정해야 저장돼요.
          </Alert>
        )}

        <FormCard title="이벤트 정보">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <TextField
                id="event-title"
                label="이벤트명"
                required
                value={values.title}
                onChange={(event) => set('title', event.target.value)}
                maxLength={EVENT_TITLE_MAX}
                placeholder="예: 여름맞이 리뷰 이벤트"
                disabled={disabled}
                error={errors.title ?? ''}
              />

              <DateRangeField
                label="이벤트 기간"
                required
                startValue={values.startAt}
                endValue={values.endAt}
                onStartChange={(value) => set('startAt', value)}
                onEndChange={(value) => set('endAt', value)}
                disabled={disabled}
                error={errors.period ?? ''}
              />

              <div style={formRowStyle}>
                <FormField htmlFor="event-phase" label="상태" required>
                  <SelectField
                    id="event-phase"
                    value={values.phase}
                    disabled={disabled}
                    onChange={(event) => set('phase', event.target.value as CampaignPhase)}
                  >
                    {CAMPAIGN_PHASE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <TextField
                  id="event-target"
                  label="대상"
                  required
                  value={values.target}
                  onChange={(event) => set('target', event.target.value)}
                  maxLength={EVENT_TARGET_MAX}
                  placeholder="예: 전체 회원 · VIP 등급"
                  disabled={disabled}
                  error={errors.target ?? ''}
                />
              </div>

              <div style={formRowStyle}>
                <FormField htmlFor="event-benefit" label="혜택 유형">
                  <SelectField
                    id="event-benefit"
                    value={values.benefitType}
                    disabled={disabled}
                    onChange={(event) => set('benefitType', event.target.value as BenefitType)}
                  >
                    {BENEFIT_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                {benefitNeedsDetail(values.benefitType) && (
                  <TextField
                    id="event-benefit-detail"
                    label="혜택 상세"
                    required
                    value={values.benefitDetail}
                    onChange={(event) => set('benefitDetail', event.target.value)}
                    placeholder="예: 3,000 적립금 · 10% 할인쿠폰"
                    disabled={disabled}
                    error={errors.benefitDetail ?? ''}
                  />
                )}
              </div>

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>배너 연동</span>
                <ToggleSwitch
                  checked={values.bannerLinked}
                  onChange={(next) => set('bannerLinked', next)}
                  disabled={disabled}
                  label="배너 연동 여부"
                  onLabel="연동"
                  offLabel="미연동"
                />
              </div>

              {values.bannerLinked && (
                <TextField
                  id="event-banner"
                  label="연동 배너명"
                  required
                  value={values.bannerLabel}
                  onChange={(event) => set('bannerLabel', event.target.value)}
                  placeholder="예: 메인 상단 여름 배너"
                  disabled={disabled}
                  error={errors.bannerLabel ?? ''}
                />
              )}

              <TextareaField
                label="설명"
                value={values.description}
                onChange={(value) => set('description', value)}
                maxLength={EVENT_DESC_MAX}
                disabled={disabled}
                placeholder="이벤트 안내 문구를 입력하세요."
                rows={4}
                error={errors.description ?? ''}
              />
            </>
          )}
        </FormCard>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 혜택 '없음'·배너 미연동이라 조건부 필드 둘이 접혀 있다 */
export const Default: Story = {
  render: () => <EventFormScreen />,
};

/** 수정: 기존 값이 채워진 폼 — 혜택 상세·연동 배너명이 함께 펼쳐진 상태 */
export const Edit: Story = {
  render: () => <EventFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <EventFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 누락 + 기간 역전 + 혜택 상세 누락 → 배너 + 각 필드 인라인 오류 */
export const ValidationError: Story = {
  render: () => <EventFormScreen errors={DEMO_ERRORS} seed={INVALID_SEED} />,
};
