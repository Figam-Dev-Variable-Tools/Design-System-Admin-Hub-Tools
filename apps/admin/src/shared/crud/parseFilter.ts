// 목록 필터 select 값 좁히기 (앱 공용 선언적 CRUD 프레임워크)
//
// [무엇인가] <select onChange> 는 `event.target.value: string` 을 준다. 목록 필터는 이 문자열을
// 좁은 유니온(예: 'all' | 'exchange' | 'return')으로 되돌려야 한다. 지금까지는 `value as XxxFilter`
// 로 강제 캐스팅했는데(약 19곳), 이 헬퍼가 **허용 값 목록으로 검증**해 캐스팅을 한곳으로 모은다.
//
// [왜 안전한가] 값은 언제나 그 select 가 그린 <option> 에서 온다 → 허용 목록(옵션 id)과 항상 일치한다.
// 목록에 없는 값이 오면(가능성 없음) fallback 으로 떨어져 **잘못된 상태로 좁혀지지 않는다**.
//
//   allowed 는 그 select 가 그리는 옵션 id 전체여야 한다 — 그래야 캐스팅과 동작이 동일하다.
//   const value = parseFilter(event.target.value, KIND_FILTER_VALUES, KIND_FILTER_ALL);

/** value 가 allowed 에 있으면 그 유니온으로 좁히고, 없으면 fallback 을 돌려준다. */
export function parseFilter<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
