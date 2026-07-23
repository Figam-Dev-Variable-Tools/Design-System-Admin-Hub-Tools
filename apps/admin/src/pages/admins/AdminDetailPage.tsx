// AdminDetailPage — 운영자 상세 (라우트: /users/admins/:id)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 화면이 새로 생긴 이유 — 회원 상세를 재사용하던 것을 끊었다]
// 예전 라우트는 `MemberDetailPage` 에 운영자 조회 함수를 주입해 회원 상세를 그대로 띄웠다.
// 결과는 셋이었다(FS-005 §7 #3·#4):
//   · 운영자에게 '회원 유형: 일반회원' 이 붙고, 적립금·쿠폰·동의정보 카드가 빈 채로 떴다.
//     운영자에게 없는 개념을 0 과 빈 배열로 채워 만든 화면이라 **거짓을 보여 주고 있었다.**
//   · 정작 목록이 이미 갖고 있던 부서·직급은 상세 어디에도 없었다.
//   · ⋯ 메뉴의 삭제·알림이 **회원 어댑터**를 불렀다 — 운영자 id 로 회원 엔드포인트를 때린다.
//     화면을 아낀 대가로 도메인이 섞였고, 그 섞임이 가장 위험한 조작(삭제)에서 터졌다.
//
// [그래서 이 화면이 보여 주는 것] 계정·닉네임·연락처·부서·직급·그룹(발신 프로필)·역할·가입일·메모.
// 등급·적립금·쿠폰·동의는 **없다** — 운영자에게 없는 개념이다.
//
// [삭제는 이 화면의 것이지만, 아무나 아무 때나 지울 수는 없다]
// 자기 자신 삭제 금지 · 마지막 시스템 관리자 보호는 guards.ts 가 순수 함수로 판정하고, 화면은
// 그 사유를 버튼 옆에 그대로 적는다. 최종 거절은 어댑터가 한다(경합 대비 — data-source.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { isAbort } from '../../shared/async';
import { isHttpError, isNotFound } from '../../shared/errors/http-error';
import { usePermissions } from '../../shared/permissions/PermissionProvider';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  pageTitleStyle,
  useToast,
} from '../../shared/ui';
import { AdminProfileCards } from './components/AdminProfileCards';
import { adminDeletionBlock, isCurrentOperator } from './guards';
import { useAdminQuery, useDeleteAdmin } from './queries';
import { useAdminGuardContext } from './useAdminGuardContext';

const LIST_PATH = '/users/admins';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/** 비활성 삭제 버튼의 사유 — 시각뿐 아니라 aria-describedby 로도 읽힌다 */
const blockReasonId = 'admin-delete-block-reason';

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const adminId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const { canUpdate, canRemove } = useRouteWritePermissions();
  const { roles } = usePermissions();

  const detailQuery = useAdminQuery(adminId);
  const admin = detailQuery.data;

  const { context: guardContext, unavailable: guardUnavailable } = useAdminGuardContext();

  const remove = useDeleteAdmin();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  /**
   * 삭제를 막을 이유.
   *
   * 세 상태를 구분한다 — null(막을 이유 없음) · 문장(막힌 이유) · '아직 모름'.
   * 모를 때 버튼을 열어 두면 확인까지 누른 뒤에야 거절되므로, 판정이 설 때까지 잠근다.
   */
  const deletionBlock =
    admin === undefined || guardContext === null ? null : adminDeletionBlock(admin, guardContext);
  const guardPending = admin !== undefined && guardContext === null && !guardUnavailable;
  const blockReason = guardUnavailable
    ? '다른 운영자 명부를 불러오지 못해 삭제 가능 여부를 판단할 수 없어요. 잠시 후 다시 시도해 주세요.'
    : deletionBlock;
  const deletable = admin !== undefined && !guardPending && blockReason === null;

  /** 역할 — 정본은 권한 스토어다. 없는 id 를 가리키면 지어내지 않고 카드가 그렇다고 말한다. */
  const role = roles.find((item) => item.id === admin?.roleId) ?? null;
  const isSelf =
    admin !== undefined &&
    guardContext !== null &&
    isCurrentOperator(admin, guardContext.currentAccount);

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    remove.reset();
    setConfirming(false);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (admin === undefined) return;
    setDeleteError(null);

    const controller = new AbortController();
    deleteControllerRef.current = controller;

    remove.mutate(
      { adminId: admin.id, signal: controller.signal },
      {
        onSuccess: () => {
          setConfirming(false);
          toast.success(`'${admin.nickname}' 운영자를 삭제했어요.`);
          // 지운 것의 상세에 남아 있을 이유가 없다 — 뒤로가기로도 돌아오지 않게 replace 로 나간다
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 실패해도 다이얼로그는 닫지 않는다 — 확인 재클릭이 곧 재시도다(ConfirmDialog 계약).
          // 경합으로 가드에 걸렸다면 어댑터가 준 문장(= guards.ts 의 문장)이 그대로 뜬다.
          setDeleteError(
            isHttpError(cause) && cause.message !== ''
              ? cause.message
              : '운영자를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
          );
        },
      },
    );
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 운영자에게 '다시 시도'는 영원히 실패한다
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '운영자를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '운영자 정보를 불러오지 못했어요.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div style={headerStyle}>
        <h1 style={pageTitleStyle}>{admin === undefined ? '운영자 상세' : admin.nickname}</h1>

        {admin !== undefined && (
          <div style={actionsStyle}>
            {/* 누를 수 없는 것은 보여 주지 않는다 (EXC-03) — 수정 권한이 없으면 버튼 자체가 없다 */}
            {canUpdate && (
              <Button variant="secondary" onClick={() => navigate(`${LIST_PATH}/${admin.id}/edit`)}>
                <Icon name="pencil" />
                수정
              </Button>
            )}

            {/* 삭제는 권한이 있어도 **가드에 걸리면 잠긴다.** 권한 없음(버튼 없음)과
                규칙에 막힘(잠긴 버튼 + 사유)은 다른 사실이라 다르게 그린다 — 후자는
                '왜 안 되는지' 와 '어떻게 풀 수 있는지' 를 말해 줘야 하는 상태다. */}
            {canRemove && (
              <Button
                variant="danger"
                disabled={!deletable}
                {...(blockReason !== null && { 'aria-describedby': blockReasonId })}
                onClick={() => {
                  setDeleteError(null);
                  setConfirming(true);
                }}
              >
                <Icon name="trash" />
                삭제
              </Button>
            )}
          </div>
        )}
      </div>

      {canRemove && blockReason !== null && (
        <Alert tone="info">
          <span id={blockReasonId}>{blockReason}</span>
        </Alert>
      )}

      {admin === undefined ? (
        <Card>
          {/* [STATE-01] 코드가 아니라 데이터가 오는 중이다 — 화면이 스스로 aria-busy 로 알린다 */}
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <AdminProfileCards admin={admin} role={role} isSelf={isSelf} />
      )}

      {/* 삭제는 되돌릴 수 없다 — intent='delete' */}
      {confirming && admin !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="운영자 삭제"
          message={`'${admin.nickname}'(${admin.account}) 운영자를 삭제할까요? 이 계정으로는 더 이상 로그인할 수 없으며, 삭제는 되돌릴 수 없어요.`}
          confirmLabel="운영자 삭제"
          busy={remove.isPending}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
