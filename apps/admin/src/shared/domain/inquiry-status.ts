// 문의 처리상태 — 두 모듈이 공유하는 **어휘와 순서**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 같은 흐름, 다른 낱말이었다]
// 문의를 처리하는 화면은 둘이다.
//   · 영업 문의(/sales/inquiries)   — 견적으로 이어지는 B2B 문의. 보류·견적 발행이 더 있다.
//   · 1:1 문의(/support/tickets)    — 고객센터 티켓. SLA·담당 배정이 붙는다.
// 둘 다 '접수→처리→완료' 를 말하면서 상태값을 각자 선언하고 있었다. 그래서 같은 단계가 두 곳에서
// 다른 집합이 되고, 1:1 문의가 견적 요청으로 넘어가는 전이는 **표현할 낱말 자체가 없었다.**
// 운영자에게는 하나의 업무인데 데이터에는 접점이 없는 상태였다.
//
// [무엇을 공유하고 무엇을 공유하지 않나]
// 공유하는 것은 **공통 상태값과 그 순서**뿐이다. 라벨·색(tone)·전이 규칙은 각 모듈에 남는다 —
// 같은 'answered' 를 영업은 '완료' 로, 고객센터는 '답변완료' 로 부르고, 그것은 어휘가 아니라
// 각 화면의 말투다. 여기로 끌어올리면 한쪽 문구를 고칠 때마다 다른 화면이 함께 흔들린다.
//
// [왜 페이지 밖인가] pages/sales → pages/support 는 페이지 간 결합이고 code-quality 축1
// (page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 공통 어휘는 공통 층이 갖는다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 문의 처리의 공통 상태 — 접수 → 배정 → 처리중 → 완료 → 종결.
 *
 * 어느 모듈에도 반드시 있는 다섯 단계다. 모듈이 더 필요한 단계(영업의 보류·견적 발행)는
 * 이 유니온을 **넓혀서** 쓴다(`CommonInquiryStatus | 'hold' | 'quote_issued'`).
 */
export type CommonInquiryStatus = 'received' | 'assigned' | 'in_progress' | 'answered' | 'closed';

/**
 * 처리 흐름 순서 — 필터 select·상태 select 가 그리는 차례의 정본.
 *
 * 배열 하나로 두는 이유: 순서가 코드 여러 곳의 리터럴 나열로 흩어지면 한쪽에만 단계가 끼어들어도
 * 아무도 모른다. 옵션 목록은 이 배열을 map 해서 만든다(라벨은 각 모듈의 Record 에서 온다).
 */
export const COMMON_INQUIRY_STATUS_ORDER: readonly CommonInquiryStatus[] = [
  'received',
  'assigned',
  'in_progress',
  'answered',
  'closed',
];

/** 타입가드 — select 값(문자열)을 좁힌다(as 캐스팅 대신) */
export function isCommonInquiryStatus(value: unknown): value is CommonInquiryStatus {
  return (
    typeof value === 'string' && (COMMON_INQUIRY_STATUS_ORDER as readonly string[]).includes(value)
  );
}

/**
 * 공통 순서의 `anchor` 바로 뒤에 모듈 고유 상태를 끼워 넣은 순서를 만든다.
 *
 * [왜 함수인가] 영업 문의는 '처리중' 과 '완료' 사이에 보류·견적 발행이 들어간다. 그 결과를
 * 영업 쪽에 리터럴 배열로 다시 적으면 공통 다섯 단계가 두 번 선언된 셈이 되어, 공통 순서가
 * 바뀔 때 영업만 옛 순서로 남는다 — 이 파일을 만든 이유가 그대로 되살아난다.
 * 그래서 '어디에 무엇을 끼워 넣는가' 만 모듈이 말하고, 나머지는 여기서 조립한다.
 *
 * anchor 가 없으면(있을 수 없지만 타입이 막아 주지 않는 호출 경로를 위해) 뒤에 이어 붙인다.
 */
export function withExtraInquiryStatuses<TExtra extends string>(
  anchor: CommonInquiryStatus,
  extras: readonly TExtra[],
): readonly (CommonInquiryStatus | TExtra)[] {
  const at = COMMON_INQUIRY_STATUS_ORDER.indexOf(anchor);
  if (at < 0) return [...COMMON_INQUIRY_STATUS_ORDER, ...extras];
  return [
    ...COMMON_INQUIRY_STATUS_ORDER.slice(0, at + 1),
    ...extras,
    ...COMMON_INQUIRY_STATUS_ORDER.slice(at + 1),
  ];
}
