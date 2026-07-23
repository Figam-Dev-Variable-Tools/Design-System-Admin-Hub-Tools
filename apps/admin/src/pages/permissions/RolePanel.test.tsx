// 역할 삭제 버튼 — 막힌 이유를 버튼 자신이 말한다
//
// [무엇을 지키나] 삭제가 막혔다는 사실을 **비활성 상태와 회색으로만** 전달하면, 그것은 고장으로
// 읽힌다(스크린리더에는 그냥 눌리지 않는 버튼이다). 상품·고객센터 카테고리 삭제 버튼이 이미
// `aria-label`/`title` 에 사유를 싣는 관용구를 갖고 있고, 역할 삭제도 같은 자리에 사유를 단다.
//
// [왜 화면 테스트가 따로 필요한가] 저장소는 거절을 보장하지만(permission-store.test.ts), 그것은
// **누른 뒤**의 이야기다. 이 테스트는 누르기 전에 이유가 보이는지를 본다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { createMatrix } from '../../shared/permissions/resources';
import { createSuperAdminRole } from '../../shared/permissions/roles';
import type { Role } from '../../shared/permissions/roles';
import { RolePanel } from './components/RolePanel';

const SUPER = createSuperAdminRole();
const OPS: Role = {
  id: 'role-ops',
  name: '운영자',
  system: false,
  scope: 'all',
  permissions: createMatrix(false),
  widgets: createWidgets(false),
};

function renderPanel(
  assigneeCounts: Readonly<Record<string, number | null>>,
  can: { readonly create: boolean; readonly update: boolean; readonly remove: boolean } = {
    create: true,
    update: true,
    remove: true,
  },
) {
  render(
    <RolePanel
      roles={[SUPER, OPS]}
      selectedRoleId={OPS.id}
      activeRoleId={OPS.id}
      assigneeCounts={assigneeCounts}
      systemReasonId="system-reason"
      canCreate={can.create}
      canUpdate={can.update}
      canRemove={can.remove}
      onSelect={() => undefined}
      onCreate={() => undefined}
      onRename={() => undefined}
      onDelete={() => undefined}
    />,
  );
}

describe('RolePanel — 배정된 역할의 삭제 버튼', () => {
  it('배정된 운영자가 있으면 버튼이 잠기고 이름이 그 이유를 말한다', () => {
    renderPanel({ [OPS.id]: 2 });

    // 접근 가능한 이름이 곧 사유다 — '삭제' 라는 이름의 버튼은 이제 존재하지 않는다
    const button = screen.getByRole('button', { name: /운영자가 2명 있어 삭제할 수 없어요/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    // 마우스 사용자에게도 같은 문장이 닿는다
    expect(button.getAttribute('title')).toContain('2명');
  });

  it('배정된 운영자가 0명이면 그냥 삭제 버튼이다', () => {
    renderPanel({ [OPS.id]: 0 });

    const button = screen.getByRole('button', { name: '삭제' });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('배정 인원을 확인할 수 없으면 잠근다 — 모르는 채로 지우게 두지 않는다', () => {
    renderPanel({ [OPS.id]: null });

    const button = screen.getByRole('button', { name: /확인하지 못해 삭제할 수 없어요/ });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});

/**
 * 권한이 없을 때는 **비활성이 아니라 부재**다 (B2 명세 §9.3).
 *
 * 두 축을 섞지 않는 것이 요점이다: 위 describe 의 '잠긴 삭제 버튼' 은 *권한은 있는데 이 대상에는
 * 못 한다* 는 뜻이고, 여기는 *그 일 자체가 내 것이 아니다* 는 뜻이다. 앞의 것은 버튼이 남아
 * 사유를 말하고, 뒤의 것은 버튼이 사라진다.
 */
describe('RolePanel — 쓰기 권한이 없으면 그 버튼이 존재하지 않는다', () => {
  it('세 권한이 다 없으면 추가·수정·삭제 버튼이 전부 없다', () => {
    renderPanel({ [OPS.id]: 0 }, { create: false, update: false, remove: false });

    expect(screen.queryByRole('button', { name: '추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
    // 탐침 — 패널 자체는 그려졌다(단언이 빈 화면 위에서 헛돌지 않는다)
    expect(screen.queryByRole('navigation', { name: '역할 목록' })).not.toBeNull();
  });

  it('권한이 있으면 셋 다 보인다 — 위 단언이 헛돌지 않는다는 증거', () => {
    renderPanel({ [OPS.id]: 0 });

    expect(screen.queryByRole('button', { name: '추가' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeNull();
  });

  it('축은 각각 독립이다 — 등록만 있으면 추가만 남는다', () => {
    renderPanel({ [OPS.id]: 0 }, { create: true, update: false, remove: false });

    expect(screen.queryByRole('button', { name: '추가' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });
});
