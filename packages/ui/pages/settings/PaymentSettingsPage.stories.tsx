/**
 * Design System/Templates/Settings/Payment — 결제(PG) 설정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['시스템 설정', 'Settings', '/settings', …]` · 화면 `['/settings/payment', '결제 설정', 'Payment']`
 * 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/settings/payment/PaymentSettingsPage.tsx (라우트 /settings/payment)
 * 와 그 하위 조립(_shared/SettingsFormShell · components/CheckoutCtaPreview).
 *
 * [이 화면이 정하는 것 하나] 상품과 프로그램을 **결제로 파는가, 문의로 받는가**. 스위치 하나(PG 결제
 * 사용)가 그 갈림이고 나머지 칸은 전부 그 스위치에 딸린 값이다 — 켜면 PG사·상점 ID·연동 모드·결제수단
 * 구획이 나타나고, 끄면 문의 전환 안내 구획이 대신 선다. 꺼진 값을 잠가 두지 않고 **자리를 없애는**
 * 이유는, 잠긴 칸이 남아 있으면 '지금 무엇을 정해야 하는가' 가 흐려지기 때문이다(저장된 값은 그대로
 * 보관된다). 그래서 이 템플릿은 두 상태를 **모두** 스토리로 보여 준다.
 *
 * [결과를 먼저 보여 준다] 여기서 정한 값은 이 화면 밖(상품 카드·프로그램 상세)에서만 눈에 띈다.
 * 스위치 아래의 미리보기가 상품 '구매하기'·프로그램 '후원하기' 두 버튼을 나란히 그리고, PG 를 끄면
 * 둘이 '문의하기' 로 수렴하는 것을 저장 전에 보여 준다. 한쪽만 그리면 그 수렴이 보이지 않는다.
 * 라벨은 이 화면이 고르지 않는다 — shared/commerce 의 checkoutCta 규칙(PG 를 켜 두고 상점 ID 가
 * 비어 있어도 문의로 떨어진다 · fail-closed)을 그대로 미러한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   SettingsFormShell → Card + 토큰 <h2> + 구획 <section> + 저장 툴바(Button)
 *   TextInputField    → TextField(trailing 슬롯에 글자 카운터)
 *   CheckoutCtaPreview 의 '버튼처럼 보이는 <span>' → component.button.* 토큰만 쓴 <span>
 *                       (누를 것이 없는 자리에 진짜 버튼을 두지 않는다)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   PG 결제 사용 스위치       → ToggleSwitch (사용/미사용)
 *   고객 화면 미리보기        → 토큰만 쓴 점선 스테이지 ×2 + 버튼 시각 토큰 <span>
 *   PG사 · 연동 모드          → FormField + SelectField (모드에 따라 hint 가 갈린다)
 *   상점 ID                  → TextField (+ 카운터 trailing · 60자 상한)
 *   결제수단(다중 선택)        → Checkbox ×5 in role="group" <ul>
 *   문의 전환 안내 문구        → TextareaField (200자 상한)
 *   PG 미사용 경고            → Alert(info) + 상품 문의·프로그램 문의로 가는 토큰 <a>
 *   검증 오류                 → FormField/TextField/TextareaField 의 error 슬롯
 *   조회 권한만 있음           → Alert(info) + 저장 툴바 자체를 그리지 않음 (EXC-03)
 *   최초 로드                 → Skeleton ×N (재조회로는 덮지 않는다 · STATE-01)
 *   저장 확인 · 409 충돌       → 스토리 밖(ConfirmDialog · ConflictDialog 는 각자의 컴포넌트 스토리)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
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
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/Payment',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 shared/commerce/payment-settings · validation 미러) ─────────────── */

/** 상점 ID 상한 — 형식 판정이 아니라 붙여넣기 사고를 막는 숫자다 */
const MERCHANT_ID_MAX = 60;
/** 안내 문구 상한 — 상품 카드 아래 한 문단에 들어가는 길이다 */
const INQUIRY_GUIDE_MAX = 200;

type PaymentProvider = 'toss' | 'inicis' | 'nice' | 'kakaopay';
type PaymentMethod = 'card' | 'transfer' | 'vbank' | 'phone' | 'easypay';
type PaymentMode = 'test' | 'live';
type CommerceDomain = 'product' | 'program';

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  toss: '토스페이먼츠',
  inicis: 'KG이니시스',
  nice: '나이스페이먼츠',
  kakaopay: '카카오페이',
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: '신용·체크카드',
  transfer: '계좌이체',
  vbank: '가상계좌',
  phone: '휴대폰 결제',
  easypay: '간편결제',
};

