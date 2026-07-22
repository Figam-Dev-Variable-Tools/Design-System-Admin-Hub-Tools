// 채용 공고 화면 전용 타입 + 순수 규칙 (라우트: /company/careers)
//
// ┌ 마감 여부를 **저장하지 않는다** ───────────────────────────────────────────┐
// │ '마감' 을 컬럼으로 두면 그 값을 누군가 바꿔 줘야 한다. 그런데 마감일이 지나는   │
// │ 순간은 아무도 로그인해 있지 않은 새벽 0시다 — 결국 배치가 필요해지고, 배치가   │
// │ 하루 실패하면 지난 공고가 '모집 중' 으로 남아 지원서를 계속 받는다.            │
// │ 마감은 **마감일과 오늘을 비교하면 나오는 사실**이다. 계산하면 언제나 맞는다.   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 상시 채용은 '마감일 없음' 이 아니라 **1급 상태**다 ────────────────────────┐
// │ 마감일을 빈 문자열로 두고 '비었으면 상시' 로 읽으면, 마감일을 아직 안 정한      │
// │ 공고와 상시 채용 공고가 같은 모양이 된다. 그래서 `closesOn: string | null` 이고 │
// │ null 은 **의도**다 — 폼도 '상시 채용' 을 먼저 고르게 하고, 고르면 날짜 칸이     │
// │ 사라진다(빈 칸을 남겨 두면 무엇을 안 채운 것인지 알 수 없다).                  │
// └──────────────────────────────────────────────────────────────────────────┘
import type { StatusTone } from '../../../shared/ui';
import type { ApplicationFormRef } from '../../../shared/domain/application-form';

/* ── 축 3종 ──────────────────────────────────────────────────────────────── */

interface OptionDef {
  readonly id: string;
  readonly label: string;
}

/** 직무 — 지원자가 자기 자리를 찾는 첫 축이다 */
export const JOB_FUNCTIONS = [
  { id: 'planning', label: '기획' },
  { id: 'design', label: '디자인' },
  { id: 'engineering', label: '개발' },
  { id: 'sales', label: '영업' },
  { id: 'marketing', label: '마케팅' },
  { id: 'operations', label: '경영지원' },
] as const satisfies readonly OptionDef[];

export type JobFunctionId = (typeof JOB_FUNCTIONS)[number]['id'];

/** 고용형태 — 지원 여부를 가르는 축이라 목록에 그대로 보인다 */
export const EMPLOYMENT_TYPES = [
  { id: 'full-time', label: '정규직' },
  { id: 'contract', label: '계약직' },
  { id: 'intern', label: '인턴' },
  { id: 'part-time', label: '시간제' },
] as const satisfies readonly OptionDef[];

export type EmploymentTypeId = (typeof EMPLOYMENT_TYPES)[number]['id'];

export function jobFunctionLabel(id: string): string {
  return JOB_FUNCTIONS.find((option) => option.id === id)?.label ?? id;
}

export function employmentTypeLabel(id: string): string {
  return EMPLOYMENT_TYPES.find((option) => option.id === id)?.label ?? id;
}

/* ── 지원 방법 ───────────────────────────────────────────────────────────── */

/**
 * 셋뿐이다. `form` 만 다른 화면의 것을 **참조**한다 — 이메일·링크는 공고가 값을 통째로 갖지만
 * 폼은 폼 관리가 만들고 고치고 지운다(shared/domain/application-form.ts).
 */
export const APPLY_METHODS = [
  { id: 'email', label: '이메일 접수' },
  { id: 'link', label: '외부 링크' },
  { id: 'form', label: '지원 폼' },
] as const satisfies readonly OptionDef[];

export type ApplyMethodId = (typeof APPLY_METHODS)[number]['id'];

export function applyMethodLabel(id: string): string {
  return APPLY_METHODS.find((option) => option.id === id)?.label ?? id;
}

/* ── 공고 ────────────────────────────────────────────────────────────────── */

export interface Career {
  readonly id: string;
  readonly title: string;
  readonly jobFunction: string;
  readonly employmentType: string;
  /** 근무지 — '서울 성동구' 처럼 사람이 읽는 문자열. 원격이면 '원격' */
  readonly location: string;
  /**
   * 마감일 'YYYY-MM-DD'. **null 은 상시 채용이다**(비어 있는 것이 아니다 — 머리말).
   */
  readonly closesOn: string | null;
  readonly applyMethod: string;
  /** 이메일 주소 · 외부 URL · 폼 id 중 하나. 어느 것인지는 applyMethod 가 말한다 */
  readonly applyTarget: string;
  readonly description: string;
  /** 비공개 저장 — 꺼져 있으면 홈페이지에 나가지 않는다 */
  readonly published: boolean;
}

export type CareerInput = Omit<Career, 'id'>;

/* ── ② 마감은 파생값이다 ─────────────────────────────────────────────────── */

/**
 * 공고의 지금 상태.
 *
 *   draft  : 비공개 — 마감 여부를 따지기 전에 아직 나가지 않은 공고다
 *   always : 상시 채용 — 닫히지 않는다
 *   open   : 모집 중
 *   closed : 마감 — **마감일이 오늘보다 이전**이면 자동으로 이 상태다
 */
export type CareerState = 'draft' | 'always' | 'open' | 'closed';

/**
 * @param today 'YYYY-MM-DD' — '오늘' 을 주입받는다(테스트가 오늘을 고정할 수 있어야 한다)
 *
 * 마감일 **당일까지는 모집 중**이다. 'D-day 에 지원서를 넣는 사람' 을 자정 기준으로 잘라 내면
 * 마지막 날이 사실상 없는 날이 된다.
 */
