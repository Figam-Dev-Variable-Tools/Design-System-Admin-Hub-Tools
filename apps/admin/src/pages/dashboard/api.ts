// 대시보드 로컬 mock API
//
// 백엔드 연동 전까지 화면을 실제 데이터 흐름(로딩 → 성공/에러)으로 굴리기 위한 mock 이다.
// 실제 API 가 붙으면 fetchTabData 의 내부만 교체하면 되고 화면 코드는 그대로다.
//
// 재현용 쿼리 파라미터 (예: /dashboard?delay=1500&error=1)
//   delay=<ms>  응답 지연
//   error=1     조회 실패 → ApiError
//   empty=1     전부 0건 / 빈 리스트
import type { TabData, TabId } from './types';

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface MockOptions {
  readonly delayMs: number;
  readonly shouldFail: boolean;
  readonly isEmpty: boolean;
}

function readMockOptions(): MockOptions {
  const params = new URLSearchParams(window.location.search);
  const rawDelay = Number(params.get('delay'));
  return {
    delayMs: Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : 500,
    shouldFail: params.get('error') === '1',
    isEmpty: params.get('empty') === '1',
  };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'));
      },
      { once: true },
    );
  });
}

/* ── mock 데이터 ────────────────────────────────────────────────────────── */

/**
 * [주문 모듈이 생겨 되돌린 자리]
 *
 * 한동안 이 앱에는 주문 모듈이 없었다. 그런데 상품 탭의 세 항목이 주문을 약속하고 엉뚱한 곳으로
 * 보내고 있어(‘신규주문’ → 상품 목록 등), 없는 라우트를 지어내는 대신 **라벨을 실제 목적지에
 * 맞춰** 두었다. 이제 `/orders` 가 생겼으므로 주문을 말하던 둘은 원래 라벨과 목적지로 돌아간다.
 *
 * 하나는 돌아가지 않는다 — **'판매 신청'**. 예정 목적지였던 `/orders/applications` 화면이 없고,
 * 이 카드의 행(상품명 + 작성자 + 일자)을 정직하게 담는 것은 구매평 목록이다. 없는 화면을 가리키느니
 * 지금 담고 있는 것의 이름으로 남는다. 판매 신청 화면이 생기면 그때 옮긴다.
 *
 * 취소·반품·교환 셋은 여전히 `/products/returns` 한 곳으로 간다 — 클레임(취소 포함) 통합 전까지는
 * 그 화면이 실제로 셋을 함께 다루는 유일한 자리다.
 */
const PRODUCT_DATA: TabData = {
  todos: [
    { key: 'new-order', label: '신규주문', count: 1, to: '/orders' },
    { key: 'cancel', label: '취소관리', count: 0, to: '/products/returns' },
    { key: 'return', label: '반품관리', count: 0, to: '/products/returns' },
    { key: 'exchange', label: '교환관리', count: 0, to: '/products/returns' },
  ],
  cards: [
    {
      title: '최근 주문',
      count: 0,
      moreTo: '/orders',
      icon: 'order',
      rows: [
        {
          id: 'o-1',
          title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
          actor: '테스***',
          date: '2026-07-10',
        },
        {
          id: 'o-2',
          title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
          actor: '테스***',
          date: '2026-07-07',
        },
      ],
    },
    {
      title: '최근 구매평',
      count: 4,
      moreTo: '/products/reviews',
      icon: 'tag',
      rows: [
        { id: 's-1', title: 'Pioneer DJ CDJ-3000', actor: '테스***', date: '2026-07-13' },
        {
          id: 's-2',
          title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
          actor: '테스***',
          date: '2026-07-09',
        },
        {
          id: 's-3',
          title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 블랙',
          actor: '테스***',
          date: '2026-07-06',
        },
        {
          id: 's-4',
          title: '야마하 스튜디오 모니터 헤드폰 HPH-MT5 화이트',
          actor: '테스***',
          date: '2026-07-06',
        },
      ],
    },
  ],
};

