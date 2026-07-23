/**
 * Design System/Templates/Sales/Contract Form — 계약 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹에서 확정된다(화면 en = Contracts).
 *
 * 대응 실화면: apps/admin/src/pages/sales/contracts/ContractFormPage.tsx
 * (라우트 /sales/contracts/new · /:id/edit). 실화면은 공용 CRUD 프레임워크(useCrudForm) 위에
 * 입력 카드 5장(계약정보·금액/기간·갱신/서명/상태·조항/첨부·비고) + 우측 계약서 요약 미리보기 2단으로
 * 구성된다. 검증의 정본은 ./validation(zod)이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기 버튼               → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명            → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · 카드 제목        → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   계약명/거래처/담당자/금액/통지기한 → TextField (자체 라벨·필수·오류)
 *   계약유형/상태/전자서명       → FormField + SelectField
 *   부가세/자동갱신             → ToggleSwitch
 *   계약 기간                  → DateRangeField
 *   주요 조항 / 비고            → TextareaField
 *   계약서 첨부(스캔)           → ImageGalleryField
 *   계약서 요약 미리보기        → 토큰만 쓴 요약 카드 + StatusBadge (실화면 ContractSummaryPreview 미러)
 *   서버 오류 / 저장 배너        → Alert
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * 첨부 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
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
  ImageGalleryField,
  SelectField,
  Skeleton,
  StatusBadge,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Contract Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 순수 규칙(실화면 contracts/types.ts 미러) ───────────────────────────────────── */

type ContractType = 'supply' | 'service' | 'maintenance' | 'license' | 'lease' | 'nda';
type ContractStatus = 'draft' | 'review' | 'active' | 'expired' | 'terminated';
type SignStatus = 'unsigned' | 'sent' | 'partial' | 'signed';

const CONTRACT_TITLE_MAX = 80;
const CONTRACT_TERMS_MAX = 1000;
const NOTE_MAX = 500;
const MAX_ATTACHMENTS = 5;

const CONTRACT_TYPE_OPTIONS: readonly { readonly id: ContractType; readonly label: string }[] = [
  { id: 'supply', label: '공급계약' },
  { id: 'service', label: '용역계약' },
  { id: 'maintenance', label: '유지보수' },
  { id: 'license', label: '라이선스' },
  { id: 'lease', label: '임대' },
  { id: 'nda', label: '비밀유지(NDA)' },
];

const CONTRACT_STATUS_OPTIONS: readonly { readonly id: ContractStatus; readonly label: string }[] =
  [
    { id: 'draft', label: '초안' },
    { id: 'review', label: '검토중' },
    { id: 'active', label: '진행중' },
    { id: 'expired', label: '만료' },
    { id: 'terminated', label: '해지' },
  ];

const SIGN_STATUS_OPTIONS: readonly { readonly id: SignStatus; readonly label: string }[] = [
  { id: 'unsigned', label: '미발송' },
  { id: 'sent', label: '서명대기' },
  { id: 'partial', label: '일부서명' },
  { id: 'signed', label: '서명완료' },
];

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const CONTRACT_STATUS_META: Record<ContractStatus, StatusMeta> = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검토중', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  terminated: { label: '해지', tone: 'danger' },
};

const optionLabel = <T extends string>(
  options: readonly { readonly id: T; readonly label: string }[],
  id: T,
): string => options.find((option) => option.id === id)?.label ?? id;

