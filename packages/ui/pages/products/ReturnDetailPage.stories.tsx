/**
 * Design System/Templates/Products/Return Detail — 교환/반품 상세·처리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products/returns/:id` → 메뉴 en = "Products"(상품 관리), 화면 en = "Returns"
 * (packages/ui/pages/_data/pages.ts — Products 그룹의 `['/products/returns', '교환/반품', 'Returns']`).
 *
 * 대응 실화면: apps/admin/src/pages/products/returns/ReturnDetailPage.tsx (라우트 /products/returns/:id)
 * 와 그 하위 조각(components/ExchangeOptionField·components/StockMovementTable).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각/스타일은 DS 표면 + 토큰 로컬 레이아웃으로 갈음:
 *   shared/ui CardTitle·dl/dt/dd·pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   ExchangeOptionField(앱 전용)               → FormField + SelectField + 토큰 미리보기 박스
 *   StockMovementTable(손으로 쓴 <table>)       → DS Table (구분 배지 = StatusBadge)
 *
 * 실화면 논리 카드 ↔ DS 컴포넌트 매핑:
 *   화면 제목/목록 복귀 → <h1> + Icon(chevron-left) 링크(토큰)
 *   요청 정보 카드      → Card + 로컬 CardTitle(+ 유형 StatusBadge) + 처리 진행 Stepper(또는 반려 배지)
 *   요청 상세 값        → dl/dt/dd(토큰)
 *   처리 상태 전이      → FormField + SelectField   ·   처리 메모 → TextareaField
 *   저장/목록           → Button(primary/secondary)   ·   재고 반영 확인 → ConfirmDialog(intent=update)
 *   교환 재발송·재고     → Card + ExchangeOptionField 갈음(옵션 SelectField + 재고 이동 미리보기)
 *   재고 이동 이력      → Card + DS Table (없으면 안내 문구)
 *   권한 없음           → Alert(info)   ·   조회 실패/404 → Alert(danger) + 목록으로
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)와 calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Icon,
  SelectField,
  StatusBadge,
  Stepper,
  Table,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Return Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 토큰 유틸 · 포맷터(px/hex 금지 — space 토큰의 calc 배수와 Intl 만) ─────────────────────────── */

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const formatNumber = (value: number): string => KO_NUMBER.format(value);

const RETURN_NOTE_MAX = 500;

type ReturnKind = 'exchange' | 'return';
type ReturnStatus = 'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected';

const KIND_LABEL: Record<ReturnKind, string> = { exchange: '교환', return: '반품' };
const KIND_TONE: Record<ReturnKind, StatusBadgeTone> = { exchange: 'info', return: 'warning' };

const STATUS_META: Record<
  ReturnStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
};

/** 정상 처리 흐름(반려 제외) — 스텝퍼가 쓴다. 실화면 RETURN_FLOW 미러 */
const RETURN_FLOW: readonly ReturnStatus[] = ['requested', 'collecting', 'inspecting', 'completed'];
const RETURN_STEPS = RETURN_FLOW.map((status) => ({
  id: status,
  label: STATUS_META[status].label,
}));

/** 처리 상태 선택지(반려 포함, '전체' 제외) — 실화면 STATUS_OPTIONS 미러 */
const STATUS_OPTIONS: readonly ReturnStatus[] = [
  'requested',
  'collecting',
  'inspecting',
  'completed',
  'rejected',
];

/* ── 데모 데이터 ──────────────────────────────────────────────────────────────────────────── */

interface DemoVariant {
  readonly id: string;
  readonly sku: string;
  readonly optionValues: readonly string[];
  readonly stock: number;
}

interface DemoStockMovement {
  readonly id: string;
  readonly direction: 'in' | 'out';
  readonly sku: string;
  readonly optionLabel: string;
  readonly quantity: number;
  readonly at: string;
}

interface DemoReturn {
  readonly orderNo: string;
  readonly productName: string;
  readonly customer: string;
  readonly kind: ReturnKind;
  readonly optionValues: readonly string[];
  readonly exchangeOptionValues: readonly string[];
  readonly reason: string;
  readonly reasonDetail: string;
  readonly quantity: number;
  readonly refundAmount: number;
  readonly requestedAt: string;
  readonly status: ReturnStatus;
  readonly stockApplied: boolean;
  readonly stockMovements: readonly DemoStockMovement[];
  readonly adminNote: string;
}

const VARIANTS: readonly DemoVariant[] = [
  { id: 'v-1', sku: 'KNIT-CH-S', optionValues: ['차콜', 'S'], stock: 12 },
  { id: 'v-2', sku: 'KNIT-CH-M', optionValues: ['차콜', 'M'], stock: 3 },
  { id: 'v-3', sku: 'KNIT-CH-L', optionValues: ['차콜', 'L'], stock: 0 },
  { id: 'v-4', sku: 'KNIT-IV-M', optionValues: ['아이보리', 'M'], stock: 8 },
];

