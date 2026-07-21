// SiteSettingsPage — 기본 설정 (라우트: /settings/site) · 시스템 설정 섹션 소유
//
// 사이트의 **이름·설명·표시 이미지·공개 범위·이용 옵션**을 정한다. 네 섹션 모두 같은 축을 쓴다:
// 왼쪽에 무엇을 정하는지(라벨·설명), 오른쪽에 실제로 정하는 것(입력·토글·업로드) — SettingLayout.
//
// [이 화면의 중심 생각 — 결과를 먼저 보여 준다]
// 여기서 정하는 값의 대부분은 **이 화면 밖에서만** 눈에 띈다: 파비콘은 브라우저 탭에, 사이트 이름과
// 설명은 카카오톡·Facebook 공유 카드에, 전용 이름은 문자 본문 앞에. 그래서 값을 받는 자리 옆에
// 결과를 함께 그린다 — 브라우저 탭 목업, OG 카드 목업, 그리고 바이트 카운터.
// 특히 OG 카드는 위 섹션의 사이트 이름·설명을 실시간으로 받는다(watch) — 그 연결이 미리보기의 요점이다.
//
// [바이트를 세는 자리] 메일·SMS 전용 이름만 **글자가 아니라 바이트**로 센다. 이 이름은 문자 본문
// 앞에 붙고, SMS 는 EUC-KR 90byte 에서 LMS 로 승격된다 — 한글 1자가 2byte 를 먹는다는 사실을
// 카운터가 입력 중에 계속 말해 준다. 계산은 마케팅 도메인의 byteLengthOf 를 **그대로 쓴다**
// (같은 규칙이 두 벌 존재하면 발송 화면과 설정 화면의 판정이 갈라진다).
//
// [동시 편집] 저장은 내가 읽은 revision 을 함께 보낸다. 다른 관리자가 먼저 저장했으면 덮어쓰지 않고
// 충돌 다이얼로그를 띄운다(EXC-04) — 입력은 그대로 살아 있다.
//
// [이 화면 밖에서 값이 실제로 읽히는 자리 — 어디에도 없던 시절이 있었다]
// 여기 저장되는 값을 읽는 화면이 한 곳도 없었다. 그래서 위의 '전용 이름은 문자 본문 앞에' 는
// 화면이 하지 않는 일을 설명하는 문장이었고, '로그인 상태 유지' 는 로그인 화면에 짝이 없었다.
// 지금은 세 값이 실제 소비자를 갖는다 — 배선은 공통 층의 조회기를 지난다
// (shared/domain/site-policy.ts · src/wiring.ts. 이 화면은 읽는 쪽을 모른다):
//   · 사이트 이름 / 전용 이름 → SMS 발송 본문·이메일/뉴스레터 제목의 접두 (marketing/_shared/messaging)
//   · 로그인 상태 유지        → 로그인 화면 '로그인 유지' 체크박스의 기본값 (pages/login)
// 남은 둘(복사 방지·모바일 확대 허용)은 **공개 사이트**의 규칙이라 관리자 화면에 소비자가 없다.
// 없는 소비자를 지어내는 대신 섹션 4 가 그 사실을 적는다.
//
// [권한] 시스템 설정은 최상위 권한이다. 수정 권한이 없으면 저장 컨트롤이 아예 없다(EXC-03).
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
// RadioCardGroup 은 @tds/ui 의 것이다 (molecule 승격) — 승격된 DS 컴포넌트는 앱 배럴을 거치지 않고
// public entry 에서 직접 가져온다 (Tabs·SegmentedControl·Empty 선례 · shared/ui README 규칙 7).
import { cssVar, RadioCardGroup } from '@tds/ui';

