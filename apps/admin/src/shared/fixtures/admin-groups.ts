// 운영진 그룹 = 발신 프로필 — **정본 저장소** (백엔드가 붙기 전까지)
//
// [이 파일의 역할] 관리자 관리 화면(`pages/admins`)의 좌측 그룹 필터와, 메시지 템플릿 편집기의
// '발신 프로필' 셀렉트(`pages/marketing/message-templates/store.ts`)가 **같은 이 배열**을 읽는다.
// 예전에는 두 화면이 각자의 하드코딩 배열을 읽어 서로를 몰랐다 — 한쪽에서 만든 그룹이 다른 쪽에
// 나타나지 않았다. 정본이 하나면 그 어긋남이 구조적으로 생기지 않는다.
//
// [왜 shared/fixtures 인가] 모델이 shared/domain/admin-group.ts 에 있는 것과 같은 이유다 —
// 두 화면 중 누구의 소유도 아니다. shared/fixtures/members.ts 와 같은 자리·같은 역할이다.
//
// [백엔드 없음] 아래 쓰기 함수가 mutable 참조를 갈아 끼운다. 실제 네트워크는 0건이며, 연동
// 지점은 `pages/admins/data-source.ts` 의 // TODO(backend) 주석이다. 백엔드가 붙으면 이 파일은
// 삭제되고 어댑터 본문이 HTTP 호출로 바뀐다.
import type { AdminGroup, AdminGroupDraft } from '../domain/admin-group';

/* ── 발신번호 사전등록 풀 ─────────────────────────────────────────────────────
 *
 * 문자 발신번호는 **사전등록제**다(전기통신사업법 제84조의2). 번호의 소유·이용 권한을 서류로
 * 증명해 통신사·문자 대행사에 등록해 두어야 하고, 등록되지 않은 번호로는 발송 자체가 거절된다.
 * 즉 이 목록은 **우리 화면이 만들어 내는 값이 아니라 받아 오는 값**이다 — 그래서 그룹을 만들 때
 * 발신번호는 자유 입력이 아니라 이 풀에서 **고른다**.
 *
 * [정본은 어디인가] 실제 정본은 문자 대행사(SureM·NHN·Solapi) 쪽 등록 대장이고, 서버가 그것을
 * 동기화해 내려준다. 번호를 새로 등록·해지하는 흐름은 이 화면의 것이 아니다(설정 도메인 소관).
 * 여기 배열은 그 응답의 자리를 잡아 둔 픽스처일 뿐이며, 화면은 읽기만 한다.
 *
 * TODO(backend): GET /api/sender-phones — 사전등록이 완료된 발신번호 목록 */
export const REGISTERED_SENDER_PHONES: readonly string[] = [
  '1588-1234',
  '02-577-1000',
  '070-1234-5678',
  '1666-0987',
];

/**
 * 합쳐진 목록.
 *
 * 앞의 둘은 예전 `pages/admins/fixtures.ts` 의 운영진 그룹이고(운영자가 실제로 속해 있다),
 * 뒤의 셋은 예전 `message-templates/store.ts` 의 발신 프로필이다(발신번호·주소를 갖는다).
 * 합친 뒤에도 **id 를 그대로 유지한다** — 기존 템플릿 픽스처의 `senderProfileId` 와 운영자
 * 픽스처의 `groupId` 가 이 id 들을 가리키고 있다.
 *
 * `usableAsSender` 가 갈라 놓는 것: '운영팀 admin' 은 조회 필터용이라 발신 프로필 셀렉트에
 * 뜨지 않고, '스페이스플래닝 대표' 는 발신 전용이라 운영자가 0명인 채로 목록에 남는다.
 */
let groups: readonly AdminGroup[] = [
  {
    id: 'admin',
    name: '운영팀 admin',
    phoneNumbers: [],
    emails: [],
    usableAsSender: false,
  },
  {
    id: 'admin-2',
    name: '운영팀 admin_2',
    phoneNumbers: [],
    emails: [],
    usableAsSender: false,
  },
  {
    id: 'sp-brand',
    name: '스페이스플래닝 대표',
    phoneNumbers: ['1588-1234', '02-577-1000'],
    emails: ['news@spaceplanning.ai', 'hello@spaceplanning.ai'],
    usableAsSender: true,
  },
  {
    id: 'sp-marketing',
    name: '마케팅센터',
    phoneNumbers: ['02-577-1000', '070-1234-5678'],
    emails: ['marketing@spaceplanning.ai'],
    usableAsSender: true,
  },
  {
    id: 'sp-support',
    name: '고객지원센터',
    phoneNumbers: ['1588-1234'],
    emails: ['support@spaceplanning.ai'],
    usableAsSender: true,
  },
];

