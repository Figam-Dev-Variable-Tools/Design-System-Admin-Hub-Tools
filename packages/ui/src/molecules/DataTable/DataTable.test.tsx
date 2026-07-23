// DataTable — 계약 검증 테스트 (contracts/DataTable.contract.json@1.0.0)
//
//   states[]   default · loading
//   events     없음 → blockedWhen 없음
//
// ⚠ loading 상태는 **테스트할 수 없다**: 계약이 `states: ["default","loading"]` 과
//   `a11y.ariaBusy: "when loading"` 을 선언하면서도 **loading 을 켤 prop 을 선언하지 않았다**
//   (props = columns · rows · rowKey · summaryRows · caption · dimZero · empty).
//   계약에 없는 prop 을 만드는 것은 컴포넌트 엔지니어의 권한 밖이므로 (원칙: "계약에 없는 prop 은 만들지 않는다")
//   계약 엔지니어에 변경 요청을 발행했다.
//   그 변경 요청이 처리되기 전까지 이 칸은 **미커버로 남긴다**. 이름만 맞춘 빈 테스트로 덮으면
//   그것이야말로 테스트 커버리지가 고발한 초록불 위조다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable';

const columns = [
  { key: 'period', label: '기간', align: 'left' as const },
  { key: 'visitors', label: '방문자', unit: '명' },
];
const rows = [
  { period: '1월', visitors: 1200 },
  { period: '2월', visitors: 0 },
];

describe('DataTable — 계약 states[]', () => {
  it('DataTable: default 상태 — caption + th[scope=col] + rowKey 컬럼의 th[scope=row] 로 렌더된다', () => {
    render(<DataTable columns={columns} rows={rows} rowKey="period" caption="기간별 방문자" />);
    const table = screen.getByRole('table', { name: '기간별 방문자' });

    expect(table.querySelector('caption')?.textContent).toBe('기간별 방문자');
    expect(screen.getByRole('columnheader', { name: '기간' })).not.toBeNull();
    expect(screen.getByRole('rowheader', { name: '1월' }).getAttribute('scope')).toBe('row');
  });

  it('DataTable: default 상태 — 숫자는 천 단위로 구분하고 dimZero 가 0 이하 셀을 흐리게 표시한다', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} rowKey="period" caption="기간별 방문자" />,
    );

    expect(screen.getByRole('cell', { name: '1,200' })).not.toBeNull();
    expect(container.querySelectorAll('.tds-datatable__cell--dim')).toHaveLength(1);
  });

  it('DataTable: default 상태 — rows 가 비면 empty 문구를, summaryRows 가 있으면 tfoot 에 단위를 붙여 렌더한다', () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey="period"
        caption="기간별 방문자"
        empty="데이터가 없어요."
      />,
    );
    expect(screen.getByText('데이터가 없어요.')).not.toBeNull();
    unmount();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey="period"
        summaryRows={[{ period: '합계', visitors: 1200 }]}
        caption="기간별 방문자"
      />,
    );
    expect(screen.getByRole('cell', { name: '1,200명' })).not.toBeNull();
  });
});

describe('DataTable — 계약 columns.unitInBody', () => {
  it('DataTable: unitInBody=true 인 컬럼은 본문 셀에도 단위를 붙인다 (대시보드 매출액의 "원")', () => {
    const withUnitInBody = [
      { key: 'period', label: '기간', align: 'left' as const },
      { key: 'revenue', label: '매출액', unit: '원', unitInBody: true },
    ];

    render(
      <DataTable
        columns={withUnitInBody}
        rows={[{ period: '1월', revenue: 1230000 }]}
        rowKey="period"
        summaryRows={[{ period: '합계', revenue: 1230000 }]}
        caption="기간별 매출"
      />,
    );

    // 본문 + 요약 두 셀 모두 단위가 붙는다
    expect(screen.getAllByRole('cell', { name: '1,230,000원' })).toHaveLength(2);
  });

  it('DataTable: unitInBody 기본값(false)이면 단위는 요약 행에만 붙는다 (현행 동작 유지)', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ period: '1월', visitors: 1200 }]}
        rowKey="period"
        summaryRows={[{ period: '합계', visitors: 1200 }]}
        caption="기간별 방문자"
      />,
    );

    expect(screen.getByRole('cell', { name: '1,200' })).not.toBeNull();
    expect(screen.getByRole('cell', { name: '1,200명' })).not.toBeNull();
  });
});
