// Table — Storybook 스토리 (CSF3 · Data Display/Table)
//
// argTypes 는 계약 생성물(generated/argtypes/Table.argtypes)을 spread 한다 (수기 작성 금지 — G5).
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

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl">
    <Story />
  </div>
);

const meta: Meta<typeof Table> = {
  title: 'Data Display/Table',
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

/** default — 정렬도 선택도 걸리지 않은 기본형. 헤더는 평범한 <th> 다 */
export const Default: Story = {};

/** selected — 정렬 기준 열. aria-sort 는 버튼이 아니라 th 가 갖는다 (ERP-04) */
export const Sorted: Story = {
  args: { sortKey: 'date', sortDirection: 'desc', onSortToggle: fn() },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('columnheader', { name: /등록일/ });
    await expect(header).toHaveAttribute('aria-sort', 'descending');
  },
};

/** 정렬은 제어된다 — DS 는 의사만 올리고 다음 상태는 호출부가 정한다 */
export const ControlledSort: Story = {
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

/** loading — aria-busy 가 켜지고 본문이 스켈레톤 격자로 대체된다 (STATE-01) */
export const Loading: Story = {
  args: { loading: true, skeletonRows: 4 },
};

/** empty — 카피는 슬롯이다. 조사(이/가)와 복구 액션은 앱의 지식이라 DS 가 문자열로 들지 않는다 */
export const Empty: Story = {
  args: { rows: [], empty: <span>등록된 보고서가 없습니다.</span> },
};

/** 권한이 만든 열 — 완성된 셀 배열로 들어온다. DS 는 canRemove 를 모른다 */
export const WithSlotColumns: Story = {
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

/** hover — 활성화 가능한 행만 배경이 바뀐다. 커서가 어포던스를 말한다 */
export const ActivatableRows: Story = {
  args: { rows: ROWS.map((row) => ({ ...row, onActivate: fn() })) },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByText('탄소중립 이행 계획'));
  },
};

/**
 * selected — 선택은 **판정의 결과**로 들어온다. 무엇이 선택됐는지 고르는 것도 체크박스를
 * 그리는 것도 호출부의 일이고, DS 는 그 사실을 aria-selected 와 시각으로만 옮긴다.
 * 배경은 hover 와 같은 raised 이고 구분은 inline-start 강조선이 짊어진다 — 배경만으로
 * 갈리면 마우스가 얹힌 행과 선택된 행이 같아 보인다.
 */
export const SelectedRows: Story = {
  args: { rows: ROWS.map((row, index) => ({ ...row, selected: index === 0 })) },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = canvas.getAllByRole('row').slice(1);

    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'false');
  },
};

/** focus-visible — 정렬 버튼에 키보드로 들어오면 링이 뜬다. 행 자체는 탭 순서에 없다 */
export const FocusVisible: Story = {
  args: { onSortToggle: fn() },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /등록일/ });
    button.focus();
    await expect(button).toHaveFocus();
  },
};

/** RTL — 논리 속성만 쓰므로 수치 열의 우측 정렬이 반대편으로 따라간다 */
export const RightToLeft: Story = {
  args: {
    caption: 'قائمة التقارير',
    columns: [
      { id: 'title', header: 'العنوان' },
      { id: 'date', header: 'التاريخ', sortable: true, nowrap: true },
      { id: 'views', header: 'المشاهدات', align: 'end' as const },
    ],
    rows: [
      { id: 'a', cells: ['تقرير الاستدامة', '2026-07-20', '1,204'] },
      { id: 'b', cells: ['خطة الحياد الكربوني', '2026-06-02', '873'] },
    ],
    sortKey: 'date',
    onSortToggle: fn(),
  },
  decorators: [rtlFrame],
};