const INQUIRY_DATA: TabData = {
  todos: [
    { key: 'new-inquiry', label: '신규문의', count: 3, to: '/support/tickets' },
    // '/support/replies' 는 답변 **템플릿** 관리 화면이다 — 답변을 기다리는 문의가 아니라
    // 답변할 때 꺼내 쓰는 문구 목록이라, 여기로 보내면 운영자가 찾던 것이 없다.
    // 티켓 목록은 상태를 URL 로 소유하므로(?status=) 접수 상태로 좁혀 보낸다.
    { key: 'awaiting-reply', label: '답변대기', count: 2, to: '/support/tickets?status=received' },
    { key: 'on-hold', label: '보류문의', count: 0, to: '/support/tickets' },
  ],
  cards: [
    {
      title: '최근 문의',
      count: 3,
      moreTo: '/support/tickets',
      icon: 'question',
      rows: [
        {
          id: 'q-1',
          title: '헤드폰 케이블 단선 A/S 문의드립니다',
          actor: '김민***',
          date: '2026-07-14',
        },
        { id: 'q-2', title: 'CDJ-3000 재고 입고 일정 문의', actor: '이서***', date: '2026-07-13' },
        { id: 'q-3', title: '렌탈 기간 연장 가능한가요?', actor: '박지***', date: '2026-07-12' },
      ],
    },
    {
      title: '답변 대기',
      count: 2,
      // 위 할일 링크와 같은 이유로 템플릿 화면이 아니라 접수 상태 티켓 목록으로 간다
      moreTo: '/support/tickets?status=received',
      icon: 'question',
      rows: [
        { id: 'w-1', title: '교환 신청 후 회수 일정 문의', actor: '최유***', date: '2026-07-11' },
        { id: 'w-2', title: '세금계산서 재발행 요청', actor: '정하***', date: '2026-07-09' },
      ],
    },
  ],
};

const SALES_DATA: TabData = {
  todos: [
    { key: 'new-lead', label: '신규문의', count: 2, to: '/sales/inquiries' },
    { key: 'new-contract', label: '신규계약', count: 1, to: '/sales/contracts' },
    { key: 'lead-waiting', label: '문의대기', count: 4, to: '/sales/inquiries' },
    { key: 'contract-waiting', label: '계약대기', count: 0, to: '/sales/contracts' },
  ],
  cards: [
    {
      title: '최근 상담',
      count: 2,
      moreTo: '/sales/consultations',
      icon: 'question',
      rows: [
        { id: 'c-1', title: '스튜디오 음향 시공 견적 상담', actor: '한음***', date: '2026-07-14' },
        { id: 'c-2', title: '연습실 방음 공사 일정 협의', actor: '오준***', date: '2026-07-12' },
      ],
    },
    {
      title: '계약 대기',
      count: 1,
      moreTo: '/sales/contracts',
      icon: 'contract',
      rows: [
        {
          id: 'k-1',
          title: '메이플 스튜디오 — 음향 장비 납품 계약',
          actor: '한음***',
          date: '2026-07-13',
        },
      ],
    },
  ],
};

const DATA_BY_TAB: Record<TabId, TabData> = {
  products: PRODUCT_DATA,
  inquiries: INQUIRY_DATA,
  sales: SALES_DATA,
};

/** 빈 상태 재현용 — 할일 라벨은 유지하되 건수 0, 리스트는 비운다 */
function toEmpty(data: TabData): TabData {
  return {
    todos: data.todos.map((todo) => ({ ...todo, count: 0 })),
    cards: [
      { ...data.cards[0], count: 0, rows: [] },
      { ...data.cards[1], count: 0, rows: [] },
    ],
  };
}

export async function fetchTabData(tab: TabId, signal: AbortSignal): Promise<TabData> {
  const options = readMockOptions();
  await wait(options.delayMs, signal);

  if (options.shouldFail) {
    throw new ApiError('데이터를 불러오지 못했습니다.');
  }

  const data = DATA_BY_TAB[tab];
  return options.isEmpty ? toEmpty(data) : data;
}
