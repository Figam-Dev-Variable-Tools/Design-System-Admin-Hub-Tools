// OAuthPage — 소셜 로그인 제공자 **목록** (라우트: /settings/oauth) · 시스템 설정 섹션 소유
//
// ┌ 화면 구조 — 목록만 있다 ─────────────────────────────────────────────────┐
// │ ① 사용하고 있는 서비스 : enabled 인 제공자 (+ '로그인 버튼 순서 변경')          │
// │ ② 이용 가능한 서비스   : enabled 가 아닌 제공자                               │
// │ ③ 로그인 화면 표시 정책                                                     │
// │                                                                          │
// │ 타일을 누르면 **주소가 바뀐다** — /settings/oauth/:provider (OAuthProviderPage).│
// │ 예전에는 목록 아래에서 자격증명 폼이 펼쳐졌다(disclosure). 그것은 '리스트를 눌러  │
// │ 상세로 간다' 는 앱의 다른 목록과 어긋났고, 링크가 아니라 버튼이라 새 탭·주소 복사· │
// │ 뒤로가기가 전부 없었다. 지금은 앱의 다른 목록(회원·공지·상품)과 같은 관례다.       │
// │                                                                          │
// │ 두 묶음은 **하나의 providers[] 에서 파생**된다 — 목록을 복제하지 않는다.       │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 화면의 저장은 **무엇을 쓰는가** — '순서와 표시 정책' 뿐이다 ──────────────┐
// │ 자격증명 입력칸이 여기 없으므로 자격증명을 쓸 이유도 없다. 그런데 폼이 문서 전체를 │
// │ 담고 있으니, 그대로 보내면 **화면에 보이지도 않는 다른 제공자의 값**을 함께 쓰게   │
// │ 된다 — 그 사이 다른 화면에서 시크릿을 바꿨다면 낡은 값으로 덮어쓴다.             │
// │ 그래서 저장 페이로드를 폼이 아니라 **서버가 준 최신 문서**에서 만들고, 폼에서는    │
// │ 순서와 표시 정책만 가져온다 (listSavePayload). 저장 확인 문구도 그 사실을 말한다.  │
// │ 자격증명은 그것을 그리는 화면(상세)이 저장한다.                                │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [로그인 버튼 순서] **providers[] 의 배열 순서가 곧 로그인 버튼 순서다** — 따로 order 필드를
// 두지 않는다. 파생 가능한 값을 별도 필드로 저장하면 배열과 어긋날 수 있고, 어긋난 순간
// 어느 쪽이 진짜인지 아무도 모른다. 순서 변경은 이 배열을 실제로 바꾸고 저장과 함께 영속된다
// (가짜 버튼이 아니다 — FEEDBACK-03: no-op 금지).
// TODO(backend): PUT /api/settings/oauth 의 providers[] 순서를 로그인 화면 렌더 순서로 쓴다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { Checkbox, cssVar } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { Alert, Button, Card, CardTitle, ConfirmDialog, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { oauthSettingsKey, oauthSettingsStore } from './data-source';
import { oauthProviderPath } from './paths';
import { ProviderTileList } from './components/ProviderTileList';
import { oauthListSchema, providerLabel } from './validation';
import type { OAuthSettingsValues } from './validation';

const UNSAVED_MESSAGE =
  '로그인 버튼 순서 또는 표시 정책에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. OAuth 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

/** 순서 변경 액션 — 버튼과 '왜 못 누르는지' 를 한 줄에 */
const reorderActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const reorderHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const DEFAULT_FORM_VALUES: OAuthSettingsValues = {
  providers: [],
  display: { kakaoTalkInAppLoginOnly: false },
};

/** 표시 정책 카드 안쪽 — 체크박스와 설명을 쌓는다 */
const policyStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const policyHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 'calc(var(--tds-space-5) + var(--tds-space-2))',
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/**
 * 이 화면이 실제로 보낼 문서를 만든다 — **순서와 표시 정책만** 폼에서 온다.
 *
 * 자격증명은 서버가 준 최신 문서(`server`)에서 그대로 가져온다. 폼이 들고 있는 사본을 쓰면
 * 그 사이 상세 화면에서 바뀐 값을 낡은 값으로 덮어쓴다 — 화면에 없는 데이터를 조용히 쓰는 것은
 * 기능이 아니라 결함이다(파일 머리말).
 *
 * 서버에 없는 제공자가 폼에만 있다면(있어서는 안 되지만) 폼 쪽을 남긴다 — 지우는 것보다 안전하다.
 */