/** 옵션 조합 표기 — '차콜 / M'. 옵션이 없으면 '단일 상품' (실화면 optionLabel 미러) */
const optionLabel = (values: readonly string[]): string =>
  values.length === 0 ? '단일 상품' : values.join(' / ');

const findVariant = (values: readonly string[]): DemoVariant | undefined =>
  VARIANTS.find(
    (variant) =>
      variant.optionValues.length === values.length &&
      variant.optionValues.every((value, index) => value === values[index]),
  );

const BASE_RETURN: DemoReturn = {
  orderNo: 'ORD-24817',
  productName: '베이직 크루넥 니트',
  customer: '김*연',
  kind: 'exchange',
  optionValues: ['차콜', 'M'],
  exchangeOptionValues: [],
  reason: '사이즈 교환 요청',
  reasonDetail: 'M 사이즈가 조금 작아 L 사이즈로 교환 원합니다.',
  quantity: 1,
  refundAmount: 0,
  requestedAt: '2026-07-18',
  status: 'requested',
  stockApplied: false,
  stockMovements: [],
  adminNote: '',
};

/* ── 로컬 레이아웃 조립(신규 DS 컴포넌트 아님 — 토큰만 쓴 표면/타이포) ──────────────────────────── */

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

/** DS Card 는 표면만 소유한다(CardTitle 부재) — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다 */
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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const stepperWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const previewStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  padding: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
};

const moveRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  ...typography('typography.label.sm'),
  color: cssVar('color.text.default'),
};

const deltaStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

/* ── 재고 이동 이력(실화면 StockMovementTable 을 DS Table 로 미러) ───────────────────────────── */

const STOCK_COLUMNS: TableProps['columns'] = [
  { id: 'direction', header: '구분', nowrap: true },
  { id: 'option', header: '옵션' },
  { id: 'sku', header: 'SKU', nowrap: true },
  { id: 'quantity', header: '수량', align: 'end' },
  { id: 'at', header: '반영 시각', nowrap: true },
];

function StockMovementCard({ movements }: { movements: readonly DemoStockMovement[] }) {
  if (movements.length === 0) {
    return (
      <DetailCard title="재고 이동 이력">
        <p style={hintStyle}>아직 반영된 재고 이동이 없습니다. 완료 처리 시 기록됩니다.</p>
      </DetailCard>
    );
  }

  const rows: TableProps['rows'] = movements.map((movement) => ({
    id: movement.id,
    cells: [
      movement.direction === 'in' ? (
        <StatusBadge tone="success" label="입고" />
      ) : (
        <StatusBadge tone="warning" label="출고" />
      ),
      movement.optionLabel,
      movement.sku,
      `${movement.direction === 'in' ? '+' : '−'}${formatNumber(movement.quantity)}개`,
      movement.at,
    ],
  }));

  return (
    <DetailCard title="재고 이동 이력">
      <Table
        caption="이 요청으로 확정된 재고 이동 이력 — 입고는 회수분, 출고는 교환 재발송분입니다."
        columns={STOCK_COLUMNS}
        rows={rows}
      />
    </DetailCard>
  );
}

/* ── 교환 재발송·재고 카드(실화면 ExchangeOptionField 갈음) ──────────────────────────────────── */