export function careerStateOf(career: Career, today: string): CareerState {
  if (!career.published) return 'draft';
  if (career.closesOn === null) return 'always';
  return career.closesOn < today ? 'closed' : 'open';
}

export const CAREER_STATE_LABEL: Readonly<Record<CareerState, string>> = {
  draft: '비공개',
  always: '상시 채용',
  open: '모집 중',
  closed: '마감',
};

export function careerStateTone(state: CareerState): StatusTone {
  switch (state) {
    case 'draft':
      return 'neutral';
    case 'always':
      return 'info';
    case 'open':
      return 'success';
    case 'closed':
      return 'warning';
  }
}

/** 마감일 표기 — 상시 채용은 날짜가 없다는 사실을 그대로 말한다 */
export function closesOnText(career: Career): string {
  return career.closesOn ?? '상시 채용';
}

/* ── ④ 지원 방법 가드 ────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTPS_RE = /^https:\/\/[^\s]+$/;

/**
 * 이 지원 방법으로 저장할 수 없는 이유 — 저장할 수 있으면 null.
 *
 * `forms` 가 **null 이면 '모른다'** 다(미배선). 그때 '지원 폼' 을 고를 수 없게 막고 이유를
 * 말한다 — 빈 목록으로 뭉개면 화면이 '등록된 폼이 없습니다' 라고 완결되게 말하고, 운영자는
 * 이미 있는 폼을 다시 만들러 간다(shared/domain/application-form.ts 머리말).
 */
export function applyMethodBlock(
  method: string,
  target: string,
  forms: readonly ApplicationFormRef[] | null,
): string | null {
  const value = target.trim();

  if (method === 'email') {
    if (value === '') return '지원서를 받을 이메일 주소를 입력하세요.';
    return EMAIL_RE.test(value) ? null : '이메일 주소 형식이 올바르지 않습니다.';
  }

  if (method === 'link') {
    if (value === '') return '지원 페이지 주소를 입력하세요.';
    return HTTPS_RE.test(value)
      ? null
      : '지원 페이지 주소는 https:// 로 시작해야 합니다. 지원자가 개인정보를 입력하는 화면입니다.';
  }

  if (method === 'form') {
    if (forms === null) {
      return '지원 폼 목록을 확인할 수 없어 폼을 고를 수 없습니다. 폼 관리 연동이 준비되면 선택할 수 있습니다.';
    }
    if (value === '') return '연결할 지원 폼을 고르세요.';

    const found = forms.find((form) => form.id === value);
    if (found === undefined) return '선택한 지원 폼을 찾을 수 없습니다. 목록에서 다시 고르세요.';
    if (!found.published) {
      return `‘${found.name}’ 은 아직 발행되지 않은 폼입니다. 지원자가 열면 빈 화면을 보게 됩니다.`;
    }
    return null;
  }

  return '지원 방법을 고르세요.';
}

/**
 * 공개 저장을 막는 이유 — 막지 않으면 null.
 *
 * 비공개 저장은 언제나 허용된다(초안을 저장하지 못하게 만들면 작성 중인 내용이 사라진다).
 * 공개하려 할 때만 지원 경로가 실제로 열려 있는지 본다 — 열리지 않는 '지원하기' 는
 * 기능이 아니라 거짓 약속이다.
 */
export function publishBlock(
  input: CareerInput,
  forms: readonly ApplicationFormRef[] | null,
): string | null {
  if (!input.published) return null;
  return applyMethodBlock(input.applyMethod, input.applyTarget, forms);
}

/* ── 목록 좁히기 ─────────────────────────────────────────────────────────── */

export const CAREER_FILTER_ALL = 'all';

export type CareerFilter = string;

/** 직무·고용형태·상태가 AND 로 걸린다 */
export function filterCareers(
  list: readonly Career[],
  jobFunction: CareerFilter,
  employmentType: CareerFilter,
  state: CareerFilter,
  today: string,
): readonly Career[] {
  return list.filter((career) => {
    if (jobFunction !== CAREER_FILTER_ALL && career.jobFunction !== jobFunction) return false;
    if (employmentType !== CAREER_FILTER_ALL && career.employmentType !== employmentType) {
      return false;
    }
    if (state !== CAREER_FILTER_ALL && careerStateOf(career, today) !== state) return false;
    return true;
  });
}

/** 제목·근무지에서 찾는다 */
export function searchCareers(list: readonly Career[], keyword: string): readonly Career[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter((career) =>
    [career.title, career.location].some((field) => field.toLowerCase().includes(needle)),
  );
}

/**
 * 정렬 — **살아 있는 공고가 위, 지난 공고가 아래.**
 *
 * [왜 '오늘' 을 받지 않는가] 이 함수는 저장소의 정본 순서다(어댑터가 부른다). 오늘을 넣으면
 * 같은 목록이 날짜마다 다른 순서로 저장되고, 그 순서는 어디에도 기록되지 않는다. 대신
 * **마감일 내림차순**이 같은 일을 한다: 먼 마감일이 위로, 지나간 날짜는 자연히 아래로 간다.
 *
 * 상시 채용은 맨 위다 — 닫히지 않는 공고라 언제 봐도 지원할 수 있다.
 * 비공개는 맨 아래다 — 아직 나가지 않은 것을 먼저 보여 줄 이유가 없다.
 */
export function sortCareers(list: readonly Career[]): readonly Career[] {
  const rank = (career: Career): number => {
    if (!career.published) return 2;
    return career.closesOn === null ? 0 : 1;
  };

  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.closesOn !== null && b.closesOn !== null && a.closesOn !== b.closesOn) {
      return a.closesOn < b.closesOn ? 1 : -1;
    }
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export const TITLE_MAX_LENGTH = 100;
export const LOCATION_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 2_000;
export const APPLY_TARGET_MAX_LENGTH = 300;
