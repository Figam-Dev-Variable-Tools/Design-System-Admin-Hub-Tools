// 메뉴 등록/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 등록과 수정을
// 겸한다(editing 유무로 갈린다). 쓰기 배선은 공용 CRUD 프레임워크의 저수준 훅이다.
//
// [내부 페이지 목록은 조회기가 준다] 이 모달은 '페이지 관리' 라는 모듈을 알지 못한다 —
// shared/domain/site-page-catalog 가 주는 목록만 그린다. 배선 전이면 null('모른다')이고, 그때는
// 고를 수 없다는 사실을 **빈 목록이 아니라 문장으로** 알린다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { cssVar, SelectField } from '@tds/ui';

import { isAbort } from '../../../../shared/async';
import { useCrudCreate, useCrudUpdate } from '../../../../shared/crud';
import { sitePageCatalog } from '../../../../shared/domain/site-page-catalog';
import { zodResolver } from '../../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  Modal,
  useModalDirtyGuard,
} from '../../../../shared/ui';
import { MENU_RESOURCE, siteMenuAdapter } from '../data-source';
import {
  BOARD_LABEL,
  MENU_LABEL_MAX,
  MENU_LOCATION_LABEL,
  MENU_LOCATIONS,
  MENU_TARGET_KIND_LABEL,
  nextMenuOrder,
  parentCandidates,
} from '../types';
import type { MenuLocation, SiteMenu, SiteMenuInput } from '../types';
import { fromMenuTarget, siteMenuSchema, toMenuTarget } from '../validation';
import type { SiteMenuFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const TARGET_KINDS = ['page', 'external', 'board'] as const;
const BOARD_IDS = ['news', 'notices', 'faq'] as const;

interface SiteMenuFormModalProps {
  /** 지금 화면에 있는 전체 메뉴 — 상위 후보와 순서 계산이 이것을 읽는다 */
  readonly menus: readonly SiteMenu[];
  /** 수정 대상 — null 이면 등록 */
  readonly editing: SiteMenu | null;
  /** 등록 시 미리 고정할 위치 — 지금 보고 있는 탭 */
  readonly presetLocation: MenuLocation;
  /** 등록 시 미리 고정할 상위 메뉴 — '하위 메뉴 추가' 로 열면 채워진다 */
  readonly presetParentId: string | null;
  readonly onClose: () => void;
  readonly onSaved: (label: string, isEdit: boolean) => void;
}

export function SiteMenuFormModal({
  menus,
  editing,
  presetLocation,
  presetParentId,
  onClose,
  onSaved,
}: SiteMenuFormModalProps) {
  const isEdit = editing !== null;
  const initialTarget = editing === null ? null : fromMenuTarget(editing.target);

  const {
    register,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<SiteMenuFormValues>({
    resolver: zodResolver(siteMenuSchema),
    defaultValues: {
      label: editing?.label ?? '',
      location: editing?.location ?? presetLocation,
      parentId: editing?.parentId ?? presetParentId ?? '',
      targetKind: initialTarget?.targetKind ?? 'page',
      pageId: initialTarget?.pageId ?? '',
      url: initialTarget?.url ?? '',
      boardId: initialTarget?.boardId ?? 'news',
    },
  });

  const location = watch('location');
  const targetKind = watch('targetKind');

  /** 조회기가 주는 것만 그린다 — null 은 '없다' 가 아니라 '모른다' 다 */
  const catalog = useMemo(() => sitePageCatalog(), []);
  const parents = parentCandidates(menus, location, editing?.id ?? null);

  const create = useCrudCreate(MENU_RESOURCE, siteMenuAdapter);
  const update = useCrudUpdate(MENU_RESOURCE, siteMenuAdapter);
  const saving = create.isPending || update.isPending;

  /* [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다 — Esc·딤·×·취소 4경로를 함께 덮는다 */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const onValid = (values: SiteMenuFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const label = values.label.trim();
    const parentId = values.parentId === '' ? null : values.parentId;
    const input: SiteMenuInput = {
      location: values.location,
      parentId,
      label,
      target: toMenuTarget(values),
      visible: editing?.visible ?? true,
      // 등록이면 저장소가 다시 계산한다. 수정이면 지금 자리를 지킨다 — 저장이 순서를 흔들지 않는다
      order: editing?.order ?? nextMenuOrder(menus, values.location, parentId),
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        { onSuccess: () => onSaved(label, true), onError },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      { onSuccess: () => onSaved(label, false), onError },
    );
  };

  const labelField = register('label');
  const labelInvalid = errors.label !== undefined;

  return (
    <>
      <Modal
        title={isEdit ? '메뉴 수정' : '메뉴 추가'}
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => labelRef.current?.focus())();
        }}
        initialFocusRef={labelRef}
        footer={
          <>
            <Button variant="secondary" size="md" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <FormField
            htmlFor="site-menu-label"
            label="메뉴 이름"
            required
            error={errors.label?.message}
          >
            <input
              id="site-menu-label"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(labelInvalid)}
              maxLength={MENU_LABEL_MAX}
              placeholder="예: 사업영역"
              disabled={saving}
              aria-invalid={labelInvalid}
              aria-describedby={labelInvalid ? errorIdOf('site-menu-label') : undefined}
              name={labelField.name}
              ref={(element) => {
                labelField.ref(element);
                labelRef.current = element;
              }}
              onChange={labelField.onChange}
              onBlur={labelField.onBlur}
            />
          </FormField>

          <FormField htmlFor="site-menu-location" label="위치" required>
            <SelectField id="site-menu-location" disabled={saving} {...register('location')}>
              {MENU_LOCATIONS.map((value) => (
                <option key={value} value={value}>
                  {MENU_LOCATION_LABEL[value]}
                </option>
              ))}
            </SelectField>
          </FormField>

          <FormField
            htmlFor="site-menu-parent"
            label="상위 메뉴"
            hint="선택하지 않으면 1단계 메뉴가 됩니다. 메뉴는 2단계까지 만들 수 있습니다."
          >
            <SelectField id="site-menu-parent" disabled={saving} {...register('parentId')}>
              <option value="">없음 (1단계)</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </SelectField>
          </FormField>

          <FormField htmlFor="site-menu-target-kind" label="링크 대상" required>
            <SelectField id="site-menu-target-kind" disabled={saving} {...register('targetKind')}>
              {TARGET_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {MENU_TARGET_KIND_LABEL[kind]}
                </option>
              ))}
            </SelectField>
          </FormField>

          {/* 고른 종류의 칸만 그린다 — 나머지 값은 폼이 계속 들고 있어 되돌아와도 사라지지 않는다 */}
          {targetKind === 'page' &&
            (catalog === null ? (
              <Alert tone="warning">
                페이지 목록을 불러올 수 없어 지금은 내부 페이지를 고를 수 없습니다. 외부 링크나
                게시판을 선택하거나, 잠시 후 다시 시도해 주세요.
              </Alert>
            ) : (
              <FormField
                htmlFor="site-menu-page"
                label="연결할 페이지"
                required
                error={errors.pageId?.message}
              >
                <SelectField
                  id="site-menu-page"
                  disabled={saving}
                  isInvalid={errors.pageId !== undefined}
                  {...register('pageId')}
                >
                  <option value="">선택</option>
                  {catalog.map((page) => (
                    <option key={page.id} value={page.id}>
                      {`${page.title} (/${page.slug})${page.published ? '' : ' · 공개 전'}`}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            ))}

          {targetKind === 'external' && (
            <FormField
              htmlFor="site-menu-url"
              label="외부 주소"
              required
              error={errors.url?.message}
              hint="http:// 또는 https:// 로 시작해야 합니다."
            >
              <input
                id="site-menu-url"
                type="url"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.url !== undefined)}
                placeholder="https://example.com/blog"
                disabled={saving}
                aria-invalid={errors.url !== undefined}
                aria-describedby={errors.url !== undefined ? errorIdOf('site-menu-url') : undefined}
                {...register('url')}
              />
            </FormField>
          )}

          {targetKind === 'board' && (
            <FormField htmlFor="site-menu-board" label="게시판" required>
              <SelectField id="site-menu-board" disabled={saving} {...register('boardId')}>
                {BOARD_IDS.map((boardId) => (
                  <option key={boardId} value={boardId}>
                    {BOARD_LABEL[boardId]}
                  </option>
                ))}
              </SelectField>
            </FormField>
          )}
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
