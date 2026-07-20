// Table — 계약 검증 테스트 (contracts/Table.contract.json@1.0.0)
//
//   a11y.role         table (<table>)
//   a11y.aria         caption · aria-sort · aria-busy · sort-button-hint · skeleton-hidden · no-row-role
//   states[]          default · hover · focus-visible · loading · selected
//   events            onSortToggle(columnId)
//
// [왜 이 파일이 이관보다 먼저 존재해야 하나] work-cycle.md §6 — 어떤 화면의 a11y 표면을 DS 로
// 옮기기 전에 그 표면을 보는 검사를 먼저 만든다. 검사 없이 옮기면 통과가 아무것도 증명하지
// 않는다(같은 리포에서 aria-pressed 를 통째로 지웠는데 245건이 전부 통과한 실측이 있다).
//
// 여기서 지키는 것은 CrudTable 이 갖고 있던 표면이다: aria-sort 가 버튼이 아니라 th 에 있을 것,
// 정렬 표식이 aria-hidden 일 것, 스켈레톤/빈 행의 colSpan 이 열 수와 맞을 것, 행 클릭이 셀 안
// 인터랙티브 요소를 가로채지 않을 것, 그리고 <tr> 이 tabIndex 를 갖지 않을 것.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import tableCss from './Table.css?raw';
import { Table } from './Table';

const COLUMNS = [
  { id: 'title', header: '제목' },
  { id: 'date', header: '등록일', sortable: true },
  { id: 'count', header: '건수', align: 'end' as const, nowrap: true },
];

const ROWS = [
  { id: 'a', cells: ['첫 번째 보고서', '2026-07-01', '12'] },
  { id: 'b', cells: ['두 번째 보고서', '2026-07-20', '3'] },
];

function renderTable(props: Partial<Parameters<typeof Table>[0]> = {}) {
  return render(<Table caption="ESG 보고서 목록" columns={COLUMNS} rows={ROWS} {...props} />);
}

describe('Table — 골격과 접근 가능한 이름', () => {
  it('Table: default 상태 — role=table 이고 caption 이 접근 가능한 이름이 된다', () => {
    renderTable();
    expect(screen.getByRole('table', { name: 'ESG 보고서 목록' })).not.toBeNull();
  });

  it('caption 은 시각적으로 숨되 DOM 과 접근성 트리에는 남는다', () => {
    const { container } = renderTable();
    const caption = container.querySelector('caption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('ESG 보고서 목록');
    // display:none / visibility:hidden 이면 접근성 트리에서도 지워져 이름이 사라진다
    expect(tableCss).toContain('clip-path: inset(50%)');
    expect(tableCss).not.toContain('display: none');
  });

  it('데이터 열은 th[scope=col] 로 나가고 행은 열 수만큼 td 를 갖는다', () => {
    const { container } = renderTable();
    const heads = container.querySelectorAll('thead th[scope="col"]');
    expect(heads).toHaveLength(3);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(3);
  });
});

describe('Table — 정렬 (aria-sort 는 열의 속성이다)', () => {
  it('sortable 열만 헤더가 버튼이 된다', () => {
    renderTable({ onSortToggle: vi.fn() });
    expect(screen.getByRole('button', { name: /등록일/ })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /제목/ })).toBeNull();
  });

  it('onSortToggle 이 없으면 sortable 열도 버튼이 되지 않는다 — 눌러도 조용한 버튼을 그리지 않는다', () => {
    renderTable();
    expect(screen.queryByRole('button', { name: /등록일/ })).toBeNull();
  });

  it('aria-sort 는 th 에 붙는다 — 버튼이 아니다 (ERP-04)', () => {
    const { container } = renderTable({
      sortKey: 'date',
      sortDirection: 'desc',
      onSortToggle: vi.fn(),
    });
    const th = container.querySelector('th[aria-sort]');
    expect(th).not.toBeNull();
    expect(th?.tagName).toBe('TH');
    expect(th?.getAttribute('aria-sort')).toBe('descending');
    // 버튼이 aria-sort 를 들면 보조기술이 '이 버튼이 정렬돼 있다' 로 읽는다
    expect(container.querySelector('button[aria-sort]')).toBeNull();
  });

  it('정렬되지 않은 열에는 aria-sort 속성 자체가 없다', () => {
    const { container } = renderTable({ sortKey: '', onSortToggle: vi.fn() });
    expect(container.querySelectorAll('[aria-sort]')).toHaveLength(0);
  });

  it('방향 표식(▲▼↕)은 aria-hidden 이다 — aria-sort 가 이미 같은 사실을 말한다', () => {
    const { container } = renderTable({
      sortKey: 'date',
      sortDirection: 'asc',
      onSortToggle: vi.fn(),
    });
    const mark = container.querySelector('.tds-table__sort-mark');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
    expect(mark?.textContent).toBe('▲');
  });

  it('정렬 버튼은 시각적으로 숨긴 안내를 함께 낸다', () => {
    renderTable({ onSortToggle: vi.fn() });
    expect(screen.getByRole('button', { name: /이 열로 정렬/ })).not.toBeNull();

    renderTable({ sortKey: 'date', onSortToggle: vi.fn() });
    expect(screen.getAllByRole('button', { name: /다시 누르면 방향 전환/ })[0]).not.toBeUndefined();
  });

  it('헤더를 누르면 그 열의 id 를 올린다 — 다음 상태는 DS 가 정하지 않는다', async () => {
    const onSortToggle = vi.fn();
    renderTable({ onSortToggle });
    await userEvent.click(screen.getByRole('button', { name: /등록일/ }));
    expect(onSortToggle).toHaveBeenCalledWith('date');
  });
});

