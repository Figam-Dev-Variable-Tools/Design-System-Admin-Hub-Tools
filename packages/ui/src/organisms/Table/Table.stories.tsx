// Table — Storybook 스토리 (CSF3 · Data 계열 IA)
//
// [고정 IA — Data 계열] Pagination·DataTable·ListCard 와 같은 어휘로 문서화한다(조합 폭발 금지):
//   Docs · Overview · Playground · States/(Empty·Loading·Selected Row) ·
//   Features/(Sort·Row Tone·Custom Columns — 이 표가 실제로 가진 데이터 역량) ·
//   Content/(Many Rows·Long Cell) · Accessibility/(Keyboard·ARIA·RTL) ·
//   Interaction/(Sort Column·Row Click)
// 상태·정렬·행 모델 전수 검증은 Table.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
// columns·rows 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import { useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TableArgTypes } from '../../../generated/argtypes/Table.argtypes';
import { Table } from './Table';

const COLUMNS = [
  { id: 'title', header: '제목' },
  { id: 'date', header: '등록일', sortable: true, nowrap: true },
  { id: 'views', header: '조회수', align: 'end' as const, sortable: true },
];

const ROWS = [
  { id: 'a', cells: ['2026 지속가능경영보고서', '2026-07-20', '1,204'] },
  { id: 'b', cells: ['탄소중립 이행 계획', '2026-06-02', '873'] },
  { id: 'c', cells: ['협력사 행동규범', '2026-04-11', '2,051'] },
];

/** 많은 행 — 구분선·행 밀도·hover 를 한 화면에서 본다 (창은 감싸는 쪽이 준다) */
const MANY_ROWS = Array.from({ length: 12 }, (_, index) => ({
  id: `report-${String(index)}`,
  cells: [`분기 실적 보고서 ${String(index + 1)}호`, '2026-07-20', `${String((index + 1) * 137)}`],
}));

/** 긴 셀 — 제목 열은 줄바꿈되고 nowrap 을 선언한 등록일 열은 한 줄로 버틴다 */
const LONG_ROWS = [
  {
    id: 'long',
    cells: [
      '2026 지속가능경영보고서 및 탄소중립 이행 계획 통합 개정판 — 협력사 행동규범 부속서 포함',
      '2026-07-20',
      '1,204',
    ],
  },
  ...ROWS.slice(1),
];

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl">
    <Story />
  </div>
);

/** Interaction/Row Click 이 행 활성화 발화를 단언하려면 행들이 같은 스파이를 공유해야 한다 */
const rowActivate = fn();

const meta: Meta<typeof Table> = {
  title: 'Design System/Components/Table',
  component: Table,
  argTypes: { ...TableArgTypes },
  args: {
    caption: 'ESG 보고서 목록',
    columns: COLUMNS,
    rows: ROWS,
    sortKey: '',
    sortDirection: 'asc',
    loading: false,
    skeletonRows: 5,
  },
};

export default meta;

type Story = StoryObj<typeof Table>;

/** Overview — 대표 쓰임새. 정렬도 선택도 걸리지 않은 기본 목록 표다. 헤더는 평범한 <th> 다 */
export const Default: Story = { name: 'Overview' };

/** Playground — caption·sortKey·sortDirection·loading·skeletonRows 를 Controls 로 바꿔 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** empty — 카피는 슬롯이다. 조사(이/가)와 복구 액션은 앱의 지식이라 DS 가 문자열로 들지 않는다 */
export const Empty: Story = {
  name: 'States/Empty',
  args: { rows: [], empty: <span>등록된 보고서가 없어요.</span> },
};

/** loading — aria-busy 가 켜지고 본문이 스켈레톤 격자로 대체된다 (STATE-01) */
export const Loading: Story = {
  name: 'States/Loading',
  args: { loading: true, skeletonRows: 4 },
};

/**
 * selected — 선택은 **판정의 결과**로 들어온다. 무엇이 선택됐는지 고르는 것도 체크박스를
 * 그리는 것도 호출부의 일이고, DS 는 그 사실을 aria-selected 와 시각으로만 옮긴다.
 * 배경은 hover 와 같은 raised 이고 구분은 inline-start 강조선이 짊어진다.
 */
export const SelectedRows: Story = {
  name: 'States/Selected Row',
  args: { rows: ROWS.map((row, index) => ({ ...row, selected: index === 0 })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = canvas.getAllByRole('row').slice(1);

    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'false');
  },
};

/* ── Features ───────────────────────────────────────────────────────────── */

/** 정렬 기준 열 — sortable 헤더가 버튼이 되고 aria-sort 는 버튼이 아니라 th 가 갖는다 (ERP-04) */
export const Sorted: Story = {
  name: 'Features/Sort',
  args: { sortKey: 'date', sortDirection: 'desc', onSortToggle: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('columnheader', { name: /등록일/ });
    await expect(header).toHaveAttribute('aria-sort', 'descending');
  },
};

