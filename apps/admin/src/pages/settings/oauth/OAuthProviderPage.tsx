// OAuthProviderPage — 제공자 한 명의 자격증명 (라우트: /settings/oauth/:provider)
// 시스템 설정 섹션 소유 — apps/admin/src/pages/settings/oauth/**
//
// ┌ 왜 별도 라우트인가 ──────────────────────────────────────────────────────┐
// │ 예전에는 목록 아래에서 폼이 펼쳐졌다(disclosure). 그래서 주소가 바뀌지 않았고,   │
// │ 새 탭·주소 공유·뒤로가기·중간 클릭이 전부 없었다. 앱의 다른 목록(회원·공지·상품)  │
// │ 은 모두 '리스트를 누르면 상세로 간다' 이고, 이 화면만 예외일 이유가 없다.        │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 화면의 저장은 **이 제공자만** 쓴다 ────────────────────────────────────┐
// │ 화면에 보이는 것이 이 제공자 하나이므로, 저장이 쓰는 것도 이 제공자 하나여야     │
// │ 한다. 저장 페이로드는 **서버가 준 최신 문서**에서 만들고 이 제공자 자리만 폼      │
// │ 값으로 갈아 끼운다 (providerSavePayload). 나머지 제공자와 표시 정책은 서버 값     │
// │ 그대로다 — 보이지도 않는 값을 조용히 쓰는 '저장' 은 기능이 아니라 결함이다.       │
// │                                                                          │
// │ 동시 편집은 revision 이 막는다: 그 사이 누가 무엇을 바꿨든 저장은 409 로 걸리고   │
// │ 충돌 다이얼로그가 뜬다(덮어쓰기는 사람이 고른다).                              │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [검증 범위] 이 제공자만 본다 (oauthProviderScopedSchema). 다른 제공자까지 검증하면
// **보이지도 않고 고칠 수도 없는 오류**가 저장을 막는다 — 근거는 ./validation.ts.
//
// [시크릿] 저장된 client secret 은 화면에 채워지지 않는다 — 저장 여부만 알고 `••••` 로 표시한다.
// [미저장 이탈] SettingsFormShell 의 가드가 세 경로(브라우저 이탈·앱 내 링크·뒤로가기)를 막는다.
//   '목록으로' 는 그래서 **버튼이 아니라 링크(<Link>)** 다: 가드는 앵커 클릭을 가로챈다.
//   navigate() 로 프로그램 이동하면 그 가드를 그냥 지나쳐 입력이 조용히 사라진다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { Alert, ConfirmDialog, Icon, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { normalizeAfterSave, oauthSettingsKey, oauthSettingsStore } from './data-source';
import { OAUTH_LIST_PATH } from './paths';
import { OAuthProviderCard } from './components/OAuthProviderCard';
import { ProviderMark } from './components/provider-marks';
import {
  isAppleProvider,
  isOAuthProviderId,
  oauthProviderScopedSchema,
  providerLabel,
  providerTitle,
} from './validation';
import type { OAuthProviderId, OAuthProviderValues, OAuthSettingsValues } from './validation';
import { cssVar } from '@tds/ui';

const READ_ONLY_NOTICE =
  '조회 권한만 있어요. OAuth 설정을 바꾸려면 시스템 설정 수정 권한이 필요해요.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/** '목록으로' — 앱의 다른 상세 화면(MemberDetailPage)과 같은 모양 */
const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  textDecoration: 'none',
};

/**
 * 화면 제목 — 브랜드 마크 + 제공자 이름.
 *
 * `<h2>` 다: 앱 헤더가 이미 `<h1>OAuth 설정</h1>` 을 그린다(shared/layout/AppHeader).
 * 여기에 또 h1 을 두면 한 문서에 최상위 제목이 둘이 되어 문서 구조가 거짓이 된다.
 */
const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.title.md.font-size'),
  fontWeight: cssVar('typography.title.md.font-weight'),
  lineHeight: cssVar('typography.title.md.line-height'),
};

const notFoundRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const DEFAULT_FORM_VALUES: OAuthSettingsValues = {
  providers: [],
  display: { kakaoTalkInAppLoginOnly: false },
};

