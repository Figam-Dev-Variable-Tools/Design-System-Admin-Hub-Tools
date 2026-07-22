// 신청 폼 조회기 — **자리만** 만든다 (폼의 정본은 폼 관리 화면이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 채용 공고의 '지원 방법: 폼' 이 가리킬 곳]
// 채용 공고(/company/careers)의 지원 방법은 셋이다: 이메일 · 외부 링크 · **폼**. 앞의 둘은 공고가
// 값을 통째로 갖지만(주소·URL), 폼은 다르다 — 폼은 다른 화면이 만들고 고치고 지우는 **참조**다.
// 공고가 폼의 이름을 복사해 저장하면 폼 이름이 바뀐 날 공고만 옛 이름을 계속 말한다.
//
// [왜 채용 화면이 폼 화면을 직접 import 하지 않나]
// `pages/company` → 폼 관리 화면은 페이지 간 결합이고 code-quality 축1(page-coupling, blocker,
// 임계값 0건)이 그대로 잡는다. 공통 층은 **계약과 등록기**만 갖고, 목록을 꽂는 일은 두 도메인을
// 아는 `src/wiring.ts` 가 한다 (shared/domain/faq-catalog.ts 와 같은 이음매).
//
// [왜 '모른다(null)' 인가 — 지금 이 조회기는 실제로 미배선이다]
// 폼 관리 화면은 아직 이 저장소에 없다. 빈 배열을 주면 채용 폼의 '지원 폼 선택' 이 **'등록된
// 폼이 없습니다'** 라고 완결되게 말하고, 운영자는 폼을 만들러 가서 이미 있는 폼을 다시 만든다.
// 모르는 동안에는 그 선택지를 **고를 수 없게 막고 이유를 말한다**(careers/rules.ts 의 가드).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 공고가 가리킬 수 있는 폼 한 건 — **참조에 필요한 값만** 담는다.
 *
 * 필드 구성·검증 규칙은 여기 없다. 그것은 폼 관리의 관심사이고, 채용 공고는 '어느 폼인가' 만
 * 알면 된다.
 */
export interface ApplicationFormRef {
  readonly id: string;
  readonly name: string;
  /**
   * 발행 여부 — 발행되지 않은 폼은 지원자가 열 수 없다.
   * 미발행 폼을 공고에 붙이면 '지원하기' 가 빈 화면으로 간다.
   */
  readonly published: boolean;
}

type ApplicationFormLookup = () => readonly ApplicationFormRef[];

/** 미배선 상태 — null 은 '폼이 없다' 가 아니라 '읽을 통로가 없다' 다(머리말) */
let lookup: ApplicationFormLookup | null = null;

/** 조회기를 꽂는다 — 멱등. 호출자는 `src/wiring.ts` 하나다 */
export function registerApplicationFormLookup(next: ApplicationFormLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetApplicationFormLookup(): void {
  lookup = null;
}

/** 지원 폼으로 고를 수 있는 것들 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function applicationForms(): readonly ApplicationFormRef[] | null {
  if (lookup === null) return null;
  try {
    return lookup();
  } catch {
    return null;
  }
}
