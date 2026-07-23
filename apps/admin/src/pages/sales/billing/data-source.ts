// 청구·입금 데이터 소스 · 저장소
//
// [백엔드 연동 지점] 실제 연동 시 // TODO(backend) 엔드포인트로 저장소 함수 본문만 교체하고 화면은
// 그대로 둔다. 청구번호는 채번(청구일+순번)이 정본이라 입력이 비어 있을 때 여기서 부여한다.
//
// [왜 createCrudAdapter 가 아니라 저장소인가] 청구는 청구 화면만 만들지 않는다 — 견적 상세의
// '청구 만들기' 버튼이 그리는 순간 '이 견적에 이미 청구가 있는가' 를 **동기로** 물어본다.
// createCrudAdapter 는 목록을 클로저에 가둬 비동기 fetchAll 로만 내준다(../quotes/data-source 선례).
//
// [픽스처는 가상이다] 상호·담당자·계좌 표기는 모두 지어낸 값이고 실제 사업자와 겹치지 않는다.
import { createStoreAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { buildBillingFromQuote, ledgerLossBlock, makeBillNo, sortBillings } from './types';
import type { Billing, BillingInput } from './types';
import type { Quote } from '../quotes/types';

const SCOPE = 'sales-billing';

/**
 * 시드의 quoteId 는 견적 저장소의 실제 견적(qt-2)을 가리킨다 — 이름만 같고 연결이 없는 행이
 * 하나라도 있으면 청구 상세의 '원 견적' 링크가 조용히 죽는다.
 */
const BILLING_SEED: readonly Billing[] = [
  {
    id: 'bl-1',
    billNo: 'BL-20260706-001',
    quoteId: 'qt-2',
    quoteNo: 'Q-20260705-001',
    accountId: 'acc-2',
    accountName: '대성물산 주식회사',
    method: 'bank_transfer',
    paymentLinkUrl: '',
    amount: 3960000,
    issuedAt: '2026-07-06',
    notices: [
      {
        id: 'bn-1',
        at: '2026-07-06T01:20:00Z',
        channel: 'email',
        memo: '계좌이체 안내 메일 발송(세금계산서 별도 발행 예정).',
      },
    ],
    // 부분 입금 — 절반만 들어왔다. 누적 합이 청구액에 닿아야 완료다(types 규칙 ②).
    payments: [{ id: 'bp-1', paidOn: '2026-07-08', amount: 2000000, memo: '대성물산(선금)' }],
    note: '잔금은 검수 후 입금 예정.',
  },
  {
    id: 'bl-2',
    billNo: 'BL-20260702-001',
    quoteId: '',
    quoteNo: '',
    accountId: 'acc-1',
    accountName: '(주)한빛소프트웨어',
    method: 'payment_link',
    paymentLinkUrl: 'https://pay.example.com/link/hanbit-2026-07',
    amount: 1200000,
    issuedAt: '2026-07-02',
    notices: [
      {
        id: 'bn-2',
        at: '2026-07-02T05:10:00Z',
        channel: 'sms',
        memo: '개인결제창 링크 문자 발송.',
      },
      { id: 'bn-3', at: '2026-07-09T00:40:00Z', channel: 'phone', memo: '미입금 안내 통화.' },
    ],
    payments: [],
    note: '',
  },
  {
    id: 'bl-3',
    billNo: 'BL-20260620-001',
    quoteId: '',
    quoteNo: '',
    accountId: 'acc-3',
    accountName: '미래테크놀로지',
    method: 'bank_transfer',
    paymentLinkUrl: '',
    amount: 4500000,
    issuedAt: '2026-06-20',
    notices: [
      { id: 'bn-4', at: '2026-06-20T02:00:00Z', channel: 'email', memo: '청구 안내 메일 발송.' },
    ],
    // 두 번에 나눠 들어와 합계가 청구액에 닿았다 — 완료 판정은 마지막 한 건이 아니라 누적 합이다.
    payments: [
      { id: 'bp-2', paidOn: '2026-06-25', amount: 2500000, memo: '미래테크(1차)' },
      { id: 'bp-3', paidOn: '2026-07-03', amount: 2000000, memo: '미래테크(잔금)' },
    ],
    note: '',
  },
];

let billings: readonly Billing[] = sortBillings(BILLING_SEED);
let seq = BILLING_SEED.length;

/** 청구번호가 비어 있으면(신규) 청구일+순번으로 채번한다 — 자동 부여 값의 단일 지점 */
function nextBilling(input: BillingInput): Billing {
  seq += 1;
  const billNo = input.billNo.trim() === '' ? makeBillNo(input.issuedAt, seq) : input.billNo;
  return { id: `bl-${String(seq)}`, ...input, billNo };
}

/* ── 청구 저장소 (어댑터가 위임한다) ───────────────────────────────────────── */

function listBillings(): readonly Billing[] {
  return sortBillings(billings);
}

function getBilling(id: string): Billing {
  const found = billings.find((billing) => billing.id === id);
  // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12).
  if (found === undefined) throw new HttpError(HTTP_STATUS.notFound, '청구를 찾을 수 없어요.');
  return found;
}

function addBilling(input: BillingInput): void {
  billings = sortBillings([...billings, nextBilling(input)]);
}

function updateBilling(id: string, input: BillingInput): void {
  // [EXC-04] 없는 id 를 조용히 지나치고 성공을 반환하면 '저장했습니다' 유령 토스트가 뜬다.
  const current = billings.find((billing) => billing.id === id);
  if (current === undefined) {
    throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 청구예요.');
  }

  /**
   * [EXC-04] **입금·안내 기록을 지우는 저장은 받지 않는다.**
   *
   * 이 저장은 문서 한 벌을 통째로 갈아 끼운다. 내가 읽은 뒤 다른 관리자가 입금을 기록했다면,
   * 내 문서에는 그 입금이 없으므로 저장하는 순간 **회계 기록이 흔적 없이 사라진다** — 되돌릴
   * 수단이 없는 종류의 사고다(./types 의 ledgerLossBlock 머리말). 그래서 원장이 덧붙기만 한
   * 저장인지 먼저 보고, 아니면 덮어쓰지 않고 409 로 거절한다. 화면은 이 409 를 충돌
   * 다이얼로그로 받아 '최신 내용 불러오기 / 이어서 편집' 을 묻는다.
   *
   * TODO(backend): 서버에서는 `PUT /api/sales/billing/:id` 가 원장을 아예 받지 않고
   *   `POST /api/sales/billing/:id/payments` 가 append 를 전담하는 것이 정본이다. 그때 이
   *   가드는 그 엔드포인트 분리로 대체된다 — 지금은 어댑터 표면이 update 하나뿐이라 저장소가
   *   같은 불변식을 지킨다.
   */
  const lost = ledgerLossBlock(current, input);
  if (lost !== null) throw new HttpError(HTTP_STATUS.conflict, lost);

  billings = sortBillings(
    billings.map((billing) => (billing.id === id ? { ...billing, ...input, id } : billing)),
  );
}

function removeBilling(id: string): void {
  if (!billings.some((billing) => billing.id === id)) {
    throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 청구예요.');
  }
  billings = billings.filter((billing) => billing.id !== id);
}

/**
 * 견적 → 청구 역방향 조회 — 청구 중복 생성을 막는 판정의 정본. 없으면 ''.
 *
 * 빈 문자열이 '없음' 인 것은 이 도메인의 규약이다(AccountRef.accountId 와 같은 결).
 */
export function findBillingIdByQuote(quoteId: string): string {
  if (quoteId === '') return '';
  return billings.find((billing) => billing.quoteId === quoteId)?.id ?? '';
}

/**
 * 견적 → 청구 생성. **이미 그 견적으로 만든 청구가 있으면 새로 만들지 않고 그것을 돌려준다**
 * (견적 id 가 멱등키다 — 두 번 눌러도 청구는 하나다).
 */
// TODO(backend): POST /api/sales/quotes/:id/billing — 서버가 견적 상태 확인 + 청구 생성 + 역링크를
//   한 트랜잭션으로 처리하고, 이미 청구된 견적이면 409 로 거절한다.
export function createBillingFromQuote(quote: Quote, issuedAt: string): Billing {
  const existingId = findBillingIdByQuote(quote.id);
  if (existingId !== '') return getBilling(existingId);
  const created = nextBilling(buildBillingFromQuote(quote, issuedAt));
  billings = sortBillings([...billings, created]);
  return created;
}

/** react-query 키 루트 겸 실패 스코프 */
export const BILLING_RESOURCE = SCOPE;

// TODO(backend): GET /api/sales/billing · GET/PUT /api/sales/billing/:id
//   · POST /api/sales/billing/:id/payments (입금확인 수기 처리 — 되돌리는 전이는 없다)
//   · POST /api/sales/billing/:id/notices  (청구 안내 발송 기록)
export const billingAdapter = createStoreAdapter<Billing, BillingInput>({
  scope: SCOPE,
  list: listBillings,
  getOne: getBilling,
  add: addBilling,
  update: updateBilling,
  remove: removeBilling,
});
