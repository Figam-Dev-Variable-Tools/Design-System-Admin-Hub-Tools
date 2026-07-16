// LanguagesPage — 언어 관리 (라우트: /settings/languages) · 시스템 설정 섹션 소유
//
// 기본 언어 · 지원 언어 목록 · 폴백 언어를 정한다.
//
// [정직한 화면] 이 앱은 **한국어 단일**이고 i18n 라이브러리가 없다. 그래서 이 화면은 설정을
// 저장할 뿐 **번역을 적용하지 않는다** — 그 사실을 감추지 않고 화면 상단에 info 배너로 밝힌다.
// 감추면 운영자는 영어를 켜 놓고 사이트가 영어로 나오길 기다리게 된다. (근거·심: ./validation.ts)
//
// [모델이 규칙을 갖는다] '기본 언어는 지원 목록에 있어야 한다' 는 화면이 아니라 스키마가 강제한다.
// 화면은 그 위에 **되돌릴 수 없는 실수를 막는 잠금**만 얹는다: 기본/폴백 언어의 체크는 끌 수 없다
// (끄면 곧바로 검증 실패가 되는 값이라, 만들 수 있게 두는 것 자체가 함정이다).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

// Checkbox 는 앱 배럴(shared/ui)이 내보내지 않아 DS public entry 에서 직접 가져온다
// (LoginForm 선례 — 배럴은 F2 소유라 이번 배치에서 넓히지 않는다. 보고서에 기재).
import { Checkbox } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  ConfirmDialog,
  errorIdOf,
  FormField,
  SelectField,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { divergedLabels, formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { LANGUAGE_FIELD_LABELS, languageSettingsKey, languageSettingsStore } from './data-source';
import { LANGUAGE_META, languageLabel, languageSettingsSchema } from './validation';
import type { LanguageCode, LanguageSettingsValues } from './validation';

const UNSAVED_MESSAGE =
  '언어 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 언어 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const SAVE_CONFIRM_MESSAGE =
  '언어 설정을 저장하면 이후 사이트가 노출하는 언어 목록이 바뀝니다. 저장할까요?';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  minWidth: 0,
};

const nativeStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const lockedStyle: CSSProperties = {
  ...nativeStyle,
  fontStyle: 'italic',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 7), 1fr))',
  gap: 'var(--tds-space-4)',
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
  borderStyle: 'none',
  borderWidth: 0,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const legendStyle: CSSProperties = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const DEFAULT_FORM_VALUES: LanguageSettingsValues = {
  defaultLanguage: 'ko',
  supported: ['ko'],
  fallback: 'ko',
};

