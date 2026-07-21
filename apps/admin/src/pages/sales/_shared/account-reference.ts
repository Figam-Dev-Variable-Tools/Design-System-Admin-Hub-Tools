// 거래처 참조 — 영업 4개 도메인(계약·견적·프로젝트·상담)이 공유하는 순수 규칙
//
// [왜 id 와 이름을 함께 드는가 — 이 파일의 존재 이유]
// 예전에는 네 도메인 모두 거래처를 **자유 입력 문자열**(accountName)로만 들었고, 거래처 마스터
// (/sales/accounts)를 참조하는 코드가 앱 전체에 한 줄도 없었다. 그 결과가 셋이다:
//   ① 오타 하나가 한 거래처를 둘로 쪼갰다 — '(주)한빛소프트웨어' 와 '㈜한빛소프트웨어'.
//   ② 거래처를 개명하면 이미 저장된 계약·견적의 이름표가 그 자리에서 낡았다.
//   ③ **거래처 → 그 거래처의 계약/견적/프로젝트/상담** 역방향 조회가 어디에도 없었다.
//
// 이제 조회·링크의 **정본은 accountId** 다. accountName 은 그 옆에 남는 비정규화 표시 라벨로,
// programs 의 categoryLabel 과 같은 역할이다 — 목록 한 장을 그리려고 거래처를 N번 되읽지 않게
// 한다. 두 값이 어긋나면 언제나 accountId 가 이긴다: 상세 화면은 마스터를 다시 읽어 이름을
// 되맞추고(currentAccountName), 목록은 속도를 위해 저장된 라벨을 그대로 쓴다.
//
// [미등록 거래처를 왜 허용하는가] 문의 → 견적 자동 발행(H)은 문의가 가진 **회사명 문자열**만
// 승계한다 — 그 회사가 거래처 마스터에 없을 수 있다. 여기서 등록을 강제하면 그 발행 경로가
// 통째로 막힌다. 그래서 accountId 는 '' 를 허용하되, 화면이 그 대가(역방향 조회에서 빠진다)를
// 반드시 드러낸다 (AccountSelectField 의 미등록 안내).

/** 거래처 마스터 목록 경로 — 링크의 단일 출처 */
export const ACCOUNT_LIST_PATH = '/sales/accounts';

/** 아직 거래처 마스터에 등록되지 않았다는 뜻의 accountId */
export const UNREGISTERED_ACCOUNT_ID = '';

/** 거래처를 참조하는 레코드가 공통으로 갖는 두 필드 */
export interface AccountRef {
  /** 거래처 마스터의 id — 조회·링크의 정본. '' 이면 미등록 */
  readonly accountId: string;
  /** 저장 시점의 거래처명(비정규화 표시 라벨) */
  readonly accountName: string;
}

/** 거래처 상세 경로 — 화면마다 문자열을 다시 조립하지 않게 한다 */
export function accountDetailPath(accountId: string): string {
  return `${ACCOUNT_LIST_PATH}/${accountId}`;
}

/** 마스터에 연결된 거래처인가 — 링크를 그릴지 말지의 단일 판정 */
export function isRegisteredAccount(ref: AccountRef): boolean {
  return ref.accountId !== UNREGISTERED_ACCOUNT_ID;
}

/**
 * id → 항목 사전.
 *
 * `list.find(...) ?? list[0]` 같은 조회를 쓰지 않는다 — noUncheckedIndexedAccess 아래에서
 * 그 폴백은 **못 찾았을 때 엉뚱한 거래처를 반환**한다(삭제된 거래처가 첫 거래처로 둔갑한다).
 * 사전은 없으면 undefined 를 주고, 호출부가 '연결 끊김' 을 명시적으로 다룬다.
 */
export function indexById<T extends { readonly id: string }>(
  list: readonly T[],
): Record<string, T> {
  const index: Record<string, T> = {};
  for (const item of list) index[item.id] = item;
  return index;
}

/**
 * 지금 화면에 쓸 거래처명 — 마스터에 살아 있으면 **마스터 이름이 이긴다**.
 * 개명 이후에도 상세 화면이 낡은 라벨을 보여 주지 않게 하는 자리다.
 * 마스터에 없으면(미등록·삭제) 저장된 라벨로 떨어진다 — 이름을 잃는 것보다 낡은 이름이 낫다.
 */
export function currentAccountName(
  ref: AccountRef,
  byId: Record<string, { readonly name: string }>,
): string {
  const master = byId[ref.accountId];
  return master === undefined ? ref.accountName : master.name;
}

/**
 * 이 거래처의 레코드만 — 거래처 상세의 **역방향 조회**(계약·견적·프로젝트·상담)가 쓴다.
 *
 * 미등록('')으로는 걸러 주지 않는다: 그러면 서로 무관한 미등록 레코드가 한 거래처의 이력인 양
 * 한 표에 모인다. 미등록은 '연결이 없다' 는 뜻이지 '같은 거래처' 라는 뜻이 아니다.
 */
export function filterByAccount<T extends AccountRef>(
  list: readonly T[],
  accountId: string,
): readonly T[] {
  if (accountId === UNREGISTERED_ACCOUNT_ID) return [];
  return list.filter((item) => item.accountId === accountId);
}