const MODE_LABEL: Record<PaymentMode, string> = {
  test: '테스트',
  live: '운영',
};

const PROVIDERS: readonly PaymentProvider[] = ['toss', 'inicis', 'nice', 'kakaopay'];
/** 카탈로그 순서 — 켰다 껐다 한 순서가 저장 값에 남지 않게 이 순서로 되맞춘다 */
const METHODS: readonly PaymentMethod[] = ['card', 'transfer', 'vbank', 'phone', 'easypay'];
const MODES: readonly PaymentMode[] = ['test', 'live'];

/** 결제하지 않는 동안 문의가 쌓이는 곳 — 도메인마다 창구가 다르다 */
const INQUIRY_PATH: Record<CommerceDomain, string> = {
  product: '/products/inquiries',
  program: '/programs/inquiries',
};

const PURCHASE_LABEL: Record<CommerceDomain, string> = {
  product: '구매하기',
  program: '후원하기',
};

const INQUIRY_LABEL = '문의하기';

interface DemoPaymentSettings {
  readonly usePg: boolean;
  readonly provider: PaymentProvider;
  /** PG 사가 발급한 상점 ID(MID) — 켠 상태로 비어 있으면 결제창을 열 수 없다 */
  readonly merchantId: string;
  readonly mode: PaymentMode;
  readonly methods: readonly PaymentMethod[];
  readonly inquiryGuide: string;
}

interface CheckoutCta {
  readonly kind: 'purchase' | 'inquiry';
  readonly label: string;
  readonly reason: string;
  readonly inquiryPath: string | null;
}

/**
 * 지금 이 설정으로 결제를 열 수 있는가 — usePg 만 보지 않는다.
 * 켜 두고 상점 ID 가 비어 있으면 결제창을 띄울 수 없으므로 **닫는 쪽으로 수렴한다**(fail-closed).
 */
const pgSellable = (settings: DemoPaymentSettings): boolean =>
  settings.usePg && settings.merchantId.trim() !== '';

/** 상품·프로그램의 구매 CTA — 파생값이다(실화면 checkoutCta 미러). 어디에도 저장하지 않는다 */
function checkoutCta(settings: DemoPaymentSettings, domain: CommerceDomain): CheckoutCta {
  if (!pgSellable(settings)) {
    return {
      kind: 'inquiry',
      label: INQUIRY_LABEL,
      reason: settings.usePg
        ? 'PG 상점 ID 가 비어 있어 결제창을 열 수 없습니다. 지금은 문의로 받습니다.'
        : 'PG 결제를 쓰지 않도록 설정되어 있어 결제 대신 문의로 받습니다.',
      inquiryPath: INQUIRY_PATH[domain],
    };
  }

  const provider = PROVIDER_LABEL[settings.provider];
  return {
    kind: 'purchase',
    label: PURCHASE_LABEL[domain],
    // 테스트 모드는 결제창이 뜨지만 돈이 움직이지 않는다 — '연동됨' 과 뭉뚱그리면 운영 전환을 잊는다
    reason:
      settings.mode === 'test'
        ? `${provider} 테스트 모드로 결제창이 열립니다. 실제 결제는 일어나지 않습니다.`
        : `${provider} 결제창이 열립니다.`,
    inquiryPath: null,
  };
}

/* ── 데모 데이터(실화면 DEFAULT_PAYMENT_SETTINGS · 저장 문서 미러) ─────────────────────────────── */

/** PG 를 끈 상태 — 이 앱은 아직 계약이 없어 **꺼진 상태에서 출발한다**(FEEDBACK-03) */
const PG_OFF: DemoPaymentSettings = {
  usePg: false,
  provider: 'toss',
  merchantId: '',
  mode: 'test',
  methods: ['card', 'transfer'],
  inquiryGuide:
    '현재 온라인 결제를 준비 중입니다. 문의를 남겨 주시면 담당자가 확인 후 연락드립니다.',
};

/** PG 를 켠 상태 — 상점 ID 가 채워져 있어 '구매하기 · 후원하기' 가 그려진다 */
const PG_ON: DemoPaymentSettings = {
  usePg: true,
  provider: 'toss',
  merchantId: 'tosspayments-mid-0001',
  mode: 'test',
  methods: ['card', 'transfer', 'easypay'],
  inquiryGuide:
    '현재 온라인 결제를 준비 중입니다. 문의를 남겨 주시면 담당자가 확인 후 연락드립니다.',
};

