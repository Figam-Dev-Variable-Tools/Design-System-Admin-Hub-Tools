/**
 * Design System/Templates/Sales/Account Form — 거래처 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Accounts 엔트리(`/sales/accounts`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/accounts/AccountFormPage.tsx (라우트 /sales/accounts/new · /:id/edit).
 * 실화면은 승격된 CRUD 프레임워크(useCrudForm + zod) 위에 왼쪽 입력 카드(사업자정보 · 거래조건 · 담당자 ·
 * 비고)와 오른쪽 사업자 정보 미리보기를 2단으로 세운다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 전용 껍데기·조각(FormPageShell·useCrudForm·AccountContactsField·
 * AccountBusinessPreview·CardTitle·controlStyle)은 DS 표면과 토큰 레이아웃으로 갈음한다:
 *   뒤로가기(FormPageShell)      → Icon(chevron-left) + 토큰만 쓴 <a>
 *   페이지 제목(pageTitleStyle)   → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목(CardTitle) → Card + 토큰만 쓴 <h2>(title.md · DS 부재라 토큰 레이아웃으로 대체)
 *   상호 · 대표자 · 업태 · 종목 · 주소 · 전화 · 여신한도 → FormField + 토큰만 쓴 <input>
 *   과세유형 · 거래유형 · 신용등급 · 결제조건 → FormField + SelectField
 *   최근 거래일                    → FormField + 토큰만 쓴 <input type="date">
 *   거래 상태                      → ToggleSwitch
 *   담당자(AccountContactsField)   → 토큰만 쓴 반복 입력행 + 대표담당 라디오 + Button/Icon
 *   비고                          → TextareaField
 *   미리보기(AccountBusinessPreview) → 토큰만 쓴 요약 카드 + StatusBadge
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
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  StatusBadge,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Account Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 sales/accounts/types 를 화면이 쓰는 필드만 축약해 미러) ────────────── */

type TradeType = 'sales' | 'purchase' | 'both';
type TaxType = 'general' | 'simplified' | 'exempt' | 'zero_rated';
type CreditGrade = 'A' | 'B' | 'C' | 'D';
type PaymentTerm = 'cash' | 'eom' | 'net_30' | 'net_60' | 'next_eom';

const ACCOUNT_NAME_MAX = 60;
const ACCOUNT_NOTE_MAX = 500;
const ACCOUNT_MAX_CONTACTS = 8;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

const TRADE_TYPE_OPTIONS: readonly Option<TradeType>[] = [
  { id: 'sales', label: '매출처' },
  { id: 'purchase', label: '매입처' },
  { id: 'both', label: '매입매출' },
];

const TAX_TYPE_OPTIONS: readonly Option<TaxType>[] = [
  { id: 'general', label: '일반과세' },
  { id: 'simplified', label: '간이과세' },
  { id: 'exempt', label: '면세' },
  { id: 'zero_rated', label: '영세율' },
];

const CREDIT_GRADE_OPTIONS: readonly Option<CreditGrade>[] = [
  { id: 'A', label: 'A (우량)' },
  { id: 'B', label: 'B (정상)' },
  { id: 'C', label: 'C (주의)' },
  { id: 'D', label: 'D (불량)' },
];

const PAYMENT_TERM_OPTIONS: readonly Option<PaymentTerm>[] = [
  { id: 'cash', label: '현금' },
  { id: 'eom', label: '말일결제' },
  { id: 'net_30', label: 'Net-30' },
  { id: 'net_60', label: 'Net-60' },
  { id: 'next_eom', label: '익월말' },
];

const labelOf = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

const tradeTypeLabel = (value: TradeType): string => labelOf(TRADE_TYPE_OPTIONS, value);
const taxTypeLabel = (value: TaxType): string => labelOf(TAX_TYPE_OPTIONS, value);
const paymentTermLabel = (value: PaymentTerm): string => labelOf(PAYMENT_TERM_OPTIONS, value);
const creditGradeLabel = (value: CreditGrade): string => labelOf(CREDIT_GRADE_OPTIONS, value);

