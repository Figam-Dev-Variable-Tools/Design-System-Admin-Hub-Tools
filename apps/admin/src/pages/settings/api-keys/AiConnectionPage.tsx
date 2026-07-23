// AiConnectionPage — 연동 하나의 자격증명 (라우트: /settings/api-keys/:providerId)
// 시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**
//
// ┌ ⚠ 파일 이름이 `Ai…` 인데 AI 전용이 아니다 ────────────────────────────────┐
// │ 이 화면은 이제 배송 연동(CJ대한통운)도 그린다. **AI 전제를 하드코딩하지        │
// │ 않는다** — 항목마다 달라지는 문장은 전부 카탈로그가 갖는다:                   │
// │   · 요구하는 입력칸  → entry.credentials                                   │
// │   · 이 연동만의 함정 → entry.connectionNotice                              │
// │   · 켜면 달라지는 것 → entry.enableEffect (없으면 그 문장을 아예 안 쓴다)     │
// │   · 택배사 원장과의 관계 → entry.carrierCode → ./components/CarrierPolicyCard│
// │   · 계약으로 열리는 API → entry.apiPackage → ./components/ApiPackageCard     │
// │ 화면이 'AI 면 …' 으로 분기하기 시작하면 항목을 더할 때마다 이 파일이 자란다.    │
// │                                                                          │
// │ 파일·심볼 이름은 그대로 뒀다: 이 폴더 밖(src/wiring.ts)이 이 경로를 import    │
// │ 하고 있어 개명은 그 파일까지 건드려야 한다(이번 변경의 소유 범위 밖이다).      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 왜 별도 라우트인가 ──────────────────────────────────────────────────────┐
// │ ../oauth 가 방금 같은 전환을 마쳤고 **그 구현을 그대로 따른다**              │
// │ (OAuthPage / OAuthProviderPage). 두 화면이 다른 방식이면 다음 사람이 어느    │
// │ 쪽을 따라야 할지 모른다. 목록에서 행을 누르면 주소가 바뀌고, 새 탭·주소 공유·  │
// │ 뒤로가기·중간 클릭이 전부 살아 있다 — 앱의 다른 목록과 같은 관례다.           │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 화면의 저장은 **이 프로바이더만** 쓴다 ────────────────────────────────┐
// │ 화면에 보이는 것이 이 연동 하나이므로, 저장이 쓰는 것도 하나여야 한다. 저장    │
// │ 페이로드는 **서버가 준 최신 문서**에서 만들고 이 프로바이더 자리만 폼 값으로    │
// │ 갈아 끼운다 (connectionSavePayload). 나머지 연동은 서버 값 그대로다 —        │
// │ 보이지도 않는 값을 조용히 쓰는 '저장' 은 기능이 아니라 결함이다.              │
// │                                                                          │
// │ 동시 편집은 revision 이 막는다: 그 사이 누가 무엇을 바꿨든 저장은 409 로 걸리고 │
// │ 충돌 다이얼로그가 뜬다(덮어쓰기는 사람이 고른다).                            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 저장되지 않는데 성공처럼 보이는 화면을 만들지 않는다 ──────────────────────┐
// │ 성공 토스트는 저장이 **실제로 끝난 뒤**(onSuccess)에만 뜬다. 그리고 저장이     │
// │ 끝나면 목록의 상태가 실제로 바뀌고, 연동이 켜지면 /ai/chat 의 응답 모드가       │
// │ 실제로 열린다 — 화면이 말한 것과 앱이 하는 일이 같다.                        │
// │                                                                          │
// │ 반대로 **연결 검증은 아직 없고, 없다고 말한다**: '자격증명이 채워짐' 과         │
// │ '실제로 통한다' 는 다른 사실이라 한 값으로 뭉치지 않는다(아래 검증 카드).       │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [시크릿] 저장된 API 키는 화면에 채워지지 않는다 — 저장 여부만 알고 `••••` 로 표시한다.
// [미저장 이탈] SettingsFormShell 의 가드가 세 경로(브라우저 이탈·앱 내 링크·뒤로가기)를 막는다.
//   '목록으로' 는 그래서 **버튼이 아니라 링크(<Link>)** 다: 가드는 앵커 클릭을 가로챈다.
//   navigate() 로 프로그램 이동하면 그 가드를 그냥 지나쳐 입력이 조용히 사라진다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { cssVar, ToggleSwitch } from '@tds/ui';