export function listSavePayload(
  server: OAuthSettingsValues,
  form: OAuthSettingsValues,
): OAuthSettingsValues {
  const byId = new Map(server.providers.map((provider) => [provider.provider, provider]));

  return {
    // 순서는 폼이 정하고, 각 항목의 내용은 서버가 정한다
    providers: form.providers.map((provider) => byId.get(provider.provider) ?? provider),
    display: form.display,
  };
}

/**
 * 저장 확인 문구 — 이 화면이 **무엇을 쓰는지** 그대로 말한다.
 * '저장할까요?' 만 물으면 자격증명까지 함께 저장되는 줄 알고 확인하게 된다.
 */
function saveConfirmMessage(
  next: OAuthSettingsValues,
  saved: OAuthSettingsValues | undefined,
): string {
  if (saved === undefined) return '로그인 버튼 순서와 표시 정책을 저장할까요?';

  const parts: string[] = [];

  const beforeOrder = saved.providers.map((provider) => provider.provider).join('>');
  const afterOrder = next.providers.map((provider) => provider.provider).join('>');
  if (beforeOrder !== afterOrder) {
    const enabledNames = next.providers
      .filter((provider) => provider.enabled)
      .map((provider) => providerLabel(provider.provider));
    parts.push(
      enabledNames.length === 0
        ? '로그인 버튼 순서를 바꿉니다.'
        : `로그인 버튼을 ${enabledNames.join(' → ')} 순서로 보여줍니다.`,
    );
  }

  if (saved.display.kakaoTalkInAppLoginOnly !== next.display.kakaoTalkInAppLoginOnly) {
    parts.push(
      next.display.kakaoTalkInAppLoginOnly
        ? '카카오톡 인앱 브라우저에서는 카카오 로그인만 보여줍니다.'
        : '카카오톡 인앱 브라우저에서도 모든 소셜 로그인을 보여줍니다.',
    );
  }

  if (parts.length === 0) return '로그인 버튼 순서와 표시 정책을 저장할까요?';

  // 자격증명이 함께 저장되지 않는다는 사실을 확인 문구가 직접 말한다
  return `${parts.join(' ')} 각 제공자의 자격증명은 바뀌지 않습니다. 저장할까요?`;
}