/** 검증 오류 데모 — 실화면 zod 스키마(교차 필드)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly merchantId?: string;
  readonly methods?: string;
  readonly inquiryGuide?: string;
}

const PG_ON_ERRORS: FieldErrors = {
  merchantId: 'PG 결제를 켰다면 상점 ID 를 입력하세요. PG 사에서 발급한 값입니다.',
  methods: '결제수단을 하나 이상 선택하세요.',
};

/** 미리보기에 세우는 두 자리 — 이름은 가상 예시다(픽스처의 실제 상품을 끌어오지 않는다) */
const STAGES: readonly {
  readonly domain: CommerceDomain;
  readonly title: string;
  readonly sample: string;
}[] = [
  { domain: 'product', title: '상품 상세', sample: '루미엔 경량 패딩 점퍼' },
  { domain: 'program', title: '프로그램 상세', sample: '도시숲 조성 프로젝트' },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.5'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.subtle'),
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const sectionBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
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

const errorTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
};

const counterStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const methodListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const linkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 미리보기 스타일 — 스테이지는 점선(진짜 화면이 아니라 '이렇게 보인다'는 그림이다) ───────────── */

const previewGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.3'),
};

const stageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  minWidth: 0,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const stageTitleStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const sampleStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const guideStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
  overflowWrap: 'anywhere',
};

/**
 * 버튼처럼 보이지만 버튼이 아니다 — 누를 것이 없는 자리에 진짜 버튼을 두면 운영자는 눌러 보고
 * 아무 일도 일어나지 않는 것을 확인하게 된다. DS 버튼의 **시각 토큰만** 빌려 <span> 으로 그린다.
 */
const ctaChipStyle = (primary: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('component.button.gap'),
  paddingTop: cssVar('component.button.padding-y'),
  paddingBottom: cssVar('component.button.padding-y'),
  paddingLeft: cssVar('component.button.padding-x'),
  paddingRight: cssVar('component.button.padding-x'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: primary ? 'transparent' : cssVar('color.border.default'),
  borderRadius: cssVar('component.button.radius'),
  background: primary ? cssVar('component.button.background') : cssVar('color.surface.default'),
  color: primary ? cssVar('component.button.text') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  whiteSpace: 'nowrap',
});

/* ── 구획 · 미리보기 조립 ─────────────────────────────────────────────────────────────────── */

function Section({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section style={sectionStyle} aria-labelledby={titleId}>
      <h3 id={titleId} style={sectionTitleStyle}>
        {title}
      </h3>
      <p style={hintStyle}>{description}</p>
      <div style={sectionBodyStyle}>{children}</div>
    </section>
  );
}