/**
 * 카드가 그릴 수 있는 필드 이름들 — 두 갈래(client-secret · apple-key)를 합친 목록이다.
 * 여기 없는 이름은 카드가 그리지 않으므로 꺼내 봐야 쓸 데가 없다.
 */
const PROVIDER_FIELD_NAMES = [
  'clientId',
  'secret',
  'nativeAppKey',
  'redirectUri',
  'servicesId',
  'teamId',
  'keyId',
  'privateKeyFileName',
] as const;

type ProviderFieldName = (typeof PROVIDER_FIELD_NAMES)[number];

/** `{ message: string }` 모양에서 문구만 꺼낸다 — 아니면 undefined */
function messageOf(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) return undefined;

  const entry: unknown = Reflect.get(source, key);
  if (typeof entry !== 'object' || entry === null) return undefined;

  const message: unknown = Reflect.get(entry, 'message');
  return typeof message === 'string' ? message : undefined;
}

/**
 * RHF 의 제공자 오류에서 카드가 쓸 문구만 모은다.
 *
 * [왜 `errors.providers[i].clientId` 를 직접 읽지 않는가] providers[] 는 갈래가 둘인 **합집합**
 * 이라(./validation.ts) RHF 의 오류 타입도 함께 갈라진다 — `clientId` 는 Apple 갈래에 없고
 * `servicesId` 는 client-secret 갈래에 없어서, 어느 쪽을 읽든 다른 갈래에서 타입이 깨진다.
 * 캐스트로 뭉개는 대신 **unknown 에서 좁혀** 꺼낸다: 없으면 없는 대로 undefined 다.
 * **exactOptionalPropertyTypes 이므로 있는 것만 넣는다**(undefined 를 넣는 것과 다르다).
 */
function collectFieldErrors(source: unknown): Partial<Record<ProviderFieldName, string>> {
  const collected: Partial<Record<ProviderFieldName, string>> = {};

  for (const field of PROVIDER_FIELD_NAMES) {
    const message = messageOf(source, field);
    if (message !== undefined) collected[field] = message;
  }

  return collected;
}

/**
 * 이 화면이 실제로 보낼 문서 — **이 제공자 자리만** 폼 값으로 갈아 끼운다.
 *
 * 나머지 제공자와 표시 정책은 서버 값 그대로다. 순서도 서버 배열 순서가 유지된다
 * (이 화면에는 순서를 바꿀 컨트롤이 없으므로 순서를 쓸 이유도 없다).
 */
export function providerSavePayload(
  server: OAuthSettingsValues,
  target: OAuthProviderId,
  edited: OAuthProviderValues,
): OAuthSettingsValues {
  return {
    providers: server.providers.map((provider) =>
      provider.provider === target ? edited : provider,
    ),
    display: server.display,
  };
}

/** 저장 확인 문구 — 켜고 끄는 일은 사용자 로그인에 곧바로 영향을 주므로 이름으로 말한다 */
function saveConfirmMessage(
  target: OAuthProviderId,
  next: OAuthProviderValues | undefined,
  before: OAuthProviderValues | undefined,
): string {
  const label = providerLabel(target);

  if (next !== undefined && before !== undefined && before.enabled && !next.enabled) {
    return `${label} 로그인을 꺼요. 이 방식으로 가입한 사용자는 로그인할 수 없게 돼요. 이 제공자의 설정만 저장돼요. 저장할까요?`;
  }
  if (next !== undefined && before !== undefined && !before.enabled && next.enabled) {
    return `${label} 로그인을 켜요. 이 제공자의 설정만 저장돼요. 저장할까요?`;
  }
  return `${label} 설정을 저장해요. 다른 제공자와 표시 정책은 바뀌지 않아요. 저장할까요?`;
}

