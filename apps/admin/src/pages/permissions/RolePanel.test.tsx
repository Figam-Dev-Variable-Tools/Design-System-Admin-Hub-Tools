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

function renderPanel(assigneeCounts: Readonly<Record<string, number | null>>) {
  render(
    <RolePanel
      roles={[SUPER, OPS]}
      selectedRoleId={OPS.id}
      activeRoleId={OPS.id}
      assigneeCounts={assigneeCounts}
      systemReasonId="system-reason"
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
    const button = screen.getByRole('button', { name: /운영자가 2명 있어 삭제할 수 없습니다/ });
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

    const button = screen.getByRole('button', { name: /확인하지 못해 삭제할 수 없습니다/ });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
