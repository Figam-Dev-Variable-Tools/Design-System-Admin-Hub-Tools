// 운영자 상세의 읽기 카드 3장 — 기본 정보 · 소속·권한 · 관리자 메모
//
// [왜 상세 화면에서 떼어 냈나] AdminDetailPage 가 하는 일은 둘이다: 조회·삭제라는 **흐름**을
// 지휘하는 것과, 받은 값을 **그려 내는** 것. 뒤엣것은 분기가 값마다 하나씩 늘어나는 종류라
// (빈 값이면 '—', 없는 역할이면 안내문, 빈 메모면 빈 상태) 한 함수에 두면 흐름 쪽 분기와
// 뒤섞여 복잡도가 상한을 넘는다(클린코드 점검 축4). 그리는 쪽은 상태를 갖지 않으므로 값만 받는다.
//
// 값을 받아 그리기만 한다 — 조회도 뮤테이션도 여기서 하지 않는다.
import type { CSSProperties } from 'react';

import type { Role } from '../../../shared/permissions/roles';
import {
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  hintStyle,
  inlineBadgeRowStyle,
  StatusBadge,
} from '../../../shared/ui';
import type { AdminUser } from '../types';
import { cssVar } from '@tds/ui';

/** 값이 비어 있을 때의 표기 — 빈 칸과 '없음' 은 다른 사실이라 기호로 통일한다 */
const EMPTY_MARK = '—';

/**
 * 메모는 운영자가 자유롭게 쓰는 칸이라 **길 수 있다**(대량 축).
 * 줄바꿈을 보존하되 긴 단어에서 카드를 밀지 않도록 강제로 접는다.
 */
const memoStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  color: cssVar('color.text.default'),
};

const orDash = (value: string): string => (value.trim() === '' ? EMPTY_MARK : value);

interface AdminProfileCardsProps {
  readonly admin: AdminUser;
  /** 배정된 역할 — 권한 목록에서 찾지 못하면 null(지어내지 않는다) */
  readonly role: Role | null;
  /** 이 레코드가 지금 로그인한 본인인가 — 배지 한 줄로만 쓰인다 */
  readonly isSelf: boolean;
}

export function AdminProfileCards({ admin, role, isSelf }: AdminProfileCardsProps) {
  return (
    <>
      <Card aria-labelledby="admin-basic-title">
        <CardTitle id="admin-basic-title">
          기본 정보
          {isSelf && <StatusBadge tone="info" label="현재 로그인 계정" />}
        </CardTitle>

        <dl style={dlStyle}>
          <dt style={dtStyle}>계정</dt>
          <dd style={ddStyle}>{admin.account}</dd>
          <dt style={dtStyle}>닉네임</dt>
          <dd style={ddStyle}>{admin.nickname}</dd>
          <dt style={dtStyle}>연락처</dt>
          <dd style={ddStyle}>{orDash(admin.phone)}</dd>
          <dt style={dtStyle}>부서</dt>
          <dd style={ddStyle}>{orDash(admin.department)}</dd>
          <dt style={dtStyle}>직급</dt>
          <dd style={ddStyle}>{orDash(admin.position)}</dd>
          <dt style={dtStyle}>가입일</dt>
          <dd style={ddStyle}>{admin.joinedAt}</dd>
        </dl>
      </Card>

      <Card aria-labelledby="admin-access-title">
        <CardTitle id="admin-access-title">소속 · 권한</CardTitle>

        <dl style={dlStyle}>
          {/* 그룹은 운영진 그룹이자 메시지 템플릿의 발신 프로필이다(shared/domain/admin-group.ts) —
              운영자가 그 둘을 같은 것으로 부르므로 상세에서도 한 줄로 밝힌다. */}
          <dt style={dtStyle}>그룹(발신 프로필)</dt>
          <dd style={ddStyle}>{orDash(admin.group)}</dd>
          <dt style={dtStyle}>역할</dt>
          <dd style={ddStyle}>
            {role === null ? (
              EMPTY_MARK
            ) : (
              // 역할 이름 옆 배지 — 감싸지 않으면 '운영자시스템 역할' 로 붙어 읽힌다
              <span style={inlineBadgeRowStyle}>
                {role.name}
                {role.system && <StatusBadge tone="warning" label="시스템 역할" />}
              </span>
            )}
          </dd>
        </dl>

        {/* 없는 역할을 가리키는 상태는 조용히 넘기지 않는다 — 권한이 어떻게 적용되는지 알 수 없다 */}
        {role === null && (
          <p style={hintStyle}>
            배정된 역할을 권한 목록에서 찾을 수 없어요. 역할이 삭제되었을 수 있으니 수정 화면에서
            다시 배정해 주세요.
          </p>
        )}
      </Card>

      <Card aria-labelledby="admin-memo-title">
        <CardTitle id="admin-memo-title">관리자 메모</CardTitle>
        {/* 빈 상태 — 없는 것을 빈 칸으로 두면 '아직 안 불러온 것' 과 구분되지 않는다 */}
        {admin.memo === '' ? (
          <p style={hintStyle}>등록된 메모가 없어요.</p>
        ) : (
          <p style={memoStyle}>{admin.memo}</p>
        )}
      </Card>
    </>
  );
}
