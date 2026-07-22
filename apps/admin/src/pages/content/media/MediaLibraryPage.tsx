// MediaLibraryPage — 미디어 라이브러리 (라우트: /content/media)
//
// 좌: 폴더 필터 / 우: 검색 + 태그 + 등록 + 자산 목록. 조회 상태의 단일 원천은 URL 이다 (IA-13).
//
// [이 화면의 핵심은 삭제 차단이다] 자산 하나하나에 **사용처**를 붙여 보여 주고, 쓰이는 중이면
// 삭제 버튼을 잠근다. 사용처를 확인할 수 없을 때도 잠근다 — '모른다' 를 '안 쓰인다' 로 뭉개면
// 홈페이지의 이미지가 조용히 깨진다(shared/domain/media-library.ts 머리말).
//
// [표가 아니라 목록인 이유] 행마다 삭제 가능 여부와 그 사유가 다르다. 공용 표 껍데기는 행 단위
// 잠금 사유를 표현할 손잡이가 없어(deletingId 하나뿐), 상품 카테고리·메뉴와 같은 카드 목록을 쓴다.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, ImageThumb, SelectField, StatusBadge } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { useCrudDelete, useCrudListQuery, useListState } from '../../../shared/crud';
import { mediaDeleteBlock, mediaUsage } from '../../../shared/domain/media-library';
import type { MediaUsageRef } from '../../../shared/domain/media-library';
import { formatNumber } from '../../../shared/format';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  buttonStyle,
  Card,
  ConfirmDialog,
  Empty,
  FilterPanel,
  FilterRail,
  hintStyle,
  Icon,
  SearchField,
  useToast,
} from '../../../shared/ui';
import { MediaAssetFormModal } from './components/MediaAssetFormModal';
import { MEDIA_FOLDERS, MEDIA_RESOURCE, mediaAssetAdapter } from './data-source';
import {
  collectTags,
  countByFolder,
  filterMediaAssets,
  FOLDER_FILTER_ALL,
  formatBytes,
  isImageExtension,
  usageLabel,
  usageTone,
} from './types';
import type { MediaAsset } from './types';

const FILTER_DEFAULTS = { folder: FOLDER_FILTER_ALL, tag: '' } as const;

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** SelectField 는 style 을 받지 않는다(토큰 보호) — 폭은 감싸는 쪽이 정한다 */
const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const fileNameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  overflowWrap: 'anywhere',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const usageListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyleType: 'none',
  marginTop: cssVar('space.2'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const FOLDER_OPTIONS = [
  { id: FOLDER_FILTER_ALL, label: '전체' },
  ...MEDIA_FOLDERS.map((folder) => ({ id: folder.id, label: folder.label })),
];

const folderLabelOf = (folderId: string): string =>
  MEDIA_FOLDERS.find((folder) => folder.id === folderId)?.label ?? '미분류';

type ModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly asset: MediaAsset };

