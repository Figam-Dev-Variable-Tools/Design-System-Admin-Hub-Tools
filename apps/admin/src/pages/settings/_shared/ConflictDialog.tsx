// 동시 편집 충돌 다이얼로그 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [언제 뜨는가] 내가 화면을 연 뒤 다른 관리자가 같은 설정을 먼저 저장했을 때(409 · EXC-04).
//
// [왜 ConfirmDialog 가 아닌가] ConfirmDialog 는 '확인/취소' 이지선다다. 충돌은 **세 갈래**다:
//   ① 최신 내용으로 다시 불러온다 (내 입력을 버린다)
//   ② 내 변경으로 덮어쓴다        (상대 변경을 버린다)
//   ③ 아무것도 하지 않고 닫는다   (그대로 두고 생각한다)
// 이지선다 컴포넌트에 억지로 끼우면 어느 버튼이 무엇을 버리는지 흐려진다 — 파괴적 선택일수록
// 라벨이 결과를 말해야 한다. 그래서 DS Modal 위에 이 화면의 3-액션 푸터를 얹는다.
//
// [입력을 버리지 않는다] 이 다이얼로그가 뜬 동안 폼은 그대로 살아 있다 — 사용자가 고르기 전에는
// 아무것도 사라지지 않는다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { Alert, Button, Modal } from '../../../shared/ui';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const textStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const listStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.4'),
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const auditStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface ConflictDialogProps {
  /** 무엇의 충돌인가 — 예: '사이트 설정' */
  readonly subject: string;
  /** 상대가 먼저 저장한 사실 — '누가 언제' */
  readonly latestBy: string;
  readonly latestAt: string;
  /** 내 입력과 최신 값이 갈린 항목의 라벨. 빈 배열이면 목록을 그리지 않는다 */
  readonly divergedFields: readonly string[];
  /** 덮어쓰기 진행 중 — 두 액션 버튼을 잠근다 */
  readonly busy: boolean;
  /** 덮어쓰기 실패 — 다이얼로그 안 danger 배너. 재클릭이 곧 재시도다 */
  readonly error: string | null;
  readonly onReload: () => void;
  readonly onOverwrite: () => void;
  readonly onClose: () => void;
}

export function ConflictDialog({
  subject,
  latestBy,
  latestAt,
  divergedFields,
  busy,
  error,
  onReload,
  onOverwrite,
  onClose,
}: ConflictDialogProps) {
  // 본문 id — Modal 의 aria-describedby 로 연결해 open 시 제목뿐 아니라 '무슨 충돌인지' 까지 읽힌다 (A11Y-02)
  const messageId = useId();

  return (
    <Modal
      title={`${subject}이 이미 변경되었습니다`}
      describedBy={messageId}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onReload}>
            최신 내용 불러오기
          </Button>
          <Button variant="danger" disabled={busy} aria-busy={busy} onClick={onOverwrite}>
            {busy ? '처리 중…' : '내 변경으로 덮어쓰기'}
          </Button>
        </>
      }
    >
      <div style={bodyStyle}>
        <p id={messageId} style={textStyle}>
          내가 이 화면을 연 뒤에 다른 관리자가 {subject}을 저장했습니다. 그대로 저장하면 그 변경이
          사라집니다.
        </p>
        <p style={auditStyle}>
          마지막 저장: {latestBy} · {latestAt}
        </p>

        {divergedFields.length > 0 && (
          <>
            <p style={textStyle}>값이 달라진 항목</p>
            <ul style={listStyle}>
              {divergedFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </>
        )}

        <p style={auditStyle}>
          ‘최신 내용 불러오기’ 를 고르면 입력한 내용이 최신 값으로 바뀝니다. ‘덮어쓰기’ 를 고르면
          다른 관리자의 변경이 사라집니다.
        </p>

        {error !== null && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}
