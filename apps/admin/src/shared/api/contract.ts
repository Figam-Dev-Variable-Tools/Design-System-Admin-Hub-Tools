// 프론트 타입 ↔ OpenAPI 스키마 **기계 검증** (ADR-0008 §3.5 · §7.5 집행)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 파일이 존재하는 이유]
// 생성만 하고 아무도 import 하지 않으면 `schema.d.ts` 는 **죽은 파일**이고 그 값은 0 이다.
// ADR-0008 §3.5 가 openapi-typescript 를 도입한 이유는 이것이었다 —
//   "지금은 명세의 §6 대조표를 **사람이 읽어서** 확인한다. 필드 하나가 어긋나면
//    런타임에 `undefined` 가 화면에 뜰 때까지 아무도 모른다."
// 그래서 생성 타입을 **하중을 받는 자리**에 놓는다: **어댑터의 경계**다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [검사가 일어나는 자리 — data-source.ts / api.ts]
// 어댑터가 fixture 를 프론트 모델로 만들어 돌려줄 때, 그 값을 `Wire<'X'>` 에 한 번 대입한다.
//
//     const detail: Wire<'MemberDetail'> = buildMemberDetail(member);  // 프론트 → 스키마
//     return detail;                       // 함수 반환 타입이 MemberDetail → 스키마 → 프론트
//
// **양방향**이라 아래를 전부 잡는다 (필드 하나만 어긋나도 `tsc` 가 멈춘다):
//   · 스키마에 있는 필드가 프론트에 없다      → 반환 대입에서 실패
//   · 프론트에 있는 필드가 스키마에 없다      → 반환 대입에서 실패 (프론트가 필수로 요구한다)
//   · 필드 이름이 다르다 (nickname/nickName)  → 양쪽 모두에서 실패
//   · 타입이 다르다 (string ↔ number)        → 양쪽 모두에서 실패
//
// [전송 타입 vs 표시 모델 — 경계는 여기다]
//
//   ① **순수 전송 타입** (표시 로직 0) → 생성 타입을 **직접 참조**한다. 손으로 다시 쓰지 않는다.
//      · pages/dashboard/types.ts       — TabData · ListCardData · TodoItem
//      · pages/dashboard/stats-types.ts — StatsData · VisitorPoint · PeriodRow · PeriodSummary
//
//   ② **UI 도메인 모델** (표시·포맷 관심사를 포함) → **손으로 쓴 타입을 유지**하고,
//      어댑터 경계에서 **일치만 검증**한다.
//      · shared/domain/member.ts — Member · MemberDetail · PointEntry · Coupon …
//
//      왜 지우지 않는가: 이 모델은 전송 형태가 아니라 **화면이 쓰는 형태**다.
//      예) `Member.joinedAt`(YYYY-MM-DD — 표·CSV 가 그대로 쓴다) 과
//          `Member.joinedAtIso`(ISO date-time — '4시간전' 상대 시각 계산용)가 **함께** 있다.
//      또 이 파일은 도메인 계약을 주석으로 지고 있다("고객은 회원가입으로만 유입된다").
//      생성물로 덮으면 그 계약이 재생성 때마다 사라진다.
//      **전송 타입과 표시 모델은 다른 것이다 — 지금 같아 보이는 것은 우연이다.**
//
// [백엔드 없음] 이 파일은 타입만 본다. HTTP 호출도, 클라이언트도 만들지 않는다.
import type { DeepReadonly } from './immutable';
import type { components } from './schema';

/**
 * 서버 응답 스키마 한 종 (생성물 기반 · 불변).
 *
 * `DeepReadonly` 로 감싸는 이유는 immutable.ts 참조 —
 * 생성기가 mutable 을 내는데 이 앱의 데이터는 전부 `readonly` 다.
 */
export type Wire<K extends keyof components['schemas']> = DeepReadonly<components['schemas'][K]>;