/**
 * tone — 행 전체 상태 색조. 로그인 실패 이력처럼 '한눈에 위험 행을 훑는' 자리에 쓴다.
 * 색만으로 말하지 않으므로 실제 호출부는 셀 안 배지·아이콘으로 같은 상태를 함께 표기한다 —
 * 여기서는 네 tone(danger·warning·success·info)만 보이도록 최소로 그린다.
 */
export const RowTones: Story = {
  name: 'Features/Row Tone',
  args: {
    rows: [
      { id: 'ok', cells: ['정상 로그인', '2026-07-20', '1'] },
      { id: 'fail', cells: ['로그인 실패', '2026-07-20', '3'], tone: 'danger' as const },
      { id: 'warn', cells: ['비정상 위치', '2026-07-19', '1'], tone: 'warning' as const },
      { id: 'done', cells: ['승인 완료', '2026-07-18', '1'], tone: 'success' as const },
      { id: 'note', cells: ['참고 항목', '2026-07-17', '1'], tone: 'info' as const },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [, danger] = canvas.getAllByRole('row').slice(1);
    await expect(danger).toHaveClass('tds-table__row--danger');
  },
};

/** 권한이 만든 열 — 체크박스·순번·액션 열이 완성된 셀 배열로 들어온다. DS 는 canRemove 를 모른다 */
export const WithSlotColumns: Story = {
  name: 'Features/Custom Columns',
  args: {
    leadingHead: [
      <th key="select" scope="col">
        선택
      </th>,
      <th key="seq" scope="col">
        번호
      </th>,
    ],
    trailingHead: [<th key="actions" scope="col" />],
    rows: ROWS.map((row, index) => ({
      ...row,
      leading: [
        <td key="select">
          <input type="checkbox" aria-label={`${String(row.cells[0])} 선택`} />
        </td>,
        <td key="seq">{index + 1}</td>,
      ],
      trailing: [
        <td key="actions">
          <button type="button">수정</button>
        </td>,
      ],
    })),
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 많은 행 — 12행에서 구분선·행 밀도·hover 배경을 한 화면에 본다 */
export const ManyRows: Story = {
  name: 'Content/Many Rows',
  args: { rows: MANY_ROWS },
};

/** 긴 셀 — 제목은 줄바꿈되고 nowrap 을 선언한 등록일 열은 한 줄을 지킨다 */
export const LongCell: Story = {
  name: 'Content/Long Cell',
  args: { rows: LONG_ROWS },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** focus-visible — 정렬 버튼에 Tab 으로 들어오면 :focus-visible 링을 받는다. 행 자체는 탭 순서에 없다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  args: { onSortToggle: fn() },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /등록일/ });
    button.focus();
    await expect(button).toHaveFocus();
  },
};

/**
 * ARIA — 선택 개념이 없는 표의 행에는 aria-selected 를 달지 않는다(없는 선택지를 읽어 주지
 * 않게). 로딩이 아니면 aria-busy 는 false 로 명시된다.
 */
export const Aria: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('table')).toHaveAttribute('aria-busy', 'false');
    for (const row of canvas.getAllByRole('row').slice(1)) {
      await expect(row).not.toHaveAttribute('aria-selected');
    }
  },
};

/** RTL — 논리 속성만 쓰므로 수치 열의 우측 정렬이 반대편으로 따라간다 (문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    caption: 'ESG 보고서 목록 (RTL 검수용)',
    columns: [
      { id: 'title', header: '제목' },
      { id: 'date', header: '등록일', sortable: true, nowrap: true },
      { id: 'views', header: '조회수', align: 'end' as const },
    ],
    rows: [
      { id: 'a', cells: ['지속가능경영 보고서', '2026-07-20', '1,204'] },
      { id: 'b', cells: ['탄소중립 이행 계획', '2026-06-02', '873'] },
    ],
    sortKey: 'date',
    onSortToggle: fn(),
  },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 정렬은 제어된다 — DS 는 의사만 올리고(onSortToggle) 다음 상태는 호출부가 정한다 */
export const ControlledSort: Story = {
  name: 'Interaction/Sort Column',
  args: { onSortToggle: fn() },
  render: function ControlledTable(args) {
    const [key, setKey] = useState('');
    const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
    return (
      <Table
        {...args}
        sortKey={key}
        sortDirection={direction}
        onSortToggle={(id) => {
          args.onSortToggle?.(id);
          // 같은 열을 다시 누르면 방향 전환, 다른 열이면 오름차순부터
          if (id === key) {
            setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setKey(id);
            setDirection('asc');
          }
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /조회수/ }));

    await expect(args.onSortToggle).toHaveBeenLastCalledWith('views');
    await expect(canvas.getByRole('columnheader', { name: /조회수/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  },
};

/** 행 클릭 — onActivate 가 있는 행은 어디를 눌러도(셀 안 인터랙티브 요소 제외) 활성화된다 */
export const ActivatableRows: Story = {
  name: 'Interaction/Row Click',
  args: { rows: ROWS.map((row) => ({ ...row, onActivate: rowActivate })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    rowActivate.mockClear();

    await userEvent.click(canvas.getByText('탄소중립 이행 계획'));

    await expect(rowActivate).toHaveBeenCalledTimes(1);
  },
};