export default function OAuthProviderPage() {
  const { provider: rawProvider = '' } = useParams<{ provider: string }>();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  /**
   * 주소창에서 온 문자열을 판별자로 좁힌다 — 여기가 유일한 관문이다.
   * 좁히지 못하면 `null` 이고, 그때 화면은 빈 껍데기가 아니라 '없는 제공자' 를 말한다.
   */
  const target: OAuthProviderId | null = isOAuthProviderId(rawProvider) ? rawProvider : null;

  const { data, isFetching, error, refetch } = useSettingsQuery(
    oauthSettingsKey,
    oauthSettingsStore,
  );
  const save = useSaveSettings(oauthSettingsKey, oauthSettingsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  /**
   * 검증 스키마는 **이 제공자에 매인다** — target 이 바뀌면 스키마도 바뀐다.
   * 알 수 없는 제공자면 화면이 폼을 그리지 않으므로 아무 제공자나 넣어 두면 되지만,
   * 그러면 '왜 google 인가' 를 나중에 아무도 답하지 못한다. 이 훅은 그 경우 쓰이지 않는다.
   */
  const resolver = useMemo(
    () => zodResolver(oauthProviderScopedSchema(target ?? 'google')),
    [target],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<OAuthSettingsValues>({ resolver, defaultValues: DEFAULT_FORM_VALUES });

  const [pending, setPending] = useState<OAuthSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<OAuthSettingsValues> | null>(null);
  /** 시크릿을 '변경 중' 인가 — 화면 상태이지 저장값이 아니다 */
  const [changingSecret, setChangingSecret] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
    setChangingSecret(false);
  }, [data, reset]);

  // 다른 제공자로 이동하면 '변경 중' 은 앞 화면의 상태다 — 들고 가지 않는다
  useEffect(() => {
    setChangingSecret(false);
  }, [target]);

  const providers = watch('providers');

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /** 이 제공자의 **원본 배열 인덱스** — RHF 의 등록 경로(providers.N.*)가 이 값이다 */
  const index = providers.findIndex((provider) => provider.provider === target);
  const value = index < 0 ? undefined : providers[index];

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
            reset(normalizeAfterSave(values));
            setChangingSecret(false);
            setPending(null);
            setConflict(null);
            toast.success(
              target === null
                ? 'OAuth 설정을 저장했어요.'
                : `${providerLabel(target)} 설정을 저장했어요.`,
            );
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<OAuthSettingsValues>);
              return;
            }
            setSaveError('OAuth 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, target, toast],
  );

  const onValid = useCallback(
    (values: OAuthSettingsValues) => {
      const server = data?.value;
      if (server === undefined || target === null) return;

      const edited = values.providers.find((item) => item.provider === target);
      if (edited === undefined) return;

      setSaveError(null);
      // 이 제공자 자리만 갈아 끼운다 — 나머지는 서버 값 그대로다(파일 머리말)
      setPending(providerSavePayload(server, target, edited));
    },
    [data?.value, target],
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
    setChangingSecret(false);
    setConflict(null);
    void refetch();
    toast.success('최신 OAuth 설정을 불러왔어요.');
  }, [conflict, refetch, reset, toast]);

  const overwrite = useCallback(() => {
    const server = data?.value;
    if (server === undefined || target === null) return;
    const edited = getValues().providers.find((item) => item.provider === target);
    if (edited === undefined) return;
    runSave(providerSavePayload(server, target, edited), true);
  }, [data?.value, getValues, runSave, target]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /**
   * 무엇이 갈라졌는지 — 이 화면이 쓰는 것은 이 제공자뿐이므로 그것만 본다.
   * 갈래마다 비교할 필드가 다르다(./validation.ts) — 캐스트로 뭉개면 갈래가 늘 때 비교가
   * 조용히 빠지고, 빠진 필드는 충돌 경고 없이 덮어써진다.
   */
  const conflictFields = useMemo(() => {
    if (conflict === null || target === null) return [];

    const mine = getValues().providers.find((item) => item.provider === target);
    const theirs = conflict.value.providers.find((item) => item.provider === target);
    if (mine === undefined || theirs === undefined) return [];

    const same =
      mine.enabled === theirs.enabled &&
      mine.redirectUri === theirs.redirectUri &&
      (isAppleProvider(mine) && isAppleProvider(theirs)
        ? mine.servicesId === theirs.servicesId &&
          mine.teamId === theirs.teamId &&
          mine.keyId === theirs.keyId &&
          mine.hasPrivateKey === theirs.hasPrivateKey
        : !isAppleProvider(mine) &&
          !isAppleProvider(theirs) &&
          mine.clientId === theirs.clientId &&
          mine.nativeAppKey === theirs.nativeAppKey &&
          mine.hasSecret === theirs.hasSecret);

    return same ? [] : [providerLabel(target)];
  }, [conflict, getValues, target]);

  const backLink = (
    <Link to={OAUTH_LIST_PATH} style={backLinkStyle} className="tds-ui-link tds-ui-focusable">
      <Icon name="chevron-left" />
      목록으로
    </Link>
  );

  /* ── 알 수 없는 제공자 — 빈 화면을 내놓지 않는다 ─────────────────────────
     주소를 손으로 고쳤거나 오래된 링크를 눌렀을 때다. 앱의 다른 상세 화면과 같은 모양으로
     '없다' 는 사실과 돌아갈 길을 함께 준다. 폼은 아예 그리지 않는다. */
  if (target === null || (!loading && error === null && value === undefined)) {
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={notFoundRowStyle}>
            <span>
              &lsquo;{rawProvider}&rsquo;은(는) 이 화면이 아는 소셜 로그인 제공자가 아니에요.
            </span>
            <Link to={OAUTH_LIST_PATH} className="tds-ui-link tds-ui-focusable">
              소셜 로그인 목록으로 돌아가기
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  // 위 가드를 지났으므로 target 은 알려진 제공자다
  const title = providerTitle(target);

  return (
    <>
      <div style={pageStyle}>
        {backLink}

        <h2 style={titleStyle}>
          <ProviderMark provider={target} size="var(--tds-space-7)" />
          {title}
        </h2>

        <SettingsFormShell
          cardTitle="자격증명"
          description={`${title}의 자격증명과 Redirect URI를 관리해요. 켠 제공자만 검증해요.`}
          loading={loading}
          loadFailed={error !== null}
          onRetry={() => void refetch()}
          serverError={
            saveError !== null && pending === null && conflict === null ? saveError : null
          }
          saving={saving}
          dirty={isDirty}
          canUpdate={canUpdate}
          readOnlyNotice={READ_ONLY_NOTICE}
          unsavedMessage={`${title} 설정에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.`}
          audit={audit}
          warning={null}
          onSubmit={(event) => void handleSubmit(onValid)(event)}
        >
          {value === undefined || index < 0 ? null : (
            <OAuthProviderCard
              key={value.provider}
              index={index}
              value={value}
              register={register}
              disabled={disabled}
              alwaysExpanded
              chrome="plain"
              changingSecret={changingSecret}
              errors={collectFieldErrors(errors.providers?.[index])}
              onToggleEnabled={(next) => {
                setValue(
                  `providers.${String(index)}.enabled` as `providers.${number}.enabled`,
                  next,
                  { shouldDirty: true, shouldValidate: true },
                );
              }}
              onChangeSecretStart={() => {
                setChangingSecret(true);
              }}
              onChangeSecretCancel={() => {
                // 입력하던 새 값을 버린다 — 기존 값이 그대로 유지된다.
                // 갈래마다 '새로 넣을 값' 이 사는 칸이 다르다: 시크릿이거나, 고른 .p8 파일 이름이거나.
                if (value.provider === 'apple') {
                  setValue(
                    `providers.${String(index)}.privateKeyFileName` as `providers.${number}.privateKeyFileName`,
                    '',
                    { shouldDirty: true, shouldValidate: true },
                  );
                } else {
                  setValue(
                    `providers.${String(index)}.secret` as `providers.${number}.secret`,
                    '',
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                }
                setChangingSecret(false);
              }}
              onPickPrivateKey={(fileName) => {
                // `.p8` 은 **이름만** 폼에 담는다 — 내용은 폼 상태에 들어오지 않는다
                setValue(
                  `providers.${String(index)}.privateKeyFileName` as `providers.${number}.privateKeyFileName`,
                  fileName,
                  { shouldDirty: true, shouldValidate: true },
                );
              }}
            />
          )}
        </SettingsFormShell>
      </div>

      {pending !== null && target !== null && (
        <ConfirmDialog
          intent="update"
          title={`${title} 설정 저장`}
          message={saveConfirmMessage(
            target,
            pending.providers.find((item) => item.provider === target),
            data?.value.providers.find((item) => item.provider === target),
          )}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject={`${title} 설정`}
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
