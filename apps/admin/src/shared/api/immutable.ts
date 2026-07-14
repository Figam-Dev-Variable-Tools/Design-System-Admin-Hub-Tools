// 생성 타입에 불변성을 되씌운다 (A41)
//
// [왜 필요한가]
// `openapi-typescript` 는 기본적으로 **mutable** 타입을 낸다 (`T[]` · `{ x: string }`).
// 이 앱의 데이터는 전부 `readonly` 다 — 어댑터가 돌려주는 fixture 를 화면이 고치지 않는다는
// 계약이고, 실제로 `readonly` 가 그 실수를 컴파일 타임에 막아 왔다.
// 생성 타입을 그대로 쓰면 그 방어선이 조용히 풀린다.
//
// [정석은 이게 아니다 — A80 change_request]
// 올바른 해법은 생성 스크립트에 **`--immutable`** 플래그를 주는 것이다:
//   openapi-typescript openapi/openapi.yaml -o ... --immutable
// 그러면 이 파일 자체가 필요 없다. 그러나 `package.json#scripts` 는 **A80 소유**라
// A41 이 고치지 않는다 (skills/react-refactorer §절대 금지 — 집행은 나, 설치·스크립트는 A80).
// → **A80 handoff**: `openapi:types` 에 `--immutable` 추가. 반영되면 이 파일을 지운다.

/**
 * 깊은 readonly.
 *
 * 배열과 **튜플을 모두 보존한다** — 매핑 타입은 `T[]` 을 `readonly T[]` 로,
 * `[A, B]` 를 `readonly [A, B]` 로 만든다. (조건부 `T extends (infer U)[]` 로 쓰면
 * 튜플이 `readonly U[]` 로 뭉개져 `TabData.cards` 의 **2장 고정 계약**이 사라진다 — ADR-0008 §6.3)
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
