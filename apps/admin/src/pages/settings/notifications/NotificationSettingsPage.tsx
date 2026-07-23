// NotificationSettingsPage — 알림 설정 (라우트: /settings/notifications) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 하는 일은 하나다 ────────────────────────────────────────────────┐
// │ 알림 종류마다 **받을지 말지**를 정한다. 종류를 만들거나 문구를 고치는 자리가    │
// │ 아니다 — 종류는 코드가 아는 사실이고, 상수 카탈로그가 정본이다                │
// │ (shared/notifications/catalog.ts). 운영자가 알림 종류를 발명하기 시작하면      │
// │ 같은 사건이 세 이름으로 쌓이고, '문의 알림만 끄기' 같은 설정은 만들 수 없게 된다. │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [끈 알림은 만들어지지도 않는다] 목록에서 감추는 것이 아니라 애초에 넣지 않는다 — 감추기만
// 하면 안읽음 수는 계속 오르고, 벨에 점이 떠 있는데 열면 아무것도 없는 상태가 된다.
//
// [권한이 우선한다] 여기서 켜 두어도 그 화면의 조회 권한이 없으면 알림은 오지 않는다.
// 수신 설정은 '보고 싶은가' 이고 권한은 '볼 수 있는가' 다 — 순서가 바뀌면 알림이 권한
// 우회로가 된다(useNotifications.ts).
//
// [데이터] 문서의 정본은 알림 층에 있다(shared/notifications/preferences.ts). 이 화면은 그것을
// 편집하는 한 표면일 뿐이라 자기 저장소를 갖지 않는다.
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cssVar, Skeleton, StatusBadge, ToggleSwitch } from '@tds/ui';

import { Alert, Button, Card, CardTitle, hintStyle, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  normalizePrefs,
  notificationPrefsKey,
  notificationPrefsStore,
  NOTIFICATION_KINDS,
  prefsSaveBlock,
} from '../../../shared/notifications';
import type { NotificationPrefs } from '../../../shared/notifications';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

// 토글은 설명 블록(제목 · 설명 · 이동 위치 세 줄)의 **세로 가운데**에 선다.
// flex-start 로 두면 토글이 첫 줄 높이에 붙어, 설명이 길수록 위로 치우쳐 보인다.
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: 0,
  paddingRight: 0,
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.subtle'),
};

const infoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 초안이 서버 값과 다른가 — 파생값이므로 저장하지 않는다 */
function keyOf(prefs: NotificationPrefs): string {
  return NOTIFICATION_KINDS.map((kind) => `${kind.id}:${String(prefs[kind.id])}`).join('|');
}