function ExchangeCard({
  request,
  exchangeValues,
  disabled,
  onChange,
}: {
  request: DemoReturn;
  exchangeValues: readonly string[];
  disabled: boolean;
  onChange: (next: readonly string[]) => void;
}) {
  const selected = exchangeValues.length === 0 ? undefined : findVariant(exchangeValues);
  const origin = findVariant(request.optionValues);
  const fieldId = useId();

  return (
    <DetailCard
      title={
        <>
          교환 재발송 · 재고
          {request.stockApplied && <StatusBadge tone="success" label="재고 반영 완료" />}
        </>
      }
    >
      {request.stockApplied ? (
        <p style={hintStyle}>
          {`재고가 이미 반영되어 교환 옵션을 바꿀 수 없습니다. 재발송 옵션: ${optionLabel(request.exchangeOptionValues)}`}
        </p>
      ) : (
        <>
          <FormField
            htmlFor={fieldId}
            label="교환할 옵션"
            required
            hint="재고가 남은 옵션만 선택할 수 있습니다. 완료 처리 시 이 옵션으로 재발송됩니다."
          >
            <SelectField
              id={fieldId}
              value={selected?.id ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const next = VARIANTS.find((variant) => variant.id === event.target.value);
                onChange(next === undefined ? [] : next.optionValues);
              }}
            >
              <option value="">옵션을 선택하세요</option>
              {VARIANTS.map((variant) => {
                const short = request.quantity > variant.stock;
                return (
                  <option key={variant.id} value={variant.id} disabled={short}>
                    {`${optionLabel(variant.optionValues)} — 재고 ${formatNumber(variant.stock)}개${
                      short ? ' (재고 부족)' : ''
                    }`}
                  </option>
                );
              })}
            </SelectField>
          </FormField>

          {selected !== undefined && (
            <div style={previewStyle} aria-live="polite">
              <span style={hintStyle}>완료 처리 시 재고가 이렇게 움직입니다</span>
              {origin !== undefined && (
                <span style={moveRowStyle}>
                  <StatusBadge tone="success" label="입고" />
                  {`${optionLabel(origin.optionValues)} · ${origin.sku}`}
                  <span style={deltaStyle}>
                    {`${formatNumber(origin.stock)} → ${formatNumber(origin.stock + request.quantity)}개`}
                  </span>
                </span>
              )}
              <span style={moveRowStyle}>
                <StatusBadge tone="warning" label="출고" />
                {`${optionLabel(selected.optionValues)} · ${selected.sku}`}
                <span style={deltaStyle}>
                  {`${formatNumber(selected.stock)} → ${formatNumber(Math.max(0, selected.stock - request.quantity))}개`}
                </span>
              </span>
            </div>
          )}
        </>
      )}
    </DetailCard>
  );
}

/* ── 화면 조립 ────────────────────────────────────────────────────────────────────────────── */

interface ReturnDetailScreenProps {
  /** 상세 데이터 — undefined 면 로딩(불러오는 중 카드) */
  readonly request?: DemoReturn;
  /** 처리 권한 — false 면 폼 비활성 + '조회만 가능' 안내(실화면 canUpdate) */
  readonly canUpdate?: boolean;
  /** 조회 실패 — 404 면 '다시 시도' 없이 목록으로만 */
  readonly error?: 'notfound' | 'failed' | null;
}

