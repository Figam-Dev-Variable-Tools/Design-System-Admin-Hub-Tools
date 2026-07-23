// BillingDetailPage — 청구 상세 · 입금확인 (라우트: /sales/billing/:id)
//
// [여기서 하는 일] 결제대행이 없으므로 '결제완료' 를 만드는 것은 **사람의 입금확인**이다. 이 화면은
// 그 한 동작을 위해 있다: 청구 안내를 보냈다고 기록하고, 통장에 찍힌 입금을 기록한다.
//
// [되돌리는 버튼이 없다] 입금 기록은 회계 기록이라 지우지도 고치지도 않는다(./types 규칙 ①).
// 그래서 이 화면에는 삭제 버튼이 없다 — 실수를 되돌리는 문을 열면 그것이 곧 '입금 취소' 가 된다.
//
// [상태는 저장하지 않는다] 미입금/부분입금/입금완료는 입금 기록의 **누적 합**에서 파생한다
// (./types 의 billingPaymentState). 그래서 상태를 고르는 select 가 없다 — 기록이 상태를 만든다.
//
// [남의 입금을 지우는 저장은 조용히 성공하지 않는다] 이 화면의 저장은 문서 한 벌을 통째로 보내므로,
// 두 운영자가 같은 청구를 열어 두면 뒤에 저장한 쪽이 앞서 기록된 입금을 지울 수 있었다. 저장소가
// 그 저장을 409 로 거절하고(./types 의 ledgerLossBlock), 이 화면은 그것을 충돌 다이얼로그로 받는다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatDateTime } from '../../../shared/format';
import { isConflict, isHttpError, isNotFound } from '../../../shared/errors/http-error';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { FormConflictDialog, useCrudUpdate } from '../../../shared/crud';
import type { ConflictState } from '../../../shared/crud';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  FormField,
  formRowStyle,
  hintStyle,
  Icon,
  mutedTextStyle,
  numericCellStyle,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  tableStyle,
  tdStyle,
  TextareaField,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { formatWon } from '../_shared/business';
import { AccountLink } from '../_shared/AccountLink';
import { BILLING_RESOURCE, billingAdapter } from './data-source';
import {
  applyNotice,
  applyPayment,
  BILLING_MEMO_MAX,
  BILLING_NOTE_MAX,
  BILLING_NOTICE_CHANNEL_OPTIONS,
  BILLING_METHOD_OPTIONS,
  billingMethodLabel,
  billingNoticeChannelLabel,
  billingPaymentState,
  billingStateMeta,
  outstandingAmount,
  paidAmount,
  paidOnDate,
  recordPaymentBlock,
  sendNoticeBlock,
  toBillingInput,
} from './types';
import type { Billing, BillingMethod, BillingNoticeChannel } from './types';

const LIST_PATH = '/sales/billing';
const QUOTE_PATH = '/sales/quotes';

