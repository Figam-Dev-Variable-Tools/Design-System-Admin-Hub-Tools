// QuoteDetailPage — 견적 상세 (라우트: /sales/quotes/:id)
//
// [왜 만들었나] 견적에는 읽기 전용 표면이 없었다. 그래서 문의 화면의 '견적 보기' 링크 두 개가
// 실제로는 **수정 폼**(/sales/quotes/:id/edit)을 열었다 — 이름은 보기인데 열리는 것은 편집이었고,
// 이미 발행 완료되거나 수주로 전환된 견적까지 편집 화면으로 열렸다. 여기가 그 '보기' 다.
//
// [문서는 다시 그리지 않는다] 견적서 모습의 정본은 ./components/QuotePreview 다(폼의 미리보기와
// 같은 컴포넌트). 상세가 자기 사본을 만들면 두 화면의 견적서가 언젠가 갈라진다 — 인쇄 규칙
// (./quotes.css `@media print`)도 그 컴포넌트의 className 을 집으므로 사본은 인쇄도 못 한다.
//
// [연결] 이 견적이 어느 거래처의 것인지, 어느 문의에서 나왔는지를 링크로 준다. 예전에는 견적에서
// 거래처로 가는 길이 없었다(거래처가 자유 입력 문자열이었으므로 갈 곳 자체가 없었다).
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { isNotFound } from '../../../shared/errors/http-error';
import { objectParticle, seoulDayOf } from '../../../shared/format';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  Icon,
  mutedTextStyle,
  pageTitleStyle,
  StatusBadge,
} from '../../../shared/ui';
import { useCrudRowUpdate } from '../../../shared/crud';
import { AccountLink } from '../_shared/AccountLink';
import { formatWon } from '../_shared/business';
import { markQuoteOrdered, quoteAdapter } from './data-source';
import { QuotePreview } from './components/QuotePreview';
import {
  computeTotals,
  isInherited,
  QUOTE_MANUAL_STATUSES,
  quoteOrderDriftBlock,
  quoteSourceChannelLabel,
  quoteSourceHref,
  quoteStatusChangeBlock,
  quoteStatusMeta,
  taxModeLabel,
  toQuoteInput,
} from './types';
import type { QuoteStatus } from './types';
import { contractDraftBlock } from '../contracts/types';
import { createContractFromQuote, findContractIdByQuote } from '../contracts/data-source';
import { billingCreateBlock } from '../billing/types';
import {
  BILLING_RESOURCE,
  createBillingFromQuote,
  findBillingIdByQuote,
} from '../billing/data-source';

const RESOURCE = 'sales-quotes';
const CONTRACT_RESOURCE = 'sales-contracts';
const LIST_PATH = '/sales/quotes';
const CONTRACT_PATH = '/sales/contracts';
const BILLING_PATH = '/sales/billing';

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

const headActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 15), 1fr))`,
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
};

/** 상태 전이 버튼 줄 — 칸이 늘어도 좁은 화면에서 접힌다 */
const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/**
 * 견적서를 종이/PDF 로 낸다 (ERP-10).
 *
 * 인쇄 대상 지정은 ./quotes.css 의 `@media print` 가 한다(.tds-quote-doc 만 남기고 앱 셸을
 * 걷어낸다) — 그 규칙은 QuotePreview 를 렌더한 **어느 화면에서든** 성립하므로 이 상세도
 * 폼과 똑같이 인쇄를 부르기만 하면 된다. 왜 react-pdf 가 아닌지는 QuoteFormPage 머리말에 있다.
 */
function printQuote(): void {
  window.print();
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quoteId = id ?? '';
  const navigate = useNavigate();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', quoteId],
    queryFn: ({ signal }) => quoteAdapter.fetchOne(quoteId, signal),
    enabled: id !== undefined,
  });
  const quote = detailQuery.data;

  /**
   * 상태 관리 — 발송·승인·반려를 여기서 옮긴다.
   *
   * [예전에는 이 자리가 비어 있었다] 견적 상세에 상태를 바꾸는 컨트롤이 하나도 없었다. 그런데
   * 다음 칸(계약)은 '승인' 에서만 열리므로, 발송한 견적을 승인으로 넘길 방법이 화면에 없어
   * 계약 버튼이 영원히 잠겨 있었다. 운영자가 말한 "발송 후 상태 관리에서 다음으로 변경" 이
   * 실제로 불가능했던 자리다.
   */
  const changeStatus = useCrudRowUpdate(RESOURCE, quoteAdapter);

  /**
   * 이 견적이 이미 계약·청구를 갖고 있는가.
   *
   * [왜 동기 조회인가] 버튼을 **그리는 순간** 답이 있어야 한다 — 비동기로 나중에 알면 '만들기'
   * 버튼이 잠깐 살아 있다가 죽고, 그 사이에 누른 사람은 두 번째 계약을 만든다. 두 저장소 모두
   * 같은 페이지(pages/sales) 안이라 결합이 아니다.
   */
  const contractId = useMemo(
    () => findContractIdByQuote(quote?.id ?? ''),
    // 전환·생성 뒤 재조회로 quote 객체가 새로 오면 다시 센다.
    [quote],
  );
  const billingId = useMemo(() => findBillingIdByQuote(quote?.id ?? ''), [quote]);

  const queryClient = useQueryClient();

  /**
   * 반쪽 저장의 자국 — 계약은 만들어졌는데 견적 상태를 못 바꾼 그 순간의 사유.
   *
   * [왜 화면 상태로 남기나] 백엔드가 없어 트랜잭션이 없다. 두 일 중 하나만 됐을 때 성공 토스트를
   * 띄우고 넘어가면 그것이 곧 거짓말이다. 무엇이 됐고(계약) 무엇이 안 됐는지(견적 상태)를 각각
   * 말하고, 안 된 쪽을 다시 시도할 문까지 같은 자리에 둔다.
   */
  const [writeBackFailure, setWriteBackFailure] = useState<string | null>(null);

  /**
   * 계약이 있는데 견적 상태가 그것을 반영하지 못한 상태 — 위의 반쪽 저장이 남긴 자국이거나,
   * 이 규칙이 생기기 전에 맺은 계약이다(픽스처의 ct-2 ↔ qt-2 가 실제로 그렇다).
   * 어느 쪽이든 조용히 정상인 척하지 않는다.
   */
  const drift = quote === undefined ? null : quoteOrderDriftBlock(quote.status, contractId);

  /** 어긋난 상태를 다시 맞춘다 — 계약 생성이 부르는 것과 **같은 함수**다(두 번째 규칙이 아니다) */
  const onResync = (): void => {
    if (quote === undefined) return;
    const failed = markQuoteOrdered(quote.id);
    setWriteBackFailure(failed);
    void queryClient.invalidateQueries({ queryKey: [RESOURCE] });
  };

  /**
   * 계약을 만든다 — 견적에서만 만들 수 있고, 이 버튼이 그 유일한 문이다.
   *
   * 한 번의 누름이 두 가지 일을 한다: 계약 생성 + 견적 되돌려 쓰기('수주(계약 진행)'). 저장소가
   * 그 둘의 결과를 따로 돌려주므로(ContractDraftResult) 반쪽만 됐을 때 그대로 말할 수 있다.
   *
   * [중복 방어] 견적 id 가 멱등키다 — 두 번 눌러도 계약은 하나이고, 두 번째 누름은 이미 있던
   * 계약을 그대로 연다. 버튼의 존재 조건(contractDraftBlock)이 첫 번째 방어선, 저장소가 두 번째다.
   */
  const onCreateContract = (): void => {
    if (quote === undefined || contractDraftBlock(quote.status, contractId) !== null) return;
    const result = createContractFromQuote(quote, seoulDayOf(new Date().toISOString()) ?? '');
    setWriteBackFailure(result.quoteWriteBack);
    void queryClient.invalidateQueries({ queryKey: [CONTRACT_RESOURCE] });
    void queryClient.invalidateQueries({ queryKey: [RESOURCE] });
    // 되돌려 쓰기가 실패했으면 **이 화면에 머문다.** 계약 화면으로 밀어 버리면 운영자는 견적이
    // 안 바뀌었다는 사실을 다음에 목록을 볼 때에야 알게 된다.
    if (result.quoteWriteBack === null) navigate(`${CONTRACT_PATH}/${result.contract.id}/edit`);
  };

  /**
   * 청구를 만든다 — 폼이 없다. 청구액·거래처는 견적이 이미 알고 있고, 청구 방식·개인결제창 링크는
   * 청구 상세에서 바로 고칠 수 있다. 물어볼 것이 없는 화면을 한 장 세우지 않는다.
   *
   * 견적 id 가 멱등키라 두 번 눌러도 청구는 하나다 — 저장소가 기존 청구를 그대로 돌려준다.
   */
  const onCreateBilling = (): void => {
    if (quote === undefined || billingCreateBlock(quote.status, billingId) !== null) return;
    const created = createBillingFromQuote(quote, seoulDayOf(new Date().toISOString()) ?? '');
    // 목록 캐시를 무효화하지 않으면 방금 만든 청구가 목록에 없는 것처럼 보인다.
    void queryClient.invalidateQueries({ queryKey: [BILLING_RESOURCE, 'list'] });
    navigate(`${BILLING_PATH}/${created.id}`);
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 삭제된 견적에 '다시 시도'는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '견적을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '견적을 불러오지 못했어요.'}
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

      {quote === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <div style={headRowStyle}>
            <div>
              <h1 style={pageTitleStyle}>{`견적 ${quote.quoteNo}`}</h1>
              <div style={badgeRowStyle}>
                <StatusBadge
                  tone={quoteStatusMeta(quote.status).tone}
                  label={quoteStatusMeta(quote.status).label}
                />
                {isInherited(quote) && <StatusBadge tone="info" label="문의에서 자동 발행" />}
              </div>
            </div>
            <div style={headActionsStyle}>
              <Button variant="secondary" onClick={printQuote}>
                인쇄 · PDF 저장
              </Button>
              {/* 파이프라인의 다음 칸으로 가는 액션들 — 전이 규칙이 열어 준 것만 존재한다 (EXC-03).
                  판정은 전부 ./types · ../contracts/types · ../billing/types 의 *Block 술어가 하고,
                  이 화면은 그 결과를 읽기만 한다: 화면이 자기 조건문으로 다시 판단하면 목록의
                  인라인 전환과 여기가 서로 다른 규칙을 갖게 된다. */}
              {canUpdate && contractDraftBlock(quote.status, contractId) === null && (
                <Button variant="secondary" onClick={onCreateContract}>
                  계약 만들기
                </Button>
              )}
              {canUpdate && billingCreateBlock(quote.status, billingId) === null && (
                <Button variant="secondary" onClick={onCreateBilling}>
                  청구 만들기
                </Button>
              )}
              {/* 고치는 길은 이 버튼 하나뿐이고, 권한이 없으면 없다 (EXC-03) */}
              {canUpdate && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`${LIST_PATH}/${quote.id}/edit`)}
                >
                  견적 수정
                </Button>
              )}
            </div>
          </div>

          {/* [반쪽 저장] 계약은 만들어졌는데 견적 상태를 못 바꿨다 — 무엇이 됐고 무엇이 안 됐는지
              둘 다 말하고, 안 된 쪽만 다시 시도할 문을 같은 자리에 둔다. 성공을 흉내 내지 않는다. */}
          {writeBackFailure !== null && (
            <Alert tone="danger">
              <div style={alertActionRowStyle}>
                <span>
                  {`계약은 만들어졌어요. 그러나 견적 상태를 '${quoteStatusMeta('ordered').label}'로 바꾸지 못했어요 — ${writeBackFailure}`}
                </span>
                <Button variant="secondary" onClick={onResync}>
                  견적 상태 다시 맞추기
                </Button>
              </div>
            </Alert>
          )}

          {/* [어긋난 데이터] 계약은 있는데 상태가 따라오지 않은 견적 — 반쪽 저장의 자국이거나
              이 규칙 이전에 맺은 계약이다. 조용히 정상인 척하지 않고, 맞출 길을 준다. */}
          {drift !== null && writeBackFailure === null && (
            <Alert tone="warning">
              <div style={alertActionRowStyle}>
                <span>{drift}</span>
                {canUpdate && (
                  <Button variant="secondary" onClick={onResync}>
                    견적 상태 맞추기
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* 종료된 견적을 고치면 이미 나간 문서와 앱의 기록이 어긋난다 — 막지는 않되 밝힌다 */}
          {quote.status === 'ordered' && (
            <Alert tone="info">
              {`'${quoteStatusMeta('ordered').label}' 견적이에요. 지금 수정해도 이미 발송된 견적서와 맺은 계약은 바뀌지 않아요.`}
            </Alert>
          )}

          {/* ── 상태 관리 ────────────────────────────────────────────────────────
              전이 판정은 ./types 의 quoteStatusChangeBlock **하나**가 한다. 버튼이 살아 있는
              조건과 저장이 거절하는 조건이 같은 술어를 읽으므로 '눌리는데 실패하는 버튼' 이
              생길 수 없다(EXC-03 · shared/domain/order.ts 와 같은 규약).

              막힌 칸을 감추지 않고 **왜 막혔는지를 문장으로 실어** 둔다 — 감추면 운영자는 자기가
              뭘 해야 다음 칸이 열리는지 알 수 없고, 그것이 지금까지의 증상이었다. */}
          {canUpdate && (
            <Card>
              <CardTitle>상태 관리</CardTitle>
              <div style={statusRowStyle}>
                {QUOTE_MANUAL_STATUSES.map((target: QuoteStatus) => {
                  const blocked = quoteStatusChangeBlock(quote.status, target);
                  const label = quoteStatusMeta(target).label;
                  return (
                    <Button
                      key={target}
                      variant="secondary"
                      disabled={blocked !== null || changeStatus.pendingId === quote.id}
                      // 거절은 boolean 이 아니라 사유 문자열이다 — 마우스에도(title) 스크린리더에도
                      // (aria-label) 같은 문장이 실린다.
                      title={blocked ?? undefined}
                      aria-label={
                        blocked === null ? `${label}(으)로 바꾸기` : `${label} — ${blocked}`
                      }
                      onClick={() =>
                        changeStatus.run(
                          quote.id,
                          { ...toQuoteInput(quote), status: target },
                          // [ERP-13] 조사는 shared/format 이 런타임에 고른다 — 상태 이름마다 받침이 다르다
                          {
                            success: `'${quote.quoteNo}'${objectParticle(quote.quoteNo)} '${label}' 상태로 바꿨어요.`,
                          },
                        )
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              {/* 지금 왜 아무것도 못 누르는지 — 버튼만 죽어 있으면 화면이 침묵한다 */}
              <p style={mutedTextStyle}>
                {quoteStatusChangeBlock(
                  quote.status,
                  quote.status === 'sent' ? 'accepted' : 'sent',
                ) ?? '다음 칸으로 넘길 수 있어요.'}
              </p>
            </Card>
          )}

          <div style={layoutStyle}>
            <Card>
              <CardTitle>견적서</CardTitle>
              <QuotePreview
                quoteNo={quote.quoteNo}
                accountName={quote.accountName}
                accountBizNo={quote.accountBizNo}
                accountCeo={quote.accountCeo}
                contactName={quote.contactName}
                issueDate={quote.issueDate}
                validUntil={quote.validUntil}
                taxMode={quote.taxMode}
                items={quote.items}
                status={quote.status}
                note={quote.note}
              />
            </Card>

            <Card>
              <CardTitle>연결 · 요약</CardTitle>
              <dl style={dlStyle}>
                <dt style={dtStyle}>거래처</dt>
                <dd style={ddStyle}>
                  <AccountLink account={quote} />
                </dd>
                <dt style={dtStyle}>담당자</dt>
                <dd style={ddStyle}>
                  {quote.contactName === '' ? (
                    <span style={mutedTextStyle}>—</span>
                  ) : (
                    quote.contactName
                  )}
                </dd>
                <dt style={dtStyle}>원본 문의</dt>
                <dd style={ddStyle}>
                  {isInherited(quote) ? (
                    // 합쳐진 문의는 모두 나열한다 — 이 견적이 어느 요청들에서 왔는지가 곧 근거다
                    quote.sources.map((source) => (
                      <div key={source.id}>
                        <Link to={quoteSourceHref(source)} className="tds-ui-link tds-ui-focusable">
                          {source.no}
                        </Link>
                        {` · ${quoteSourceChannelLabel(source.channel)}`}
                      </div>
                    ))
                  ) : (
                    <span style={mutedTextStyle}>수동 등록 견적이에요.</span>
                  )}
                </dd>
                <dt style={dtStyle}>연결된 계약</dt>
                <dd style={ddStyle}>
                  {contractId === '' ? (
                    <span style={mutedTextStyle}>아직 계약이 없어요.</span>
                  ) : (
                    <Link
                      to={`${CONTRACT_PATH}/${contractId}/edit`}
                      className="tds-ui-link tds-ui-focusable"
                    >
                      계약 열기
                    </Link>
                  )}
                </dd>
                <dt style={dtStyle}>연결된 청구</dt>
                <dd style={ddStyle}>
                  {billingId === '' ? (
                    <span style={mutedTextStyle}>아직 청구가 없어요.</span>
                  ) : (
                    <Link
                      to={`${BILLING_PATH}/${billingId}`}
                      className="tds-ui-link tds-ui-focusable"
                    >
                      청구 열기
                    </Link>
                  )}
                </dd>
                <dt style={dtStyle}>견적일 · 유효기간</dt>
                <dd style={{ ...ddStyle, ...numericStyle }}>
                  {`${quote.issueDate} ~ ${quote.validUntil}`}
                </dd>
                <dt style={dtStyle}>과세유형</dt>
                <dd style={ddStyle}>{taxModeLabel(quote.taxMode)}</dd>
                <dt style={dtStyle}>합계금액</dt>
                <dd style={{ ...ddStyle, ...numericStyle }}>
                  {formatWon(computeTotals(quote.items, quote.taxMode).total)}
                </dd>
              </dl>
            </Card>
          </div>

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
