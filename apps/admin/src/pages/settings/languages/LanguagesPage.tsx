// LanguagesPage — 다국어 설정 (라우트: /settings/languages) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 정하는 것 ───────────────────────────────────────────────────────┐
// │ 언어 × 지역, 기본 언어, URL 전략, 지역별 사이트명. **번역 본문은 여기 없다** —  │
// │ 본문은 각 작성 화면(공지·FAQ·회사소개)이 갖고, 이 화면은 '무엇이 아직 안 됐나' │
// │ 만 답한다.                                                                │
// │                                                                          │
// │ 통화·시간대 입력 칸이 없는 것이 실수가 아니다: 그 둘은 **지역**이 갖는다        │
// │ (./types.ts 머리말). 'en' 하나로는 USD 인지 GBP 인지 정할 수 없다.            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [번역 대상은 발행된 것만] 목록은 조회기가 준다(shared/domain/translatable-catalog.ts).
// 미배선이면 **빈 목록이 아니라 '모른다'** 로 그린다 — 0건이라고 적으면 운영자는 번역이 끝났다고
// 판단한다.
//
// [파생값을 저장하지 않는다] 미번역 수·폴백 제목·URL 미리보기는 매번 계산한다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, RadioCardGroup, Skeleton, StatusBadge, ToggleSwitch } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  controlStyle,
  hintStyle,
  Icon,
  SelectField,
  tableStyle,
  tdStyle,
  thStyle,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { translatableEntries } from '../../../shared/domain/translatable-catalog';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { divergedLabels, formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import {
  fetchTranslationIndex,
  languageSettingsKey,
  languageSettingsStore,
  LANGUAGE_FIELD_LABELS,
} from './data-source';
import {
  addLocaleBlock,
  localeUrlOf,
  missingCountOf,
  regionSummaryOf,
  removeLocaleBlock,
  saveBlock,
  setDefaultBlock,
  translationRowsOf,
} from './rules';
import {
  isUrlStrategy,
  LANGUAGES,
  localeIdOf,
  localeLabelOf,
  REGIONS,
  translationLabel,
  translationTone,
  URL_STRATEGIES,
} from './types';
import type { LanguageSettingsDoc, LocaleEntry } from './types';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 다국어 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

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

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
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

const controlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const addRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const scrollStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const urlStyle: CSSProperties = {
  fontFamily: cssVar('typography.code.md.font-family'),
  fontSize: cssVar('typography.code.md.font-size'),
  color: cssVar('color.text.muted'),
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

  const [draft, setDraft] = useState<LanguageSettingsDoc | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState<LanguageSettingsDoc | null>(null);
  const [conflict, setConflict] = useState<Revisioned<LanguageSettingsDoc> | null>(null);

  const [newLanguage, setNewLanguage] = useState<string>('');
  const [newRegion, setNewRegion] = useState<string>('');
  const [viewLocaleId, setViewLocaleId] = useState<string>('');

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 설정이 도착하면 초안의 기준선이 된다
  useEffect(() => {
    if (data === undefined) return;
    setDraft(data.value);
    setRejected(null);
  }, [data]);

  const doc = draft ?? data?.value ?? null;
  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const dirty =
    doc !== null && data !== undefined && JSON.stringify(doc) !== JSON.stringify(data.value);

  /* ── 초안 조작 ─────────────────────────────────────────────────────────── */

  const patch = (next: Partial<LanguageSettingsDoc>) => {
    setDraft((current) => (current === null ? current : { ...current, ...next }));
    setRejected(null);
  };

  const patchLocale = (localeId: string, next: Partial<LocaleEntry>) => {
    setDraft((current) =>
      current === null
        ? current
        : {
            ...current,
            locales: current.locales.map((locale) =>
              locale.id === localeId ? { ...locale, ...next } : locale,
            ),
          },
    );
    setRejected(null);
  };

  const addLocale = () => {
    if (doc === null) return;
    const block = addLocaleBlock(doc.locales, newLanguage, newRegion);
    if (block !== null) {
      setRejected(block);
      return;
    }

    const id = localeIdOf(newLanguage, newRegion);
    patch({
      locales: [
        ...doc.locales,
        {
          id,
          languageId: newLanguage,
          regionId: newRegion,
          siteName: '',
          urlKey: newLanguage,
          published: false,
        },
      ],
    });
    setNewLanguage('');
    setNewRegion('');
  };

  const removeLocale = (localeId: string) => {
    if (doc === null) return;
    const block = removeLocaleBlock(doc, localeId);
    if (block !== null) {
      setRejected(block);
      return;
    }
    patch({ locales: doc.locales.filter((locale) => locale.id !== localeId) });
  };

  const makeDefault = (locale: LocaleEntry) => {
    const block = setDefaultBlock(locale);
    if (block !== null) {
      setRejected(block);
      return;
    }
    patch({ defaultLocaleId: locale.id });
  };

  /* ── 저장 ──────────────────────────────────────────────────────────────── */

  const runSave = useCallback(
    (value: LanguageSettingsDoc, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;
      // [EXC-08] 동기 잠금 — 빠른 더블 클릭의 두 번째가 여기서 멈춘다
      if (!lock.acquire()) return;

      setSaveError(null);
      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: (saved) => {
            lock.release();
            if (controller.signal.aborted) return;
            setDraft(saved.value);
            setPending(null);
            setConflict(null);
            toast.success('다국어 설정을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return;

            // [EXC-04] 409 — 덮어쓰지 않는다. 초안을 쥔 채로 선택을 묻는다
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<LanguageSettingsDoc>);
              return;
            }

            setSaveError('다국어 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, save, toast],
  );

  const submit = () => {
    if (doc === null) return;
    const block = saveBlock(doc);
    if (block !== null) {
      setRejected(block);
      return;
    }
    setRejected(null);
    setPending(doc);
  };

  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  const conflictFields = useMemo(() => {
    if (conflict === null || doc === null) return [];
    return divergedLabels(doc, conflict.value, LANGUAGE_FIELD_LABELS);
  }, [conflict, doc]);

  /* ── 번역 현황 ─────────────────────────────────────────────────────────── */

  const entries = translatableEntries();
  const index = useMemo(() => fetchTranslationIndex(), []);

  const selectedLocaleId =
    viewLocaleId !== '' && doc?.locales.some((locale) => locale.id === viewLocaleId) === true
      ? viewLocaleId
      : (doc?.locales.find((locale) => locale.id !== doc.defaultLocaleId)?.id ?? '');

  const rows = useMemo(
    () =>
      entries === null || selectedLocaleId === ''
        ? []
        : translationRowsOf(entries, selectedLocaleId, index),
    [entries, selectedLocaleId, index],
  );

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={controlsStyle}>
            <span>다국어 설정을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        언어와 지역, 기본 언어, 주소 전략을 정합니다. 통화·시간대는 언어가 아니라{' '}
        <strong>지역</strong>이 갖습니다 — 같은 영어라도 미국과 영국의 통화가 다릅니다.
      </p>

      {rejected !== null && <Alert tone="danger">{rejected}</Alert>}
      {saveError !== null && pending === null && <Alert tone="danger">{saveError}</Alert>}
      {!canUpdate && <Alert tone="info">{READ_ONLY_NOTICE}</Alert>}

      {loading || doc === null ? (
        <div aria-busy="true" aria-label="다국어 설정을 불러오는 중">
          <Skeleton />
        </div>
      ) : (
        <>
          <Card>
            <CardTitle>주소 전략</CardTitle>
            <p style={hintStyle}>
              하나만 고릅니다. 둘 다 열어 두면 같은 문서가 두 주소로 존재해 검색엔진이 중복으로
              봅니다.
            </p>

            <RadioCardGroup
              legend="주소 전략"
              name="url-strategy"
              value={doc.urlStrategy}
              options={URL_STRATEGIES.map((strategy) => ({
                value: strategy.id,
                label: strategy.label,
                description: strategy.description,
              }))}
              disabled={!canUpdate || saving}
              onChange={(value) => {
                if (isUrlStrategy(value)) patch({ urlStrategy: value });
              }}
            />

            <label htmlFor="languages-base-host" style={hintStyle}>
              기준 도메인 — 언어별 주소가 이것으로 만들어집니다.
            </label>
            <input
              id="languages-base-host"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={doc.baseHost}
              disabled={!canUpdate || saving}
              placeholder="example.com"
              onChange={(event) => {
                patch({ baseHost: event.target.value });
              }}
            />
          </Card>

          <Card>
            <CardTitle>언어 · 지역</CardTitle>
            <p style={hintStyle}>
              기본 언어는 번역되지 않은 항목이 돌아가는 곳입니다 — 지울 수 없습니다.
            </p>

            {doc.locales.map((locale) => {
              const isDefault = locale.id === doc.defaultLocaleId;
              const summary = regionSummaryOf(locale.regionId);

              return (
                <div key={locale.id} style={rowStyle}>
                  <div style={infoStyle}>
                    <span style={titleRowStyle}>
                      <span style={labelStyle}>{localeLabelOf(locale)}</span>
                      {isDefault && <StatusBadge tone="info" label="기본 언어" />}
                      <StatusBadge
                        tone={locale.published ? 'success' : 'neutral'}
                        label={locale.published ? '공개' : '비공개'}
                      />
                    </span>
                    {/* 통화·시간대는 지역에서 온다 — 여기서 고칠 수 있는 값이 아니다 */}
                    <span style={hintStyle}>{summary ?? '지역 정보를 찾을 수 없습니다.'}</span>
                    <span style={urlStyle}>
                      {localeUrlOf(doc.urlStrategy, doc.baseHost, locale, isDefault)}
                    </span>

                    <input
                      type="text"
                      aria-label={`${localeLabelOf(locale)} 사이트명`}
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(false)}
                      value={locale.siteName}
                      disabled={!canUpdate || saving}
                      placeholder="이 지역에서 쓸 사이트명"
                      onChange={(event) => {
                        patchLocale(locale.id, { siteName: event.target.value });
                      }}
                    />
                    <input
                      type="text"
                      aria-label={`${localeLabelOf(locale)} URL 키`}
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(false)}
                      value={locale.urlKey}
                      disabled={!canUpdate || saving}
                      placeholder="en"
                      onChange={(event) => {
                        patchLocale(locale.id, { urlKey: event.target.value });
                      }}
                    />
                  </div>

                  <div style={controlsStyle}>
                    <ToggleSwitch
                      checked={locale.published}
                      label={`${localeLabelOf(locale)} 공개`}
                      onLabel="공개"
                      offLabel="비공개"
                      disabled={!canUpdate || saving}
                      onChange={(next) => {
                        patchLocale(locale.id, { published: next });
                      }}
                    />
                    {canUpdate && !isDefault && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={saving}
                          onClick={() => {
                            makeDefault(locale);
                          }}
                        >
                          기본으로
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => {
                            removeLocale(locale.id);
                          }}
                        >
                          <Icon name="trash" />
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {canUpdate && (
              <div style={addRowStyle}>
                <span style={selectWrapStyle}>
                  <SelectField
                    aria-label="추가할 언어"
                    value={newLanguage}
                    disabled={saving}
                    onChange={(event) => {
                      setNewLanguage(event.target.value);
                    }}
                  >
                    <option value="">언어 선택</option>
                    {LANGUAGES.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.label} ({language.nativeLabel})
                      </option>
                    ))}
                  </SelectField>
                </span>
                <span style={selectWrapStyle}>
                  <SelectField
                    aria-label="추가할 지역"
                    value={newRegion}
                    disabled={saving}
                    onChange={(event) => {
                      setNewRegion(event.target.value);
                    }}
                  >
                    <option value="">지역 선택</option>
                    {REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.label} · {region.currency} · {region.timeZone}
                      </option>
                    ))}
                  </SelectField>
                </span>
                <Button variant="secondary" size="md" disabled={saving} onClick={addLocale}>
                  <Icon name="plus-circle" />
                  언어 추가
                </Button>
              </div>
            )}

            {canUpdate && (
              <div style={actionsStyle}>
                <p style={hintStyle}>
                  {saving
                    ? '저장하는 중입니다…'
                    : dirty
                      ? '저장하지 않은 변경 사항이 있습니다.'
                      : '변경 사항이 없습니다.'}
                </p>
                <Button variant="primary" size="md" disabled={!dirty || saving} onClick={submit}>
                  {saving ? '저장 중…' : '저장'}
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>번역 현황</CardTitle>
            <p style={hintStyle}>
              발행된 항목만 번역 대상입니다. 초안을 번역하면 발행 직전에 원문이 바뀌어 그 작업이
              버려집니다. 미번역 항목은 <strong>기본 언어로 폴백</strong>합니다.
            </p>

            {entries === null ? (
              <Alert tone="warning">
                번역 대상 목록을 확인할 수 없어 현황을 <strong>표시하지 못했습니다</strong>. 대상이
                없다는 뜻이 아닙니다 — 콘텐츠 연동을 확인해 주세요.
              </Alert>
            ) : selectedLocaleId === '' ? (
              <p style={hintStyle}>기본 언어 외의 언어를 추가하면 번역 현황이 나타납니다.</p>
            ) : (
              <>
                <span style={selectWrapStyle}>
                  <SelectField
                    aria-label="번역 현황을 볼 언어"
                    value={selectedLocaleId}
                    onChange={(event) => {
                      setViewLocaleId(event.target.value);
                    }}
                  >
                    {doc.locales
                      .filter((locale) => locale.id !== doc.defaultLocaleId)
                      .map((locale) => (
                        <option key={locale.id} value={locale.id}>
                          {localeLabelOf(locale)}
                        </option>
                      ))}
                  </SelectField>
                </span>

                <p style={hintStyle}>
                  전체 {formatNumber(rows.length)}건 · 미번역 {formatNumber(missingCountOf(rows))}건
                </p>

                <div style={scrollStyle}>
                  <table style={tableStyle}>
                    <caption style={hintStyle}>
                      번역 현황 — 미번역 항목은 기본 언어의 제목이 그대로 보입니다.
                    </caption>
                    <thead>
                      <tr>
                        <th style={thStyle} scope="col">
                          종류
                        </th>
                        <th style={thStyle} scope="col">
                          제목
                        </th>
                        <th style={thStyle} scope="col">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.entryId}>
                          <td style={tdStyle}>{row.kindLabel}</td>
                          <td style={tdStyle}>{row.title}</td>
                          <td style={tdStyle}>
                            <StatusBadge
                              tone={translationTone(row.state)}
                              label={translationLabel(row.state)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {audit !== null && (
            <p style={hintStyle}>
              마지막 변경: {audit.updatedBy} · {formatAuditAt(audit.updatedAt)}
            </p>
          )}
        </>
      )}

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="다국어 설정 저장"
          message="저장하는 즉시 공개된 언어의 주소가 바뀝니다. 기존 주소로 들어온 링크는 더 이상 같은 문서를 가리키지 않을 수 있습니다. 저장할까요?"
          busy={saving}
          error={saveError}
          onConfirm={() => {
            runSave(pending, false);
          }}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="다국어 설정"
          latestBy={conflict.audit.updatedBy}
          latestAt={formatAuditAt(conflict.audit.updatedAt)}
          divergedFields={conflictFields}
          busy={saving}
          error={saveError}
          onReload={() => {
            setDraft(conflict.value);
            setConflict(null);
            void refetch();
            toast.success('최신 다국어 설정을 불러왔습니다.');
          }}
          onOverwrite={() => {
            if (doc !== null) runSave(doc, true);
          }}
          onClose={closeConflict}
        />
      )}
    </div>
  );
}