import { isAbort } from '../../../shared/async';
// 택배사 원장은 배송 정책이 갖는다 — 페이지끼리 서로를 모르므로 공통 층에 묻는다
// (shared/domain/carrier-integration.ts 머리말에 방향과 근거).
import { carrierPolicyLink } from '../../../shared/domain/carrier-integration';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  Card,
  CardTitle,
  ConfirmDialog,
  Icon,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { connectionIsUsable, toConnection } from './ai-connections';
import type { AiCredentialFieldKey } from './ai-connections';
import {
  aiConnectionsKey,
  aiConnectionsStore,
  connectionSavePayload,
  emptyConnectionRecord,
  formToRecord,
  recordToForm,
} from './data-source';
import type { AiConnectionsValues } from './data-source';
import { integrationCatalogue, integrationCategoryLabel } from './integrations';
import type { IntegrationCatalogueEntry } from './integrations';
import { AI_CONNECTION_LIST_PATH } from './paths';
import { AiCredentialFields } from './components/AiCredentialFields';
import { ApiPackageCard } from './components/ApiPackageCard';
import { CarrierPolicyCard } from './components/CarrierPolicyCard';
import { ServiceGlyph } from './components/ServiceGlyph';
import { aiConnectionSchema, EMPTY_CONNECTION_FORM } from './validation';
import type { AiConnectionFormValues } from './validation';

const READ_ONLY_NOTICE = '조회 권한만 있어요. 연동을 바꾸려면 시스템 설정 수정 권한이 필요해요.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/** '목록으로' — 앱의 다른 상세 화면(OAuthProviderPage·MemberDetailPage)과 같은 모양 */
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
 * 화면 제목 — 글리프 + 연동 이름.
 *
 * `<h2>` 다: 앱 헤더가 이미 `<h1>` 을 그린다(shared/layout/AppHeader). 여기에 또 h1 을 두면
 * 한 문서에 최상위 제목이 둘이 되어 문서 구조가 거짓이 된다.
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

/** 켜기 스위치와 그 설명 — 자격증명 칸 위에 온다(무엇을 위한 입력인지 먼저 말한다) */
const toggleRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const hintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 검증 카드 안 — 사실 한 줄씩 */
const factListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const factRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const factLabelStyle: CSSProperties = {
  minWidth: `calc(${cssVar('space.7')} * 2)`,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const factValueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/**
 * 저장 확인 문구.
 *
 * ┌ 왜 결과를 항목에서 가져오는가 ────────────────────────────────────────────┐
 * │ 예전 이 문구는 'AI 화면의 응답 모드가 다시 잠깁니다' 를 **하드코딩**했다.      │
 * │ AI 6종에는 참이지만 배송 연동에는 **거짓**이다 — 그 연동은 AI 응답 모드와      │
 * │ 아무 관계가 없다. 배송 항목이 들어오는 순간 이 다이얼로그가 거짓말을 한다.     │
 * │                                                                          │
 * │ 그래서 결과는 항목이 말한다(entry.enableEffect). **null 이면 그 문장을 아예   │
 * │ 넣지 않는다** — 부르는 곳이 없는 연동에 '무언가 열립니다' 를 지어내지 않는다.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
function saveConfirmMessage(
  entry: IntegrationCatalogueEntry,
  next: AiConnectionFormValues,
  wasEnabled: boolean,
): string {
  // 결과 문장은 있을 때만 낀다 — 없는 항목에서 문장 사이가 벌어지지 않게 접두 공백을 함께 만든다
  const effect = entry.enableEffect === null ? '' : ` ${entry.enableEffect}`;

  if (wasEnabled && !next.enabled) {
    return `${entry.name} 연동을 꺼요. 자격증명은 지워지지 않고 남지만 이 연동은 쓰이지 않아요.${effect} 이 연동만 저장돼요. 저장할까요?`;
  }
  if (!wasEnabled && next.enabled) {
    return `${entry.name} 연동을 켜요. 입력한 자격증명이 저장돼요.${effect} 이 연동만 저장돼요. 저장할까요?`;
  }
  return `${entry.name} 연동 설정을 저장해요. 다른 연동은 바뀌지 않아요. 저장할까요?`;
}

/** `{ message: string }` 모양에서 문구만 꺼낸다 — 아니면 undefined */
function messageOf(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) return undefined;

  const entry: unknown = Reflect.get(source, key);
  if (typeof entry !== 'object' || entry === null) return undefined;

  const message: unknown = Reflect.get(entry, 'message');
  return typeof message === 'string' ? message : undefined;
}

