// 운영자 삭제·역할 변경 가드 — 순수 판정
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 막나 — 셋 다 '앱이 스스로를 잠그는' 사고다]
//
//  1) 자기 자신 삭제      로그인한 운영자가 자기 계정을 지우면 그 순간 세션의 주체가 사라진다.
//                        되돌릴 수단은 남의 계정으로 다시 만드는 것뿐이다.
//  2) 마지막 시스템 관리자 시스템 역할(Role.system)은 이름 변경·삭제·권한 수정이 잠긴 전권 역할이다
//                        (roles.ts SYSTEM_ROLE_REASON). 그 역할을 가진 유일한 사람을 지우거나
//                        다른 역할로 내리면, **아무도 권한을 되돌릴 수 없는 상태**가 된다.
//                        역할 자체는 남아 있지만 그 역할을 배정할 수 있는 사람이 없다.
//  3) 자기 권한 박탈      자기 roleId 를 스스로 낮추면 저장이 끝나는 순간 이 화면의 update 권한이
//                        사라져 되돌릴 수 없다. '더 낮은 역할' 을 매트릭스 비교로 판정할 수도
//                        있지만, 그 계산은 리소스×액션 전수 비교라 규칙이 복잡해지고 무엇보다
//                        **경계에서 틀리면 그 실패가 곧 잠금**이다. 그래서 더 단순하고 방어 가능한
//                        규칙을 쓴다: **자기 역할은 자기가 바꾸지 않는다.** 승격조차 막히지만,
//                        그것은 다른 시스템 관리자가 해 주면 되는 일이고 잠금을 만들지 않는다.
//
// [왜 순수 함수이고, 왜 문구까지 도메인이 갖는가]
// 이 판정은 두 곳에서 쓰인다 — 화면이 버튼을 잠그며 띄우는 안내와, 어댑터(백엔드 자리)가 요청을
// 거절하며 던지는 오류 메시지다. 화면의 사전 확인은 **안내**일 뿐이고 거절의 책임은 서버에 있다:
// 확인을 본 뒤 다른 탭에서 다른 관리자가 시스템 관리자를 강등할 수 있다. 두 곳에 문장을 따로
// 적으면 그 경합에서만 다른 문장이 뜬다 — 같은 사실을 경로에 따라 다르게 말하게 된다.
// `shared/domain/admin-group.ts` 의 adminGroupDeletionBlock 이 같은 이유로 같은 모양이다.
// ─────────────────────────────────────────────────────────────────────────────
import type { AdminUser } from './types';

/**
 * 판정에 필요한 사실들 — 전부 **주입**받는다.
 *
 * 세션도 권한 스토어도 여기서 읽지 않는다. 읽으면 이 함수는 브라우저 저장소와 전역 스토어가
 * 있어야만 도는 함수가 되어, '마지막 시스템 관리자가 한 명일 때' 같은 경우를 시험하려면 그 둘을
 * 흉내 내야 한다. 사실을 인자로 받으면 판정은 표(입력→출력)가 된다.
 */
export interface AdminGuardContext {
  /** 전체 운영자 명부 — '마지막 한 명인가' 는 명부 전체를 봐야만 답할 수 있다 */
  readonly admins: readonly AdminUser[];
  /** system:true 인 역할들의 id 집합 (정본은 shared/permissions/roles.ts) */
  readonly systemRoleIds: ReadonlySet<string>;
  /**
   * 지금 로그인한 운영자의 계정(이메일) — 알 수 없으면 null.
   *
   * null 은 '자기 자신이 아니다' 가 아니라 '모른다' 이다. 모를 때 자기 보호 규칙은 걸리지
   * 않지만(누가 나인지 모르므로), 마지막 시스템 관리자 보호는 세션과 무관하므로 그대로 산다.
   */
  readonly currentAccount: string | null;
}

/**
 * 이 운영자가 지금 로그인한 사람인가.
 *
 * [가정 — 세션에는 운영자 id 가 없다] AuthSession 의 userId 는 인증 사용자 id('u-001')이지
 * 운영자 명부의 id('A-00001')가 아니다. 두 세계를 잇는 값이 이메일뿐이라 계정으로 맞춘다
 * (근거는 shared/auth/current-operator.ts 머리말). 대소문자·앞뒤 공백은 무시한다 —
 * 로그인은 이메일을 정규화해 저장하는데(pages/login 의 normalizeEmail) 운영자 명부는 손으로
 * 입력된 값이라, 그대로 비교하면 'Admin@…' 하나로 이 가드가 통째로 빠져나간다.
 */
