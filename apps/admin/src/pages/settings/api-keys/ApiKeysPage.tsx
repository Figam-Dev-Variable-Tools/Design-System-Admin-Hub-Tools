// ApiKeysPage — API Key 관리 (라우트: /settings/api-keys) · 시스템 설정 섹션 소유
//
// ┌ 시크릿 취급 3원칙 (근거: ../_shared/secret.ts · ./types.ts) ────────────────┐
// │ ① **1회 노출**  발급 응답에만 평문이 실리고, 노출 모달의 지역 state 로만 산다.   │
// │ ② **마스킹**    목록은 `sk_test_••••0001` 만 안다 — 가린 게 아니라 그게 전부다.  │
// │ ③ **폐기 확인** 되돌릴 수 없다 — delete-intent 확인 다이얼로그를 반드시 거친다.  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [STATE-01] 네 상태를 섞지 않는다: 첫 로딩=스켈레톤만 / 조회 실패=인라인 배너만 /
//            0건=Empty 컴포넌트만 / 그 외=표. 재조회 중에는 이전 행을 유지한다.
// [EXC-03] 조회 권한 없으면 403. 발급/폐기 컨트롤은 각 권한이 있을 때만 렌더한다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { Alert, Button, ConfirmDialog, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { useSubmitLock } from '../_shared/queries';
import { ApiKeysCard } from './components/ApiKeysCard';
import { CreateApiKeyModal } from './components/CreateApiKeyModal';
import { RevealKeyModal } from './components/RevealKeyModal';
import { useApiKeysQuery, useCreateApiKey, useRevokeApiKey } from './queries';
import type { ApiKey, ApiKeyDraft, ApiKeyIssued } from './types';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 키를 발급하거나 폐기하려면 시스템 설정 등록·삭제 권한이 필요합니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 폐기 확인 문구 — 되돌릴 수 없다는 사실과 그 결과를 함께 말한다 (FEEDBACK-05) */
function revokeMessage(key: ApiKey): string {
  return `‘${key.name}’ 키를 폐기하면 이 키를 쓰는 연동이 즉시 401을 받습니다. 폐기는 되돌릴 수 없고, 같은 키를 다시 발급할 수 없습니다. 폐기할까요?`;
}

export default function ApiKeysPage() {
  const toast = useToast();
  const { canCreate, canRemove } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useApiKeysQuery();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const createLock = useSubmitLock();
  const revokeLock = useSubmitLock();

  /** 발급 모달이 열려 있는가 */
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /**
   * 1회 노출 — 평문이 사는 유일한 자리.
   * 이 state 가 null 이 되는 순간 평문은 앱 어디에도 없다(캐시·목록·전역 상태 어디에도 넣지 않았다).
   */
  const [issued, setIssued] = useState<ApiKeyIssued | null>(null);

  /** 폐기 확인 대상 */
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const createControllerRef = useRef<AbortController | null>(null);
  const revokeControllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      createControllerRef.current?.abort();
      revokeControllerRef.current?.abort();
    },
    [],
  );

  const keys = data;
  // [STATE-01] 첫 로딩에서만 스켈레톤 — 재조회 중에는 이전 행을 유지한다
  const loading = isFetching && keys === undefined;

  const existingNames = useMemo(() => (keys ?? []).map((key) => key.name), [keys]);

  /* ── 발급 ──────────────────────────────────────────────────────────────── */

  const submitCreate = useCallback(
    (draft: ApiKeyDraft) => {
      if (!createLock.acquire()) return; // [EXC-08] 동기 잠금 — 두 번 발급되지 않는다

      setCreateError(null);
      const controller = new AbortController();
      createControllerRef.current = controller;

      create.mutate(
        { draft, signal: controller.signal },
        {
          onSuccess: (result) => {
            createLock.release();
            if (controller.signal.aborted) return;
            // 폼 모달을 닫고 노출 모달을 연다 — 평문은 여기서만 산다
            setCreating(false);
            setIssued(result);
            toast.success('API Key를 발급했습니다.');
          },
          onError: (cause: unknown) => {
            createLock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            // 모달을 닫지 않는다 — 입력을 지키고, 재클릭이 곧 재시도다 (FEEDBACK-01)
            setCreateError('키를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [create, createLock, toast],
  );

  const closeCreate = useCallback(() => {
    createControllerRef.current?.abort();
    createControllerRef.current = null;
    create.reset();
    createLock.release();
    setCreateError(null);
    setCreating(false);
  }, [create, createLock]);

  /** 노출 모달을 닫는다 — 평문을 버린다. 이 시점 이후 복구 경로는 없다 */
  const dismissIssued = useCallback(() => {
    setIssued(null);
  }, []);

  /* ── 폐기 ──────────────────────────────────────────────────────────────── */

  const confirmRevoke = useCallback(() => {
    const target = revoking;
    if (target === null) return;
    if (!revokeLock.acquire()) return; // [EXC-08]

    setRevokeError(null);
    const controller = new AbortController();
    revokeControllerRef.current = controller;

    revoke.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          revokeLock.release();
          if (controller.signal.aborted) return;
          setRevoking(null);
          toast.success(`‘${target.name}’ 키를 폐기했습니다.`);
        },
        onError: (cause: unknown) => {
          revokeLock.release();
          if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
          // [FEEDBACK-02] 다이얼로그를 열어 둔 채 배너로 알린다 — 재클릭이 재시도다
          setRevokeError('키를 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  }, [revoke, revokeLock, revoking, toast]);

  const cancelRevoke = useCallback(() => {
    revokeControllerRef.current?.abort();
    revokeControllerRef.current = null;
    revoke.reset();
    revokeLock.release();
    setRevokeError(null);
    setRevoking(null);
  }, [revoke, revokeLock]);

  /* ── 렌더 ──────────────────────────────────────────────────────────────── */

  // [STATE-02] 조회 실패 — 인라인 danger 배너 + 재시도. 토스트로 알리지 않는다
  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>API Key 목록을 불러오지 못했습니다.</span>
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const issueButton = canCreate ? (
    <Button
      variant="primary"
      size="sm"
      onClick={() => {
        setCreateError(null);
        setCreating(true);
      }}
    >
      새 키 발급
    </Button>
  ) : null;

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        외부 시스템이 이 사이트의 API를 호출할 때 쓰는 키입니다. 키는 발급 직후 한 번만 전체를 볼 수
        있고, 이후에는 마지막 4자리만 표시됩니다.
      </p>

      <ApiKeysCard
        loading={loading}
        keys={keys}
        canRemove={canRemove}
        readOnlyNotice={!canCreate && !canRemove ? READ_ONLY_NOTICE : null}
        revokingId={revoke.isPending ? (revoking?.id ?? null) : null}
        issueButton={issueButton}
        onRevoke={(key) => {
          setRevokeError(null);
          setRevoking(key);
        }}
      />

      {creating && (
        <CreateApiKeyModal
          existingNames={existingNames}
          busy={create.isPending}
          error={createError}
          onSubmit={submitCreate}
          onClose={closeCreate}
        />
      )}

      {issued !== null && (
        <RevealKeyModal
          keyName={issued.key.name}
          plaintext={issued.plaintext}
          onClose={dismissIssued}
        />
      )}

      {revoking !== null && (
        <ConfirmDialog
          intent="delete"
          title="API Key 폐기"
          message={revokeMessage(revoking)}
          confirmLabel="폐기"
          busy={revoke.isPending}
          error={revokeError}
          onConfirm={confirmRevoke}
          onCancel={cancelRevoke}
        />
      )}
    </div>
  );
}
