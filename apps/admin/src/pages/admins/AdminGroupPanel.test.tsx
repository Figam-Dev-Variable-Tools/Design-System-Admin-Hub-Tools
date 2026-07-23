// 운영진 그룹 패널 — 그룹 만들기·그룹 삭제는 쓰기 권한을 탄다 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면은 운영자 등록 CTA 만 게이팅돼 있었고, 좌측 패널의 **그룹 만들기·그룹 삭제**는
// 조회 권한만으로 눌렸다. 그중 삭제가 이 화면에서 가장 넓게 번진다: 운영진 그룹은 메시지
// 템플릿의 '발신 프로필' 과 같은 실체라(shared/domain/admin-group.ts) 지우면 **등록된
// 발신번호·발신 이메일까지 함께 사라진다.**
//
// [두 종류의 '못 함' 을 섞지 않는다]
//   · disabled 삭제 버튼 = 권한은 있는데 **지금 고른 것이 그룹이 아니다**('전체 운영자') ·
//     참조 현황 확인 중. 그래서 버튼이 남아 라벨로 사정을 말한다.
//   · 권한 없음      = 그 일 자체가 내 것이 아니다. 그래서 버튼이 **사라진다**(B2 §9.3).
// 이 둘을 한 단언으로 뭉치면 '아무나 못 누른다' 만 지키고 어느 쪽 이유인지는 뒤바뀌어도 통과한다.
// ─────────────────────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AdminGroupPanel } from './components/AdminGroupPanel';
import { GROUP_ALL } from './types';
import type { AdminGroup } from './types';

const GROUPS: readonly AdminGroup[] = [
  { id: 'ag-1', name: '콘텐츠', phoneNumbers: [], emails: [], usableAsSender: true },
];

interface Can {
  readonly create: boolean;
  readonly remove: boolean;
}

const ALL: Can = { create: true, remove: true };

function renderPanel(value: string, can: Can = ALL) {
  render(
    <MemoryRouter>
      <AdminGroupPanel
        value={value}
        groups={GROUPS}
        counts={{ 'ag-1': 2 }}
        totalAll={5}
        checkingDeletion={false}
        canCreate={can.create}
        canRemove={can.remove}
        onChange={() => undefined}
        onCreate={() => undefined}
        onDelete={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe('AdminGroupPanel — 쓰기 권한이 없으면 그 버튼이 존재하지 않는다', () => {
  it('둘 다 없으면 그룹 만들기·그룹 삭제가 모두 사라진다', () => {
    renderPanel('ag-1', { create: false, remove: false });

    expect(screen.queryByRole('button', { name: '+ 새 그룹 만들기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /그룹 삭제/ })).toBeNull();
    // 탐침 — 필터 자체는 그려졌다(단언이 빈 화면 위에서 헛돌지 않는다)
    expect(screen.queryByRole('navigation', { name: '운영진 그룹 필터' })).not.toBeNull();
  });

  it('둘 다 있으면 둘 다 보인다 — 위 단언이 헛돌지 않는다는 증거', () => {
    renderPanel('ag-1');

    expect(screen.queryByRole('button', { name: '+ 새 그룹 만들기' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: "'콘텐츠' 그룹 삭제" })).not.toBeNull();
  });

  it('축은 각각 독립이다 — create 만 있으면 만들기만 남는다', () => {
    renderPanel('ag-1', { create: true, remove: false });

    expect(screen.queryByRole('button', { name: '+ 새 그룹 만들기' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /그룹 삭제/ })).toBeNull();
  });

  /**
   * 권한이 있는데도 못 누르는 경우 — 버튼은 남고 라벨이 사정을 말한다.
   * 이것이 남아 있어야 위 '부재' 단언들이 **권한 축**을 지킨다는 것이 증명된다.
   */
  it("권한이 있고 '전체 운영자' 를 고른 상태면 삭제 버튼은 남되 잠긴다", () => {
    renderPanel(GROUP_ALL);

    const button = screen.getByRole('button', { name: '그룹 삭제' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
