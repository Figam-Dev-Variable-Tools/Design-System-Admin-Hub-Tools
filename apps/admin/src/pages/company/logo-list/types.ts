// 로고 목록(파트너사·고객사) 공용 타입 + 순수 규칙
//
// [왜 공유하는가] 파트너사와 고객사는 데이터 모양(로고·이름·링크·정렬)과 화면(목록 + 추가/수정 모달
// + 삭제팝업)이 동일하다. 두 화면이 각자 표·모달·필터를 복사하는 대신 한 모듈을 config 로 공유한다.
// (둘 다 pages/company 아래라 결합이 아니다 — 콘텐츠 목록이 쓰는 shared/ui 프리미티브는 그대로 재사용.)

/** 로고 항목 1건 — 파트너사/고객사 공통 */
export interface LogoItem {
  readonly id: string;
  readonly name: string;
  /** 로고 이미지 URL */
  readonly logoUrl: string;
  /** 클릭 시 이동할 링크(선택) */
  readonly linkUrl: string;
  /** 정렬 순서 — 작을수록 앞에 온다 */
  readonly order: number;
  /** 노출 여부 — 목록에서 바로 ON/OFF 토글한다(등록 시 기본 노출) */
  readonly active: boolean;
}

/** 등록/수정 입력 — 정렬 순서는 목록의 드래그로 관리하므로 폼에서 받지 않는다 */
export interface LogoInput {
  readonly name: string;
  readonly logoUrl: string;
  readonly linkUrl: string;
}

/**
 * 이름 키워드(대소문자·앞뒤 공백 무시) 필터. 순서는 보존한다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function filterLogos(list: readonly LogoItem[], keyword: string): readonly LogoItem[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter((item) => item.name.toLowerCase().includes(needle));
}

/**
 * orderedIds 순서대로 재배치하고 order 를 1..n 으로 다시 매긴다.
 * **테스트가 이 순수 함수를 직접 부른다.**
 */
export function reorderLogosByIds(
  list: readonly LogoItem[],
  orderedIds: readonly string[],
): LogoItem[] {
  const byId = new Map(list.map((item) => [item.id, item]));
  const moved = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is LogoItem => item !== undefined);
  const idSet = new Set(orderedIds);
  let cursor = 0;
  const next = list.map((item) => (idSet.has(item.id) ? (moved[cursor++] ?? item) : item));
  return next.map((item, index) => ({ ...item, order: index + 1 }));
}

/** 현재 최대 order + 1 (비면 1). **테스트가 이 순수 함수를 직접 부른다.** */
export function nextLogoOrder(list: readonly LogoItem[]): number {
  return list.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

export const NAME_MAX_LENGTH = 60;
