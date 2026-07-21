/**
 * Design System/Templates/Sales/Quote Form — 견적 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Quotes 엔트리(`/sales/quotes`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/quotes/QuoteFormPage.tsx (라우트 /sales/quotes/new · /:id/edit).
 * 실화면은 승격된 CRUD 프레임워크(useCrudForm + zod) 위에 왼쪽 입력 카드(견적정보 · 품목 명세 편집표 ·
 * 비고)와 오른쪽 견적서 문서 미리보기를 2단으로 세운다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 전용 껍데기·조각(FormPageShell·useCrudForm·QuoteLineItemsTable·
 * QuotePreview·CardTitle·controlStyle)은 DS 표면과 토큰 레이아웃으로 갈음한다:
 *   뒤로가기(FormPageShell)      → Icon(chevron-left) + 토큰만 쓴 <a>
 *   페이지 제목(pageTitleStyle)   → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목(CardTitle) → Card + 토큰만 쓴 <h2>(title.md · DS 부재라 토큰 레이아웃으로 대체)
 *   견적번호(자동 채번 · readOnly) → 토큰만 쓴 읽기 전용 <input>(죽은 배경·흐린 글자)
 *   상태 · 과세유형               → FormField + SelectField
 *   거래처 · 담당자 · 대표자 · 사업자번호 → FormField + 토큰만 쓴 <input>
 *   견적일 · 유효기간              → DateRangeField
 *   품목 명세(QuoteLineItemsTable) → 토큰만 쓴 편집표 + TextField 급 <input> + Button/Icon(합계 자동)
 *   비고                          → TextareaField
 *   견적서 미리보기(QuotePreview)  → 토큰만 쓴 문서 레이아웃 + StatusBadge
 *   상태 배지                      → StatusBadge (견적 상태 tone)
 *   저장/취소                      → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem/calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  DateRangeField,
  FormField,
  Icon,
  SelectField,
  StatusBadge,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Quote Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 sales/quotes/types 를 화면이 쓰는 필드만 축약해 미러) ───────────────── */

type QuoteTaxMode = 'standard' | 'zero_rated' | 'exempt';
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';

const QUOTE_NOTE_MAX = 500;
const QUOTE_MAX_ITEMS = 30;
const QUOTE_ITEM_NAME_MAX = 60;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

/** 상태 선택지 — 실화면 QUOTE_STATUS_OPTIONS 미러 */
const QUOTE_STATUS_OPTIONS: readonly Option<QuoteStatus>[] = [
  { id: 'draft', label: '작성중' },
  { id: 'sent', label: '발송' },
  { id: 'accepted', label: '승인' },
  { id: 'rejected', label: '반려' },
  { id: 'expired', label: '만료' },
  { id: 'ordered', label: '수주전환' },
];

/** 과세유형 선택지 + 세율 — 실화면 TAX_MODE_OPTIONS 미러 */
const TAX_MODE_OPTIONS: readonly (Option<QuoteTaxMode> & { readonly rate: number })[] = [
  { id: 'standard', label: '과세(10%)', rate: 0.1 },
  { id: 'zero_rated', label: '영세율(0%)', rate: 0 },
  { id: 'exempt', label: '면세', rate: 0 },
];

const STATUS_TONE: Record<QuoteStatus, StatusBadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
  ordered: 'success',
};

const statusLabel = (status: QuoteStatus): string =>
  QUOTE_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status;
const taxModeLabel = (mode: QuoteTaxMode): string =>
  TAX_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
const taxRateOf = (mode: QuoteTaxMode): number =>
  TAX_MODE_OPTIONS.find((option) => option.id === mode)?.rate ?? 0;

/** 공급자(자사) 정보 — 실화면 SUPPLIER 미러(견적서 상단 고정) */
const SUPPLIER = {
  name: 'TDS 주식회사',
  bizNo: '211-88-11223',
  ceoName: '홍대표',
  address: '서울특별시 강남구 테헤란로 501, 12층',
  phone: '02-6000-1000',
} as const;

