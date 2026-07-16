// AUTO-GENERATED from contracts/Pagination.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type PaginationState = 'default' | 'hover' | 'focus-visible' | 'disabled';

/**
 * 페이지네이션 — 범위 요약('전체 N건 중 x–y') · 이전 / 번호 창 / 다음 · 페이지 크기 선택. 현재 페이지 주변 최대 5개 번호만 보여준다(전부 그리면 줄이 넘친다). 도메인을 모른다 — 회원·운영자·적립금 내역 어느 목록이든 page·totalPages·onChange 와 nav 접근성 label 만 받는다. 출처: apps/admin/src/shared/ui/Pagination.tsx (소비 11곳).

[범위·크기 표면은 opt-in — 하위호환] 한국 ERP grid 는 가시 record 범위와 조정 가능한 page size 를 기대한다(ERP-05). 그러나 기존 소비자 11곳은 page·totalPages·label·onChange 만 넘긴다 — 그래서 범위/크기 표면은 **pageSize 를 받았을 때만** 그린다(pageSize 기본 0 = 미지정). pageSize 미지정이면 렌더 결과가 1.0.0 과 완전히 동일하다(번호 줄만, totalPages ≤ 1 이면 null).

[totalPages ≤ 1 이어도 범위는 남는다] pageSize 를 받은 경우엔 단일/0 페이지에서도 범위 요약('전체 0건' · '전체 3건 중 1–3')을 그린다 — 번호 줄만 감춘다. 0건에서 '전체 0건'을 보여주는 것이 ERP 운영자에게 필요한 정보다.
 */
export interface PaginationProps {
  /**
   * 현재 페이지 (1-based). 번호 창이 이 값을 가운데 두려 민다
   */
  page: number;
  /**
   * 전체 페이지 수. 1 이하이면 컴포넌트가 렌더되지 않는다
   */
  totalPages: number;
  /**
   * nav 의 접근성 이름(aria-label). 회원 목록이 기본값 — 다른 목록이 재사용할 때만 바꾼다
   * @default "회원 목록 페이지"
   */
  label?: string;
  /**
   * 전체 레코드 수 — 범위 요약('전체 N건 중 x–y')의 N. pageSize 와 함께 줘야 의미가 있다. 데이터 prop — Figma 대응 없음 (ADR-0003)
   * @default 0
   */
  total?: number;
  /**
   * 페이지당 행 수 — 범위 요약의 x–y 를 계산하는 근거다. **0(기본)이면 범위 요약과 크기 선택을 그리지 않는다** — 이 값이 곧 ERP-05 표면의 opt-in 스위치이자 하위호환 장치다(기존 소비자 11곳은 이 prop 을 넘기지 않아 1.0.0 과 동일하게 렌더된다). 데이터 prop — Figma 대응 없음
   * @default 0
   */
  pageSize?: number;
  /**
   * 페이지 크기 선택지(예: [10, 25, 50, 100]). 비어 있으면(기본) 크기 선택 <select> 를 그리지 않는다 — 범위 요약만 쓰는 소비자를 위해 두 표면을 따로 켠다. 데이터 prop — Figma 대응 없음
   * @default []
   */
  pageSizeOptions?: ReadonlyArray<number>;
  /**
   * 크기 선택 <select> 의 가시 라벨. 목록마다 세는 단위가 달라도('건'/'줄') 라벨만 바꿔 쓴다
   * @default "페이지당"
   */
  sizeLabel?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 선택된 페이지 번호를 인자로 발화한다. 이전/다음/번호 버튼 모두 이 콜백으로 귀결된다
   */
  onChange?: (payload: number) => void;
  /**
   * 크기 선택에서 고른 새 page size 를 인자로 발화한다. 페이지 되감기(보통 1로)는 호출부가 소유한다 — 이 컴포넌트는 값만 알린다(도메인을 모른다)
   */
  onPageSizeChange?: (payload: number) => void;
}