export default function MediaLibraryPage() {
  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const folderId = list.filters['folder'] ?? FOLDER_FILTER_ALL;
  const tag = list.filters['tag'] ?? '';

  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** 사용처를 펼쳐 본 자산 — '어디에 쓰였나' 를 삭제 전에 확인하는 자리 */
  const [openUsageId, setOpenUsageId] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(MEDIA_RESOURCE, mediaAssetAdapter);
  const deleteAsset = useCrudDelete(MEDIA_RESOURCE, mediaAssetAdapter);

  const assets = useMemo(() => data ?? [], [data]);
  // [STATE-01] 스켈레톤/'불러오는 중'은 최초 로드에만 — 재조회 중에는 이전 목록을 유지한다
  const firstLoading = isFetching && data === undefined;
  const loaded = data !== undefined && error === null;

  const counts = useMemo(
    () => (loaded ? countByFolder(assets, MEDIA_FOLDERS) : null),
    [assets, loaded],
  );
  const tags = useMemo(() => collectTags(assets), [assets]);
  const visible = useMemo(
    () => filterMediaAssets(assets, folderId, tag, list.keyword),
    [assets, folderId, tag, list.keyword],
  );

  /**
   * 자산별 사용처 — 목록을 그릴 때 한 번에 모은다.
   *
   * 행마다 조회기를 부르면 렌더가 반복될 때마다 같은 질문을 수십 번 되풀이한다. 무엇보다 한
   * 화면 안의 두 행이 **서로 다른 시점의 답**을 갖게 되어, 배지와 삭제 버튼이 어긋난다.
   */
  const usageById = useMemo(() => {
    const map = new Map<string, readonly MediaUsageRef[] | null>();
    for (const asset of assets) map.set(asset.id, mediaUsage(asset.id));
    return map;
  }, [assets]);

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteAsset.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteAsset.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.fileName}' 파일을 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
      <Icon name="upload" />
      파일 등록
    </Button>
  ) : null;

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <p style={hintStyle}>
            쓰이는 중인 파일은 삭제할 수 없습니다. 사용처를 눌러 어디에 걸려 있는지 확인한 뒤 그
            화면에서 먼저 연결을 끊으세요.
          </p>
        }
      >
        <FilterPanel
          navLabel="폴더 필터"
          heading="폴더"
          options={FOLDER_OPTIONS}
          value={folderId}
          counts={counts}
          onChange={(next) => list.setFilter('folder', next)}
        />
      </FilterRail>

      <div style={mainStyle}>
        <div style={toolbarStyle}>
          <div style={toolbarLeftStyle}>
            <SearchField
              value={list.searchInput}
              onChange={list.setSearchInput}
              label="파일 이름·대체텍스트 검색"
              {...list.searchInputProps}
            />
            <span style={filterSlotStyle}>
              <SelectField
                aria-label="태그 필터"
                value={tag}
                onChange={(event) => list.setFilter('tag', event.target.value)}
              >
                <option value="">태그 전체</option>
                {tags.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectField>
            </span>
          </div>
          {createButton}
        </div>

        {error !== null ? (
          <Alert tone="danger">
            <div style={errorBodyStyle}>
              <span>파일 목록을 불러오지 못했습니다.</span>
              <Button variant="secondary" onClick={() => void refetch()}>
                다시 시도
              </Button>
            </div>
          </Alert>
        ) : (
          <Card>
            <p style={hintStyle} aria-busy={isFetching}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
            </p>

            {firstLoading ? null : visible.length === 0 ? (
              <Empty
                label="파일"
                hasQuery={list.hasQuery}
                hasActiveFilters={list.hasActiveFilters}
                onClearSearch={list.clearSearch}
                onResetFilters={list.resetFilters}
                action={createButton}
              />
            ) : (
              <ul style={listStyle}>
                {visible.map((asset) => {
                  const usage = usageById.get(asset.id) ?? null;
                  const deleteBlocked = mediaDeleteBlock(usage);
                  const count = usage === null ? null : usage.length;
                  const usageOpen = openUsageId === asset.id;
                  const usagePanelId = `media-usage-${asset.id}`;

                  return (
                    <li key={asset.id}>
                      <div style={rowStyle}>
                        <span style={rowLeftStyle}>
                          {/* 이미지가 아닌 파일에도 같은 자리를 준다 — 목록이 들쭉날쭉하지 않게 */}
                          <ImageThumb
                            src={isImageExtension(asset.extension) ? asset.url : ''}
                            alt={asset.alt}
                          />
                          <span style={metaStyle}>
                            <span style={fileNameStyle}>{asset.fileName}</span>
                            <span style={mutedStyle}>{asset.alt}</span>
                            <span style={badgeRowStyle}>
                              <StatusBadge tone="neutral" label={folderLabelOf(asset.folderId)} />
                              <StatusBadge
                                tone="neutral"
                                label={`${asset.extension.toUpperCase()} · ${formatBytes(asset.sizeBytes)}`}
                              />
                              {asset.tags.map((value) => (
                                <StatusBadge key={value} tone="neutral" label={`#${value}`} />
                              ))}
                            </span>
                          </span>
                        </span>

                        <span style={actionsStyle}>
                          {/* 사용처는 삭제를 막는 근거다 — 그 근거를 확인할 길이 같은 자리에 있어야 한다 */}
                          <button
                            type="button"
                            className="tds-ui-btn-ghost tds-ui-focusable"
                            style={buttonStyle('ghost')}
                            aria-expanded={usageOpen}
                            aria-controls={usagePanelId}
                            onClick={() => setOpenUsageId(usageOpen ? null : asset.id)}
                          >
                            <StatusBadge tone={usageTone(count)} label={usageLabel(count)} />
                          </button>

                          {canUpdate && (
                            <button
                              type="button"
                              className="tds-ui-btn-ghost tds-ui-focusable"
                              style={buttonStyle('ghost')}
                              aria-label={`${asset.fileName} 정보 수정`}
                              onClick={() => setModal({ kind: 'edit', asset })}
                            >
                              <Icon name="pencil" />
                            </button>
                          )}

                          {canRemove && (
                            <button
                              type="button"
                              className="tds-ui-btn-ghost tds-ui-focusable"
                              style={
                                deleteBlocked !== null
                                  ? buttonStyle('ghost', true)
                                  : dangerGhostStyle
                              }
                              // 못 누르는 이유를 그대로 말한다 — 화면이 사유를 다시 지어내지 않는다
                              aria-label={
                                deleteBlocked !== null
                                  ? `${asset.fileName} — ${deleteBlocked}`
                                  : `${asset.fileName} 삭제`
                              }
                              {...(deleteBlocked !== null && { title: deleteBlocked })}
                              disabled={deleteBlocked !== null || deleteAsset.isPending}
                              onClick={() => {
                                setDeleteError(null);
                                setPendingDelete(asset);
                              }}
                            >
                              <Icon name="trash" />
                            </button>
                          )}
                        </span>
                      </div>

                      {usageOpen && (
                        <div id={usagePanelId}>
                          {usage === null ? (
                            <p style={hintStyle}>
                              사용처를 확인할 수 없습니다. 확인되기 전에는 삭제할 수 없습니다.
                            </p>
                          ) : usage.length === 0 ? (
                            <p style={hintStyle}>아직 어디에도 쓰이지 않았습니다.</p>
                          ) : (
                            <ul style={usageListStyle}>
                              {usage.map((ref) => (
                                <li key={`${ref.domainLabel}-${ref.id}`} style={mutedStyle}>
                                  <a className="tds-ui-link tds-ui-focusable" href={ref.path}>
                                    {`${ref.domainLabel} · ${ref.label}`}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      {modal.kind !== 'closed' && (
        <MediaAssetFormModal
          assets={assets}
          editing={modal.kind === 'edit' ? modal.asset : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={(fileName, isEdit) => {
            setModal({ kind: 'closed' });
            toast.success(
              isEdit ? `'${fileName}' 정보를 저장했습니다.` : `'${fileName}' 파일을 등록했습니다.`,
            );
          }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="파일 삭제"
          message={`'${pendingDelete.fileName}' 파일을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="파일 삭제"
          busy={deleteAsset.isPending}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