interface DemoLineItem {
  readonly id: string;
  readonly name: string;
  readonly spec: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

/** 라인 공급가액 = 수량 × 단가 — 실화면 lineSupply 미러 */
const lineSupply = (item: Pick<DemoLineItem, 'quantity' | 'unitPrice'>): number =>
  item.quantity * item.unitPrice;

interface QuoteTotals {
  readonly supply: number;
  readonly vat: number;
  readonly total: number;
}

/** 합계 — 라인별 공급가액 합산 + 라인별 반올림 세액 합산 (실화면 computeTotals 미러) */
const computeTotals = (items: readonly DemoLineItem[], taxMode: QuoteTaxMode): QuoteTotals => {
  const rate = taxRateOf(taxMode);
  let supply = 0;
  let vat = 0;
  for (const item of items) {
    const amount = lineSupply(item);
    supply += amount;
    vat += Math.round(amount * rate);
  }
  return { supply, vat, total: supply + vat };
};

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const formatNumber = (value: number): string => value.toLocaleString('ko-KR');

/** '000-00-00000' 표기 — 실화면 formatBizNo 미러(자릿수만 취해 3-2-5 로 끊는다) */
const formatBizNo = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const dash = (value: string): string => (value.trim() === '' ? '—' : value.trim());

/* ── 시드(신규/수정) ──────────────────────────────────────────────────────────────────────── */

interface SeedValues {
  readonly quoteNo: string;
  readonly status: QuoteStatus;
  readonly taxMode: QuoteTaxMode;
  readonly accountName: string;
  readonly contactName: string;
  readonly accountCeo: string;
  readonly accountBizNo: string;
  readonly issueDate: string;
  readonly validUntil: string;
  readonly items: readonly DemoLineItem[];
  readonly note: string;
}

const EMPTY_SEED: SeedValues = {
  quoteNo: '',
  status: 'draft',
  taxMode: 'standard',
  accountName: '',
  contactName: '',
  accountCeo: '',
  accountBizNo: '',
  issueDate: '',
  validUntil: '',
  items: [],
  note: '',
};

const EDIT_SEED: SeedValues = {
  quoteNo: 'Q-20260718-003',
  status: 'sent',
  taxMode: 'standard',
  accountName: '(주)한빛소프트웨어',
  contactName: '김담당',
  accountCeo: '김한빛',
  accountBizNo: '123-45-67890',
  issueDate: '2026-07-18',
  validUntil: '2026-08-17',
  items: [
    { id: 'li-1', name: 'ERP 라이선스', spec: '100석', quantity: 1, unitPrice: 18000000 },
    { id: 'li-2', name: '설치·교육', spec: '3일', quantity: 3, unitPrice: 1200000 },
  ],
  note: '납품 후 30일 이내 세금계산서 발행. 유지보수 1년 무상.',
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly accountName?: string;
  readonly items?: string;
  readonly period?: string;
  readonly note?: string;
}

const DEMO_ERRORS: FieldErrors = {
  accountName: '거래처를 입력하세요.',
  items: '품목을 한 개 이상 추가하세요.',
  period: '견적일·유효기간을 YYYY-MM-DD 형식으로 입력하세요.',
};

/* ── 스타일(토큰·rem·calc 만) ────────────────────────────────────────────────────────────── */

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
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 15), 1fr))`,
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

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

const partyRowStyle: CSSProperties = {
  ...rowStyle,
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
};

const controlBaseStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  ...controlBaseStyle,
  ...(invalid ? { borderColor: cssVar('color.feedback.danger.border') } : {}),
});

/** 자동 채번 값(견적번호)의 읽기 전용 표면 — 죽은 배경·흐린 글자·기본 커서로 '편집 불가'를 알린다 */
const systemValueStyle: CSSProperties = {
  ...controlBaseStyle,
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  cursor: 'default',
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const previewHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

/* ── 품목 편집표 스타일 ───────────────────────────────────────────────────────────────────── */

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const tableWrapStyle: CSSProperties = { width: '100%', overflowX: 'auto' };

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  ...typography('typography.label.sm'),
};

const thStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  color: cssVar('color.text.muted'),
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  color: cssVar('color.text.default'),
  verticalAlign: 'top',
};

const textInputStyle: CSSProperties = {
  ...controlBaseStyle,
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const numberInputStyle: CSSProperties = {
  ...controlBaseStyle,
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const amountCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const totalsLabelStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  color: cssVar('color.text.muted'),
};

const totalsValueStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const trashButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.feedback.danger.text'),
  cursor: 'pointer',
};

/* ── 견적서 미리보기 문서 스타일 ─────────────────────────────────────────────────────────────── */

const docStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.5'),
  paddingRight: cssVar('space.5'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const docHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const docTitleStyle: CSSProperties = {
  margin: 0,
  letterSpacing: cssVar('space.1'),
  color: cssVar('color.text.default'),
  ...typography('typography.title.lg'),
};

const docMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  textAlign: 'right',
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.sm'),
};

const partiesStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.3'),
};

const partyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
};

const partyLabelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const partyNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const partyLineStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
  ...typography('typography.caption.md'),
};

const totalsBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  alignItems: 'flex-end',
};

const totalRowStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.4'),
  justifyContent: 'space-between',
  minWidth: `calc(${cssVar('space.6')} * 6)`,
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.sm'),
};

const grandTotalStyle: CSSProperties = {
  ...totalRowStyle,
  ...typography('typography.title.md'),
  paddingTop: cssVar('space.2'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.medium'),
  borderTopColor: cssVar('color.border.default'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const docNoteStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
  ...typography('typography.caption.md'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ──────── */

function FormCard({ title, children }: { title: ReactNode; children: ReactNode }) {
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

/* ── 품목 명세 편집표(실화면 QuoteLineItemsTable 미러 — 합계 자동 계산) ─────────────────────────── */

interface LineItemsTableProps {
  readonly items: readonly DemoLineItem[];
  readonly taxMode: QuoteTaxMode;
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly onChange: (next: readonly DemoLineItem[]) => void;
}

function LineItemsTable({ items, taxMode, disabled, error, onChange }: LineItemsTableProps) {
  const totals = computeTotals(items, taxMode);

  const patch = (id: string, part: Partial<DemoLineItem>): void => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...part } : item)));
  };
  const remove = (id: string): void => onChange(items.filter((item) => item.id !== id));
  const add = (): void => {
    if (items.length >= QUOTE_MAX_ITEMS) return;
    onChange([
      ...items,
      { id: `li-new-${String(items.length + 1)}`, name: '', spec: '', quantity: 1, unitPrice: 0 },
    ]);
  };
  const toDigits = (raw: string): number => {
    const digits = raw.replace(/\D/g, '');
    return digits === '' ? 0 : Number(digits);
  };

  return (
    <div style={sectionStyle}>
      <span style={fieldLabelStyle}>품목 *</span>
      <p style={hintStyle}>
        {`품목을 추가하면 공급가액(수량 × 단가)이 자동 계산되고, 하단에 ${taxModeLabel(taxMode)} 기준 합계가 나옵니다. (최대 ${String(QUOTE_MAX_ITEMS)}개)`}
      </p>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th scope="col" style={thStyle}>
                품목명
              </th>
              <th scope="col" style={thStyle}>
                규격
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
                수량
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
                단가(원)
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
                공급가액(원)
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: 'center' }}>
                삭제
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...tdStyle, textAlign: 'center', color: cssVar('color.text.muted') }}
                >
                  품목을 추가하세요.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      style={textInputStyle}
                      value={item.name}
                      maxLength={QUOTE_ITEM_NAME_MAX}
                      placeholder="예: ERP 라이선스"
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 품목명`}
                      onChange={(event) => patch(item.id, { name: event.target.value })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      style={textInputStyle}
                      value={item.spec}
                      placeholder="예: 100석"
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 규격`}
                      onChange={(event) => patch(item.id, { spec: event.target.value })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      style={numberInputStyle}
                      value={String(item.quantity)}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 수량`}
                      onChange={(event) =>
                        patch(item.id, { quantity: toDigits(event.target.value) })
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      style={numberInputStyle}
                      value={String(item.unitPrice)}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 단가`}
                      onChange={(event) =>
                        patch(item.id, { unitPrice: toDigits(event.target.value) })
                      }
                    />
                  </td>
                  <td style={amountCellStyle}>{formatNumber(lineSupply(item))}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      style={trashButtonStyle}
                      disabled={disabled}
                      aria-label={`품목 ${String(index + 1)} 삭제`}
                      onClick={() => remove(item.id)}
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                공급가액 합계
              </td>
              <td style={totalsValueStyle}>{formatNumber(totals.supply)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                {`부가세(${taxModeLabel(taxMode)})`}
              </td>
              <td style={totalsValueStyle}>{formatNumber(totals.vat)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
            <tr>
              <td colSpan={4} style={totalsLabelStyle}>
                합계금액
              </td>
              <td style={totalsValueStyle}>{formatNumber(totals.total)}</td>
              <td style={tdStyle} aria-hidden="true" />
            </tr>
          </tfoot>
        </table>
      </div>

      {items.length < QUOTE_MAX_ITEMS && (
        <span>
          <Button
            variant="secondary"
            size="md"
            disabled={disabled}
            iconLeft={<Icon name="plus-circle" />}
            onClick={add}
          >
            품목 추가
          </Button>
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={{ ...hintStyle, color: cssVar('color.feedback.danger.text') }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── 견적서 미리보기(실화면 QuotePreview 미러) ──────────────────────────────────────────────── */

interface QuotePreviewProps {
  readonly quoteNo: string;
  readonly accountName: string;
  readonly accountBizNo: string;
  readonly accountCeo: string;
  readonly contactName: string;
  readonly issueDate: string;
  readonly validUntil: string;
  readonly taxMode: QuoteTaxMode;
  readonly status: QuoteStatus;
  readonly items: readonly DemoLineItem[];
  readonly note: string;
}

function QuotePreview({
  quoteNo,
  accountName,
  accountBizNo,
  accountCeo,
  contactName,
  issueDate,
  validUntil,
  taxMode,
  status,
  items,
  note,
}: QuotePreviewProps) {
  const totals = computeTotals(items, taxMode);

  return (
    <div style={docStyle} aria-label="견적서 미리보기">
      <div style={docHeadStyle}>
        <h2 style={docTitleStyle}>견 적 서</h2>
        <div style={docMetaStyle}>
          <span>{quoteNo === '' ? '(자동 부여)' : quoteNo}</span>
          <span>{`견적일 ${dash(issueDate)}`}</span>
          <span>{`유효기간 ${dash(validUntil)}`}</span>
          <StatusBadge tone={STATUS_TONE[status]} label={statusLabel(status)} />
        </div>
      </div>

      <div style={partiesStyle}>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급받는자</span>
          <span style={partyNameStyle}>
            {accountName.trim() === '' ? '(거래처 미입력)' : accountName.trim()}
          </span>
          <span style={partyLineStyle}>
            {`사업자 ${accountBizNo.trim() === '' ? '—' : formatBizNo(accountBizNo)}`}
          </span>
          <span style={partyLineStyle}>{`대표 ${dash(accountCeo)}`}</span>
          <span style={partyLineStyle}>{`담당 ${dash(contactName)}`}</span>
        </div>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급자</span>
          <span style={partyNameStyle}>{SUPPLIER.name}</span>
          <span style={partyLineStyle}>{`사업자 ${formatBizNo(SUPPLIER.bizNo)}`}</span>
          <span style={partyLineStyle}>{`대표 ${SUPPLIER.ceoName}`}</span>
          <span style={partyLineStyle}>{SUPPLIER.address}</span>
          <span style={partyLineStyle}>{SUPPLIER.phone}</span>
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th scope="col" style={thStyle}>
              품목
            </th>
            <th scope="col" style={thStyle}>
              규격
            </th>
            <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
              수량
            </th>
            <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
              단가
            </th>
            <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
              공급가액
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ ...tdStyle, textAlign: 'center', color: cssVar('color.text.muted') }}
              >
                품목이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{dash(item.name)}</td>
                <td style={tdStyle}>{dash(item.spec)}</td>
                <td style={amountCellStyle}>{formatNumber(item.quantity)}</td>
                <td style={amountCellStyle}>{formatNumber(item.unitPrice)}</td>
                <td style={amountCellStyle}>{formatNumber(lineSupply(item))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={totalsBlockStyle}>
        <div style={totalRowStyle}>
          <span>공급가액</span>
          <span>{formatNumber(totals.supply)}</span>
        </div>
        <div style={totalRowStyle}>
          <span>{`부가세(${taxModeLabel(taxMode)})`}</span>
          <span>{formatNumber(totals.vat)}</span>
        </div>
        <div style={grandTotalStyle}>
          <span>합계금액</span>
          <span>{`${formatNumber(totals.total)}원`}</span>
        </div>
      </div>

      {note.trim() !== '' && <p style={docNoteStyle}>{`비고: ${note.trim()}`}</p>}
    </div>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface QuoteFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 중 — 실화면 loadingDetail: 모든 입력을 잠그고 저장 버튼을 막는다 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function QuoteFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: QuoteFormScreenProps) {
  const [quoteNo] = useState(seed.quoteNo);
  const [status, setStatus] = useState<QuoteStatus>(seed.status);
  const [taxMode, setTaxMode] = useState<QuoteTaxMode>(seed.taxMode);
  const [accountName, setAccountName] = useState(seed.accountName);
  const [contactName, setContactName] = useState(seed.contactName);
  const [accountCeo, setAccountCeo] = useState(seed.accountCeo);
  const [accountBizNo, setAccountBizNo] = useState(seed.accountBizNo);
  const [issueDate, setIssueDate] = useState(seed.issueDate);
  const [validUntil, setValidUntil] = useState(seed.validUntil);
  const [items, setItems] = useState<readonly DemoLineItem[]>(seed.items);
  const [note, setNote] = useState(seed.note);

  const disabled = loadingDetail;

  return (
    <div style={pageStyle}>
      <a href="#quote-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '견적 수정' : '견적 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 실제 견적서 모습을 확인하세요. 견적번호는
          시스템이 저장 시 자동 부여하며 수정할 수 없습니다.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={formStyle}>
        <div style={layoutStyle}>
          <div style={columnStyle}>
            <FormCard title="견적 정보">
              <div style={rowStyle}>
                <FormField
                  htmlFor="quote-no"
                  label="견적번호"
                  hint="시스템이 저장 시 자동 부여합니다 (수정 불가)"
                >
                  <input
                    id="quote-no"
                    type="text"
                    style={systemValueStyle}
                    value={quoteNo}
                    placeholder="저장 시 자동 부여"
                    readOnly
                    aria-readonly="true"
                  />
                </FormField>
                <FormField htmlFor="quote-status" label="상태" required>
                  <SelectField
                    id="quote-status"
                    value={status}
                    disabled={disabled}
                    onChange={(event) => setStatus(event.target.value as QuoteStatus)}
                  >
                    {QUOTE_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="quote-tax" label="과세유형" required>
                  <SelectField
                    id="quote-tax"
                    value={taxMode}
                    disabled={disabled}
                    onChange={(event) => setTaxMode(event.target.value as QuoteTaxMode)}
                  >
                    {TAX_MODE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={partyRowStyle}>
                <FormField
                  htmlFor="quote-account"
                  label="거래처(공급받는자)"
                  required
                  {...(errors.accountName !== undefined && { error: errors.accountName })}
                >
                  <input
                    id="quote-account"
                    type="text"
                    style={controlStyle(errors.accountName !== undefined)}
                    value={accountName}
                    placeholder="예: (주)한빛소프트웨어"
                    disabled={disabled}
                    aria-invalid={errors.accountName !== undefined}
                    onChange={(event) => setAccountName(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="quote-contact" label="담당자">
                  <input
                    id="quote-contact"
                    type="text"
                    style={controlStyle(false)}
                    value={contactName}
                    placeholder="예: 김담당"
                    disabled={disabled}
                    onChange={(event) => setContactName(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="quote-account-ceo" label="대표자">
                  <input
                    id="quote-account-ceo"
                    type="text"
                    style={controlStyle(false)}
                    value={accountCeo}
                    placeholder="예: 김한빛"
                    disabled={disabled}
                    onChange={(event) => setAccountCeo(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="quote-account-biz" label="사업자등록번호">
                  <input
                    id="quote-account-biz"
                    type="text"
                    inputMode="numeric"
                    style={controlStyle(false)}
                    value={accountBizNo}
                    placeholder="000-00-00000"
                    disabled={disabled}
                    onChange={(event) => setAccountBizNo(formatBizNo(event.target.value))}
                  />
                </FormField>
              </div>

              <DateRangeField
                label="견적일 · 유효기간"
                required
                startValue={issueDate}
                endValue={validUntil}
                onStartChange={setIssueDate}
                onEndChange={setValidUntil}
                disabled={disabled}
                {...(errors.period !== undefined && { error: errors.period })}
              />
            </FormCard>

            <FormCard title="품목 명세">
              <LineItemsTable
                items={items}
                taxMode={taxMode}
                disabled={disabled}
                onChange={setItems}
                {...(errors.items !== undefined && { error: errors.items })}
              />
            </FormCard>

            <FormCard title="비고">
              <TextareaField
                label="비고"
                value={note}
                onChange={setNote}
                maxLength={QUOTE_NOTE_MAX}
                disabled={disabled}
                placeholder="납기·결제조건·할인 안내 등을 기록하세요."
                rows={3}
                error={errors.note ?? ''}
              />
            </FormCard>
          </div>

          <FormCard
            title={
              <span style={previewHeadStyle}>
                미리보기
                <Button type="button" variant="secondary" size="sm">
                  인쇄 · PDF 저장
                </Button>
              </span>
            }
          >
            <QuotePreview
              quoteNo={quoteNo}
              accountName={accountName}
              accountBizNo={accountBizNo}
              accountCeo={accountCeo}
              contactName={contactName}
              issueDate={issueDate}
              validUntil={validUntil}
              taxMode={taxMode}
              status={status}
              items={items}
              note={note}
            />
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md" disabled={loadingDetail}>
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={loadingDetail}>
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 견적 입력. 미리보기는 '(자동 부여)'·빈 품목표를 보여준다 */
export const Default: Story = {
  render: () => <QuoteFormScreen />,
};

/** 수정: 기존 값이 채워진 폼 — 품목 2건의 공급가액·부가세·합계가 자동 합산되고 미리보기에 반영된다 */
export const Edit: Story = {
  render: () => <QuoteFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 — 실화면 loadingDetail 처럼 모든 입력이 잠기고 저장/취소 버튼이 막힌다 */
export const Loading: Story = {
  render: () => <QuoteFormScreen isEdit seed={EDIT_SEED} loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 거래처·품목·유효기간 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <QuoteFormScreen errors={DEMO_ERRORS} />,
};
