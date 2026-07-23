// 운영진 그룹 = 발신 프로필 — 통합 도메인 모델
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 shared/domain 에 있는가 — 두 화면 중 누구의 것도 아니기 때문이다]
//
// 예전에는 같은 개념이 **두 벌**로 존재했다:
//   · `pages/admins/fixtures.ts` 의 `ADMIN_GROUPS` — 운영진 그룹(좌측 필터가 읽는다)
//   · `pages/marketing/message-templates/store.ts` 의 `SENDER_PROFILES` — 발신 프로필
//     (문자·이메일 편집기의 '발신 프로필' 셀렉트가 읽는다 — 목업 원문은 'Sender profile')
// 둘 다 '운영 주체의 묶음에 이름을 붙인 것' 이고, 실무에서 운영자는 이 둘을 같은 것으로 부른다.
// 그래서 **하나로 합친다**(요구사항 판단). 합치고 나면 이 모델은 관리자 관리 화면의 것도,
// 마케팅 화면의 것도 아니다 — 둘 다 소비자일 뿐이다. 어느 한쪽 페이지 폴더에 두면 다른 쪽이
// 남의 화면을 가로질러 import 하게 되고, 그 화면을 지우면 관계없는 화면이 깨진다
// (`pages/members/types.ts` 머리말이 기록한 것과 똑같은 사고다). 그래서 shared/domain 이다.
//
// [1:N 을 지킨다] 한 그룹은 발신번호와 발신 이메일을 **여러 개** 가질 수 있다. 편집기의 둘째
// 셀렉트가 '고른 프로필이 쓸 수 있는 번호/주소' 를 나열하는 것이 그 이유다(SenderProfileCard).
// 그룹을 만들 때는 대표값 1개씩만 받고(입력 부담), 나머지는 그룹이 생긴 뒤 덧붙인다.
//
// [usableAsSender — 목록을 합쳤다고 모두가 발신 프로필은 아니다]
// 그룹 중에는 **조회·권한 필터 용도로만** 만드는 것이 있다(예: '운영팀 admin'). 그런 그룹까지
// 발신 프로필 셀렉트에 뜨면, 발송 화면의 드롭다운이 보낼 수 없는 이름들로 채워진다 — 고르면
// 발신번호 후보가 0개라 저장도 못 하는 항목이다. 목록은 하나로 합치되, **발신 자격은 명시적인
// 플래그로 갈라 둔다.**
// ─────────────────────────────────────────────────────────────────────────────
import { formatNumber } from '../format';

/**
 * 운영진 그룹 = 발신 프로필.
 *
 * `name` 하나만 둔다 — 예전 `AdminGroup.label` 과 `SenderProfile.name` 이 같은 값의 두 이름이었다.
 * 합친 뒤에도 둘을 남기면 어느 쪽이 정본인지 화면마다 갈린다.
 */
export interface AdminGroup {
  readonly id: string;
  /** 표시명. 좌측 필터는 `'운영 - {name}'`, 표와 발신 프로필 셀렉트는 `name` 을 그대로 쓴다 */
  readonly name: string;
  /** 이 그룹으로 쓸 수 있는 발신번호들 (문자용) — **사전등록된 번호만** 들어온다 */
  readonly phoneNumbers: readonly string[];
  /** 이 그룹으로 쓸 수 있는 발신 주소들 (이메일용) */
  readonly emails: readonly string[];
  /** 메시지 템플릿의 발신 프로필로 고를 수 있는가 — false 면 편집기 셀렉트에 뜨지 않는다 */
  readonly usableAsSender: boolean;
}

/** 생성 입력 — id 는 저장소가 붙인다(화면이 만든 id 를 믿지 않는다) */
export interface AdminGroupDraft {
  readonly name: string;
  readonly phoneNumbers: readonly string[];
  readonly emails: readonly string[];
  readonly usableAsSender: boolean;
}

/** 그룹별 운영자 수 — 좌측 목록에 배지로 붙는다 (키 = 그룹 id) */
export type AdminGroupCounts = Readonly<Record<string, number>>;

/**
 * 그룹명 최대 길이.
 *
 * 회원 그룹 만들기(`pages/members/validation.ts`)와 운영진 그룹 만들기가 **같은 값**을 본다 —
 * 운영진 그룹 생성은 회원 그룹 생성 경로에서 갈라져 나온 것이라, 한쪽만 늘어나면 같은 화면의
 * 두 모달이 서로 다른 길이를 허용하게 된다.
 */
export const GROUP_NAME_MAX_LENGTH = 30;

/* ── 삭제 가드 ────────────────────────────────────────────────────────────────
 *
 * 그룹을 지우는 것은 **그 그룹을 가리키는 다른 것들을 고아로 만드는** 행위다. 두 종류가 있다.
 *
 * 1) 그룹에 운영자가 남아 있다  → **막는다.**
 *    `AdminUser.groupId` 는 null 을 허용하지 않는 `string` 이다(types.ts). '그룹 없음' 상태를
 *    만들려면 타입을 `string | null` 로 바꿔야 하고, 그 변경은 표의 그룹 셀·좌측 배지 집계·
 *    필터 조회 조건까지 전부로 번진다. 그런데 **운영자에게 '그룹 없음' 은 뜻이 있는 상태가
 *    아니다** — 그룹이 곧 권한 묶음이므로 그룹 없는 운영자는 아무것도 할 수 없는 계정이다.
 *    쓸 곳이 없는 상태를 표현하려고 타입을 넓히지 않는다. 대신 인원수와 해결 방법을 말한다.
 *
 * 2) 발신 프로필로 쓰이는 중이다 → **막는다.**
 *    지우면 그 템플릿의 `senderProfileId` 가 존재하지 않는 id 를 가리킨다. 목록·상세는
 *    `senderProfileName()` 이 '—' 를 띄워 넘어가지만, 발송 시점에는 발신자가 없는 템플릿이다.
 *    '지우고 나중에 고치세요' 보다 **어느 템플릿이 걸려 있는지 이름을 대는 편**이 복구가 빠르다.
 */
export interface AdminGroupUsage {
  /** 이 그룹에 속한 운영자 수 */
  readonly adminCount: number;
  /** 이 그룹을 발신 프로필로 쓰는 메시지 템플릿 이름들 */
  readonly senderTemplateNames: readonly string[];
}

/**
 * 삭제를 막아야 하는 이유 — 없으면 null.
 *
 * [왜 문구를 도메인이 갖는가] 이 문구는 두 곳에서 쓰인다: 화면이 삭제 전에 띄우는 안내와,
 * 어댑터(서버 자리)가 DELETE 를 거절할 때 던지는 오류 메시지다. 두 곳에 따로 적으면 경합으로
 * 거절됐을 때만 다른 문장이 뜬다 — 같은 사실을 두 가지로 말하게 된다.
 */
export function adminGroupDeletionBlock(groupName: string, usage: AdminGroupUsage): string | null {
  if (usage.adminCount > 0) {
    return `'${groupName}' 그룹에는 운영자 ${formatNumber(usage.adminCount)}명이 속해 있어 삭제할 수 없어요. 이 운영자들을 다른 그룹으로 옮긴 뒤 다시 삭제해 주세요.`;
  }
  if (usage.senderTemplateNames.length > 0) {
    const names = usage.senderTemplateNames.map((name) => `'${name}'`).join(', ');
    return `'${groupName}' 그룹을 발신 프로필로 쓰는 메시지 템플릿이 있어 삭제할 수 없어요 (${names}). 해당 템플릿의 발신 프로필을 먼저 바꾼 뒤 다시 삭제해 주세요.`;
  }
  return null;
}
