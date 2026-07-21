// 사이트 기본 설정이 **화면 밖으로 내보내는 값** — 조회기의 자리만 만든다
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 저장은 되는데 아무도 읽지 않았다]
// /settings/site 는 사이트 이름·메일/SMS 전용 이름·로그인 유지를 저장한다. 그런데 그 값을 읽는
// 화면이 **한 곳도 없었다.** 결과:
//   · 설정 화면은 "전용 이름은 문자 본문 앞에 붙습니다" 라고 적어 두었는데, 실제 SMS 미리보기와
//     발송 본문은 그 이름을 한 번도 보지 않았다 — 화면이 하지 않는 일을 설명하고 있었다.
//   · '로그인 상태 유지' 토글은 있는데 로그인 화면에는 그 체크박스 자체가 없었다.
// 설정은 저장되는 순간이 아니라 **읽히는 순간**에 존재한다.
//
// [왜 발송·로그인 화면이 설정 화면을 직접 import 하지 않나]
// `pages/marketing` → `pages/settings`, `pages/login` → `pages/settings` 는 둘 다 페이지 간
// 결합이고 code-quality 축1(page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 그래서 방향을
// 뒤집는다: 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 값을 꽂는 일은 두 도메인을 모두 아는
// `src/wiring.ts` 가 한다. 발송 화면도 로그인 화면도 끝까지 '시스템 설정' 이라는 모듈을 모른다.
// (같은 결의 선례: shared/domain/faq-catalog.ts · shared/fixtures/ai-providers.ts)
//
// [왜 값 하나가 아니라 스냅숏 하나인가]
// 정본이 **문서 한 건**(사이트 기본 설정)이라 그렇다. 값마다 조회기를 따로 두면 같은 문서를
// 두 번 읽는 두 개의 통로가 생기고, 나중에 세 번째 값이 필요할 때 세 번째 통로가 는다.
//
// [왜 '모른다(null)' 인가 — 빈 값과 다르다]
// 배선 전에는 `messagingName: ''`(접두 없음)이 아니라 **모르는 상태**다. 둘을 뭉개면 배선 사고가
// '전용 이름을 안 쓰기로 한 설정' 과 똑같이 보인다. 다만 여기서는 fail-closed 로 수렴시킨다 —
// 모를 때 접두를 붙이면 발송 본문에 없는 사실이 섞이고, 모를 때 로그인을 유지하면 공용 PC 에
// 세션이 남는다. '모른다' 는 **아무것도 하지 않는 쪽**으로 떨어진다(아래 두 헬퍼).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사이트 기본 설정 중 다른 화면이 실제로 읽는 값만 추린 스냅숏.
 *
 * export 하지 않는다 — 읽는 쪽은 아래 두 헬퍼로 **값**만 받고, 꽂는 쪽(src/wiring.ts)은
 * 문맥 타입으로 객체를 만든다. 타입을 내보내면 화면이 스냅숏 전체를 들고 다니며 자기 분기를
 * 만들기 시작한다(전용 이름 ↔ 사이트 이름 같은 판단은 배선이 끝낸다).
 */
interface SitePolicy {
  /**
   * 메일·SMS 발송물 앞에 붙는 발신 표시 이름.
   *
   * 정본은 '메일·SMS 전용 사이트 이름' 이지만 그 스위치가 꺼져 있으면 **사이트 이름**이 대신
   * 쓰인다 — 설정 화면의 안내("전용 이름을 지정하지 않으면 사이트 이름으로 적용됩니다")가
   * 그렇게 말한다. 어느 쪽을 고를지는 설정 도메인의 판단이라 배선 지점이 정해서 넣는다.
   */
  readonly messagingName: string;
  /** 로그인 화면 '로그인 유지' 체크박스의 **기본값** — 사용자가 그 자리에서 끌 수 있다 */
  readonly keepSignedIn: boolean;
}

type SitePolicyLookup = () => SitePolicy;

/** 미배선 상태 — null 은 '설정이 비었다' 가 아니라 '아직 읽을 통로가 없다' 다(머리말) */
let lookup: SitePolicyLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerSitePolicyLookup(next: SitePolicyLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetSitePolicyLookup(): void {
  lookup = null;
}

/**
 * 지금의 사이트 정책 — **배선되지 않았으면 null**.
 *
 * 던지지 않는다. 설정 화면 쪽 사고가 발송 폼이나 로그인 화면을 통째로 세우면 안 된다 —
 * 그 두 화면은 설정이 없어도 자기 일을 할 수 있어야 한다.
 */
function sitePolicy(): SitePolicy | null {
  if (lookup === null) return null;
  try {
    return lookup();
  } catch {
    return null;
  }
}

/** 발신 표시 이름 — 모르면 빈 문자열(접두를 붙이지 않는다) */
export function messagingNameOf(): string {
  return sitePolicy()?.messagingName.trim() ?? '';
}

/** '로그인 유지' 기본값 — 모르면 꺼진 채로 연다(공용 PC 에 세션을 남기지 않는 쪽) */
export function keepSignedInDefault(): boolean {
  return sitePolicy()?.keepSignedIn ?? false;
}
