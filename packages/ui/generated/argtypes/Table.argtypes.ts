// AUTO-GENERATED from contracts/Table.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TableArgTypes = {
  caption: {
    description: '표의 접근 가능한 설명 — `<caption>` 에 들어가며 시각적으로는 숨는다. 표가 무엇의 목록이고 행에 어떤 조작이 있는지 한 문장으로 말한다. **없는 버튼을 있다고 읽어 주면 스크린리더 사용자는 존재하지 않는 조작을 찾아 표를 헤맨다** — 권한에 따라 문장을 바꾸는 것은 호출부의 일이다(DS 는 권한을 모른다)',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
    },
  },
  columns: {
    description: '**데이터 열**의 정의. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003). 체크박스·순번·행 액션 열은 여기 들어가지 않는다(leadingHead·trailingHead 참조). `id` 는 정렬 키이자 React key 다. `align: \'end\'` 는 수치 열 — 우측 정렬 + tabular-nums 가 함께 붙는다. `sortable: true` 인 열만 헤더가 정렬 버튼이 되며 기본은 false 다(정렬은 opt-in)',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; header: ReactNode; align?: \'start\' | \'end\'; nowrap?: boolean; sortable?: boolean }>',
      },
    },
  },
  rows: {
    description: '본문 행. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003). `cells` 는 columns 와 **같은 순서·같은 길이**이며 각 항목이 그 열의 `<td>` 안에 그대로 들어간다. `leading`/`trailing` 은 **완성된 `<td>`/`<th>` 요소**다 — 호출부가 체크박스 셀·순번 셀·액션 셀을 통째로 넘긴다. `onActivate` 를 주면 행 전체가 클릭 가능해진다(포인터 커서). 정렬은 이미 끝난 상태로 들어온다 — DS 는 rows 를 준 순서 그대로 그린다. `selected` 는 계약 states 의 `selected` 를 그리는 **판정의 결과**다(sortKey·Sidebar 의 activeHref 와 같은 어법) — 무엇이 선택됐는지 고르는 것도, 체크박스를 그리는 것도 여전히 앱의 일이고(체크박스는 leading 으로 통째로 들어온다) DS 는 \'이 행은 선택됐다\' 는 사실만 받아 `aria-selected` 와 시각으로 옮긴다. hover 와 같은 배경을 쓰되 inline-start 강조선으로 구분한다 — 배경만으로 갈리면 마우스가 얹힌 행과 선택된 행이 같아 보인다',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<{ id: string; cells: ReadonlyArray<ReactNode>; leading?: ReadonlyArray<ReactNode>; trailing?: ReadonlyArray<ReactNode>; onActivate?: () => void; selected?: boolean }>',
      },
    },
  },
  leadingHead: {
    description: '데이터 헤더 **앞**에 오는 완성된 `<th>` 요소들 — 전체 선택 체크박스 헤더·순번 헤더 등. 배열 길이가 곧 앞쪽 열 수이며, 스켈레톤과 빈 행의 colSpan 이 여기서 계산된다. 권한으로 열이 사라지면 호출부가 배열에서 빼면 되고 DS 는 셈을 다시 하지 않는다',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<ReactNode>',
      },
      defaultValue: {
        summary: '[]',
      },
    },
  },
  trailingHead: {
    description: '데이터 헤더 **뒤**에 오는 완성된 `<th>` 요소들 — 행 액션 열 헤더 등. leadingHead 와 같은 규칙이다',
    control: false,
    table: {
      category: 'Props',
      type: {
        summary: 'ReadonlyArray<ReactNode>',
      },
      defaultValue: {
        summary: '[]',
      },
    },
  },
  sortKey: {
    description: '지금 정렬 기준인 열의 id. 빈 문자열이면 어느 열도 정렬 표시를 갖지 않고 rows 가 온 순서 그대로다. **판정은 앱이 한다** — 어드민은 URL(useListState.sort)이 단일 원천이라 DS 가 자기 상태로 들면 뒤로 가기로 되돌릴 수 없다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '""',
      },
    },
  },
  sortDirection: {
    description: '정렬 방향 — sortKey 가 빈 문자열이면 아무 데도 쓰이지 않는다. `<th aria-sort>` 가 ascending/descending 으로 나가고 시각 표식(▲/▼)이 같은 값을 따른다',
    control: {
      type: 'select',
    },
    options: ['asc', 'desc'],
    table: {
      category: 'Props',
      type: {
        summary: '\'asc\' | \'desc\'',
      },
      defaultValue: {
        summary: '"asc"',
      },
    },
  },
  loading: {
    description: '**최초 로드만** true 여야 한다 — 재조회 중에 true 가 되면 이전 행이 스켈레톤으로 덮여 화면이 깜빡인다(STATE-01). true 이면 `<table aria-busy>` 가 켜지고 본문이 스켈레톤 격자로 대체된다',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
      defaultValue: {
        summary: 'false',
      },
    },
  },
  skeletonRows: {
    description: '로딩 중 그릴 스켈레톤 행 수. 실제 페이지 크기에 가까울수록 로드 후 레이아웃이 덜 튄다',
    control: {
      type: 'number',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'number',
      },
      defaultValue: {
        summary: '5',
      },
    },
  },
  empty: {
    description: 'rows 가 비었을 때 본문 한 칸(colSpan 전체)에 그릴 내용. **슬롯이다** — \'등록된 X이(가) 없습니다\' 의 조사 처리와 \'검색을 지우세요/필터를 초기화하세요\' 의 분기는 한국어와 이 제품의 정보구조에 묶인 앱의 지식이라 DS 가 문자열로 들지 않는다. null 이면 빈 칸만 그린다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'ReactNode',
      },
      defaultValue: {
        summary: 'null',
      },
    },
  },
  onSortToggle: {
    description: '정렬 가능한 헤더 버튼이 눌리면 그 열의 id 를 전달한다. 다음 정렬 상태를 정하는 것은 DS 가 아니다 — 호출부가 sortKey·sortDirection 을 다음 값으로 정해서 되돌려준다. 이 콜백을 주지 않으면 sortable 열의 헤더도 버튼이 되지 않는다(눌러도 조용한 버튼을 그리지 않는다)',
    action: 'onSortToggle',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'string',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 4개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 커버리지 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { sortDirection: 'asc', loading: 'false' },
  { sortDirection: 'asc', loading: 'true' },
  { sortDirection: 'desc', loading: 'false' },
  { sortDirection: 'desc', loading: 'true' },
] as const;

export type TableCombination = (typeof combinationMatrix)[number];