/**
 * RHF 의 자격증명 오류에서 화면이 쓸 문구만 모은다 — **그리는 칸의 것만**.
 *
 * 그리지 않는 칸의 오류를 꺼내 봐야 보여줄 자리가 없고, 스키마가 애초에 그 칸을 보지 않는다
 * (./validation.ts). **exactOptionalPropertyTypes 이므로 있는 것만 넣는다.**
 */
function collectFieldErrors(
  source: unknown,
  fields: readonly { readonly key: AiCredentialFieldKey }[],
): Partial<Record<AiCredentialFieldKey, string>> {
  const collected: Partial<Record<AiCredentialFieldKey, string>> = {};

  for (const field of fields) {
    const message = messageOf(source, field.key);
    if (message !== undefined) collected[field.key] = message;
  }

  return collected;
}

export default function AiConnectionPage() {
  const { providerId: rawProviderId = '' } = useParams<{ providerId: string }>();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  /**
   * 주소창에서 온 문자열을 카탈로그에서 찾는다 — 여기가 유일한 관문이다.
   * 찾지 못하면 화면은 빈 껍데기가 아니라 '없는 프로바이더' 를 말한다.
   */
  const entry = useMemo(
    () => integrationCatalogue().find((item) => item.id === rawProviderId) ?? null,
    [rawProviderId],
  );

  const { data, isFetching, error, refetch } = useSettingsQuery(
    aiConnectionsKey,
    aiConnectionsStore,
  );
  const save = useSaveSettings(aiConnectionsKey, aiConnectionsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  /**
   * 검증 스키마는 **이 프로바이더가 요구하는 칸에 매인다** — entry 가 바뀌면 스키마도 바뀐다.
   * 알 수 없는 id 면 화면이 폼을 그리지 않으므로 빈 목록이면 충분하다(검증할 칸이 없다).
   */
  const resolver = useMemo(
    () => zodResolver(aiConnectionSchema(entry?.credentials ?? [])),
    [entry],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AiConnectionFormValues>({ resolver, defaultValues: EMPTY_CONNECTION_FORM });

  const [pending, setPending] = useState<AiConnectionsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<AiConnectionsValues> | null>(null);
  /** 새 값을 입력 중인 비밀 칸들 — 화면 상태이지 저장값이 아니다 */
  const [changingSecrets, setChangingSecrets] = useState<readonly AiCredentialFieldKey[]>([]);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  /** 서버 문서에서 이 프로바이더의 저장 기록 — 없으면 '아직 저장한 적 없음' 이다 */
  const record = useMemo(() => {
    if (entry === null) return null;
    return (
      data?.value.connections.find((connection) => connection.providerId === entry.id) ??
      emptyConnectionRecord(entry.id)
    );
  }, [data, entry]);

  useEffect(() => {
    if (record === null) return;
    reset(recordToForm(record));
    setChangingSecrets([]);
  }, [record, reset]);

  // 다른 프로바이더로 이동하면 '변경 중' 은 앞 화면의 상태다 — 들고 가지 않는다
  useEffect(() => {
    setChangingSecrets([]);
  }, [entry]);

  const values = watch();

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  const runSave = useCallback(
    (next: AiConnectionsValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined || entry === null) return;
      if (!lock.acquire()) return; // [EXC-08]

      setSaveError(null);
      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: next, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: (saved) => {
            lock.release();
            if (controller.signal.aborted) return;

            // 저장한 순간 평문은 화면에서 사라진다 — 새 기준선은 저장소가 돌려준 문서다
            // (그 문서에는 평문이 없다. 있는 것은 '저장됐다' 는 사실뿐이다.)
            const stored = saved.value.connections.find(
              (connection) => connection.providerId === entry.id,
            );
            if (stored !== undefined) reset(recordToForm(stored));

            setChangingSecrets([]);
            setPending(null);
            setConflict(null);
            toast.success(`${entry.name} 연동을 저장했어요.`);
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<AiConnectionsValues>);
              return;
            }
            setSaveError('연동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, entry, lock, reset, save, toast],
  );

  const onValid = useCallback(
    (form: AiConnectionFormValues) => {
      const server = data?.value;
      if (server === undefined || entry === null || record === null) return;

      setSaveError(null);
      // 이 프로바이더 자리만 갈아 끼운다 — 나머지는 서버 값 그대로다(파일 머리말)
      setPending(connectionSavePayload(server, entry.id, formToRecord(record, form)));
    },
    [data?.value, entry, record],
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
    if (latest === null || entry === null) return;
    const stored =
      latest.value.connections.find((connection) => connection.providerId === entry.id) ??
      emptyConnectionRecord(entry.id);
    reset(recordToForm(stored));
    setChangingSecrets([]);
    setConflict(null);
    void refetch();
    toast.success('최신 연동 설정을 불러왔어요.');
  }, [conflict, entry, refetch, reset, toast]);

  const overwrite = useCallback(() => {
    const server = data?.value;
    if (server === undefined || entry === null || record === null) return;
    runSave(connectionSavePayload(server, entry.id, formToRecord(record, getValues())), true);
  }, [data?.value, entry, getValues, record, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /**
   * 무엇이 갈라졌는지 — 이 화면이 쓰는 것은 이 연동 하나뿐이므로 그것만 본다.
   * 비밀 칸은 **값을 비교할 수 없다**(양쪽 다 값이 없다) — '저장 여부' 가 갈라졌는지만 본다.
   */
  const conflictFields = useMemo(() => {
    if (conflict === null || entry === null) return [];

    const mine = record;
    const theirs = conflict.value.connections.find(
      (connection) => connection.providerId === entry.id,
    );
    if (mine === null) return [];
    if (theirs === undefined) return [entry.name];

    const same =
      mine.enabled === theirs.enabled &&
      JSON.stringify(mine.publicValues) === JSON.stringify(theirs.publicValues) &&
      mine.storedSecrets.join(',') === theirs.storedSecrets.join(',');

    return same ? [] : [entry.name];
  }, [conflict, entry, record]);

  const backLink = (
    <Link
      to={AI_CONNECTION_LIST_PATH}
      style={backLinkStyle}
      className="tds-ui-link tds-ui-focusable"
    >
      <Icon name="chevron-left" />
      목록으로
    </Link>
  );

  /* ── 알 수 없는 연동 — 빈 화면을 내놓지 않는다 ───────────────────────────
     주소를 손으로 고쳤거나 오래된 링크를 눌렀을 때다. 앱의 다른 상세 화면과 같은 모양으로
     '없다' 는 사실과 돌아갈 길을 함께 준다. 폼은 아예 그리지 않는다.

     [문구가 'AI 프로바이더' 가 아니게 됐다] 이 카탈로그는 이제 AI 만 담지 않는다 —
     배송 연동을 열려다 오타를 낸 운영자에게 'AI 프로바이더가 아닙니다' 라고 답하면
     그는 자기가 엉뚱한 화면에 왔다고 읽는다. 실제로는 이 화면이 맞고 id 만 틀렸다. */
  if (entry === null) {
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={notFoundRowStyle}>
            <span>&lsquo;{rawProviderId}&rsquo;은(는) 이 화면이 아는 연동이 아니에요.</span>
            <Link to={AI_CONNECTION_LIST_PATH} className="tds-ui-link tds-ui-focusable">
              연동 목록으로 돌아가기
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  /**
   * 지금 연동이 **성립하는가** — 판정은 카탈로그와 저장된 사실이 한다(./ai-connections.ts).
   * 폼의 입력 중인 값이 아니라 **저장된 문서**를 본다: 아직 저장하지 않은 입력은 연동이 아니다.
   */
  const usable = record !== null && connectionIsUsable(entry.credentials, toConnection(record));

  const fieldErrors = collectFieldErrors(errors.credentials, entry.credentials);

  return (
    <>
      <div style={pageStyle}>
        {backLink}

        <h2 style={titleStyle}>
          <ServiceGlyph glyph={entry.glyph} brand={entry.brand} logoSrc={entry.logoSrc} />
          {entry.name}
        </h2>

        <SettingsFormShell
          cardTitle="자격증명"
          description={`${entry.name} · ${integrationCategoryLabel(entry.category)} — ${entry.description}`}
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
          unsavedMessage={`${entry.name} 연동에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.`}
          audit={audit}
          warning={
            entry.connectionNotice === null ? null : (
              <Alert tone="info">{entry.connectionNotice}</Alert>
            )
          }
          onSubmit={(event) => void handleSubmit(onValid)(event)}
        >
          <div style={toggleRowStyle}>
            <ToggleSwitch
              checked={values.enabled}
              label={`${entry.name} 사용`}
              disabled={disabled}
              onChange={(next) => {
                setValue('enabled', next, { shouldDirty: true, shouldValidate: true });
              }}
            />
            <p style={hintStyle}>
              켜면 필수 자격증명을 모두 요구해요. 끄는 것은 언제나 할 수 있어요 — 자격증명은
              지워지지 않고 그대로 남아요.
            </p>
          </div>

          {/* 그리는 칸은 카탈로그가 정한다 — 모델 4종은 한 칸, Azure 는 네 칸이다 */}
          <AiCredentialFields
            fields={entry.credentials}
            values={values}
            register={register}
            disabled={disabled}
            errors={fieldErrors}
            changingSecrets={changingSecrets}
            onChangeSecretStart={(key) => {
              setChangingSecrets((prev) => [...prev, key]);
            }}
            onChangeSecretCancel={(key) => {
              // 입력하던 새 값을 버린다 — 저장된 키가 그대로 유지된다
              setValue(`credentials.${key}` as const, '', {
                shouldDirty: true,
                shouldValidate: true,
              });
              setChangingSecrets((prev) => prev.filter((item) => item !== key));
            }}
          />
        </SettingsFormShell>

        {/* ── 배송 정책 연결 — 택배 연동에만 붙는다 ─────────────────────────────
            자격증명이 저장돼 있다는 것과 그 택배사로 물건이 나간다는 것은 다른 사실이다.
            택배사 원장은 배송 정책이 갖고, 여기서는 **묻기만** 한다(./components/CarrierPolicyCard).
            조회기가 안 꽂혔으면 null 이고 카드는 '확인하지 못함' 을 그린다 — 모르는 것을
            '등록 안 됨' 으로 그리면 운영자가 하지 않아도 될 일을 하러 간다. */}
        {!loading && error === null && entry.carrierCode !== null && (
          <CarrierPolicyCard
            carrierCode={entry.carrierCode}
            link={carrierPolicyLink(entry.carrierCode)}
          />
        )}

        {/* ── 계약으로 열리는 API — 묶음이 있는 연동에만 붙는다 ──────────────────
            읽는 목록이지 부르는 버튼이 아니다(그 규율은 그 파일 머리말에 있다). */}
        {!loading && error === null && entry.apiPackage !== null && (
          <ApiPackageCard apiPackage={entry.apiPackage} />
        )}

        {/* ── 연결 상태 — '채워짐' 과 '검증됨' 을 가른다 ────────────────────────
            이 둘을 한 값으로 뭉치면 배포명 오타 같은 고장이 '연동 완료' 배지 뒤에 숨는다.
            우리가 아는 것은 **우리 쪽 사실**(자격증명이 저장돼 있다)뿐이고, 그 키가 실제로
            통하는지는 **상대 쪽 사실**이라 서버가 한 번 불러 봐야 안다. */}
        {!loading && error === null && (
          <Card>
            <CardTitle>연결 상태</CardTitle>

            <div style={factListStyle}>
              <div style={factRowStyle}>
                <span style={factLabelStyle}>자격증명</span>
                <StatusBadge
                  tone={usable ? 'success' : 'neutral'}
                  label={usable ? '채워짐' : '채워지지 않음'}
                />
                <span style={hintStyle}>
                  {usable
                    ? '필수 칸이 모두 저장돼 있고 사용 설정이 켜져 있어요.'
                    : '연동이 성립하려면 사용 설정을 켜고 필수 칸을 모두 저장해야 해요.'}
                </span>
              </div>

              <div style={factRowStyle}>
                <span style={factLabelStyle}>연결 검증</span>
                <StatusBadge tone="neutral" label="확인한 적 없음" />
                <span style={factValueStyle}>
                  {record?.lastVerifiedAt === null || record?.lastVerifiedAt === undefined
                    ? '-'
                    : formatAuditAt(record.lastVerifiedAt)}
                </span>
              </div>

              {/* 없는 버튼을 그리지 않는다 — 누르면 아무 일도 없거나, 성공을 지어내게 된다.
                  [근거 한 줄이 늘었다] '브라우저에서 부르지 않는다' 는 우리 취향이 아니라
                  제공자들이 자기 문서에 적어 둔 것이기도 하다(아래 문장) — 그 사실을 적어 두면
                  다음 사람이 '버튼 하나 만들면 되지 않나' 를 다시 묻지 않는다. */}
              <Alert tone="info">
                <strong>자격증명이 채워진 것과 실제로 연결되는 것은 다른 사실이에요.</strong> 연결
                검증은 서버가 이 연동 상대를 실제로 한 번 호출해 봐야 성립해요 — 브라우저에서 부르면
                키가 브라우저로 내려와야 하고, 그 순간 &lsquo;평문을 저장하지 않는다&rsquo;가 거짓이
                돼요. 그 서버 경로가 아직 없어 이 화면은 검증 결과를 지어내지 않고 &lsquo;확인한 적
                없음&rsquo;으로 둬요. <strong>제공자 공식 문서도 같은 말을 해요</strong> — 키를
                브라우저 같은 클라이언트 코드에 노출하지 말고 자체 백엔드를 거치라고 적고, 공식 SDK
                는 브라우저 사용을 기본 차단한 뒤 그것을 켜는 옵션 이름을
                &lsquo;dangerously…&rsquo;로 붙여 두었어요.
              </Alert>

              {/* ── 사용량·요금·한도는 여기 두지 않는다 ─────────────────────────────
                  넷의 조회 수단이 고르지 않고(프로그램 조회가 되는 곳과 콘솔뿐인 곳이 섞여 있다),
                  OpenAI 는 일반 API 키로 읽히지도 않는다 — **더 강한 admin 키를 하나 더 받아야**
                  한다. 받는 비밀을 늘리지 않는다는 이 섹션의 규약과 정면으로 부딪친다.
                  그래서 숫자를 들이지 않고 **갈 곳만** 가리킨다(주소를 확인한 항목만). */}
              <p style={hintStyle}>
                사용량·요금·한도는 이 화면에 없어요 — 프로바이더마다 조회 수단이 다르고, 어떤 곳은
                자격증명을 하나 더 요구해요. 값의 정본은 각 콘솔이에요.{' '}
                {entry.rateLimitUrl === null ? (
                  '이 연동은 한도 안내 주소를 확인하지 못해 링크를 걸지 않았어요.'
                ) : (
                  <a
                    href={entry.rateLimitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tds-ui-link tds-ui-focusable"
                  >
                    {entry.name} 한도 안내 열기
                  </a>
                )}
              </p>
            </div>
          </Card>
        )}
      </div>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title={`${entry.name} 연동 저장`}
          message={saveConfirmMessage(entry, getValues(), record?.enabled ?? false)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject={`${entry.name} 연동`}
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