import { Alert, ConfirmDialog, HelpTip, ToggleSwitch, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { byteLengthOf } from '../../../shared/format';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { divergedLabels, formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { AssetField } from './components/AssetField';
import { CountedInput } from './components/CountedInput';
import { BrowserTabPreview, OgCardPreview } from './components/Previews';
import { SettingRow, SettingSection } from './components/SettingLayout';
import { SITE_FIELD_LABELS, siteSettingsKey, siteSettingsStore } from './data-source';
import { useAssetUpload } from './useAssetUpload';
import type { AssetSlot } from './useAssetUpload';
import {
  isPrivateImageEditable,
  MESSAGING_NAME_MAX_BYTES,
  SITE_DESCRIPTION_MAX,
  SITE_NAME_MAX,
  siteSettingsSchema,
} from './validation';
import type { SiteAsset, SiteSettingsValues, SiteVisibility } from './validation';

const PAGE_DESCRIPTION =
  '사이트 정보와 관련된 기본적인 설정을 합니다. 검색엔진 최적화를 위해 사이트 설명을 입력해 주세요.';

const UNSAVED_MESSAGE =
  '기본 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 기본 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

/** TODO(content): 도움말 센터가 열리면 실제 문서 주소로 바꾼다 — 지금은 자리만 잡아 둔다 */
const FAVICON_HELP_URL = 'https://help.spaceplanning.ai/site/favicon';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif';

/**
 * 공개 범위 선택지.
 *
 * RadioCardGroup(@tds/ui)은 도메인을 모른다 — onChange 로 `string` 을 준다(ADR-0003). 그래서 이
 * 목록이 **유니온의 원천**이 되고, 되돌아온 문자열은 캐스팅하지 않고 여기서 되찾아 좁힌다
 * (SegmentedControl 을 쓰는 대시보드 StatsSection 과 같은 방식).
 */
const VISIBILITY_OPTIONS: readonly {
  readonly value: SiteVisibility;
  readonly label: string;
  readonly description: string;
}[] = [
  { value: 'public', label: '전체 공개', description: '누구나 내 사이트에 접속할 수 있어요' },
  { value: 'private', label: '비공개', description: '관리자만 접근할 수 있어요' },
];

/** DS 가 돌려준 문자열을 옵션 목록에서 되찾아 좁힌다 — 'as' 없이 유니온으로 돌아온다 */
function toSiteVisibility(value: string): SiteVisibility | undefined {
  return VISIBILITY_OPTIONS.find((option) => option.value === value)?.value;
}

/* ── 스타일 ────────────────────────────────────────────────────────────────── */

const toggleAlignStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  minWidth: 0,
};

const calloutListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.4'),
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const lockedNoteStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/* ── 문구 ──────────────────────────────────────────────────────────────────── */

/** 저장 확인 문구 — 비공개 전환이면 그 사실을 앞세운다(무엇이 일어나는지 모르고 확인하지 않게) */
function saveConfirmMessage(values: SiteSettingsValues, wasPrivate: boolean): string {
  if (values.visibility === 'private' && !wasPrivate) {
    return '사이트를 비공개로 바꿉니다. 저장하는 즉시 관리자를 제외한 방문자는 사이트에 접속할 수 없습니다. 저장할까요?';
  }
  if (values.visibility === 'public' && wasPrivate) {
    return '사이트를 전체 공개로 바꿉니다. 저장하는 즉시 누구나 사이트에 접속할 수 있습니다. 저장할까요?';
  }
  return '기본 설정을 저장하면 사이트 전반에 즉시 반영됩니다. 저장할까요?';
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

export default function SiteSettingsPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(siteSettingsKey, siteSettingsStore);
  const save = useSaveSettings(siteSettingsKey, siteSettingsStore);
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
  } = useForm<SiteSettingsValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /** 확인 다이얼로그에 실을 값 — 검증을 통과한 제출 1건 */
  const [pending, setPending] = useState<SiteSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 409 — 다른 관리자가 먼저 저장했다. 최신 문서를 들고 사용자의 선택을 기다린다 */
  const [conflict, setConflict] = useState<Revisioned<SiteSettingsValues> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 설정이 도착하면 폼을 채운다 — 이 값이 dirty 판정의 기준선이 된다
  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
  }, [data, reset]);

  const siteName = watch('siteName');
  const siteDescription = watch('siteDescription');
  const siteUrl = watch('siteUrl');
  const messagingNameEnabled = watch('messagingNameEnabled');
  const messagingName = watch('messagingName');
  const favicon = watch('favicon');
  const ogImage = watch('ogImage');
  const visibility = watch('visibility');
  const privateImage = watch('privateImage');

  /** 서버가 알고 있는 공개 범위 — 확인 문구가 '여는 중인지 닫는 중인지' 를 이걸로 안다 */
  const savedPrivate = data?.value.visibility === 'private';

  // [STATE-01] 첫 로딩에서만 스켈레톤 — 재조회 중에는 이전 값을 유지한다
  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /* ── 자산 업로드 ────────────────────────────────────────────────────────── */

  const slotToField: Readonly<Record<AssetSlot, 'favicon' | 'ogImage' | 'privateImage'>> = useMemo(
    () => ({ favicon: 'favicon', ogImage: 'ogImage', privateImage: 'privateImage' }),
    [],
  );

  const onUploaded = useCallback(
    (slot: AssetSlot, asset: SiteAsset) => {
      setValue(slotToField[slot], asset, { shouldDirty: true, shouldValidate: true });
    },
    [setValue, slotToField],
  );

  const upload = useAssetUpload(onUploaded);

  const removeAsset = useCallback(
    (slot: AssetSlot) => {
      setValue(slotToField[slot], null, { shouldDirty: true, shouldValidate: true });
      upload.clearError(slot);
    },
    [setValue, slotToField, upload],
  );

  /* ── 저장 ───────────────────────────────────────────────────────────────── */

  const runSave = useCallback(
    (values: SiteSettingsValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;

      // [EXC-08] 동기 잠금 — disabled 렌더를 기다리지 않는다. 빠른 더블 클릭의 2번째가 여기서 멈춘다
      if (!lock.acquire()) return;

      setSaveError(null);

      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: values, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: () => {
            lock.release();
            if (controller.signal.aborted) return;
            // 저장한 값이 새 기준선이다 — dirty 가 풀려 이탈 가드도 함께 내려간다
            reset(values);
            setPending(null);
            setConflict(null);
            toast.success('기본 설정을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            // [EXC-09] 취소는 실패가 아니다 — 사용자가 다이얼로그를 닫은 것이다
            if (isAbort(cause) || controller.signal.aborted) return;

            // [EXC-04] 409 — 덮어쓰지 않는다. 입력을 쥔 채로 선택을 묻는다
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<SiteSettingsValues>);
              return;
            }

            setSaveError('기본 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  /** 제출 — 여기서 저장하지 않는다. 검증을 통과한 값을 쥐고 확인 다이얼로그를 세운다 */
  const onValid = useCallback((values: SiteSettingsValues) => {
    setSaveError(null);
    setPending(values);
  }, []);

  const confirmSave = useCallback(() => {
    if (pending === null) return;
    runSave(pending, false);
  }, [pending, runSave]);

  /** 취소·Esc·딤 클릭 — 진행 중이던 저장도 함께 취소한다 */
  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  /* ── 충돌 해소 ─────────────────────────────────────────────────────────── */

  /** 최신 내용으로 되돌린다 — 내 입력을 버리는 선택이다(라벨이 그렇게 말한다) */
  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null) return;
    reset(latest.value);
    setConflict(null);
    void refetch();
    toast.success('최신 기본 설정을 불러왔습니다.');
  }, [conflict, refetch, reset, toast]);

  /** 덮어쓴다 — 상대의 변경을 버리는 선택이다. force 로 토큰 검사를 건너뛴다 */
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

  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    return divergedLabels(getValues(), conflict.value, SITE_FIELD_LABELS);
  }, [conflict, getValues]);

  /* ── 파생 값 ────────────────────────────────────────────────────────────── */

  const messagingBytes = byteLengthOf(messagingName);
  // 비공개용 이미지는 비공개일 때만 효과가 있다 — 판정은 validation.ts 가 소유한다(그 근거도 거기 있다)
  const privateImageEditable = isPrivateImageEditable(visibility);

  return (
    <>
      <SettingsFormShell
        cardTitle="기본 설정"
        description={PAGE_DESCRIPTION}
        loading={loading}
        loadFailed={error !== null}
        onRetry={() => void refetch()}
        serverError={saveError !== null && pending === null ? saveError : null}
        saving={saving}
        dirty={isDirty}
        canUpdate={canUpdate}
        readOnlyNotice={READ_ONLY_NOTICE}
        unsavedMessage={UNSAVED_MESSAGE}
        audit={audit}
        warning={
          visibility === 'private' ? (
            <Alert tone="warning">
              사이트가 비공개로 설정되어 있습니다. 저장하면 관리자를 제외한 방문자는 사이트에 접속할
              수 없습니다.
            </Alert>
          ) : null
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        {/* ── 섹션 1 · 사이트 기본 정보 ─────────────────────────────────── */}
        <SettingSection id="site-basic" title="사이트 기본 정보">
          <SettingRow
            label="사이트 이름"
            htmlFor="site-name"
            hintId="site-name-hint"
            hint="브라우저 탭이나 소셜 미디어에 공유할 때 표시됩니다."
          >
            <CountedInput
              id="site-name"
              counter={`${String(siteName.length)}/${String(SITE_NAME_MAX)}`}
              disabled={disabled}
              error={errors.siteName?.message}
              hintId="site-name-hint"
              maxLength={SITE_NAME_MAX}
              placeholder="예: TDS 스페이스플래닝"
              registration={register('siteName')}
            />
          </SettingRow>

          <SettingRow
            label="사이트 설명"
            htmlFor="site-description"
            hintId="site-description-hint"
            hint="사이트를 대표하는 문장이나 키워드 사용을 추천합니다."
          >
            <CountedInput
              id="site-description"
              counter={`${String(siteDescription.length)}/${String(SITE_DESCRIPTION_MAX)}`}
              disabled={disabled}
              error={errors.siteDescription?.message}
              hintId="site-description-hint"
              maxLength={SITE_DESCRIPTION_MAX}
              placeholder="예: 공간 기획·설계·시공을 한 팀이 맡는 종합 공간 솔루션"
              registration={register('siteDescription')}
            />
          </SettingRow>

          <SettingRow
            label="메일·SMS 전용 사이트 이름"
            hintId="messaging-name-hint"
            hint="전용 이름을 지정하지 않으면 사이트 이름으로 적용됩니다."
          >
            <div style={toggleAlignStyle}>
              <ToggleSwitch
                checked={messagingNameEnabled}
                label="메일·SMS 전용 사이트 이름 사용"
                disabled={disabled}
                onChange={(next) => {
                  setValue('messagingNameEnabled', next, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
            </div>

            {/* 전용 이름 칸은 스위치를 켰을 때만 의미가 있다 — 꺼져 있으면 자리를 차지하지 않는다 */}
            {messagingNameEnabled && (
              <CountedInput
                id="messaging-name"
                // 글자 수가 아니라 **바이트**다 (한글 1자 = 2byte · EUC-KR) — 단위를 눈에 보이게 적는다
                counter={`${String(messagingBytes)}/${String(MESSAGING_NAME_MAX_BYTES)} byte`}
                disabled={disabled}
                error={errors.messagingName?.message}
                hintId="messaging-name-hint"
                placeholder="예: TDS 스페이스플래닝 고객센터"
                registration={register('messagingName')}
              />
            )}
          </SettingRow>
        </SettingSection>

        {/* ── 섹션 2 · 사이트 표시 이미지 ───────────────────────────────── */}
        <SettingSection id="site-images" title="사이트 표시 이미지">
          <SettingRow
            label="파비콘"
            hintId="favicon-hint"
            hint={
              <>
                내 웹사이트를 볼 때 브라우저 탭에 표시되는 아이콘입니다.{' '}
                <a
                  className="tds-ui-link tds-ui-focusable"
                  href={FAVICON_HELP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  자세히
                </a>
              </>
            }
          >
            <AssetField
              label="파비콘"
              asset={favicon}
              dropTitle="파일 선택 또는 끌어다 놓기"
              dropMeta="최소 16x16 / ICO"
              accept=".ico,image/x-icon,image/vnd.microsoft.icon"
              disabled={disabled}
              busy={upload.busyOf('favicon')}
              error={upload.errorOf('favicon')}
              messageId="favicon-message"
              hintId="favicon-hint"
              onSelect={(file) => upload.pick('favicon', file)}
              onRemove={() => removeAsset('favicon')}
            />

            <BrowserTabPreview
              faviconUrl={favicon?.url ?? ''}
              siteName={siteName}
              siteUrl={siteUrl}
            />
          </SettingRow>

          <SettingRow
            label="대표 이미지"
            hintId="og-image-hint"
            hint="카카오톡 또는 Facebook 등에서 링크와 함께 나타날 이미지를 설정합니다."
            help={
              <HelpTip label="대표 이미지 설명">
                링크를 공유하면 이 이미지와 함께 사이트 이름·설명이 카드로 보입니다. 가로가 세로의
                약 2배인 이미지를 권장합니다 — 비율이 다르면 가장자리가 잘립니다.
              </HelpTip>
            }
          >
            <AssetField
              label="대표 이미지"
              asset={ogImage}
              dropTitle="파일을 선택 하거나 끌어다 놓기"
              dropMeta="PNG, JPG, GIF"
              accept={IMAGE_ACCEPT}
              disabled={disabled}
              busy={upload.busyOf('ogImage')}
              error={upload.errorOf('ogImage')}
              messageId="og-image-message"
              hintId="og-image-hint"
              onSelect={(file) => upload.pick('ogImage', file)}
              onRemove={() => removeAsset('ogImage')}
            />

            {/* 위 섹션의 이름·설명을 그대로 받는다 — 고치는 즉시 카드가 바뀐다 */}
            <OgCardPreview
              imageUrl={ogImage?.url ?? ''}
              siteName={siteName}
              siteDescription={siteDescription}
              siteUrl={siteUrl}
            />
          </SettingRow>
        </SettingSection>

        {/* ── 섹션 3 · 공개 범위 ────────────────────────────────────────── */}
        <SettingSection id="site-visibility" title="공개 범위">
          <RadioCardGroup
            name="site-visibility-choice"
            legend="사이트 접근 범위"
            value={visibility}
            options={VISIBILITY_OPTIONS}
            disabled={disabled}
            onChange={(next) => {
              const narrowed = toSiteVisibility(next);
              if (narrowed === undefined) return;
              setValue('visibility', narrowed, { shouldDirty: true, shouldValidate: true });
            }}
          />

          <SettingRow
            label="비공개용 이미지"
            hintId="private-image-hint"
            hint="비공개 상태인 내 사이트에 방문했을 때 표시할 이미지를 설정합니다."
            disabled={!privateImageEditable}
          >
            {/*
              전체 공개일 때는 **잠그되 숨기지 않는다.** 이 이미지는 비공개 페이지에만 그려지므로
              지금은 효과가 없지만, 자리를 없애면 '비공개로 바꾸면 무엇을 더 정해야 하는지' 를
              미리 알 수 없다. 이미 올려 둔 값도 지우지 않는다 — 공개↔비공개를 오갈 때마다
              같은 이미지를 다시 올리게 하지 않는다 (근거: validation.isPrivateImageEditable).
            */}
            <AssetField
              label="비공개용 이미지"
              asset={privateImage}
              dropTitle="파일을 선택 하거나 끌어다 놓기"
              dropMeta="PNG, JPG, GIF"
              accept={IMAGE_ACCEPT}
              disabled={disabled || !privateImageEditable}
              busy={upload.busyOf('privateImage')}
              error={upload.errorOf('privateImage')}
              messageId="private-image-message"
              hintId="private-image-hint"
              onSelect={(file) => upload.pick('privateImage', file)}
              onRemove={() => removeAsset('privateImage')}
            />

            {!privateImageEditable && (
              <p style={lockedNoteStyle}>
                공개 범위를 비공개로 바꾸면 설정할 수 있습니다. 지금 올려 둔 이미지는 그대로
                보관됩니다.
              </p>
            )}

            <Alert tone="info">
              <ul style={calloutListStyle}>
                <li>모바일을 고려해 HD 처리하여 50% 크기로 적용됩니다.</li>
                <li>이미지를 등록하면 밝은 회색 배경에 적용됩니다.</li>
                <li>이미지를 등록하지 않으면 기본 비공개 페이지가 표시됩니다.</li>
              </ul>
            </Alert>
          </SettingRow>
        </SettingSection>

        {/* ── 섹션 4 · 사이트 이용 옵션 ─────────────────────────────────── */}
        <SettingSection id="site-options" title="사이트 이용 옵션">
          {/*
            [왜 '적용되는 곳' 을 적는가]
            이 섹션의 세 값은 **적용되는 화면이 서로 다르다.** 복사 방지와 모바일 확대 허용은
            방문자가 보는 공개 사이트의 규칙이고, 이 관리자 화면은 그것을 지키지 않는다(지킬
            이유도 없다 — 운영자는 표를 복사해 붙여 넣으며 일한다). 그 사실을 적지 않으면 화면은
            '저장하면 여기서도 복사가 막힌다' 고 약속한 것처럼 읽히고, 막히지 않는 것을 본
            운영자는 설정이 고장 났다고 판단한다. 반대로 로그인 상태 유지는 관리자 로그인 화면이
            실제로 읽는 값이라, 어디서 결과를 확인할 수 있는지 짚어 준다.
          */}
          <Alert tone="info">
            복사 방지와 모바일 확대 허용은 방문자에게 보이는 <strong>공개 사이트</strong>에
            적용됩니다. 관리자 화면에는 적용되지 않습니다.
          </Alert>

          <SettingRow
            label="복사 방지"
            hint={
              <>
                마우스 오른쪽 버튼과 복사 단축키로 콘텐츠를 복사할 수 없게 하는 기능입니다.
                <br />
                (안드로이드 앱에서는 길게 클릭해서 저장, 캡처를 할 수 없게 하는 기능)
                <br />
                공개 사이트에만 적용됩니다.
              </>
            }
          >
            <div style={toggleAlignStyle}>
              <ToggleSwitch
                checked={watch('copyProtection')}
                label="복사 방지"
                disabled={disabled}
                onChange={(next) => {
                  setValue('copyProtection', next, { shouldDirty: true });
                }}
              />
            </div>
          </SettingRow>

          <SettingRow
            label="모바일 확대 허용"
            hint="공개 사이트에만 적용됩니다. 방문자 브라우저 설정에 따라 확대 허용 방지가 동작하지 않을 수 있습니다."
          >
            <div style={toggleAlignStyle}>
              <ToggleSwitch
                checked={watch('mobileZoomAllowed')}
                label="모바일 확대 허용"
                disabled={disabled}
                onChange={(next) => {
                  setValue('mobileZoomAllowed', next, { shouldDirty: true });
                }}
              />
            </div>
          </SettingRow>

          <SettingRow
            label="로그인 상태 유지"
            hint="로그인 화면의 '로그인 유지' 체크박스 기본값입니다. 사용자가 로그인할 때 끌 수 있습니다."
          >
            <div style={toggleAlignStyle}>
              <ToggleSwitch
                checked={watch('keepSignedIn')}
                label="로그인 상태 유지"
                disabled={disabled}
                onChange={(next) => {
                  setValue('keepSignedIn', next, { shouldDirty: true });
                }}
              />
            </div>
          </SettingRow>
        </SettingSection>
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="기본 설정 저장"
          message={saveConfirmMessage(pending, savedPrivate)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="기본 설정"
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

/** 폼의 초기 골격 — 조회가 도착하면 reset() 이 실제 값으로 갈아끼운다 */
const DEFAULT_FORM_VALUES: SiteSettingsValues = {
  siteName: '',
  siteDescription: '',
  messagingNameEnabled: false,
  messagingName: '',
  siteUrl: '',
  favicon: null,
  ogImage: null,
  visibility: 'public',
  privateImage: null,
  copyProtection: true,
  mobileZoomAllowed: false,
  keepSignedIn: true,
};