export function isCurrentOperator(admin: AdminUser, currentAccount: string | null): boolean {
  if (currentAccount === null) return false;
  return admin.account.trim().toLocaleLowerCase() === currentAccount.trim().toLocaleLowerCase();
}

function hasSystemRole(admin: AdminUser, systemRoleIds: ReadonlySet<string>): boolean {
  return systemRoleIds.has(admin.roleId);
}

/** 이 운영자가 시스템 역할을 가진 **마지막 한 명**인가 */
function isLastSystemAdmin(target: AdminUser, context: AdminGuardContext): boolean {
  if (!hasSystemRole(target, context.systemRoleIds)) return false;

  // 명부에 target 이 들어 있지 않을 수도 있다(방금 불러온 상세) — id 로 세지 말고 '나 말고 또 있나'로 센다
  return !context.admins.some(
    (admin) => admin.id !== target.id && hasSystemRole(admin, context.systemRoleIds),
  );
}

/**
 * 자기 역할은 자기가 바꿀 수 없다 — 비활성 컨트롤의 사유 문구로도 그대로 쓴다.
 *
 * 화면은 이 문구를 aria-describedby 로 잠긴 셀렉트에 붙인다. '왜 못 누르는지' 를 시각적으로만
 * 말하면 스크린리더 사용자에게는 그냥 잠긴 컨트롤이다 (A11Y — 비활성에는 사유가 붙는다).
 */
export const SELF_ROLE_CHANGE_REASON =
  '본인 계정의 역할은 스스로 바꿀 수 없어요. 역할을 바꾸면 이 화면의 수정 권한까지 함께 사라져 되돌릴 수 없기 때문이에요. 다른 시스템 관리자에게 변경을 요청해 주세요.';

/**
 * 삭제를 막아야 하는 이유 — 없으면 null.
 *
 * 순서가 곧 우선순위다. 자기 자신이면서 마지막 시스템 관리자인 경우(가장 흔한 초기 상태)에는
 * **자기 자신** 쪽을 말한다: 그쪽이 사용자가 지금 당장 할 수 있는 일과 더 가깝다.
 */
export function adminDeletionBlock(target: AdminUser, context: AdminGuardContext): string | null {
  if (isCurrentOperator(target, context.currentAccount)) {
    return `'${target.nickname}' 은(는) 지금 로그인한 본인 계정이라 삭제할 수 없어요. 계정을 정리하려면 다른 관리자에게 요청해 주세요.`;
  }

  if (isLastSystemAdmin(target, context)) {
    return `'${target.nickname}' 은(는) 시스템 관리자 역할을 가진 마지막 운영자예요. 삭제하면 역할·권한을 관리할 수 있는 사람이 아무도 남지 않아요. 다른 운영자에게 시스템 관리자 역할을 먼저 준 뒤 삭제해 주세요.`;
  }

  return null;
}

/**
 * 역할 변경을 막아야 하는 이유 — 없으면 null.
 *
 * 값이 그대로면 판정하지 않는다: 이름·연락처만 고치는 저장까지 '역할을 바꿀 수 없다' 로 막으면,
 * 본인 계정은 아무것도 수정하지 못하는 계정이 된다.
 */
export function adminRoleChangeBlock(
  target: AdminUser,
  nextRoleId: string,
  context: AdminGuardContext,
): string | null {
  if (nextRoleId === target.roleId) return null;

  if (isCurrentOperator(target, context.currentAccount)) return SELF_ROLE_CHANGE_REASON;

  // 시스템 역할 → 시스템 역할(둘 이상 있을 때)은 강등이 아니다 — 막을 이유가 없다
  if (isLastSystemAdmin(target, context) && !context.systemRoleIds.has(nextRoleId)) {
    return `'${target.nickname}' 은(는) 시스템 관리자 역할을 가진 마지막 운영자예요. 역할을 내리면 역할·권한을 관리할 수 있는 사람이 아무도 남지 않아요. 다른 운영자에게 시스템 관리자 역할을 먼저 준 뒤 바꿔 주세요.`;
  }

  return null;
}