/** 거래유형 배지 색 — 실화면 tradeTypeTone 미러 */
const tradeTypeTone = (value: TradeType): StatusBadgeTone => {
  if (value === 'sales') return 'info';
  if (value === 'purchase') return 'warning';
  return 'success';
};

/** 신용등급 배지 색 — 실화면 creditGradeTone 미러(A 진해질수록 위험) */
const creditGradeTone = (value: CreditGrade): StatusBadgeTone => {
  if (value === 'A') return 'success';
  if (value === 'B') return 'info';
  if (value === 'C') return 'warning';
  return 'danger';
};

/** ko-KR 자릿수 구분 */
const formatNumber = (value: number): string => value.toLocaleString('ko-KR');
/** 원화 표기 '50,000,000원' — 실화면 formatWon 미러 */
const formatWon = (amount: number): string => `${formatNumber(amount)}원`;

/** '000-00-00000' 표기 — 실화면 formatBizNo 미러(자릿수만 취해 3-2-5 로 끊는다) */
const formatBizNo = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

const placeholderDash = (value: string): string => (value.trim() === '' ? '—' : value.trim());

interface DemoContact {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly email: string;
  readonly primary: boolean;
}

/* ── 시드(신규/수정) ──────────────────────────────────────────────────────────────────────── */

interface SeedValues {
  readonly name: string;
  readonly bizNo: string;
  readonly ceoName: string;
  readonly bizType: string;
  readonly bizItem: string;
  readonly tradeType: TradeType;
  readonly taxType: TaxType;
  readonly creditGrade: CreditGrade;
  readonly creditLimit: string;
  readonly paymentTerm: PaymentTerm;
  readonly address: string;
  readonly phone: string;
  readonly contacts: readonly DemoContact[];
  readonly active: boolean;
  readonly lastTradeAt: string;
  readonly note: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  bizNo: '',
  ceoName: '',
  bizType: '',
  bizItem: '',
  tradeType: 'sales',
  taxType: 'general',
  creditGrade: 'B',
  creditLimit: '0',
  paymentTerm: 'net_30',
  address: '',
  phone: '',
  contacts: [
    { id: 'ct-1', name: '', department: '', position: '', phone: '', email: '', primary: true },
  ],
  active: true,
  lastTradeAt: '',
  note: '',
};

const EDIT_SEED: SeedValues = {
  name: '(주)한빛소프트웨어',
  bizNo: '123-45-67890',
  ceoName: '김한빛',
  bizType: '서비스',
  bizItem: '소프트웨어 개발',
  tradeType: 'sales',
  taxType: 'general',
  creditGrade: 'A',
  creditLimit: '50000000',
  paymentTerm: 'net_30',
  address: '서울특별시 강남구 테헤란로 123',
  phone: '02-1234-5678',
  contacts: [
    {
      id: 'ct-1',
      name: '이영업',
      department: '영업팀',
      position: '팀장',
      phone: '010-1111-2222',
      email: 'sales@hanbit.co.kr',
      primary: true,
    },
    {
      id: 'ct-2',
      name: '박구매',
      department: '구매팀',
      position: '대리',
      phone: '010-3333-4444',
      email: 'buy@hanbit.co.kr',
      primary: false,
    },
  ],
  active: true,
  lastTradeAt: '2026-06-30',
  note: '분기별 정기 발주. 세금계산서 익월 10일 발행.',
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly bizNo?: string;
  readonly ceoName?: string;
  readonly creditLimit?: string;
  readonly contacts?: string;
  readonly note?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '상호를 입력하세요.',
  bizNo: '올바른 사업자등록번호가 아니에요. (000-00-00000)',
  ceoName: '대표자명을 입력하세요.',
  contacts: '담당자 이름을 입력하세요.',
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
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const errorTextStyle: CSSProperties = {
  ...hintStyle,
  color: cssVar('color.feedback.danger.text'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/* ── 담당자 편집기 스타일 ─────────────────────────────────────────────────────────────────── */

const contactsRowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const contactGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const contactCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const cellLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.default'),
};

const primaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const primaryLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.default'),
  cursor: 'pointer',
  ...typography('typography.label.md'),
};

const removeButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.feedback.danger.text'),
  cursor: 'pointer',
  ...typography('typography.label.sm'),
};