const signStatusTone = (status: SignStatus): StatusBadgeTone => {
  if (status === 'signed') return 'success';
  if (status === 'partial') return 'warning';
  if (status === 'sent') return 'info';
  return 'neutral';
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

const formatWon = (amount: number): string => `${amount.toLocaleString('ko-KR')}원`;

/* ── 폼 값 · 데모 시드(실화면 ContractFormValues 미러 — 금액/통지기한은 문자열) ─────────────────── */

interface FormValues {
  readonly title: string;
  readonly accountName: string;
  readonly contractType: ContractType;
  readonly startAt: string;
  readonly endAt: string;
  readonly amount: string;
  readonly vatIncluded: boolean;
  readonly autoRenew: boolean;
  readonly renewNoticeDays: string;
  readonly status: ContractStatus;
  readonly signStatus: SignStatus;
  readonly ownerName: string;
  readonly attachments: readonly string[];
  readonly terms: string;
  readonly note: string;
}

/** 차단 안내의 문장 + 두 링크를 한 줄에 — 좁은 화면에서는 접힌다 */
const blockedRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const blockedLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const EMPTY_SEED: FormValues = {
  title: '',
  accountName: '',
  contractType: 'supply',
  startAt: '',
  endAt: '',
  amount: '0',
  vatIncluded: false,
  autoRenew: false,
  renewNoticeDays: '30',
  status: 'draft',
  signStatus: 'unsigned',
  ownerName: '',
  attachments: [],
  terms: '',
  note: '',
};

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 스캔본을 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="64" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_SEED: FormValues = {
  title: '2026년 SaaS 연간 이용계약',
  accountName: '(주)한빛소프트웨어',
  contractType: 'license',
  startAt: '2026-01-01',
  endAt: '2026-12-31',
  amount: '36000000',
  vatIncluded: false,
  autoRenew: true,
  renewNoticeDays: '30',
  status: 'active',
  signStatus: 'signed',
  ownerName: '김영업',
  attachments: [svgDataUri('계약서 1p', 'steelblue'), svgDataUri('계약서 2p', 'seagreen')],
  terms: '연간 라이선스 12개월, 계정 100석 기준. 미납 시 서비스 일시중지 조항 포함.',
  note: '',
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly accountName?: string;
  readonly amount?: string;
  readonly period?: string;
  readonly renewNoticeDays?: string;
  readonly terms?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '계약명을 입력하세요.',
  accountName: '거래처를 입력하세요.',
  amount: '계약금액은 0보다 커야 해요.',
  period: '계약 기간을 YYYY-MM-DD 형식으로 입력하세요.',
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

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
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

/* ── 계약서 요약 미리보기(실화면 components/ContractSummaryPreview 미러 — 토큰 + StatusBadge) ───── */

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  padding: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const previewTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  color: cssVar('color.text.default'),
};

const previewBadgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const previewRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(calc(${cssVar('space.6')} * 2), auto) minmax(0, 1fr)`,
  columnGap: cssVar('space.3'),
  rowGap: cssVar('space.2'),
};

const previewKeyStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const previewValueStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
  overflowWrap: 'anywhere',
};

function ContractSummaryPreview({ values }: { values: FormValues }) {
  const statusMeta = CONTRACT_STATUS_META[values.status];
  const period =
    values.startAt !== '' && values.endAt !== '' ? `${values.startAt} ~ ${values.endAt}` : '—';
  const title = values.title.trim();
  const account = values.accountName.trim();

  return (
    <div style={previewCardStyle} aria-label="계약서 요약 미리보기">
      <span style={previewTitleStyle}>{title === '' ? '(계약명 미입력)' : title}</span>

      <div style={previewBadgeRowStyle}>
        <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
        <StatusBadge
          tone={signStatusTone(values.signStatus)}
          label={`서명 ${optionLabel(SIGN_STATUS_OPTIONS, values.signStatus)}`}
        />
        {values.autoRenew && <StatusBadge tone="info" label="자동갱신" />}
      </div>

      <div style={previewRowStyle}>
        <span style={previewKeyStyle}>거래처</span>
        <span style={previewValueStyle}>{account === '' ? '—' : account}</span>
        <span style={previewKeyStyle}>계약유형</span>
        <span style={previewValueStyle}>
          {optionLabel(CONTRACT_TYPE_OPTIONS, values.contractType)}
        </span>
        <span style={previewKeyStyle}>계약기간</span>
        <span style={previewValueStyle}>{period}</span>
        <span style={previewKeyStyle}>계약금액</span>
        <span style={previewValueStyle}>
          {formatWon(digitsToNumber(values.amount))}
          <span style={previewKeyStyle}>
            {values.vatIncluded ? ' (부가세 포함)' : ' (부가세 별도)'}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface ContractFormScreenProps {
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: FormValues;
}

function ContractFormScreen({
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: ContractFormScreenProps) {
  const [values, setValues] = useState<FormValues>(seed);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const disabled = loadingDetail;

  return (
    <div style={pageStyle}>
      <div style={backLinkStyle}>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      <div>
        <h1 style={pageTitleStyle}>'계약 수정'</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 계약 기간·금액을 확인하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        {/* 서버 오류 배너 — 검증 오류 데모에서 요약을 알린다(실화면 FormServerError 자리) */}
        {Object.keys(errors).length > 0 && (
          <Alert tone="danger">
            입력한 내용을 다시 확인하세요. 표시된 항목을 수정해야 저장돼요.
          </Alert>
        )}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <FormCard title="계약 정보">
              {loadingDetail ? (
                <div style={skeletonBodyStyle} aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={`info-${String(row)}`} />
                  ))}
                </div>
              ) : (
                <>
                  <TextField
                    id="contract-title"
                    label="계약명"
                    required
                    value={values.title}
                    onChange={(event) => set('title', event.target.value)}
                    maxLength={CONTRACT_TITLE_MAX}
                    placeholder="예: 2026년 SaaS 연간 이용계약"
                    disabled={disabled}
                    error={errors.title ?? ''}
                  />
                  <div style={formRowStyle}>
                    <TextField
                      id="contract-account"
                      label="거래처"
                      required
                      value={values.accountName}
                      onChange={(event) => set('accountName', event.target.value)}
                      placeholder="예: (주)한빛소프트웨어"
                      disabled={disabled}
                      error={errors.accountName ?? ''}
                    />
                    <FormField htmlFor="contract-type" label="계약유형" required>
                      <SelectField
                        id="contract-type"
                        value={values.contractType}
                        disabled={disabled}
                        onChange={(event) =>
                          set('contractType', event.target.value as ContractType)
                        }
                      >
                        {CONTRACT_TYPE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                    <TextField
                      id="contract-owner"
                      label="담당자"
                      value={values.ownerName}
                      onChange={(event) => set('ownerName', event.target.value)}
                      placeholder="예: 김영업"
                      disabled={disabled}
                    />
                  </div>
                </>
              )}
            </FormCard>

            <FormCard title="금액 · 기간">
              <div style={formRowStyle}>
                <TextField
                  id="contract-amount"
                  label="계약금액 (원)"
                  required
                  type="text"
                  inputMode="numeric"
                  value={values.amount}
                  onChange={(event) => set('amount', event.target.value)}
                  placeholder="예: 36000000"
                  disabled={disabled}
                  error={errors.amount ?? ''}
                />
                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>부가세</span>
                  <ToggleSwitch
                    checked={values.vatIncluded}
                    onChange={(next) => set('vatIncluded', next)}
                    disabled={disabled}
                    label="부가세 포함 여부"
                    onLabel="포함"
                    offLabel="별도"
                  />
                </div>
              </div>

              <DateRangeField
                label="계약 기간"
                required
                startValue={values.startAt}
                endValue={values.endAt}
                onStartChange={(value) => set('startAt', value)}
                onEndChange={(value) => set('endAt', value)}
                disabled={disabled}
                error={errors.period ?? ''}
              />
            </FormCard>

            <FormCard title="갱신 · 서명 · 상태">
              <div style={formRowStyle}>
                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>자동갱신</span>
                  <ToggleSwitch
                    checked={values.autoRenew}
                    onChange={(next) => set('autoRenew', next)}
                    disabled={disabled}
                    label="자동갱신 여부"
                    onLabel="사용"
                    offLabel="미사용"
                  />
                </div>
                {values.autoRenew && (
                  <TextField
                    id="contract-renew-notice"
                    label="갱신 통지기한 (일)"
                    type="text"
                    inputMode="numeric"
                    value={values.renewNoticeDays}
                    onChange={(event) => set('renewNoticeDays', event.target.value)}
                    placeholder="예: 30 (만료 N일 전 통지)"
                    disabled={disabled}
                    error={errors.renewNoticeDays ?? ''}
                  />
                )}
              </div>

              <div style={formRowStyle}>
                <FormField htmlFor="contract-status" label="계약 상태" required>
                  <SelectField
                    id="contract-status"
                    value={values.status}
                    disabled={disabled}
                    onChange={(event) => set('status', event.target.value as ContractStatus)}
                  >
                    {CONTRACT_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="contract-sign" label="전자서명 상태" required>
                  <SelectField
                    id="contract-sign"
                    value={values.signStatus}
                    disabled={disabled}
                    onChange={(event) => set('signStatus', event.target.value as SignStatus)}
                  >
                    {SIGN_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>
            </FormCard>

            <FormCard title="조항 · 첨부">
              <TextareaField
                label="주요 조항 요약"
                value={values.terms}
                onChange={(value) => set('terms', value)}
                maxLength={CONTRACT_TERMS_MAX}
                disabled={disabled}
                placeholder="지급조건·해지조건·SLA 등 핵심 조항을 요약하세요."
                rows={4}
                error={errors.terms ?? ''}
              />
              <ImageGalleryField
                label="계약서 첨부(스캔)"
                values={values.attachments}
                onChange={(next) => set('attachments', [...next])}
                disabled={disabled}
                maxFiles={MAX_ATTACHMENTS}
                hint="계약서·부속합의서 스캔본을 업로드하세요."
              />
            </FormCard>

            <FormCard title="비고">
              <TextareaField
                label="메모"
                value={values.note}
                onChange={(value) => set('note', value)}
                maxLength={NOTE_MAX}
                disabled={disabled}
                placeholder="내부 메모"
                rows={2}
              />
            </FormCard>
          </div>

          <FormCard title="미리보기">
            <ContractSummaryPreview values={values} />
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * 사슬 밖 생성 차단 — `/new` 주소로 들어왔을 때 그리는 것.
 *
 * 목록의 등록 버튼만 숨기면 막은 것이 아니다: 주소창·즐겨찾기·옛 링크가 그대로 살아 있다.
 * 조용한 404 나 빈 화면은 고장과 구분되지 않으므로 **왜 못 만드는지와 어디서 만드는지**를 말한다
 * (실화면 pages/sales/_shared/ChainOnlyCreateNotice · 시스템 설정의 '알 수 없는 프로바이더'와 같은 관용구).
 */
function ContractCreateBlockedScreen() {
  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>계약 등록</h1>
        <p style={descriptionStyle}>
          영업 파이프라인(문의 → 견적 → 계약 → 프로젝트)은 앞 칸에서만 다음 칸이 생겨요.
        </p>
      </div>
      <Alert tone="warning">
        <div style={blockedRowStyle}>
          <span>
            계약은 견적에서 만들어져요. 고객이 승인한 견적 상세에서 ‘계약 만들기’를 누르세요.
          </span>
          <a href="#견적-list" style={blockedLinkStyle}>
            견적 목록으로
          </a>
          <a href="#계약-list" style={blockedLinkStyle}>
            계약 목록으로
          </a>
        </div>
      </Alert>
    </div>
  );
}

/** 사슬 밖 생성 차단 — 빈 폼이 아니라 다음 행동을 알려 주는 문장이 뜬다 */
export const Default: Story = {
  render: () => <ContractCreateBlockedScreen />,
};

/** 수정: 기존 값이 채워진 폼(첨부 미리보기·자동갱신 통지기한 포함) */
export const Edit: Story = {
  render: () => <ContractFormScreen seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 계약 정보 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <ContractFormScreen loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 서버 오류 배너 + 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <ContractFormScreen errors={DEMO_ERRORS} />,
};