describe('Table — 로딩 (STATE-01)', () => {
  it('loading 이면 aria-busy 가 켜지고 본문이 스켈레톤으로 대체된다', () => {
    const { container } = renderTable({ loading: true });
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.tds-skeleton').length).toBeGreaterThan(0);
    // 실제 행은 그리지 않는다
    expect(screen.queryByText('첫 번째 보고서')).toBeNull();
  });

  it('loading 이 아니면 aria-busy 는 false 다', () => {
    renderTable();
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('false');
  });

  it('스켈레톤 격자는 skeletonRows × 전체 열 수다 — colSpan 계산의 정본', () => {
    const { container } = renderTable({
      loading: true,
      skeletonRows: 3,
      leadingHead: [<th key="s" scope="col" />, <th key="q" scope="col" />],
      trailingHead: [<th key="a" scope="col" />],
    });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    // 2(leading) + 3(data) + 1(trailing) = 6
    expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(6);
  });

  it('스켈레톤은 aria-hidden 이다 — 내용 없는 셀이 낭독되면 빈 값으로 오해된다', () => {
    const { container } = renderTable({ loading: true });
    const skeletons = container.querySelectorAll('.tds-skeleton');
    for (const node of skeletons) expect(node.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Table — 빈 상태', () => {
  it('rows 가 비면 empty 슬롯이 전체 열을 가로지른다', () => {
    const { container } = renderTable({
      rows: [],
      empty: <p>등록된 보고서가 없습니다.</p>,
      leadingHead: [<th key="s" scope="col" />],
      trailingHead: [<th key="a" scope="col" />],
    });
    const cell = container.querySelector('tbody td');
    // 1(leading) + 3(data) + 1(trailing) = 5
    expect(cell?.getAttribute('colSpan')).toBe('5');
    expect(screen.getByText('등록된 보고서가 없습니다.')).not.toBeNull();
  });

  it('empty 를 주지 않아도 표가 깨지지 않는다 — 카피는 앱의 것이라 DS 가 기본값을 발명하지 않는다', () => {
    const { container } = renderTable({ rows: [] });
    expect(container.querySelector('tbody td')?.textContent).toBe('');
  });
});

describe('Table — 행 활성화 (마우스 보조 수단이다)', () => {
  it('onActivate 를 주면 행 클릭이 그것을 부른다', async () => {
    const onActivate = vi.fn();
    renderTable({ rows: [{ id: 'a', cells: ['첫 번째 보고서', '2026-07-01', '12'], onActivate }] });
    await userEvent.click(screen.getByText('첫 번째 보고서'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('행 안의 인터랙티브 요소에서 시작한 클릭은 행을 활성화하지 않는다', async () => {
    const onActivate = vi.fn();
    const onCheck = vi.fn();
    renderTable({
      rows: [
        {
          id: 'a',
          cells: [
            <input key="c" type="checkbox" aria-label="선택" onChange={onCheck} />,
            '2026-07-01',
            '12',
          ],
          onActivate,
        },
      ],
    });
    await userEvent.click(screen.getByLabelText('선택'));
    expect(onCheck).toHaveBeenCalledTimes(1);
    // 이 가드가 없으면 체크박스를 누를 때마다 화면이 튄다
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('텍스트를 드래그 선택하던 중이면 행을 활성화하지 않는다 — 셀 값 복사를 막지 않는다', () => {
    const onActivate = vi.fn();
    renderTable({ rows: [{ id: 'a', cells: ['첫 번째 보고서', '2026-07-01', '12'], onActivate }] });
    const spy = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => '첫 번째' } as unknown as Selection);

    fireEvent.click(screen.getByText('첫 번째 보고서'));
    expect(onActivate).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('onActivate 가 없는 행은 활성화 클래스도 갖지 않는다 — 커서가 거짓말하지 않게', () => {
    const { container } = renderTable();
    expect(container.querySelectorAll('.tds-table__row--activatable')).toHaveLength(0);
  });

  // hover 는 포인터 의사 클래스라 jsdom 에 실제 상태가 없다 — 검증할 수 있는 유일한 진짜
  // 단언은 스타일시트 규칙 자체다. 규칙을 지우면 이 테스트가 실패한다 (Button 선례).
  it('Table: hover 상태 — 활성화 가능한 행만 :hover 에서 배경이 올라간다', () => {
    const start = tableCss.indexOf('.tds-table__row--activatable:hover');
    expect(start).toBeGreaterThan(-1);
    const open = tableCss.indexOf('{', start);
    const body = tableCss.slice(open + 1, tableCss.indexOf('}', open));
    expect(body).toContain('var(--tds-color-surface-raised)');

    // 행 전체(.tds-table__row)에 hover 를 걸면 누를 수 없는 행도 눌릴 것처럼 보인다
    expect(tableCss).not.toContain('.tds-table__row:hover');

    // 그 클래스가 실제로 onActivate 있는 행에만 붙는다는 것은 위/아래 두 테스트가 함께 못 박는다
    const { container } = renderTable({
      rows: [{ id: 'a', cells: ['첫', '둘', '셋'], onActivate: vi.fn() }],
    });
    expect(container.querySelectorAll('.tds-table__row--activatable')).toHaveLength(1);
  });

  it('<tr> 은 role 도 tabIndex 도 갖지 않는다 — 표 시맨틱을 덮으면 행·열 탐색이 사라진다', () => {
    const { container } = renderTable({
      rows: [{ id: 'a', cells: ['첫', '둘', '셋'], onActivate: vi.fn() }],
    });
    const row = container.querySelector('tbody tr');
    expect(row?.getAttribute('role')).toBeNull();
    expect(row?.getAttribute('tabindex')).toBeNull();
  });
});

describe('Table — 계약 states 의 selected (판정의 결과로 주입된다)', () => {
  // 무엇이 선택됐는지 고르는 것도 체크박스를 그리는 것도 앱의 일이다 (Table.types.ts 머리말:
  // "DS 는 (1) 골격의 시각과 상호작용만 가진다"). DS 는 '이 행은 선택됐다' 는 **결과**만 받아
  // aria-selected 와 시각으로 옮긴다 — 그 옮김이 빠지지 않았는지가 여기서 지키는 전부다.
  const selectable = [
    { id: 'a', cells: ['첫 번째 보고서', '2026-07-01', '12'], selected: true },
    { id: 'b', cells: ['두 번째 보고서', '2026-07-20', '3'], selected: false },
  ];

  it('Table: selected 상태 — 선택된 행만 aria-selected="true" 와 선택 클래스를 갖는다', () => {
    renderTable({ rows: selectable });
    const [first, second] = screen.getAllByRole('row').slice(1);

    expect(first?.getAttribute('aria-selected')).toBe('true');
    expect(first?.className).toContain('tds-table__row--selected');

    expect(second?.getAttribute('aria-selected')).toBe('false');
    expect(second?.className).not.toContain('tds-table__row--selected');
  });

  it('Table: 선택 개념이 없는 표의 행에는 aria-selected 가 아예 없다 (없는 선택지를 읽어 주지 않는다)', () => {
    // selected 를 주지 않은 표에 aria-selected="false" 가 달리면 스크린리더가
    // '선택 안 됨' 이라고 읽어 사용자가 존재하지 않는 선택 조작을 찾게 된다.
    renderTable();

    for (const row of screen.getAllByRole('row').slice(1)) {
      expect(row.hasAttribute('aria-selected')).toBe(false);
    }
  });

  it('Table: selected 는 hover 와 같은 배경을 쓰되 inline-start 강조선으로 구분된다', () => {
    // 배경만으로 갈리면 마우스가 얹힌 행과 선택된 행이 같아 보인다. 선은 위치를 가지므로
    // 색에만 기대지 않는다 — 색각 이상에서도 남는 신호다.
    expect(tableCss).toContain('.tds-table__row--selected');
    const accent = /\.tds-table__row--selected\s*>\s*\*:first-child\s*\{([^}]*)\}/.exec(tableCss);

    expect(accent).not.toBeNull();
    expect(accent?.[1]).toContain('var(--tds-border-width-medium)');
    expect(accent?.[1]).toContain('var(--tds-color-action-primary-default)');
  });
});

describe('Table — leading/trailing 은 완성된 셀을 그대로 흘린다', () => {
  it('호출부가 준 <td>/<th> 가 감싸지지 않고 그대로 나간다', () => {
    const { container } = renderTable({
      leadingHead: [
        <th key="s" scope="col">
          선택
        </th>,
      ],
      rows: [
        {
          id: 'a',
          cells: ['첫', '둘', '셋'],
          leading: [<td key="s">체크</td>],
          trailing: [<td key="x">액션</td>],
        },
      ],
    });
    // td 안에 td 가 중첩되면 브라우저가 마크업을 재배치해 표가 무너진다
    expect(container.querySelectorAll('td td')).toHaveLength(0);
    expect(container.querySelectorAll('tbody tr:first-child > td')).toHaveLength(5);
    expect(screen.getByRole('columnheader', { name: '선택' })).not.toBeNull();
  });
});

describe('Table — 토큰과 RTL', () => {
  it('CSS 에 hex·px·rgb 가 없다', () => {
    expect(tableCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(tableCss).not.toMatch(/\brgb\(/);
    expect(tableCss).not.toMatch(/\b\d+px\b/);
  });

  it('물리 방향 속성을 쓰지 않는다 — RTL 에서 수치 열이 반대쪽에 남지 않게', () => {
    const physical = tableCss.match(/\b(border|padding|margin)-(left|right)\b/g) ?? [];
    expect(physical).toEqual([]);
    expect(tableCss).not.toMatch(/text-align:\s*(left|right)/);
  });

  it('셀 여백은 component.table 스코프 토큰에서 온다 (ERP-02)', () => {
    expect(tableCss).toContain('--tds-component-table-cell-padding-x');
    expect(tableCss).toContain('--tds-component-table-cell-padding-y');
    expect(tableCss).toContain('--tds-component-table-divider');
  });
});