function CheckoutCtaPreview({ settings }: { readonly settings: DemoPaymentSettings }) {
  return (
    <div style={previewGridStyle}>
      {STAGES.map((stage) => {
        // 라벨을 여기서 고르지 않는다 — 상품 폼·프로그램 상세와 **같은 규칙**이 정한다
        const cta = checkoutCta(settings, stage.domain);
        return (
          <div key={stage.domain} style={stageStyle}>
            <span style={stageTitleStyle}>{stage.title}</span>
            <p style={sampleStyle}>{stage.sample}</p>
            {/* 장식이 아니라 정보다 — 스크린리더에도 '이 자리에 이 버튼이 보인다' 로 읽혀야 한다 */}
            <span style={ctaChipStyle(cta.kind === 'purchase')}>{cta.label}</span>
            <p style={guideStyle}>{cta.reason}</p>
            {cta.kind === 'inquiry' && settings.inquiryGuide.trim() !== '' && (
              <p style={guideStyle}>{settings.inquiryGuide}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface PaymentSettingsScreenProps {
  readonly settings?: DemoPaymentSettings;
  readonly loading?: boolean;
  readonly saving?: boolean;
  readonly canUpdate?: boolean;
  readonly initialDirty?: boolean;
  readonly errors?: FieldErrors;
}

function PaymentSettingsScreen({
  settings = PG_OFF,
  loading = false,
  saving = false,
  canUpdate = true,
  initialDirty = false,
  errors = {},
}: PaymentSettingsScreenProps) {
  const [usePg, setUsePg] = useState(settings.usePg);
  const [provider, setProvider] = useState<PaymentProvider>(settings.provider);
  const [merchantId, setMerchantId] = useState(settings.merchantId);
  const [mode, setMode] = useState<PaymentMode>(settings.mode);
  const [methods, setMethods] = useState<readonly PaymentMethod[]>(settings.methods);
  const [inquiryGuide, setInquiryGuide] = useState(settings.inquiryGuide);
  const [dirty, setDirty] = useState(initialDirty);

  const methodsErrorId = useId();
  const disabled = saving || loading || !canUpdate;
  const current: DemoPaymentSettings = { usePg, provider, merchantId, mode, methods, inquiryGuide };

  const touch = (): void => setDirty(true);

  const toggleMethod = (method: PaymentMethod, checked: boolean): void => {
    // 순서를 카탈로그 순서로 되맞춘다 — 켰다 껐다 한 순서가 저장 값에 남지 않게 한다
    setMethods(
      METHODS.filter((option) => (option === method ? checked : methods.includes(option))),
    );
    touch();
  };

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        상품과 프로그램을 결제로 판매할지, 문의로 받을지 정합니다. PG 결제를 끄면 구매·후원 버튼이
        문의하기로 바뀝니다.
      </p>

      <Card>
        <div style={cardBodyStyle}>
          <h2 style={cardTitleStyle}>결제 설정</h2>

          {!canUpdate && (
            <Alert tone="info">
              조회 권한만 있습니다. 결제 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.
            </Alert>
          )}

          {!usePg && (
            <Alert tone="info">
              지금은 <strong>PG 결제를 쓰지 않는 상태</strong>입니다. 상품의 구매하기와 프로그램의
              후원하기가 모두 <strong>문의하기</strong>로 보이고, 접수된 문의는{' '}
              <a href="#product-inquiries" style={linkStyle}>
                상품 문의
              </a>
              {' · '}
              <a href="#program-inquiries" style={linkStyle}>
                프로그램 문의
              </a>
              로 들어옵니다.
            </Alert>
          )}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              {/* ── 구획 1 · 결제 연동 ── */}
              <Section
                title="결제 연동"
                description="이 스위치 하나가 판매 방식을 정합니다. 끄면 상품·프로그램의 구매·후원 버튼이 문의하기로 바뀌고, 문의는 상품 문의·프로그램 문의로 들어옵니다."
              >
                <ToggleSwitch
                  checked={usePg}
                  label="PG 결제 사용"
                  onLabel="사용"
                  offLabel="미사용"
                  disabled={disabled}
                  onChange={(next) => {
                    setUsePg(next);
                    touch();
                  }}
                />

                {/* 스위치 바로 아래에 결과를 그린다 — 저장 전에 '무엇이 어떻게 보이는지' 확인한다 */}
                <div style={groupStyle}>
                  <span style={fieldLabelStyle}>고객 화면 미리보기</span>
                  <CheckoutCtaPreview settings={current} />
                </div>
              </Section>

              {/* ── 구획 2 · PG 설정 (쓸 때만 — 꺼져 있으면 자리를 없앤다) ── */}
              {usePg && (
                <Section
                  title="PG 설정"
                  description="PG사에서 발급받은 정보를 넣습니다. 상점 ID 가 비어 있으면 결제창을 열 수 없어 버튼은 문의하기로 남습니다."
                >
                  <div style={rowStyle}>
                    <FormField htmlFor="payment-provider" label="PG사" required>
                      <SelectField
                        id="payment-provider"
                        value={provider}
                        disabled={disabled}
                        onChange={(event) => {
                          const next = PROVIDERS.find((id) => id === event.target.value);
                          if (next === undefined) return;
                          setProvider(next);
                          touch();
                        }}
                      >
                        {PROVIDERS.map((id) => (
                          <option key={id} value={id}>
                            {PROVIDER_LABEL[id]}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>

                    <FormField
                      htmlFor="payment-mode"
                      label="연동 모드"
                      required
                      hint={
                        mode === 'test'
                          ? '테스트 모드에서는 결제창이 열려도 실제 결제가 일어나지 않습니다.'
                          : '운영 모드에서는 고객의 결제가 실제로 승인됩니다.'
                      }
                    >
                      <SelectField
                        id="payment-mode"
                        value={mode}
                        disabled={disabled}
                        onChange={(event) => {
                          const next = MODES.find((id) => id === event.target.value);
                          if (next === undefined) return;
                          setMode(next);
                          touch();
                        }}
                      >
                        {MODES.map((id) => (
                          <option key={id} value={id}>
                            {MODE_LABEL[id]}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                  </div>

                  <div style={groupStyle}>
                    <TextField
                      id="payment-merchant-id"
                      label="상점 ID"
                      required
                      value={merchantId}
                      disabled={disabled}
                      placeholder="예: tosspayments-mid-0001"
                      {...(errors.merchantId === undefined ? {} : { error: errors.merchantId })}
                      trailing={
                        <span style={counterStyle}>
                          {`${String(merchantId.length)}/${String(MERCHANT_ID_MAX)}`}
                        </span>
                      }
                      onChange={(event) => {
                        setMerchantId(event.target.value.slice(0, MERCHANT_ID_MAX));
                        touch();
                      }}
                    />
                    <p style={hintStyle}>
                      PG사 관리자에서 발급한 상점 아이디(MID)입니다. 결제 API 키는 여기가 아니라 API
                      연동 설정에서 관리합니다.
                    </p>
                  </div>

                  <div style={groupStyle}>
                    <span style={fieldLabelStyle}>
                      결제수단
                      <span aria-hidden="true"> *</span>
                    </span>

                    {/* 묶음 이름이 필수를 싣는다 — 개별 체크박스가 아니라 '고르는 행위' 가 필수다 (A11Y-11) */}
                    <ul
                      style={methodListStyle}
                      role="group"
                      aria-label="결제수단 (필수)"
                      {...(errors.methods === undefined
                        ? {}
                        : { 'aria-describedby': methodsErrorId })}
                    >
                      {METHODS.map((id) => (
                        <li key={id}>
                          <Checkbox
                            id={`payment-method-${id}`}
                            label={METHOD_LABEL[id]}
                            checked={methods.includes(id)}
                            disabled={disabled}
                            onChange={(event) => toggleMethod(id, event.target.checked)}
                          />
                        </li>
                      ))}
                    </ul>

                    {errors.methods === undefined ? (
                      <p style={hintStyle}>
                        고객 결제창에 노출할 수단입니다. PG 계약에 있는 것만 켭니다.
                      </p>
                    ) : (
                      <p id={methodsErrorId} role="alert" style={errorTextStyle}>
                        {errors.methods}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* ── 구획 3 · 문의 전환 안내 (끄고 있을 때만) ── */}
              {!usePg && (
                <Section
                  title="문의 전환 안내"
                  description="결제 대신 문의를 받는 동안 고객에게 보일 문구입니다. 왜 지금 살 수 없는지 말하지 않으면 문의 버튼만 덩그러니 남습니다."
                >
                  <TextareaField
                    label="안내 문구"
                    required
                    value={inquiryGuide}
                    maxLength={INQUIRY_GUIDE_MAX}
                    disabled={disabled}
                    {...(errors.inquiryGuide === undefined ? {} : { error: errors.inquiryGuide })}
                    hint="상품 카드와 프로그램 상세의 문의하기 버튼 아래에 그대로 보입니다."
                    placeholder="예: 현재 온라인 결제를 준비 중입니다. 문의를 남겨 주시면 담당자가 확인 후 연락드립니다."
                    rows={4}
                    onChange={(next) => {
                      setInquiryGuide(next);
                      touch();
                    }}
                  />
                </Section>
              )}
            </>
          )}

          {/* 저장 툴바 — 수정 권한이 없으면 저장 컨트롤 자체가 없다(눌러 보고 403 받는 자리를 안 만든다) */}
          {canUpdate && (
            <div style={footerStyle}>
              <p style={hintStyle}>
                {saving
                  ? '저장하는 중입니다…'
                  : dirty
                    ? '저장하지 않은 변경 사항이 있습니다.'
                    : '변경 사항이 없습니다.'}
              </p>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={!dirty || saving || loading}
                onClick={() => setDirty(false)}
              >
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** 정상(PG 미사용): 기본 상태 — 문의 전환 안내 구획 + 두 버튼이 '문의하기' 로 수렴한 미리보기 */
export const Default: Story = {
  render: () => <PaymentSettingsScreen />,
};

/** PG 사용: 스위치를 켜면 PG사·상점 ID·모드·결제수단 구획이 나타나고 미리보기가 구매/후원으로 갈린다 */
export const PgEnabled: Story = {
  render: () => <PaymentSettingsScreen settings={PG_ON} />,
};

/** 최초 로드: 카드 안 스켈레톤 — 첫 조회에서만 켠다(재조회로는 덮지 않는다 · STATE-01) */
export const Loading: Story = {
  render: () => <PaymentSettingsScreen loading />,
};

/**
 * 검증 오류(교차 필드): PG 를 켰는데 상점 ID 가 비고 결제수단도 없다 —
 * 미리보기는 그 사실대로 '문의하기' 를 그린다(fail-closed 규칙이 화면 두 곳에서 갈리지 않는다).
 */
export const PgEnabledInvalid: Story = {
  render: () => (
    <PaymentSettingsScreen
      settings={{ ...PG_ON, merchantId: '', methods: [] }}
      errors={PG_ON_ERRORS}
      initialDirty
    />
  ),
};

/** 읽기 전용: 수정 권한 없음 → 저장 컨트롤 없음 + 안내 배너 (EXC-03) */
export const ReadOnly: Story = {
  render: () => <PaymentSettingsScreen canUpdate={false} />,
};