/** 입금일의 초기값 — 화면이 `new Date()` 를 읽으면 스토리·회귀 비교가 매일 깨진다 */
const TODAY = '2026-07-21';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: cssVar('space.2'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const tableScrollStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

/** 숫자만 남긴다 — '1,200,000원' 을 붙여 넣어도 값이 살아남는다 */
function digitsToNumber(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

function isBillingMethod(value: string): value is BillingMethod {
  return BILLING_METHOD_OPTIONS.some((option) => option.id === value);
}

function isNoticeChannel(value: string): value is BillingNoticeChannel {
  return BILLING_NOTICE_CHANNEL_OPTIONS.some((option) => option.id === value);
}

export default function BillingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const billingId = id ?? '';
  const navigate = useNavigate();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [BILLING_RESOURCE, 'detail', billingId],
    queryFn: ({ signal }) => billingAdapter.fetchOne(billingId, signal),
    enabled: id !== undefined,
  });
  const billing = detailQuery.data;

  const update = useCrudUpdate(BILLING_RESOURCE, billingAdapter);
  const saving = update.isPending;

  const [paidOn, setPaidOn] = useState(TODAY);
  const [amountInput, setAmountInput] = useState('');
  const [memo, setMemo] = useState('');
  const [channel, setChannel] = useState<BillingNoticeChannel>('email');
  const [noticeMemo, setNoticeMemo] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  /** [EXC-04] 409 — 내가 읽은 뒤 다른 관리자가 기록을 남겼다. 덮어쓰지 않고 물어본다 */
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  // 저장 결과를 화면에도 남긴다 — 토스트만 쓰면 스크린리더 사용자가 결과를 놓친다 (A11Y-16)
  const [statusMessage, setStatusMessage] = useState('');

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * 저장의 단일 경로 — 입금 기록도 안내 기록도 청구 설정도 '다음 청구 한 벌' 을 만들어 통째로 보낸다.
   * 세 동작이 각자 mutate 를 배선하면 성공/실패 처리와 abort 정리가 셋으로 갈라진다.
   *
   * @param afterSave 저장에 **성공했을 때만** 도는 뒷정리(입력 비우기). 호출 직후에 비우면 409·5xx
   *   로 되돌아왔을 때 방금 친 금액·메모가 사라져 있고, 사용자는 그것을 다시 쳐야 한다 —
   *   충돌 다이얼로그가 '입력을 버리지 않는다' 고 말하는 동안 입력은 이미 없어진 상태가 된다.
   */
  const commit = (next: Billing, message: string, afterSave?: () => void) => {
    if (id === undefined) return;
    setServerError(null);
    setConflict(null);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      { id, input: toBillingInput(next), signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setServerError(null);
          void detailQuery.refetch();
          setStatusMessage(message);
          afterSave?.();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          /*
           * [EXC-04] 409 는 재시도가 푸는 실패가 아니다 — 다시 보내면 또 같은 것을 지우려 한다.
           * 그래서 배너가 아니라 충돌 다이얼로그로 받는다(관용구는 shared/crud 의 FormConflictDialog:
           * '최신 내용 불러오기'(내 입력을 버린다) / '이어서 편집'(그대로 둔다)).
           *
           * **'덮어쓰기' 선택지는 두지 않는다.** 시스템 설정의 3-액션 다이얼로그에는 그 갈래가
           * 있지만(pages/settings/_shared/ConflictDialog), 여기서 덮어쓴다는 것은 곧 남의 입금
           * 기록을 지운다는 뜻이다 — 회계 기록에는 그 문을 열지 않는다(./types 규칙 ①).
           */
          if (isConflict(cause)) {
            setConflict({
              message: isHttpError(cause)
                ? cause.message
                : '다른 관리자가 먼저 이 청구를 변경했어요.',
              reload: () => {
                setConflict(null);
                void detailQuery.refetch();
              },
              dismiss: () => setConflict(null),
            });
            return;
          }
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 삭제된 청구에 '다시 시도'는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '청구를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '청구를 불러오지 못했어요.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (billing === undefined) {
    return (
      <div style={pageStyle}>
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      </div>
    );
  }

  const state = billingPaymentState(billing);
  const stateMeta = billingStateMeta(state);
  const outstanding = outstandingAmount(billing);
  const amount = digitsToNumber(amountInput);
  // 버튼의 disabled 와 저장의 거절이 **같은 술어**를 읽는다 — 규칙은 ./types 가 갖는다
  const paymentBlock = recordPaymentBlock(billing, amount, paidOn);
  const noticeBlock = sendNoticeBlock(billing);

  const onRecordPayment = () => {
    if (paymentBlock !== null) return;
    // 입력은 **저장에 성공한 뒤에만** 비운다 — 409 로 되돌아왔을 때 다시 칠 것이 남아 있어야 한다
    commit(
      applyPayment(billing, {
        id: `bp-${String(Date.now())}`,
        paidOn,
        amount,
        memo: memo.trim(),
      }),
      '입금을 확인 처리했어요.',
      () => {
        setAmountInput('');
        setMemo('');
      },
    );
  };

  const onRecordNotice = () => {
    if (noticeBlock !== null) return;
    commit(
      applyNotice(billing, {
        id: `bn-${String(Date.now())}`,
        at: new Date().toISOString(),
        channel,
        memo: noticeMemo.trim(),
      }),
      '청구 안내 발송을 기록했어요.',
      () => setNoticeMemo(''),
    );
  };

  const onChangeMethod = (next: BillingMethod) => {
    // 계좌이체로 되돌리면 보관하던 링크는 의미가 없다 — 남겨 두면 안내 문면과 어긋난다.
    commit(
      {
        ...billing,
        method: next,
        paymentLinkUrl: next === 'bank_transfer' ? '' : billing.paymentLinkUrl,
      },
      '청구 방식을 변경했어요.',
    );
  };

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      {/* [A11Y-16] 항상 마운트된 polite live region — 저장 결과가 스크린리더에도 닿는다 */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {statusMessage}
      </div>

      <div style={headRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>{`청구 ${billing.billNo}`}</h1>
          <div style={badgeRowStyle}>
            <StatusBadge tone={stateMeta.tone} label={stateMeta.label} />
            <StatusBadge tone="info" label={billingMethodLabel(billing.method)} />
          </div>
        </div>
      </div>

      {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

      {!canUpdate && <Alert tone="info">입금확인 권한이 없어요. 이 화면은 조회만 가능해요.</Alert>}

      <div style={layoutStyle}>
        <div style={pageStyle}>
          <Card>
            <CardTitle>청구 요약</CardTitle>
            <dl style={dlStyle}>
              <dt style={dtStyle}>거래처</dt>
              <dd style={ddStyle}>
                <AccountLink account={billing} />
              </dd>
              <dt style={dtStyle}>원 견적</dt>
              <dd style={ddStyle}>
                {billing.quoteId === '' ? (
                  <span style={mutedTextStyle}>견적 없이 만든 청구예요.</span>
                ) : (
                  <Link
                    to={`${QUOTE_PATH}/${billing.quoteId}`}
                    className="tds-ui-link tds-ui-focusable"
                  >
                    {billing.quoteNo}
                  </Link>
                )}
              </dd>
              <dt style={dtStyle}>청구일</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{billing.issuedAt}</dd>
              <dt style={dtStyle}>청구액</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(billing.amount)}</dd>
              <dt style={dtStyle}>입금액(누적)</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(paidAmount(billing))}</dd>
              <dt style={dtStyle}>잔액</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>{formatWon(outstanding)}</dd>
              <dt style={dtStyle}>입금 완료일</dt>
              <dd style={{ ...ddStyle, ...numericStyle }}>
                {paidOnDate(billing) === '' ? (
                  <span style={mutedTextStyle}>—</span>
                ) : (
                  paidOnDate(billing)
                )}
              </dd>
            </dl>
          </Card>

          <Card>
            <CardTitle>청구 방식</CardTitle>
            <p style={hintStyle}>
              결제대행을 쓰지 않으므로 앱은 결제를 처리하지 않아요. 개인결제창은 링크를 보관만 하고,
              입금 사실은 아래에서 사람이 확인해 기록해요.
            </p>
            <div style={formRowStyle}>
              <FormField htmlFor="billing-method" label="청구 방식">
                <SelectField
                  id="billing-method"
                  value={billing.method}
                  disabled={saving || !canUpdate}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (isBillingMethod(next)) onChangeMethod(next);
                  }}
                >
                  {BILLING_METHOD_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              {billing.method === 'payment_link' && (
                <FormField
                  htmlFor="billing-link"
                  label="개인결제창 링크"
                  hint="링크만 보관해요 — 결제 상태를 조회하지 않아요."
                >
                  <input
                    id="billing-link"
                    type="url"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    value={billing.paymentLinkUrl}
                    placeholder="https://"
                    disabled={saving || !canUpdate}
                    onChange={(event) =>
                      commit(
                        { ...billing, paymentLinkUrl: event.target.value },
                        '개인결제창 링크를 저장했어요.',
                      )
                    }
                  />
                </FormField>
              )}
            </div>
            <TextareaField
              label="비고"
              value={billing.note}
              onChange={(next) => commit({ ...billing, note: next }, '비고를 저장했어요.')}
              maxLength={BILLING_NOTE_MAX}
              disabled={saving || !canUpdate}
              placeholder="결제조건·세금계산서 발행 등을 기록하세요."
              rows={2}
            />
          </Card>
        </div>

        <div style={pageStyle}>
          <Card>
            <CardTitle>입금확인</CardTitle>
            <p style={hintStyle}>
              통장에 찍힌 입금을 기록해요. 여러 번 나눠 들어오면 그때마다 기록하고, 누적 합이
              청구액에 닿으면 입금완료가 돼요. <strong>기록한 입금은 되돌릴 수 없어요.</strong>
            </p>

            <div style={formRowStyle}>
              <FormField htmlFor="payment-date" label="입금일" required>
                <input
                  id="payment-date"
                  type="date"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={paidOn}
                  disabled={saving || !canUpdate || state === 'paid'}
                  onChange={(event) => setPaidOn(event.target.value)}
                />
              </FormField>
              <FormField
                htmlFor="payment-amount"
                label="입금액"
                required
                hint={`잔액 ${formatWon(outstanding)}`}
              >
                <input
                  id="payment-amount"
                  type="text"
                  inputMode="numeric"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={amountInput}
                  placeholder="0"
                  disabled={saving || !canUpdate || state === 'paid'}
                  onChange={(event) => setAmountInput(event.target.value)}
                />
              </FormField>
              <FormField htmlFor="payment-memo" label="입금자명 · 메모">
                <input
                  id="payment-memo"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={memo}
                  maxLength={BILLING_MEMO_MAX}
                  placeholder="통장 표기가 다르면 적어 두세요"
                  disabled={saving || !canUpdate || state === 'paid'}
                  onChange={(event) => setMemo(event.target.value)}
                />
              </FormField>
            </div>

            {/* 왜 못 누르는지를 버튼 옆에 적는다 — disabled 와 이 문장이 같은 술어에서 나온다 */}
            {canUpdate && paymentBlock !== null && amountInput !== '' && (
              <Alert tone="warning">{paymentBlock}</Alert>
            )}

            <div style={actionsStyle}>
              {canUpdate && (
                <Button
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={saving || paymentBlock !== null}
                  onClick={onRecordPayment}
                >
                  입금확인 기록
                </Button>
              )}
            </div>

            <div style={tableScrollStyle}>
              <table style={tableStyle}>
                <caption style={{ ...hintStyle, textAlign: 'left' }}>
                  입금 내역 — 덧붙이기만 하는 기록이에요.
                </caption>
                <thead>
                  <tr>
                    <th style={thStyle} scope="col">
                      입금일
                    </th>
                    <th style={{ ...thStyle, ...numericCellStyle }} scope="col">
                      입금액
                    </th>
                    <th style={thStyle} scope="col">
                      입금자명 · 메모
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billing.payments.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={3}>
                        <span style={mutedTextStyle}>아직 입금 기록이 없어요.</span>
                      </td>
                    </tr>
                  ) : (
                    billing.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td style={{ ...tdStyle, ...numericStyle }}>{payment.paidOn}</td>
                        <td style={{ ...tdStyle, ...numericCellStyle }}>
                          {formatWon(payment.amount)}
                        </td>
                        <td style={tdStyle}>
                          {payment.memo === '' ? (
                            <span style={mutedTextStyle}>—</span>
                          ) : (
                            payment.memo
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle>청구 안내</CardTitle>
            <p style={hintStyle}>
              고객에게 청구를 안내한 사실을 남겨요. 앱이 메시지를 보내지는 않아요 — 보낸 사실을
              기록할 뿐이에요.
            </p>

            <div style={formRowStyle}>
              <FormField htmlFor="notice-channel" label="안내 창구">
                <SelectField
                  id="notice-channel"
                  value={channel}
                  disabled={saving || !canUpdate}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (isNoticeChannel(next)) setChannel(next);
                  }}
                >
                  {BILLING_NOTICE_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField htmlFor="notice-memo" label="메모">
                <input
                  id="notice-memo"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={noticeMemo}
                  maxLength={BILLING_MEMO_MAX}
                  placeholder="무엇을 안내했는지 적어 두세요"
                  disabled={saving || !canUpdate}
                  onChange={(event) => setNoticeMemo(event.target.value)}
                />
              </FormField>
            </div>

            {canUpdate && noticeBlock !== null && <Alert tone="warning">{noticeBlock}</Alert>}

            <div style={actionsStyle}>
              {canUpdate && (
                <Button
                  variant="secondary"
                  disabled={saving || noticeBlock !== null}
                  onClick={onRecordNotice}
                >
                  안내 발송 기록
                </Button>
              )}
            </div>

            <div style={tableScrollStyle}>
              <table style={tableStyle}>
                <caption style={{ ...hintStyle, textAlign: 'left' }}>청구 안내 발송 기록</caption>
                <thead>
                  <tr>
                    <th style={thStyle} scope="col">
                      발송 시각
                    </th>
                    <th style={thStyle} scope="col">
                      창구
                    </th>
                    <th style={thStyle} scope="col">
                      메모
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billing.notices.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={3}>
                        <span style={mutedTextStyle}>아직 안내를 보내지 않았어요.</span>
                      </td>
                    </tr>
                  ) : (
                    billing.notices.map((notice) => (
                      <tr key={notice.id}>
                        <td style={{ ...tdStyle, ...numericStyle }}>{formatDateTime(notice.at)}</td>
                        <td style={tdStyle}>{billingNoticeChannelLabel(notice.channel)}</td>
                        <td style={tdStyle}>
                          {notice.memo === '' ? <span style={mutedTextStyle}>—</span> : notice.memo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div style={actionsStyle}>
        <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
          목록으로
        </Button>
      </div>

      {/* [EXC-04] 저장이 남의 기록을 지우려 했다 — 입력은 그대로 살아 있고 사용자가 고른다 */}
      <FormConflictDialog conflict={conflict} />
    </div>
  );
}
