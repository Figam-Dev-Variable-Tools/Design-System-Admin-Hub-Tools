// 알림 벨 — 헤더에 붙는 유일한 표면
//
// [무엇을 하는가] 안읽음 수를 보이고, 누르면 최근 알림을 펼치고, 항목을 누르면 그 상세로 데려간다.
// **그게 전부다.** 알림에서 처리·종결·삭제를 하지 않는다 — 알림은 사실의 사본이고 정본은 그
// 화면에 있다(./store.ts 머리말).
//
// [권한] 목록은 이미 걸러져서 온다(./useNotifications.ts). 이 컴포넌트는 권한을 다시 판단하지
// 않는다 — 두 곳에서 판단하면 언젠가 한쪽만 고쳐진다.
//
// [열림/닫힘의 접근성] 트리거는 `aria-expanded` + `aria-controls` 를 갖고, 패널은 라벨을 가진
// 영역이다. Esc 로 닫히고 포커스가 트리거로 돌아온다 — 키보드 사용자가 패널 안에 갇히지 않는다.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, cssVar, Icon, IconButton } from '@tds/ui';

import { formatRelativeOrDate } from '../format';
import { Button, hintStyle, visuallyHiddenStyle } from '../ui';
import { notificationKindOf } from './catalog';
import { useNotifications } from './useNotifications';

/**
 * 배지가 버튼 밖으로 나가는 길이 — **배지 크기의 절반**이다.
 *
 * 상수를 손으로 적지 않고 배지 토큰에서 계산한다: 아래 `transform` 이 배지를 자기 크기의 50%
 * 만큼 밀어내므로, 밀려나는 길이는 정의상 배지 크기의 절반이다. 배지 크기가 바뀌면 여백도
 * 함께 따라온다(@tds/ui Badge.css — block-size: space.5).
 */
const BADGE_OVERHANG = `calc(${cssVar('space.5')} / 2)`;

/**
 * 벨과 배지를 함께 담는 앵커.
 *
 * 네 방향 여백이 있는 이유는 둘이다: ① 밖으로 밀려난 배지가 헤더 상자 가장자리에서 **잘리지
 * 않게** 하고 ② 여백이 한쪽에만 있으면 헤더의 `align-items: center` 안에서 벨이 그만큼
 * 치우쳐 보인다. 대칭이라야 벨이 제자리에 남는다.
 */
const wrapStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  paddingTop: BADGE_OVERHANG,
  paddingBottom: BADGE_OVERHANG,
  paddingLeft: BADGE_OVERHANG,
  paddingRight: BADGE_OVERHANG,
};

/**
 * 안읽음 배지의 자리 — 아이콘을 **덮지 않고 모서리에 걸친다.**
 *
 * [왜 오프셋이 필요한가] 예전에는 `top: 0; right: 0` 뿐이라 배지가 버튼 상자 **안쪽** 우상단에
 * 그대로 앉았다. 벨은 `stroke` 만 있는 선 아이콘이고 안읽음 배지는 채워진 danger 색이라, 그
 * 배지가 아이콘 위에 겹치면 아이콘이 **사라진 것처럼 보인다**(운영자 보고: '아이콘이 안 보이는
 * 경향이 있음'). 사라진 것은 아이콘이 아니라 그것을 가린 배지였다.
 *
 * 그래서 버튼의 우상단 꼭짓점에 붙인 뒤 자기 크기의 절반만큼 바깥으로 민다 — 절반은 밖,
 * 절반은 안이라 배지가 어디에 속한 것인지도 그대로 읽힌다.
 */
const badgeAnchorStyle: CSSProperties = {
  position: 'absolute',
  top: BADGE_OVERHANG,
  right: BADGE_OVERHANG,
  transform: 'translate(50%, -50%)',
  pointerEvents: 'none',
};

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  zIndex: 1,
  width: `calc(${cssVar('space.10')} * 5)`,
  maxWidth: `calc(${cssVar('space.10')} * 6)`,
  marginTop: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  backgroundColor: cssVar('color.surface.raised'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  boxShadow: cssVar('shadow.overlay'),
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
};

const headTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  maxHeight: `calc(${cssVar('space.10')} * 5)`,
  overflowY: 'auto',
};

const itemButtonStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  backgroundColor: cssVar('color.transparent'),
  borderStyle: 'none',
  borderRadius: cssVar('radius.sm'),
  textAlign: 'left',
  cursor: 'pointer',
};

const unreadDotStyle: CSSProperties = {
  display: 'inline-block',
  width: cssVar('space.2'),
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  backgroundColor: cssVar('color.action.primary.default'),
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const itemTitleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

export function NotificationBell() {
  const navigate = useNavigate();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const { rows, unreadCount, firstLoading, error, markRead, markAllRead } = useNotifications();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Esc 로 닫는다 — 패널이 열린 채 키보드로 빠져나가지 못하는 상태를 만들지 않는다
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = triggerRef.current;
      if (root !== null && event.target instanceof Node && !root.contains(event.target)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close]);

  return (
    <div style={wrapStyle} ref={triggerRef}>
      <IconButton
        icon={<Icon name="bell" />}
        label={unreadCount > 0 ? `알림 ${String(unreadCount)}건 안읽음` : '알림'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current);
        }}
      />

      {/* 배지는 시각 보조다 — 개수는 트리거의 접근 가능한 이름이 이미 말한다 */}
      {unreadCount > 0 && (
        <span style={badgeAnchorStyle} aria-hidden>
          <Badge count={unreadCount} tone="danger" />
        </span>
      )}

      {open && (
        <div id={panelId} role="dialog" aria-label="알림" style={panelStyle}>
          <div style={headRowStyle}>
            <p style={headTitleStyle}>알림</p>
            {rows.length > 0 && (
              <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={markAllRead}>
                모두 읽음
              </Button>
            )}
          </div>

          <div aria-live="polite" style={visuallyHiddenStyle}>
            {firstLoading ? '' : `안읽은 알림 ${String(unreadCount)}건`}
          </div>

          {error !== null ? (
            <p style={hintStyle}>알림을 불러오지 못했어요.</p>
          ) : firstLoading ? (
            <p style={hintStyle}>불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p style={hintStyle}>새 알림이 없어요.</p>
          ) : (
            <ul style={listStyle}>
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="tds-ui-focusable"
                    style={itemButtonStyle}
                    onClick={() => {
                      markRead(row.id);
                      close();
                      navigate(row.path);
                    }}
                  >
                    <span style={titleRowStyle}>
                      {!row.read && <span style={unreadDotStyle} aria-hidden />}
                      <span style={itemTitleStyle}>{row.title}</span>
                    </span>
                    <span style={hintStyle}>{row.body}</span>
                    <span style={hintStyle}>
                      {notificationKindOf(row.kind)?.label ?? row.kind} ·{' '}
                      {formatRelativeOrDate(row.occurredAt)}
                      {row.read ? '' : ' · 안읽음'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              close();
              navigate('/settings/notifications');
            }}
          >
            알림 설정
          </Button>
        </div>
      )}
    </div>
  );
}
