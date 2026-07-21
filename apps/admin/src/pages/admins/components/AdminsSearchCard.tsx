// 운영자 검색 카드 — 돋보기 아이콘 + 입력 + 역할 필터
//
// 회원 관리 툴바(MembersToolbar)와 같은 검색 패턴이다. 다만 운영자 화면에는
// 내보내기 버튼이 없고, 검색은 닉네임·계정을 대상으로 한다.
//
// [역할 필터가 왜 좌측 레일이 아니라 여기인가] 좌측은 이미 운영진 그룹 레일이고, 그 레일은
// 그룹 만들기·지우기 액션까지 쥔 화면의 주 축이다. 역할은 두 번째 축이라 검색과 같은 줄에 둔다
// (상품 목록이 좌측 카테고리 + 툴바 검색을 나눠 쓰는 것과 같은 배치). 고른 값은 URL 이 소유한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Card,
  controlStyle,
  fieldLabelStyle,
  Icon,
  SelectField,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import type { Role } from '../../../shared/permissions/roles';
import { ROLE_ALL } from '../types';
import { cssVar } from '@tds/ui';

/** 검색 + 역할 필터 한 줄 — 좁아지면 역할 필터가 아래로 내려간다 */
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
  // 검색이 남는 폭을 갖고, 역할 필터는 자기 폭만 쓴다
  flexGrow: 1,
  flexBasis: `calc(${cssVar('space.6')} * 8)`,
};

const roleFilterStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/** 입력 안쪽 왼쪽에 겹쳐 놓는 돋보기 — 클릭이 입력으로 통과하도록 pointerEvents 해제 */
const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: cssVar('space.3'),
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
  pointerEvents: 'none',
};

const searchInputStyle: CSSProperties = {
  ...controlStyle(false),
  // 아이콘 폭(1.25em) + 좌우 여백만큼 왼쪽 패딩을 늘린다
  paddingLeft: `calc(${cssVar('space.6')} + ${cssVar('space.3')})`,
};

interface AdminsSearchCardProps {
  readonly keyword: string;
  readonly onKeywordChange: (keyword: string) => void;
  /** 필터에 세울 역할 목록 — 정본은 권한 스토어다(이 화면은 만들지 않는다) */
  readonly roles: readonly Role[];
  /** 지금 걸린 역할 id 또는 ROLE_ALL — 값의 소유자는 URL 이다 */
  readonly roleId: string;
  readonly onRoleChange: (roleId: string) => void;
}

export function AdminsSearchCard({
  keyword,
  onKeywordChange,
  roles,
  roleId,
  onRoleChange,
}: AdminsSearchCardProps) {
  const searchId = useId();
  const roleFilterId = useId();

  return (
    <Card>
      <div style={rowStyle}>
        <div style={searchWrapStyle}>
          <label htmlFor={searchId} style={visuallyHiddenStyle}>
            운영자 닉네임 또는 계정 검색
          </label>
          <span style={searchIconStyle}>
            <Icon name="search" />
          </span>
          <input
            id={searchId}
            type="search"
            className="tds-ui-input tds-ui-focusable"
            style={searchInputStyle}
            placeholder="전체 운영자 검색"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </div>

        <div style={roleFilterStyle}>
          {/* 라벨을 숨기지 않는다 — 이 셀렉트는 '역할' 이라는 값 하나로는 뜻이 서지 않는다
              (선택된 값이 '전체 역할' 이면 무엇의 전체인지 알 수 없다) */}
          <label htmlFor={roleFilterId} style={fieldLabelStyle}>
            역할
          </label>
          <SelectField
            id={roleFilterId}
            value={roleId}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            <option value={ROLE_ALL}>전체 역할</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </Card>
  );
}
