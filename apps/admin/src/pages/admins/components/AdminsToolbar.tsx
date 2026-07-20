// 운영진 목록 상단 줄 — 탭 + '운영자 등록' CTA
//
// [왜 떼어 냈나] 목록 화면(AdminsPage)은 이미 조회·검색·그룹 만들기·그룹 지우기라는 네 흐름을
// 지휘한다. 거기에 '권한이 있으면 버튼을 그린다' 라는 분기를 더하면 한 함수의 복잡도가 상한을
// 넘는다(클린코드 점검 축4). 이 줄은 상태를 갖지 않으므로 값과 콜백만 받는다.
import type { CSSProperties } from 'react';
import { cssVar, Tabs } from '@tds/ui';

import { Button, Icon } from '../../../shared/ui';
import { ADMIN_TABS } from '../types';

/** 탭 줄 오른쪽 끝에 등록 CTA 를 세운다 — 좁은 화면에서는 아래로 접힌다 */
const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

interface AdminsToolbarProps {
  readonly tab: string;
  readonly onTabChange: (id: string) => void;
  /** 등록 권한 — 없으면 버튼을 **그리지 않는다**(비활성이 아니다) */
  readonly canCreate: boolean;
  readonly onCreate: () => void;
}

export function AdminsToolbar({ tab, onTabChange, canCreate, onCreate }: AdminsToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <Tabs value={tab} items={ADMIN_TABS} ariaLabel="관리자 관리 영역" onChange={onTabChange} />

      {/* 누를 수 없는 것은 보여 주지 않는다 (EXC-03) — 상품 목록이 같은 패턴을 쓴다 */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={onCreate}>
          <Icon name="plus-circle" />
          운영자 등록
        </Button>
      )}
    </div>
  );
}