let groupSeq = 0;

export function listAdminGroups(): readonly AdminGroup[] {
  return groups;
}

export function findAdminGroup(id: string): AdminGroup | null {
  return groups.find((group) => group.id === id) ?? null;
}

/**
 * 발신 프로필 셀렉트가 읽는 부분집합 — `usableAsSender` 가 켜진 그룹만.
 *
 * 이 필터가 **여기** 있는 이유는 소비자가 둘 이상이 될 수 있기 때문이다(문자 편집기·이메일
 * 편집기·상세 화면이 이미 같은 목록을 본다). 각 화면이 `filter(g => g.usableAsSender)` 를 따로
 * 쓰면 한 곳만 고쳐진 채 나머지가 남고, 그 실수는 '보낼 수 없는 프로필이 드롭다운에 뜬다' 는
 * 형태로 나타난다.
 */
export function listSenderCapableAdminGroups(): readonly AdminGroup[] {
  return groups.filter((group) => group.usableAsSender);
}

/**
 * 같은 이름의 그룹이 이미 있는가 — 대소문자·앞뒤 공백을 무시하고 본다.
 * '운영팀 A' 와 '운영팀 a' 가 나란히 있으면 좌측 필터에서 어느 쪽을 고른 것인지 알 수 없다.
 */
export function hasAdminGroupNamed(name: string): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return groups.some((group) => group.name.trim().toLocaleLowerCase() === normalized);
}

/** 중복 이름 거절 — 어댑터가 이 오류를 409 대응 문구로 바꾼다 */
export const DUPLICATE_GROUP_NAME = '같은 이름의 그룹이 이미 있어요.';

export function addAdminGroup(draft: AdminGroupDraft): AdminGroup {
  const name = draft.name.trim();
  if (hasAdminGroupNamed(name)) throw new Error(DUPLICATE_GROUP_NAME);

  groupSeq += 1;
  const created: AdminGroup = {
    id: `ag-${String(groupSeq)}`,
    name,
    // 빈 값은 싣지 않는다 — '대표값을 비워 둔 그룹' 과 '번호가 0개인 그룹' 은 같은 사실이다
    phoneNumbers: draft.phoneNumbers.filter((phone) => phone.trim() !== ''),
    emails: draft.emails.filter((email) => email.trim() !== ''),
    usableAsSender: draft.usableAsSender,
  };
  groups = [...groups, created];
  return created;
}

export function removeAdminGroup(id: string): void {
  groups = groups.filter((group) => group.id !== id);
}

/* ── 발신 사용처 조회 — 의존 방향을 뒤집는다 ─────────────────────────────────
 *
 * [문제] 삭제 가드는 "이 그룹을 발신 프로필로 쓰는 템플릿이 있나?" 를 알아야 하는데, 그 답은
 * 메시지 템플릿(마케팅 도메인)이 갖고 있다. 관리자 화면이 마케팅 스토어를 직접 import 하면
 * **pages/admins → pages/marketing 결합**이 되고 code-quality 축1 이 blocker 로 잡는다.
 *
 * [해법] 여기(공통 층)가 조회기의 **자리만** 만들고, 실제 구현은 마케팅이 넣는다. 배선은
 * 합성 루트(App.tsx)가 한다 — 두 도메인을 아는 것이 합성 루트의 일이고, 화면끼리는 서로를
 * 모른 채로 남는다.
 *
 * [등록 전에는 null 을 돌려준다 — 그리고 그때는 삭제를 막는다] 배선이 안 된 상태에서 빈 배열을
 * 돌려주면 "쓰는 데가 없다" 로 읽혀 **삭제가 조용히 통과**한다. 모르는 것과 없는 것은 다르다.
 * 소비처는 null 을 '확인 불가' 로 다루고 삭제를 거절해야 한다(fail-closed).
 */
type SenderUsageLookup = (groupId: string) => readonly string[];

let senderUsageLookup: SenderUsageLookup | null = null;

export function registerSenderUsageLookup(lookup: SenderUsageLookup): void {
  senderUsageLookup = lookup;
}

/** 이 그룹을 발신 프로필로 쓰는 템플릿 이름들 — 조회기가 등록되지 않았으면 null(확인 불가) */
export function senderTemplateNamesOf(groupId: string): readonly string[] | null {
  return senderUsageLookup === null ? null : senderUsageLookup(groupId);
}
