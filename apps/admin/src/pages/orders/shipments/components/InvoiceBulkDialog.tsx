// 송장 일괄 입력 다이얼로그 — 주문별로 택배사 + 송장번호 한 줄씩
//
// [왜 엑셀 업로드가 아닌가] 실제 운영에서는 택배사 접수 파일을 내려받아 채운 뒤 다시 올린다.
// 그 왕복은 파일 규격·인코딩·매핑 실패라는 세 겹의 예외를 새로 만들고, 백엔드 없이 그것을 흉내
// 내면 '되는 것처럼 보이지만 아무 데도 닿지 않는' 화면이 된다. 그래서 여기서는 **화면 안 표
// 입력**까지만 한다 — 열 건 스무 건은 이쪽이 오히려 빠르고, 오입력을 그 자리에서 막을 수 있다.
//
// [저장 전에 전부 검증한다] 한 줄이라도 틀리면 아무것도 저장하지 않는다. 절반만 들어가면 어느
// 주문에 송장이 붙었는지 다시 세어 봐야 하고, 그 확인은 이 다이얼로그를 다시 여는 것으로만 된다.
// 검증 규칙(형식·중복)의 정본은 도메인이며 이 화면은 그것을 부르기만 한다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

import { formatNumber } from '../../../../shared/format';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  hintStyle,
  Modal,
  SelectField,
  useModalDirtyGuard,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import {
  duplicateInvoiceBlock,
  invoiceNoBlock,
  INVOICE_NO_MAX,
  normalizeInvoiceNo,
} from '../../../../shared/domain/shipment';
import type { Carrier, Shipment } from '../../../../shared/domain/shipment';
import type { ShipmentRow } from '../types';

/** 저장 요청 1건 — 주문 하나에 붙일 택배사와 송장번호 */
export interface InvoiceEntry {
  readonly orderId: string;
  readonly carrierId: string;
  readonly invoiceNo: string;
}

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const orderNoStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  fontVariantNumeric: 'tabular-nums',
};

