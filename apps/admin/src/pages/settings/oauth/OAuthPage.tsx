// OAuthPage — OAuth 설정 (라우트: /settings/oauth) · 시스템 설정 섹션 소유
//
// 소셜 로그인 제공자(Google·카카오·네이버)의 자격증명과 Redirect URI 를 관리한다.
//
// [시크릿] 저장된 client secret 은 **화면에 채워지지 않는다** — 저장 여부만 알고 `••••` 로 표시한다.
// 바꾸려면 새 값을 넣고, 비워 두면 기존 값이 유지된다 (근거: ./validation.ts 머리말).
//
// [위험 설정] 제공자를 끄면 그 방식으로 가입한 사용자가 로그인하지 못한다 — 저장 확인이 그 사실을 말한다.
//
// [연결 테스트] 백엔드가 없어 비활성이다 — 가짜 성공을 보여주지 않는다 (components/OAuthProviderCard).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { Alert, ConfirmDialog, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { normalizeAfterSave, oauthSettingsKey, oauthSettingsStore } from './data-source';
import { OAuthProviderCard } from './components/OAuthProviderCard';
import { oauthSettingsSchema, providerLabel } from './validation';
import type { OAuthProviderId, OAuthSettingsValues } from './validation';

const UNSAVED_MESSAGE =
  'OAuth 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. OAuth 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const DEFAULT_FORM_VALUES: OAuthSettingsValues = { providers: [] };

/**
 * 저장 확인 문구 — 켜고 끄는 제공자를 이름으로 말한다.
 * '저장할까요?' 만 물으면 무엇이 바뀌는지 모르고 확인하게 된다.
 */
function saveConfirmMessage(
  next: OAuthSettingsValues,
  saved: OAuthSettingsValues | undefined,
): string {
  if (saved === undefined) return 'OAuth 설정을 저장할까요?';

  const turnedOff: string[] = [];
  const turnedOn: string[] = [];

  for (const provider of next.providers) {
    const before = saved.providers.find((item) => item.provider === provider.provider);
    if (before === undefined) continue;
    if (before.enabled && !provider.enabled) turnedOff.push(providerLabel(provider.provider));
    if (!before.enabled && provider.enabled) turnedOn.push(providerLabel(provider.provider));
  }

  const parts: string[] = [];
  if (turnedOff.length > 0) {
    parts.push(
      `${turnedOff.join(' · ')} 로그인을 끕니다. 이 방식으로 가입한 사용자는 로그인할 수 없게 됩니다.`,
    );
  }
  if (turnedOn.length > 0) parts.push(`${turnedOn.join(' · ')} 로그인을 켭니다.`);
  if (parts.length === 0) return 'OAuth 설정을 저장하면 즉시 반영됩니다. 저장할까요?';

  return `${parts.join(' ')} 저장할까요?`;
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
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<OAuthSettingsValues>({
    resolver: zodResolver(oauthSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const [pending, setPending] = useState<OAuthSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<OAuthSettingsValues> | null>(null);
  /** 시크릿을 '변경 중' 인 제공자들 — 화면 상태이지 저장값이 아니다 */
  const [changingSecrets, setChangingSecrets] = useState<readonly OAuthProviderId[]>([]);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
    setChangingSecrets([]);
  }, [data, reset]);

  const providers = watch('providers');

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
            // 저장한 순간 평문 시크릿은 화면에서 사라진다 — 새 기준선은 '저장됨 + 빈 입력' 이다
            const normalized = normalizeAfterSave(values);
            reset(normalized);
            setChangingSecrets([]);
            setPending(null);
            setConflict(null);
            toast.success('OAuth 설정을 저장했습니다.');
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

  const onValid = useCallback((values: OAuthSettingsValues) => {
    setSaveError(null);
    setPending(values);
  }, []);

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
    setChangingSecrets([]);
    setConflict(null);
    void refetch();
    toast.success('최신 OAuth 설정을 불러왔습니다.');
  }, [conflict, refetch, reset, toast]);

  const overwrite = useCallback(() => {
    runSave(getValues(), true);
  }, [getValues, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /** 어느 제공자가 달라졌는지 이름으로 짚는다 — 필드 단위로 나열하면 읽히지 않는다 */
  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    const mine = getValues().providers;
    return conflict.value.providers
      .filter((theirs) => {
        const ours = mine.find((item) => item.provider === theirs.provider);
        if (ours === undefined) return false;
        return (
          ours.enabled !== theirs.enabled ||
          ours.clientId !== theirs.clientId ||
          ours.redirectUri !== theirs.redirectUri ||
          ours.hasSecret !== theirs.hasSecret
        );
      })
      .map((theirs) => providerLabel(theirs.provider));
  }, [conflict, getValues]);

  const startChangeSecret = useCallback((provider: OAuthProviderId) => {
    setChangingSecrets((prev) => (prev.includes(provider) ? prev : [...prev, provider]));
  }, []);

  const cancelChangeSecret = useCallback(
    (provider: OAuthProviderId, index: number) => {
      // 입력하던 새 시크릿을 버린다 — 기존 값이 그대로 유지된다
      setValue(`providers.${String(index)}.secret` as `providers.${number}.secret`, '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      setChangingSecrets((prev) => prev.filter((item) => item !== provider));
    },
    [setValue],
  );

  const anyEnabled = providers.some((provider) => provider.enabled);

  return (
    <>
      <SettingsFormShell
        cardTitle="OAuth 설정"
        description="소셜 로그인 제공자의 자격증명과 Redirect URI를 관리합니다. 켠 제공자만 검증합니다."
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
          {providers.map((provider, index) => {
            const fieldErrors = errors.providers?.[index];
            return (
              <OAuthProviderCard
                key={provider.provider}
                index={index}
                value={provider}
                register={register}
                disabled={disabled}
                changingSecret={changingSecrets.includes(provider.provider)}
                errors={{
                  ...(fieldErrors?.clientId?.message === undefined
                    ? {}
                    : { clientId: fieldErrors.clientId.message }),
                  ...(fieldErrors?.secret?.message === undefined
                    ? {}
                    : { secret: fieldErrors.secret.message }),
                  ...(fieldErrors?.redirectUri?.message === undefined
                    ? {}
                    : { redirectUri: fieldErrors.redirectUri.message }),
                }}
                onToggleEnabled={(next) => {
                  setValue(
                    `providers.${String(index)}.enabled` as `providers.${number}.enabled`,
                    next,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
                onChangeSecretStart={() => {
                  startChangeSecret(provider.provider);
                }}
                onChangeSecretCancel={() => {
                  cancelChangeSecret(provider.provider, index);
                }}
              />
            );
          })}
        </div>
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="OAuth 설정 저장"
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
