// 일괄 쓰기 공용 유틸 (A41 소유 — apps/admin/src/shared/**)
//
// 콘텐츠 목록 6종의 '일괄 삭제 / 일괄 ON·OFF' 가 같은 규약을 쓴다: 선택된 항목마다 쓰기 요청을
// 병렬로 보내고, **부분 실패도 건수로 알린다**(하나가 실패해도 나머지는 반영). 취소(abort)는
// 실패로 세지 않는다 — 화면을 떠났거나 다이얼로그를 닫은 것이므로.
//
// 회원 목록의 useDeleteMembers/useBulkSendNotification 이 손으로 하던 allSettled 집계를 콘텐츠
// 목록이 다섯·여섯 번째 소비자가 되며 여기 한 곳으로 모은다.
import { isAbort } from './async';

/**
 * 실패한 항목 하나 — **무엇이** 실패했는지(item)와 **왜**(reason)를 함께 들고 있는다.
 *
 * [export 하지 않는다] 이름을 import 하는 곳이 없다 — 소비자(crud.ts·useCrudList)는
 * settleAllDetailed 의 반환 타입을 **구조적으로** 물려받는다. export 하면 소비자 0인 export 가
 * 되어 dead-code(A83 축5, 임계 0건)만 한 건 늘어난다. crud.ts 의 WriteContext 가 같은 이유로
 * 같은 선택을 해 두었다 — 그 선례를 따른다.
 */
interface SettleFailure<T> {
  readonly item: T;
  readonly reason: unknown;
}

/** 일괄 쓰기 결과 — 건수와 사유를 함께 준다. (SettleFailure 와 같은 이유로 export 하지 않는다) */
interface SettleOutcome<T> {
  readonly failed: number;
  readonly failures: readonly SettleFailure<T>[];
}

/**
 * 항목마다 run 을 병렬 실행하고 **취소가 아닌 실패**를 사유와 함께 돌려준다.
 *
 * [왜 건수만으로는 부족한가] `Promise.allSettled` 는 실패마다 `reason` 을 들고 있다. 그 안에는
 * 어댑터가 **왜 막혔는지 이미 문장으로 만들어 둔** HttpError 가 들어 있다("발송 규칙 3건이 이
 * 템플릿을 쓰고 있어 삭제할 수 없습니다…"). 예전 settleAll 은 그것을 `.filter(...).length` 로
 * **개수만 남기고 전부 버렸다.** 그래서 호출부는 409 인지 알 방법이 없었고, 409 에도
 * '잠시 후 다시 시도' 를 권했다 — 재시도하면 또 409 인 실패에 대고. 사유를 버리는 것은
 * 집계가 아니라 **정보 파괴**다.
 */
export async function settleAllDetailed<T>(
  items: readonly T[],
  run: (item: T) => Promise<unknown>,
): Promise<SettleOutcome<T>> {
  const results = await Promise.allSettled(items.map((item) => run(item)));
  const failures: SettleFailure<T>[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'rejected' || isAbort(result.reason)) return;
    // items[index] 는 allSettled 가 입력 순서를 보존하므로 항상 대응한다.
    const item = items[index];
    if (item !== undefined) failures.push({ item, reason: result.reason });
  });
  return { failed: failures.length, failures };
}

/**
 * 항목마다 run 을 병렬 실행하고 **취소가 아닌 실패의 개수**를 돌려준다(0 = 전원 성공).
 * 백엔드가 붙으면 run 이 실제 요청이 되고 이 집계는 그대로 쓰인다.
 *
 * 사유가 필요하면 settleAllDetailed 를 쓴다. 이쪽은 사유가 필요 없는 소비자(일괄 ON/OFF 등)를
 * 위해 남긴 얇은 껍데기다 — 건수만 필요한 곳까지 결과 객체를 열게 만들 이유가 없다.
 */
export async function settleAll<T>(
  items: readonly T[],
  run: (item: T) => Promise<unknown>,
): Promise<number> {
  return (await settleAllDetailed(items, run)).failed;
}