/** 택배사 : 송장번호 = 좁게 : 넓게. 송장번호가 잘리면 오입력을 눈으로 잡을 수 없다 */
const fieldRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0, 1fr) minmax(0, 2fr)`,
  gap: cssVar('space.2'),
  alignItems: 'center',
};

interface InvoiceBulkDialogProps {
  readonly rows: readonly ShipmentRow[];
  /** 지금 고를 수 있는 택배사 — 배선 전에는 null('모른다') */
  readonly carriers: readonly Carrier[] | null;
  /** 이미 등록된 배송 건 전체 — 송장번호 중복 판정의 대조군 */
  readonly existing: readonly Shipment[];
  readonly busy: boolean;
  /** 저장 실패 — 다이얼로그를 닫지 않고 배너로 알린다(재클릭이 곧 재시도다) */
  readonly serverError: string | null;
  readonly onSubmit: (entries: readonly InvoiceEntry[]) => void;
  readonly onCancel: () => void;
}

export function InvoiceBulkDialog({
  rows,
  carriers,
  existing,
  busy,
  serverError,
  onSubmit,
  onCancel,
}: InvoiceBulkDialogProps) {
  const options = carriers ?? [];
  /* 첫 선택값은 목록의 첫 줄이다(어댑터가 사용 중인 것을 위로, 이름순으로 정렬해 둔다).
     비어 있으면 '' — 그 상태에서는 저장 버튼이 잠기고 그 이유를 배너가 말한다. 여기서 임의의
     택배사를 골라 두면 운영자가 확인하지 않은 값으로 송장이 등록된다. */
  const initialCarrierId = options.length === 0 ? '' : (options[0]?.id ?? '');

  const [entries, setEntries] = useState<readonly InvoiceEntry[]>(() =>
    rows.map((row) => ({ orderId: row.id, carrierId: initialCarrierId, invoiceNo: '' })),
  );
  /** 주문번호 → 사유. 제출을 눌렀을 때만 채워진다(치는 도중 붉게 물들이지 않는다) */
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const dirty = entries.some((entry) => entry.invoiceNo.trim() !== '');
  const { requestClose, discardDialog } = useModalDirtyGuard(dirty && !busy, onCancel);

  const patch = (orderId: string, next: Partial<InvoiceEntry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.orderId === orderId ? { ...entry, ...next } : entry)),
    );
  };

  /**
   * 전부 검증한다 — 통과하면 빈 객체.
   *
   * 셋을 본다: ① 택배사를 골랐는가 ② 송장번호 형식(도메인) ③ 중복. 중복은 **이미 저장된 것**과
   * **이 다이얼로그 안의 다른 줄** 둘 다를 본다 — 후자는 저장 전이라 원장에 없지만, 붙여넣기
   * 실수는 대부분 화면 안 두 줄 사이에서 난다.
   */
  const validate = (): Readonly<Record<string, string>> => {
    const found: Record<string, string> = {};
    const seen = new Map<string, string>();

    for (const entry of entries) {
      if (entry.carrierId === '') {
        found[entry.orderId] = '택배사를 선택하세요.';
        continue;
      }
      const formatBlock = invoiceNoBlock(entry.invoiceNo);
      if (formatBlock !== null) {
        found[entry.orderId] = formatBlock;
        continue;
      }
      const stored = duplicateInvoiceBlock(existing, entry);
      if (stored !== null) {
        found[entry.orderId] = stored;
        continue;
      }
      const key = `${entry.carrierId}:${normalizeInvoiceNo(entry.invoiceNo)}`;
      const clash = seen.get(key);
      if (clash !== undefined) {
        found[entry.orderId] = `이 다이얼로그의 ${clash} 줄과 송장번호가 같아요.`;
        continue;
      }
      seen.set(key, entry.orderId);
    }
    return found;
  };

  const submit = () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(
      entries.map((entry) => ({ ...entry, invoiceNo: normalizeInvoiceNo(entry.invoiceNo) })),
    );
  };

  const noCarriers = carriers === null || options.length === 0;

  return (
    <>
      <Modal
        title="송장 일괄 입력"
        onClose={requestClose}
        onSubmit={submit}
        initialFocusRef={firstFieldRef}
        footer={
          <>
            <Button variant="secondary" size="md" disabled={busy} onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={busy || noCarriers}>
              {busy ? '등록 중…' : `${formatNumber(rows.length)}건 송장 등록`}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          {carriers === null ? (
            <Alert tone="warning">
              택배사 목록을 확인하지 못해 송장을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.
            </Alert>
          ) : (
            options.length === 0 && (
              <Alert tone="warning">
                사용 중인 택배사가 없어요. 상품 관리 &gt; 배송에서 택배사를 먼저 등록해 주세요.
              </Alert>
            )
          )}

          <ul style={listStyle}>
            {entries.map((entry, index) => {
              const row = rows.find((candidate) => candidate.id === entry.orderId);
              const reason = errors[entry.orderId];
              const invalid = reason !== undefined;
              const inputId = `invoice-${entry.orderId}`;
              const selectId = `carrier-${entry.orderId}`;
              const remaining = row?.remaining ?? [];
              const quantity = remaining.reduce((sum, line) => sum + line.quantity, 0);

              return (
                <li key={entry.orderId} style={rowStyle}>
                  <div style={rowHeadStyle}>
                    <span style={orderNoStyle}>{entry.orderId}</span>
                    <span style={hintStyle}>
                      {row === undefined
                        ? ''
                        : `${row.order.receiver.name} · 남은 품목 ${formatNumber(quantity)}개`}
                    </span>
                  </div>

                  <div style={fieldRowStyle}>
                    <span>
                      <label htmlFor={selectId} style={visuallyHiddenStyle}>
                        {`${entry.orderId} 택배사`}
                      </label>
                      <SelectField
                        id={selectId}
                        value={entry.carrierId}
                        disabled={busy || noCarriers}
                        onChange={(event) =>
                          patch(entry.orderId, { carrierId: event.target.value })
                        }
                      >
                        {options.length === 0 ? (
                          <option value="">택배사 없음</option>
                        ) : (
                          options.map((carrier) => (
                            <option key={carrier.id} value={carrier.id}>
                              {carrier.name}
                            </option>
                          ))
                        )}
                      </SelectField>
                    </span>

                    <span>
                      <label htmlFor={inputId} style={visuallyHiddenStyle}>
                        {`${entry.orderId} 송장번호`}
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(invalid)}
                        maxLength={INVOICE_NO_MAX}
                        placeholder="숫자와 하이픈(-)만"
                        disabled={busy || noCarriers}
                        aria-invalid={invalid}
                        // [A11Y-11] aria-invalid 는 언제나 그 이유와 함께 나간다
                        aria-describedby={invalid ? errorIdOf(inputId) : undefined}
                        value={entry.invoiceNo}
                        ref={index === 0 ? firstFieldRef : undefined}
                        onChange={(event) =>
                          patch(entry.orderId, { invoiceNo: event.target.value })
                        }
                      />
                    </span>
                  </div>

                  {invalid && (
                    <p id={errorIdOf(inputId)} role="alert" style={errorTextStyle}>
                      {reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <p style={hintStyle}>
            송장을 등록하면 배송대기가 돼요 — 아직 나간 것이 아니에요. 실제 발송은 목록에서
            &lsquo;발송처리&rsquo;를 눌러야 기록돼요.
          </p>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