/* ── 미리보기 스타일 ──────────────────────────────────────────────────────────────────────── */

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const previewHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const previewNameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

const previewGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(calc(${cssVar('space.6')} * 2), auto) minmax(0, 1fr)`,
  columnGap: cssVar('space.3'),
  rowGap: cssVar('space.2'),
};

const previewKeyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const previewValueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
  ...typography('typography.label.md'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
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

/* ── 담당자 편집기(실화면 AccountContactsField 미러 — 복수 + 대표담당 1명) ──────────────────────── */

interface ContactCellProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}

function ContactCell({ id, label, value, placeholder, disabled, onChange }: ContactCellProps) {
  return (
    <label style={contactCellStyle} htmlFor={id}>
      <span style={cellLabelStyle}>{label}</span>
      <input
        id={id}
        type="text"
        style={controlStyle(false)}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface ContactsFieldProps {
  readonly contacts: readonly DemoContact[];
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly onChange: (next: readonly DemoContact[]) => void;
}

function ContactsField({ contacts, disabled, error, onChange }: ContactsFieldProps) {
  const patch = (id: string, part: Partial<DemoContact>): void => {
    onChange(contacts.map((contact) => (contact.id === id ? { ...contact, ...part } : contact)));
  };
  const setPrimary = (id: string): void => {
    onChange(contacts.map((contact) => ({ ...contact, primary: contact.id === id })));
  };
  const remove = (id: string): void => {
    const next = contacts.filter((contact) => contact.id !== id);
    if (next.length > 0 && !next.some((contact) => contact.primary)) {
      onChange(next.map((contact, index) => ({ ...contact, primary: index === 0 })));
      return;
    }
    onChange(next);
  };
  const add = (): void => {
    if (contacts.length >= ACCOUNT_MAX_CONTACTS) return;
    onChange([
      ...contacts,
      {
        id: `ct-new-${String(contacts.length + 1)}`,
        name: '',
        department: '',
        position: '',
        phone: '',
        email: '',
        primary: contacts.length === 0,
      },
    ]);
  };

  return (
    <div style={contactGroupStyle}>
      <span style={fieldLabelStyle}>담당자 *</span>
      <p style={hintStyle}>
        {`거래처 담당자를 등록하세요. 대표담당 1명이 목록·견적서에 노출돼요. (최대 ${String(ACCOUNT_MAX_CONTACTS)}명)`}
      </p>

      <div style={contactsRowsStyle}>
        {contacts.map((contact, index) => (
          <div key={contact.id} style={contactGroupStyle}>
            <div style={formRowStyle}>
              <ContactCell
                id={`contact-name-${contact.id}`}
                label={`담당자 ${String(index + 1)} 이름`}
                value={contact.name}
                placeholder="예: 홍길동"
                disabled={disabled}
                onChange={(value) => patch(contact.id, { name: value })}
              />
              <ContactCell
                id={`contact-dept-${contact.id}`}
                label="부서"
                value={contact.department}
                placeholder="예: 구매팀"
                disabled={disabled}
                onChange={(value) => patch(contact.id, { department: value })}
              />
              <ContactCell
                id={`contact-position-${contact.id}`}
                label="직급"
                value={contact.position}
                placeholder="예: 팀장"
                disabled={disabled}
                onChange={(value) => patch(contact.id, { position: value })}
              />
              <ContactCell
                id={`contact-phone-${contact.id}`}
                label="연락처"
                value={contact.phone}
                placeholder="예: 010-0000-0000"
                disabled={disabled}
                onChange={(value) => patch(contact.id, { phone: value })}
              />
              <ContactCell
                id={`contact-email-${contact.id}`}
                label="이메일"
                value={contact.email}
                placeholder="예: user@company.com"
                disabled={disabled}
                onChange={(value) => patch(contact.id, { email: value })}
              />
            </div>
            <div style={primaryRowStyle}>
              <label style={primaryLabelStyle}>
                <input
                  type="radio"
                  name="account-primary-contact"
                  checked={contact.primary}
                  disabled={disabled}
                  onChange={() => setPrimary(contact.id)}
                />
                대표담당으로 지정
              </label>
              {contacts.length > 1 && (
                <button
                  type="button"
                  style={removeButtonStyle}
                  disabled={disabled}
                  onClick={() => remove(contact.id)}
                >
                  <Icon name="trash" />
                  담당자 삭제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {contacts.length < ACCOUNT_MAX_CONTACTS && (
        <span>
          <Button
            variant="secondary"
            size="md"
            disabled={disabled}
            iconLeft={<Icon name="plus-circle" />}
            onClick={add}
          >
            담당자 추가
          </Button>
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── 사업자 정보 미리보기(실화면 AccountBusinessPreview 미러) ───────────────────────────────── */

interface BusinessPreviewProps {
  readonly name: string;
  readonly bizNo: string;
  readonly ceoName: string;
  readonly bizType: string;
  readonly bizItem: string;
  readonly address: string;
  readonly tradeType: TradeType;
  readonly taxType: TaxType;
  readonly creditGrade: CreditGrade;
  readonly creditLimit: number;
  readonly paymentTerm: PaymentTerm;
}

function BusinessPreview({
  name,
  bizNo,
  ceoName,
  bizType,
  bizItem,
  address,
  tradeType,
  taxType,
  creditGrade,
  creditLimit,
  paymentTerm,
}: BusinessPreviewProps) {
  return (
    <div style={previewCardStyle} aria-label="사업자 정보 미리보기">
      <div style={previewHeadStyle}>
        <span style={previewNameStyle}>{name.trim() === '' ? '(상호 미입력)' : name.trim()}</span>
        <StatusBadge tone={tradeTypeTone(tradeType)} label={tradeTypeLabel(tradeType)} />
      </div>

      <div style={previewGridStyle}>
        <span style={previewKeyStyle}>사업자번호</span>
        <span style={previewValueStyle}>{bizNo.trim() === '' ? '—' : formatBizNo(bizNo)}</span>
        <span style={previewKeyStyle}>대표자</span>
        <span style={previewValueStyle}>{placeholderDash(ceoName)}</span>
        <span style={previewKeyStyle}>업태 / 종목</span>
        <span
          style={previewValueStyle}
        >{`${placeholderDash(bizType)} / ${placeholderDash(bizItem)}`}</span>
        <span style={previewKeyStyle}>과세유형</span>
        <span style={previewValueStyle}>{taxTypeLabel(taxType)}</span>
        <span style={previewKeyStyle}>사업장</span>
        <span style={previewValueStyle}>{placeholderDash(address)}</span>
      </div>

      <div style={badgeRowStyle}>
        <StatusBadge
          tone={creditGradeTone(creditGrade)}
          label={`신용 ${creditGradeLabel(creditGrade)}`}
        />
        <StatusBadge tone="neutral" label={`여신 ${formatWon(creditLimit)}`} />
        <StatusBadge tone="neutral" label={paymentTermLabel(paymentTerm)} />
      </div>
    </div>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface AccountFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 중 — 실화면 loadingDetail: 모든 입력을 잠그고 저장 버튼을 막는다 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function AccountFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: AccountFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [bizNo, setBizNo] = useState(seed.bizNo);
  const [ceoName, setCeoName] = useState(seed.ceoName);
  const [bizType, setBizType] = useState(seed.bizType);
  const [bizItem, setBizItem] = useState(seed.bizItem);
  const [tradeType, setTradeType] = useState<TradeType>(seed.tradeType);
  const [taxType, setTaxType] = useState<TaxType>(seed.taxType);
  const [creditGrade, setCreditGrade] = useState<CreditGrade>(seed.creditGrade);
  const [creditLimit, setCreditLimit] = useState(seed.creditLimit);
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(seed.paymentTerm);
  const [address, setAddress] = useState(seed.address);
  const [phone, setPhone] = useState(seed.phone);
  const [contacts, setContacts] = useState<readonly DemoContact[]>(seed.contacts);
  const [active, setActive] = useState(seed.active);
  const [lastTradeAt, setLastTradeAt] = useState(seed.lastTradeAt);
  const [note, setNote] = useState(seed.note);

  const disabled = loadingDetail;

  return (
    <div style={pageStyle}>
      <a href="#account-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '거래처 수정' : '거래처 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 사업자등록번호는 국세청 형식으로 검증돼요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={formStyle}>
        <div style={layoutStyle}>
          <div style={columnStyle}>
            <FormCard title="사업자 정보">
              <FormField
                htmlFor="account-name"
                label="상호(거래처명)"
                required
                {...(errors.name !== undefined && { error: errors.name })}
              >
                <input
                  id="account-name"
                  type="text"
                  style={controlStyle(errors.name !== undefined)}
                  value={name}
                  maxLength={ACCOUNT_NAME_MAX}
                  placeholder="예: (주)한빛소프트웨어"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>

              <div style={formRowStyle}>
                <FormField
                  htmlFor="account-biz-no"
                  label="사업자등록번호"
                  required
                  {...(errors.bizNo !== undefined && { error: errors.bizNo })}
                >
                  <input
                    id="account-biz-no"
                    type="text"
                    inputMode="numeric"
                    style={controlStyle(errors.bizNo !== undefined)}
                    value={bizNo}
                    placeholder="000-00-00000"
                    disabled={disabled}
                    aria-invalid={errors.bizNo !== undefined}
                    onChange={(event) => setBizNo(formatBizNo(event.target.value))}
                  />
                </FormField>
                <FormField
                  htmlFor="account-ceo"
                  label="대표자명"
                  required
                  {...(errors.ceoName !== undefined && { error: errors.ceoName })}
                >
                  <input
                    id="account-ceo"
                    type="text"
                    style={controlStyle(errors.ceoName !== undefined)}
                    value={ceoName}
                    maxLength={40}
                    placeholder="예: 김한빛"
                    disabled={disabled}
                    aria-invalid={errors.ceoName !== undefined}
                    onChange={(event) => setCeoName(event.target.value)}
                  />
                </FormField>
              </div>

              <div style={formRowStyle}>
                <FormField htmlFor="account-biz-type" label="업태">
                  <input
                    id="account-biz-type"
                    type="text"
                    style={controlStyle(false)}
                    value={bizType}
                    placeholder="예: 서비스"
                    disabled={disabled}
                    onChange={(event) => setBizType(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="account-biz-item" label="종목">
                  <input
                    id="account-biz-item"
                    type="text"
                    style={controlStyle(false)}
                    value={bizItem}
                    placeholder="예: 소프트웨어 개발"
                    disabled={disabled}
                    onChange={(event) => setBizItem(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="account-tax" label="과세유형" required>
                  <SelectField
                    id="account-tax"
                    value={taxType}
                    disabled={disabled}
                    onChange={(event) => setTaxType(event.target.value as TaxType)}
                  >
                    {TAX_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <FormField htmlFor="account-address" label="사업장 주소">
                <input
                  id="account-address"
                  type="text"
                  style={controlStyle(false)}
                  value={address}
                  placeholder="예: 서울특별시 강남구 테헤란로 123"
                  disabled={disabled}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </FormField>

              <FormField htmlFor="account-phone" label="대표 전화">
                <input
                  id="account-phone"
                  type="text"
                  style={controlStyle(false)}
                  value={phone}
                  placeholder="예: 02-1234-5678"
                  disabled={disabled}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </FormField>
            </FormCard>

            <FormCard title="거래 조건">
              <div style={formRowStyle}>
                <FormField htmlFor="account-trade-type" label="거래유형" required>
                  <SelectField
                    id="account-trade-type"
                    value={tradeType}
                    disabled={disabled}
                    onChange={(event) => setTradeType(event.target.value as TradeType)}
                  >
                    {TRADE_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="account-credit-grade" label="신용등급" required>
                  <SelectField
                    id="account-credit-grade"
                    value={creditGrade}
                    disabled={disabled}
                    onChange={(event) => setCreditGrade(event.target.value as CreditGrade)}
                  >
                    {CREDIT_GRADE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={formRowStyle}>
                <FormField
                  htmlFor="account-credit-limit"
                  label="여신한도 (원)"
                  required
                  hint="0 이면 미설정"
                  {...(errors.creditLimit !== undefined && { error: errors.creditLimit })}
                >
                  <input
                    id="account-credit-limit"
                    type="text"
                    inputMode="numeric"
                    style={controlStyle(errors.creditLimit !== undefined)}
                    value={creditLimit}
                    placeholder="예: 50000000"
                    disabled={disabled}
                    aria-invalid={errors.creditLimit !== undefined}
                    onChange={(event) => setCreditLimit(event.target.value)}
                  />
                </FormField>
                <FormField htmlFor="account-payment-term" label="결제조건" required>
                  <SelectField
                    id="account-payment-term"
                    value={paymentTerm}
                    disabled={disabled}
                    onChange={(event) => setPaymentTerm(event.target.value as PaymentTerm)}
                  >
                    {PAYMENT_TERM_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="account-last-trade" label="최근 거래일">
                  <input
                    id="account-last-trade"
                    type="date"
                    style={controlStyle(false)}
                    value={lastTradeAt}
                    disabled={disabled}
                    onChange={(event) => setLastTradeAt(event.target.value)}
                  />
                </FormField>
              </div>

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>거래 상태</span>
                <ToggleSwitch
                  checked={active}
                  onChange={setActive}
                  disabled={disabled}
                  label="거래처 거래 여부"
                  onLabel="거래중"
                  offLabel="중지"
                />
              </div>
            </FormCard>

            <FormCard title="담당자">
              <ContactsField
                contacts={contacts}
                disabled={disabled}
                onChange={setContacts}
                {...(errors.contacts !== undefined && { error: errors.contacts })}
              />
            </FormCard>

            <FormCard title="비고">
              <TextareaField
                label="메모"
                value={note}
                onChange={setNote}
                maxLength={ACCOUNT_NOTE_MAX}
                disabled={disabled}
                placeholder="거래 이력·특이사항을 기록하세요."
                rows={3}
                error={errors.note ?? ''}
              />
            </FormCard>
          </div>

          <FormCard title="미리보기">
            <BusinessPreview
              name={name}
              bizNo={bizNo}
              ceoName={ceoName}
              bizType={bizType}
              bizItem={bizItem}
              address={address}
              tradeType={tradeType}
              taxType={taxType}
              creditGrade={creditGrade}
              creditLimit={digitsToNumber(creditLimit)}
              paymentTerm={paymentTerm}
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

/** 정상(등록): 빈 폼 — 신규 거래처 입력. 담당자 1행이 대표담당으로 선택된 채 시작한다 */
export const Default: Story = {
  render: () => <AccountFormScreen />,
};

/** 수정: 기존 값이 채워진 폼 — 담당자 2명(대표담당 1명)·신용등급/여신/결제조건이 미리보기 배지로 요약된다 */
export const Edit: Story = {
  render: () => <AccountFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 — 실화면 loadingDetail 처럼 모든 입력이 잠기고 저장/취소 버튼이 막힌다 */
export const Loading: Story = {
  render: () => <AccountFormScreen isEdit seed={EDIT_SEED} loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 상호·사업자번호·대표자명·담당자 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <AccountFormScreen errors={DEMO_ERRORS} />,
};
