// ConversationsPage — 대화 목록 (라우트: /ai/conversations)
//
// [무엇을 보여주나] 지금까지의 대화를 최근 갱신 순으로 보여주고, 열거나 지운다.
//
// [대화는 저장되지 않는다] 새로고침하면 사라진다 — 서버가 없기 때문이다. 이 사실을 화면이
// 문구로 밝힌다. 밝히지 않으면 관리자는 대화가 보관된다고 믿고, 다음 날 없어진 것을 결함으로
// 본다 (없는 기능을 있는 것처럼 보이게 하지 않는다 — FEEDBACK-03).
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import './ai.css';
import { isAbort } from '../../shared/async';
import { useRouteCan, WRITE_DENIED } from '../../shared/permissions/RequirePermission';
import { Alert, Button, Card, ConfirmDialog, Empty, useToast } from '../../shared/ui';
import { useConversationsQuery, useDeleteConversations } from './queries';
import { cssVar } from '@tds/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderBottom: `thin solid ${cssVar('color.border.subtle')}`,
};

const titleCellStyle: CSSProperties = { flexGrow: 1, minWidth: 0 };

const mutedStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/**
 * 갱신 시각 — **현지 시각**으로 보여준다.
 *
 * 저장된 값은 UTC ISO 다. 문자열을 잘라 쓰면 한국 시간 오전에 만든 대화가 전날 밤으로 보인다
 * (좌측 기록의 '오늘/이전' 묶기와 같은 함정 — ConversationRail 의 isToday 주석 참조).
 */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const date = `${String(at.getFullYear())}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}

export default function ConversationsPage() {
  const conversations = useConversationsQuery();
  const remove = useDeleteConversations();
  const toast = useToast();
  const [confirming, setConfirming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * [EXC-03] 이 화면의 쓰기는 삭제 하나뿐이다 — 대화는 채팅 화면에서 생기고, 여기서 고치지 않는다.
   * 그래서 remove 만 묻는다. 판정 하나가 버튼의 존재와 삭제 요청의 거절을 함께 정한다.
   */
  const canRemove = useRouteCan('remove');

  const items = conversations.data ?? [];
  const firstLoading = conversations.isFetching && conversations.data === undefined;

  const confirmDelete = (): void => {
    const id = confirming;
    if (id === null) return;
    // 버튼을 없앤 술어가 삭제 경로도 막는다 — 거절은 침묵이 아니다 (EXC-03)
    if (!canRemove) {
      setConfirming(null);
      toast.error(WRITE_DENIED.remove);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    remove.mutate(
      { ids: [id], signal: controller.signal },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.success('대화를 삭제했어요.');
        },
        onError: (error) => {
          if (isAbort(error)) return;
          setConfirming(null);
          // 실패 토스트는 자동으로 사라지지 않는다 — 재시도 경로를 함께 준다
          toast.error('대화를 삭제하지 못했어요.', { retry: confirmDelete });
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      {/*
        제목(<h1>)은 여기서 그리지 않는다 — 이 화면은 nav 잎이라 AppHeader 가 findNavLabel 로
        이미 h1 을 그린다. 여기서 또 그리면 한 화면에 h1 이 둘이 되어 스크린리더가 화면 이름을
        두 번 읽는다(폼 화면만 자기 h1 을 갖는다 — 그쪽은 nav 잎이 아니다).
      */}
      <div style={headerRowStyle}>
        <span style={{ flexGrow: 1 }} />
        <Link to="/ai/chat">
          <Button type="button" size="sm" variant="primary">
            새 채팅
          </Button>
        </Link>
      </div>

      <Alert tone="info">
        대화는 브라우저 메모리에만 있어요 — 새로고침하면 사라져요. 보관은 백엔드 연동 후 가능해요.
      </Alert>

      {conversations.isError ? (
        <Alert tone="danger">대화 목록을 불러오지 못했어요.</Alert>
      ) : firstLoading ? (
        <p style={mutedStyle}>불러오는 중…</p>
      ) : items.length === 0 ? (
        <Empty
          label="대화"
          createVerb="시작"
          action={
            <Link to="/ai/chat">
              <Button type="button" size="sm" variant="primary">
                새 채팅 시작
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <ul style={listStyle}>
            {items.map((conversation) => (
              <li key={conversation.id} style={rowStyle}>
                <span style={titleCellStyle}>
                  <Link to={`/ai/chat?c=${conversation.id}`}>{conversation.title}</Link>
                </span>
                <span style={mutedStyle}>{`${String(conversation.messages.length)}개 메시지`}</span>
                <span style={mutedStyle}>{formatWhen(conversation.updatedAtIso)}</span>
                {canRemove && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfirming(conversation.id);
                    }}
                  >
                    삭제
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 열려 있을 때만 렌더한다 — 이 다이얼로그에는 open 프롭이 없다(존재 = 열림) */}
      {confirming === null ? null : (
        <ConfirmDialog
          title="대화를 삭제할까요?"
          message="삭제한 대화는 되돌릴 수 없어요."
          intent="delete"
          busy={remove.isPending}
          onConfirm={confirmDelete}
          onCancel={() => {
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}