export default function LanguagesPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(
    languageSettingsKey,
    languageSettingsStore,
  );
  const save = useSaveSettings(languageSettingsKey, languageSettingsStore);
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
  } = useForm<LanguageSettingsValues>({
    resolver: zodResolver(languageSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const [pending, setPending] = useState<LanguageSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<LanguageSettingsValues> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
  }, [data, reset]);

  const supported = watch('supported');
  const defaultLanguage = watch('defaultLanguage');
  const fallback = watch('fallback');

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /**
   * 지원 목록 토글.
   *
   * 기본/폴백 언어는 끌 수 없다 — 끄는 순간 스키마가 거부할 값이 되므로 애초에 만들지 않는다.
   * (검증으로 잡을 수도 있지만, 막을 수 있는 실수를 만들게 두고 나서 혼내지 않는다.)
   */
  const toggleSupported = useCallback(
    (code: LanguageCode, checked: boolean) => {
      const current = getValues('supported');
      const next = checked
        ? [...current, code]
        : current.filter((item: LanguageCode) => item !== code);

      // LANGUAGE_META 순서로 정규화 — 체크 순서가 저장값을 흔들지 않는다(무의미한 dirty 방지)
      const ordered = LANGUAGE_META.map((meta) => meta.code).filter((item) => next.includes(item));

      setValue('supported', ordered, { shouldDirty: true, shouldValidate: true });
    },
    [getValues, setValue],
  );

  const runSave = useCallback(
    (values: LanguageSettingsValues, force: boolean) => {
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
            toast.success('언어 설정을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<LanguageSettingsValues>);
              return;
            }
            setSaveError('언어 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  const onValid = useCallback((values: LanguageSettingsValues) => {
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
    setConflict(null);
    void refetch();
    toast.success('최신 언어 설정을 불러왔습니다.');
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

  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    return divergedLabels(getValues(), conflict.value, LANGUAGE_FIELD_LABELS);
  }, [conflict, getValues]);

  /** 지원 목록에 있는 언어만 기본/폴백이 될 수 있다 — 고를 수 없는 선택지를 보여주지 않는다 */
  const selectable = LANGUAGE_META.filter((meta) => supported.includes(meta.code));

  return (
    <>
      <SettingsFormShell
        cardTitle="언어 설정"
        description="사이트가 노출할 언어와 기본·폴백 언어를 정합니다."
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
          <Alert tone="info">
            현재 이 어드민과 사이트는 한국어로만 제공됩니다. 이 화면은 언어 정책을 저장할 뿐,
            저장한다고 화면이 번역되지는 않습니다. 실제 번역 적용은 준비 중입니다.
          </Alert>
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <fieldset style={groupStyle}>
          <legend style={legendStyle}>지원 언어</legend>

          <ul style={listStyle}>
            {LANGUAGE_META.map((meta) => {
              const checked = supported.includes(meta.code);
              // 기본/폴백은 지원 목록에서 뺄 수 없다(스키마가 거부할 상태를 만들지 않는다)
              const locked = meta.code === defaultLanguage || meta.code === fallback;

              return (
                <li key={meta.code} style={itemStyle}>
                  {/* 보이는 라벨은 Checkbox 가 그린다 — 옆에 또 쓰면 접근 가능한 이름이 두 번 읽힌다 */}
                  <Checkbox
                    id={`lang-supported-${meta.code}`}
                    label={meta.label}
                    checked={checked}
                    disabled={disabled || locked}
                    onChange={(event) => {
                      toggleSupported(meta.code, event.target.checked);
                    }}
                  />
                  <span style={nativeStyle}>{meta.native}</span>
                  {locked && (
                    <span style={lockedStyle}>
                      {meta.code === defaultLanguage ? '기본 언어' : '폴백 언어'}라 끌 수 없습니다
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {errors.supported?.message !== undefined && (
            <p id={errorIdOf('lang-supported')} role="alert" style={supportedErrorStyle}>
              {errors.supported.message}
            </p>
          )}
        </fieldset>

        <div style={rowStyle}>
          <FormField
            htmlFor="lang-default"
            label="기본 언어"
            required
            error={errors.defaultLanguage?.message ?? ''}
            hint="사이트에 처음 들어온 방문자가 보게 될 언어입니다."
          >
            <SelectField
              id="lang-default"
              disabled={disabled}
              isInvalid={errors.defaultLanguage?.message !== undefined}
              aria-describedby={
                errors.defaultLanguage?.message !== undefined
                  ? errorIdOf('lang-default')
                  : undefined
              }
              {...register('defaultLanguage')}
            >
              {selectable.map((meta) => (
                <option key={meta.code} value={meta.code}>
                  {meta.label}
                </option>
              ))}
            </SelectField>
          </FormField>

          <FormField
            htmlFor="lang-fallback"
            label="폴백 언어"
            required
            error={errors.fallback?.message ?? ''}
            hint="번역이 없는 문구를 대신 보여줄 언어입니다."
          >
            <SelectField
              id="lang-fallback"
              disabled={disabled}
              isInvalid={errors.fallback?.message !== undefined}
              aria-describedby={
                errors.fallback?.message !== undefined ? errorIdOf('lang-fallback') : undefined
              }
              {...register('fallback')}
            >
              {selectable.map((meta) => (
                <option key={meta.code} value={meta.code}>
                  {meta.label}
                </option>
              ))}
            </SelectField>
          </FormField>
        </div>

        <p style={nativeStyle}>
          기본 언어 {languageLabel(defaultLanguage)} · 폴백 {languageLabel(fallback)} · 지원{' '}
          {supported.length}개
        </p>
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="언어 설정 저장"
          message={SAVE_CONFIRM_MESSAGE}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="언어 설정"
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

const supportedErrorStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-feedback-danger-text)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};