function ReturnDetailScreen({ request, canUpdate = true, error = null }: ReturnDetailScreenProps) {
  const [status, setStatus] = useState<ReturnStatus>(request?.status ?? 'requested');
  const [note, setNote] = useState(request?.adminNote ?? '');
  const [exchangeValues, setExchangeValues] = useState<readonly string[]>(
    request?.exchangeOptionValues ?? [],
  );
  const [confirmStock, setConfirmStock] = useState(false);

  if (error !== null) {
    const notFound = error === 'notfound';
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={actionsStyle}>
            <span>
              {notFound
                ? '요청을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '요청을 불러오지 못했습니다.'}
            </span>
            {!notFound && <Button variant="secondary">다시 시도</Button>}
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const isExchange = request?.kind === 'exchange';
  // 완료로 넘길 때만 재고가 실제로 움직인다 — 확인 다이얼로그를 띄운다(실화면 willMoveStock)
  const willMoveStock = request !== undefined && status === 'completed' && !request.stockApplied;
  const dirty =
    request !== undefined &&
    (status !== request.status ||
      note !== request.adminNote ||
      optionLabel(exchangeValues) !== optionLabel(request.exchangeOptionValues));

  return (
    <div style={pageStyle}>
      <a href="#return-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <h1 style={pageTitleStyle}>교환/반품 처리</h1>

      {request === undefined ? (
        <Card>
          <p style={hintStyle}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <DetailCard
            title={
              <>
                요청 정보
                <StatusBadge tone={KIND_TONE[request.kind]} label={KIND_LABEL[request.kind]} />
              </>
            }
          >
            <div style={stepperWrapStyle}>
              <span style={fieldLabelStyle}>처리 진행</span>
              {status === 'rejected' ? (
                <StatusBadge tone={STATUS_META.rejected.tone} label="반려 — 처리 종료" />
              ) : (
                <Stepper steps={RETURN_STEPS} current={status} ariaLabel="처리 진행 단계" />
              )}
            </div>

            <dl style={dlStyle}>
              <InfoRow label="접수번호">{request.orderNo}</InfoRow>
              <InfoRow label="상품">{request.productName}</InfoRow>
              <InfoRow label="주문 옵션">{optionLabel(request.optionValues)}</InfoRow>
              <InfoRow label="신청자">{request.customer}</InfoRow>
              <InfoRow label="수량">{`${formatNumber(request.quantity)}개`}</InfoRow>
              <InfoRow label="사유">{request.reason}</InfoRow>
              <InfoRow label="상세 사유">{request.reasonDetail}</InfoRow>
              {request.kind === 'return' && (
                <InfoRow label="환불 예정액">{`${formatNumber(request.refundAmount)}원`}</InfoRow>
              )}
              <InfoRow label="접수일">{request.requestedAt}</InfoRow>
            </dl>

            <FormField htmlFor="return-status" label="처리 상태">
              <SelectField
                id="return-status"
                value={status}
                disabled={!canUpdate}
                onChange={(event) => setStatus(event.target.value as ReturnStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_META[option].label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <TextareaField
              label="처리 메모"
              value={note}
              onChange={setNote}
              maxLength={RETURN_NOTE_MAX}
              disabled={!canUpdate}
              placeholder="수거·검수·환불 등 처리 내역을 기록하세요."
              rows={4}
            />

            {!canUpdate && (
              <Alert tone="info">이 요청을 처리할 권한이 없습니다. 조회만 가능합니다.</Alert>
            )}

            <div style={actionsStyle}>
              <Button variant="secondary">목록으로</Button>
              {canUpdate && (
                <Button
                  variant="primary"
                  size="md"
                  disabled={!dirty}
                  onClick={() => {
                    // 재고를 움직이는 완료 저장만 확인을 묻는다 — 되돌릴 수 없는 이동이라 예고한다
                    if (willMoveStock) setConfirmStock(true);
                  }}
                >
                  처리 저장
                </Button>
              )}
            </div>
          </DetailCard>

          {isExchange && (
            <ExchangeCard
              request={request}
              exchangeValues={exchangeValues}
              disabled={!canUpdate || request.stockApplied}
              onChange={setExchangeValues}
            />
          )}

          <StockMovementCard movements={request.stockMovements} />
        </>
      )}

      {confirmStock && request !== undefined && (
        <ConfirmDialog
          intent="update"
          title={isExchange ? '교환 재고 반영' : '반품 재고 반영'}
          message={`'${request.productName}' ${formatNumber(request.quantity)}개의 재고가 이동합니다. 재고 반영은 되돌릴 수 없으며, 반영 후에는 교환 옵션을 바꿀 수 없습니다.`}
          confirmLabel="재고 반영"
          onConfirm={() => setConfirmStock(false)}
          onCancel={() => setConfirmStock(false)}
        />
      )}
    </div>
  );
}

/** 정상(교환): 접수 상태 — 스텝퍼 + 교환 옵션 선택 + 아직 없는 재고 이동 */
export const Default: Story = {
  render: () => <ReturnDetailScreen request={BASE_RETURN} />,
};

/** 반품: 교환 카드 없이 환불 예정액이 표시되고 수거중 단계 */
export const Returned: Story = {
  render: () => (
    <ReturnDetailScreen
      request={{
        ...BASE_RETURN,
        orderNo: 'ORD-24790',
        productName: '워시드 데님 팬츠',
        customer: '이*호',
        kind: 'return',
        optionValues: ['인디고', '30'],
        reason: '단순 변심',
        reasonDetail: '색이 생각과 달라 반품 신청합니다.',
        refundAmount: 39000,
        status: 'collecting',
        requestedAt: '2026-07-16',
      }}
    />
  ),
};

/** 완료(교환): 재고 반영 완료 — 옵션 잠금 + 재고 이동 이력 표 */
export const Completed: Story = {
  render: () => (
    <ReturnDetailScreen
      request={{
        ...BASE_RETURN,
        exchangeOptionValues: ['아이보리', 'M'],
        status: 'completed',
        stockApplied: true,
        adminNote: '수거 완료 후 아이보리 M 재발송 처리했습니다.',
        stockMovements: [
          {
            id: 'mv-in',
            direction: 'in',
            sku: 'KNIT-CH-M',
            optionLabel: '차콜 / M',
            quantity: 1,
            at: '2026-07-20 14:02',
          },
          {
            id: 'mv-out',
            direction: 'out',
            sku: 'KNIT-IV-M',
            optionLabel: '아이보리 / M',
            quantity: 1,
            at: '2026-07-20 14:02',
          },
        ],
      }}
    />
  ),
};

/** 반려: 흐름 밖 종료 — 스텝퍼 대신 '반려 — 처리 종료' 배지 */
export const Rejected: Story = {
  render: () => (
    <ReturnDetailScreen request={{ ...BASE_RETURN, status: 'rejected', kind: 'return' }} />
  ),
};

/** 권한 없음: 폼 비활성 + '조회만 가능' 안내, 저장 버튼 없음(실화면 canUpdate=false) */
export const ReadOnly: Story = {
  render: () => <ReturnDetailScreen request={BASE_RETURN} canUpdate={false} />,
};

/** 로딩: 상세 데이터 미도착 — '불러오는 중…' 카드 */
export const Loading: Story = {
  render: () => <ReturnDetailScreen />,
};

/** 조회 실패(404): 이미 삭제된 요청 — '다시 시도' 없이 목록으로만 */
export const NotFound: Story = {
  render: () => <ReturnDetailScreen error="notfound" />,
};