export default function OAuthPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(
    oauthSettingsKey,
    oauthSettingsStore,
  );
  const save = useSaveSettings(oauthSettingsKey, oauthSettingsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<OAuthSettingsValues>({
    resolver: zodResolver(oauthListSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const [pending, setPending] = useState<OAuthSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<OAuthSettingsValues> | null>(null);
  /** 로그인 버튼 순서를 바꾸는 중인가 — 켜면 사용 중 타일에 위/아래 버튼이 붙는다 */
  const [reordering, setReordering] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
  }, [data, reset]);

  const providers = watch('providers');
  const kakaoTalkInAppLoginOnly = watch('display.kakaoTalkInAppLoginOnly');

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  const runSave = useCallback(
    (values: OAuthSettingsValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;
      if (!lock.acquire()) return; // [EXC-08]

      setSaveError(null);
      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: values, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: () => {
            lock.release();
            if (controller.signal.aborted) return;
            reset(values);
            setPending(null);
            setConflict(null);
            toast.success('로그인 버튼 순서와 표시 정책을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<OAuthSettingsValues>);
              return;
            }
            setSaveError('OAuth 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  const onValid = useCallback(
    (values: OAuthSettingsValues) => {
      const server = data?.value;
      if (server === undefined) return;
      setSaveError(null);
      // 자격증명은 서버 문서에서 가져온다 — 이 화면은 순서와 정책만 쓴다(파일 머리말)
      setPending(listSavePayload(server, values));
    },
    [data?.value],
  );

  const confirmSave = useCallback(() => {
    if (pending === null) return;
    runSave(pending, false);
  }, [pending, runSave]);

  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null) return;
    reset(latest.value);
    setConflict(null);
    void refetch();
    toast.success('최신 OAuth 설정을 불러왔습니다.');
  }, [conflict, refetch, reset, toast]);

  const overwrite = useCallback(() => {
    const server = data?.value;
    if (server === undefined) return;
    runSave(listSavePayload(server, getValues()), true);
  }, [data?.value, getValues, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /**
   * 무엇이 갈라졌는지 — 이 화면이 쓰는 것(순서·표시 정책)만 짚는다.
   * 자격증명은 여기서 쓰지 않으므로 갈라져도 이 화면의 충돌이 아니다.
   */
  const conflictFields = useMemo(() => {
    if (conflict === null) return [];

    const mine = getValues();
    const diverged: string[] = [];

    const mineOrder = mine.providers.map((provider) => provider.provider).join('>');
    const theirOrder = conflict.value.providers.map((provider) => provider.provider).join('>');
    if (mineOrder !== theirOrder) diverged.push('로그인 버튼 순서');

    if (mine.display.kakaoTalkInAppLoginOnly !== conflict.value.display.kakaoTalkInAppLoginOnly) {
      diverged.push('로그인 화면 표시 정책');
    }

    return diverged;
  }, [conflict, getValues]);

  const anyEnabled = providers.some((provider) => provider.enabled);

  /* ── 두 묶음은 providers[] 에서 파생된다 — 목록을 복제하지 않는다 ─────────────
     [useMemo 를 쓰지 않는 이유 — 쓰면 **틀린다**] RHF 의 watch 는 배열을 새로 만들지 않고
     **제자리에서 바꾼다**. 그래서 `[providers]` 를 의존성으로 건 useMemo 는 참조가 그대로라
     다시 계산되지 않고, 순서를 바꿔도 타일이 따라오지 않는다(실제로 그렇게 깨졌다).
     항목이 여섯뿐이라 매 렌더 filter 하는 비용은 없다 — 정확함이 먼저다. */

  const enabledProviders = providers.filter((provider) => provider.enabled);
  const availableProviders = providers.filter((provider) => !provider.enabled);

  /**
   * 로그인 버튼 순서 바꾸기 — **providers[] 를 실제로 재배열한다**(별도 order 필드가 없는 이유는
   * 파일 머리말). 사용 중인 두 항목의 자리를 맞바꾸므로 꺼진 제공자의 위치는 흔들리지 않는다.
   */
  const moveEnabled = useCallback(
    (position: number, delta: number) => {
      const current = getValues('providers');
      const enabledIndices = current.reduce<number[]>((acc, provider, index) => {
        if (provider.enabled) acc.push(index);
        return acc;
      }, []);

      const from = enabledIndices[position];
      const to = enabledIndices[position + delta];
      if (from === undefined || to === undefined) return;

      const next = [...current];
      const moved = next[from];
      const displaced = next[to];
      if (moved === undefined || displaced === undefined) return;
      next[from] = displaced;
      next[to] = moved;

      setValue('providers', next, { shouldDirty: true, shouldValidate: true });
    },
    [getValues, setValue],
  );

  /** 표시 정책의 교차 규칙 위반 메시지 — 스키마가 낸 문장을 그대로 쓴다 */
  const policyError = errors.display?.kakaoTalkInAppLoginOnly?.message;

  /** 순서는 둘 이상일 때만 뜻이 있다 — 하나뿐이면 누를 수 있게 두지 않고 이유를 적는다 */
  const canReorder = enabledProviders.length > 1;
  /**
   * 순서 변경 중인가 — `canReorder` 와 함께 본다. 순서를 바꾸다가 제공자가 하나만 남으면
   * 버튼이 비활성이 되는데, 그때 라벨이 '순서 변경 완료' 로 굳어 있으면 **빠져나올 수 없는
   * 모드**에 갇힌다. 조건이 사라지면 모드도 함께 사라진다.
   */
  const reorderActive = reordering && canReorder;

  return (
    <>
      <SettingsFormShell
        cardTitle="소셜 로그인"
        description="켜고 끄기와 자격증명은 제공자를 눌러 각자의 화면에서 설정합니다. 이 화면은 로그인 버튼 순서와 표시 정책을 저장합니다."
        loading={loading}
        loadFailed={error !== null}
        onRetry={() => void refetch()}
        serverError={saveError !== null && pending === null && conflict === null ? saveError : null}
        saving={saving}
        dirty={isDirty}
        canUpdate={canUpdate}
        readOnlyNotice={READ_ONLY_NOTICE}
        unsavedMessage={UNSAVED_MESSAGE}
        audit={audit}
        warning={
          !anyEnabled && !loading ? (
            <Alert tone="info">
              켜져 있는 소셜 로그인이 없습니다. 사용자는 이메일과 비밀번호로만 로그인합니다.
            </Alert>
          ) : null
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <div style={stackStyle}>
          {/* ── ① 사용하고 있는 서비스 — 목록에 뜨는 순서가 곧 로그인 버튼 순서다 ── */}
          <ProviderTileList
            groupId="in-use"
            heading="사용하고 있는 서비스"
            items={enabledProviders}
            hrefOf={oauthProviderPath}
            emptyNote="켜져 있는 소셜 로그인이 없습니다. 아래 '이용 가능한 서비스'에서 하나를 골라 자격증명을 넣고 켜세요."
            action={
              <span style={reorderActionStyle}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled || !canReorder}
                  onClick={() => {
                    setReordering((prev) => !prev);
                  }}
                >
                  {reorderActive ? '순서 변경 완료' : '로그인 버튼 순서 변경'}
                </Button>
                <p style={reorderHintStyle}>
                  {canReorder
                    ? '여기 놓인 순서대로 로그인 화면에 버튼이 나옵니다. 저장해야 반영됩니다.'
                    : '사용 중인 서비스가 2개 이상일 때 순서를 바꿀 수 있습니다.'}
                </p>
              </span>
            }
            {...(reorderActive ? { onMove: moveEnabled, moveLocked: disabled } : {})}
          />

          {/* ── ② 이용 가능한 서비스 — 순서 개념이 없다(로그인 화면에 뜨지 않는다) ── */}
          <ProviderTileList
            groupId="available"
            heading="이용 가능한 서비스"
            items={availableProviders}
            hrefOf={oauthProviderPath}
            emptyNote="모든 소셜 로그인을 사용 중입니다."
          />

          {/* ── 로그인 화면 표시 정책 ────────────────────────────────────────
              [왜 상세가 아니라 목록에 있나] 이 값은 카카오 콘솔에서 받아오는 것이 아니라
              **우리 로그인 화면 전체의 규칙**이다 — 모델도 providers[] 밖의 display 로 분리돼
              있다(./validation.ts). 카카오 상세 화면에 두면 '카카오의 설정' 으로 읽히고,
              언젠가 '카카오 콘솔 어디에서 이 값을 받나요' 라는 질문으로 돌아온다.
              게다가 이 정책은 **카카오가 켜져 있어야** 켤 수 있는데(교차 규칙), 그 사실을
              눈으로 확인할 수 있는 곳이 바로 이 목록이다 — 카카오가 어느 묶음에 있는지 보인다. */}
          <Card>
            <CardTitle>로그인 화면 표시 정책</CardTitle>

            <div style={policyStackStyle}>
              <Checkbox
                id="oauth-kakao-inapp-login-only"
                label="카카오톡 앱에서 접속 시 카카오 로그인만 사용"
                checked={kakaoTalkInAppLoginOnly}
                disabled={disabled}
                onChange={(event) => {
                  setValue('display.kakaoTalkInAppLoginOnly', event.target.checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              <p style={policyHintStyle}>
                카카오톡 인앱 브라우저에서는 구글·네이버 로그인이 차단되는 경우가 있습니다. 켜 두면
                그 환경에서 다른 소셜 버튼을 감추고 카카오 로그인만 보여줍니다. 자격증명이 아니라
                화면 규칙이므로 카카오 콘솔에서 받아오는 값이 아닙니다.
              </p>

              {/* [교차 규칙] 카카오가 꺼진 채 이 정책이 켜지면 스키마가 저장을 막는다(validation.ts).
                  카카오를 켜는 곳은 이제 카카오 상세 화면이므로, 문구가 그리로 안내한다.
                  판정을 화면에 복제하지 않고 스키마가 낸 메시지를 그대로 보여준다 — 이게 없으면
                  저장 버튼이 조용히 아무 일도 하지 않는 것처럼 보인다. */}
              {policyError !== undefined && (
                <Alert tone="danger">
                  {policyError} 위 &lsquo;이용 가능한 서비스&rsquo;에서 카카오 로그인을 열어 먼저
                  켜세요.
                </Alert>
              )}
            </div>
          </Card>
        </div>
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="로그인 버튼 순서 · 표시 정책 저장"
          message={saveConfirmMessage(pending, data?.value)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="OAuth 설정"
          latestBy={conflict.audit.updatedBy}
          latestAt={formatAuditAt(conflict.audit.updatedAt)}
          divergedFields={conflictFields}
          busy={saving}
          error={saveError}
          onReload={reloadLatest}
          onOverwrite={overwrite}
          onClose={closeConflict}
        />
      )}
    </>
  );
}