export default function NotificationSettingsPage() {
  const { canUpdate } = useRouteWritePermissions();
  const toast = useToast();
  const client = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: notificationPrefsKey,
    queryFn: ({ signal }) => notificationPrefsStore.fetch(signal),
  });

  const server = normalizePrefs(prefsQuery.data?.kinds);
  const serverKey = keyOf(server);

  const [draft, setDraft] = useState<NotificationPrefs>(server);
  const [baseline, setBaseline] = useState(serverKey);

  // 서버 값이 바뀌면(재조회) 초안을 그 위에서 다시 시작한다 (렌더 중 동기화 — useEffect 불필요)
  if (baseline !== serverKey) {
    setBaseline(serverKey);
    setDraft(server);
  }

  const save = useMutation({
    mutationFn: (kinds: NotificationPrefs) => notificationPrefsStore.save({ kinds }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: notificationPrefsKey });
      toast.success('알림 설정을 저장했어요.');
    },
    onError: () => {
      toast.error('알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });

  const loading = prefsQuery.isFetching && prefsQuery.data === undefined;
  const dirty = keyOf(draft) !== serverKey;
  const offCount = NOTIFICATION_KINDS.filter((kind) => !draft[kind.id]).length;

  /**
   * 저장을 막는 이유 — 없으면 null (shared/notifications/preferences.ts).
   *
   * 문서를 못 읽은 채로 저장하면 화면에 그려진 기본값(전부 받음)이 실제 설정을 덮어, 운영자가
   * 꺼 둔 종류가 조용히 켜진다. 토글의 잠금 · 저장 버튼의 잠금 · 배너 문구가 **같은 술어**를
   * 읽는다 — 이유를 말하지 않는 disabled 는 '고장' 으로 보인다.
   */
  const saveBlock = prefsSaveBlock(prefsQuery.data);

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        어떤 일이 일어났을 때 헤더의 알림 벨에 표시할지 정해요. 끈 종류는 목록에서 감추는 것이
        아니라 <strong>애초에 만들지 않아요</strong>.
      </p>

      {prefsQuery.error !== null && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            {/* 실패 사실만 말하고 끝내지 않는다 — 그 상태의 저장이 무엇을 덮는지까지 말한다.
                한 번이라도 읽은 뒤의 재조회 실패라면(saveBlock === null) 화면의 값은 진짜이므로
                저장을 막지 않고, 문구도 그 사실에 맞춘다 */}
            <span>
              {saveBlock ??
                '알림 설정을 새로 불러오지 못했어요. 아래는 마지막으로 읽은 설정이에요.'}
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                void prefsQuery.refetch();
              }}
            >
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      <Card>
        <CardTitle>알림 종류</CardTitle>

        <p style={hintStyle}>
          여기서 켜 두어도 그 화면의 조회 권한이 없으면 알림은 오지 않아요 — 알림이 권한 우회로가
          되지 않도록 권한이 언제나 먼저예요.
        </p>

        {!canUpdate && <Alert tone="info">조회 권한만 있어 알림 설정을 변경할 수 없어요.</Alert>}
        {offCount > 0 && (
          <Alert tone="warning">
            {offCount}개 종류를 받지 않도록 설정했어요. 그 사건들은 목록을 직접 새로고침해야 알 수
            있어요.
          </Alert>
        )}

        {loading ? (
          <div aria-busy="true" aria-label="알림 설정을 불러오는 중">
            <Skeleton />
          </div>
        ) : (
          NOTIFICATION_KINDS.map((kind) => (
            <div key={kind.id} style={rowStyle}>
              <div style={infoStyle}>
                <span style={titleRowStyle}>
                  <span style={labelStyle}>{kind.label}</span>
                  {kind.severity === 'warning' && <StatusBadge tone="warning" label="기한 경고" />}
                </span>
                <span style={hintStyle}>{kind.description}</span>
                <span style={hintStyle}>이동 위치: {kind.leafPath}</span>
              </div>

              <ToggleSwitch
                checked={draft[kind.id]}
                label={`${kind.label} 알림 받기`}
                onLabel="받음"
                offLabel="받지 않음"
                // 못 읽은 설정을 만지게 두면 '내가 방금 껐다' 는 기억만 남고 저장은 막힌다
                disabled={!canUpdate || save.isPending || loading || saveBlock !== null}
                onChange={(next) => {
                  setDraft((current) => ({ ...current, [kind.id]: next }));
                }}
              />
            </div>
          ))
        )}

        {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 (EXC-03) */}
        {canUpdate && (
          <div style={actionsStyle}>
            <p style={hintStyle}>
              {save.isPending
                ? '저장하는 중이에요…'
                : saveBlock !== null
                  ? '설정을 불러오지 못해 저장할 수 없어요.'
                  : dirty
                    ? '저장하지 않은 변경 사항이 있어요.'
                    : '변경 사항이 없어요.'}
            </p>
            <Button
              variant="primary"
              size="md"
              disabled={!dirty || save.isPending || loading || saveBlock !== null}
              onClick={() => {
                // 버튼의 잠금과 같은 술어를 한 번 더 읽는다 — Enter·재렌더 틈으로 들어온 클릭도
                // 여기서 멈춘다. 모르는 값을 '켜짐' 으로 덮는 저장은 어느 경로로도 나가지 않는다
                if (prefsSaveBlock(prefsQuery.data) !== null) return;
                save.mutate(draft);
              }}
            >
              {save.isPending ? '저장 중…' : '저장'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
