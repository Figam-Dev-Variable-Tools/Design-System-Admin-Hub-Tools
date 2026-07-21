// CategoriesPage — 문의 유형 관리 (라우트: /support/categories)
//
// 목록 + 추가/수정 모달 + 삭제팝업. **사용 중 차단**: 그 유형을 쓰는 티켓/템플릿이 1건이라도 있으면
// 삭제 버튼을 잠근다(고아 참조 방지 — 국내 CS 관례: 참조되는 데이터는 하드 삭제하지 않는다).
// 사용여부(active) 소프트 비활성으로 신규 선택에서만 숨길 수 있다. 배선은 CRUD 저수준 훅이다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
  Card,
  ConfirmDialog,
  hintStyle,
  Icon,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import { DetailCellLink, useCrudDelete, useCrudListQuery } from '../../../shared/crud';
import { CATEGORY_RESOURCE, supportCategoryAdapter } from './data-source';
import { CategoryFormModal } from './components/CategoryFormModal';
import { categoryInUse, categoryUsageLabel } from '../_shared/domain';
import type { SupportCategoryUsage } from '../_shared/domain';
import { cssVar } from '@tds/ui';

const pageStyle: CSSProperties = {
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

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
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
  gap: cssVar('space.2'),
  minWidth: 0,
  flexWrap: 'wrap',
};

const labelTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
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

/**
 * 사용 건수 배지가 여는 목록.
 *
 * 티켓 목록은 유형을 `?category=` 로 URL 이 소유한다(IA-13) — 그 유형만 걸러 열 수 있다.
 * **답변 템플릿 목록에는 유형 필터가 없다**: 조회 수단이 검색뿐이고 그 검색은 제목·본문만 훑어
 * 유형 이름으로 찾아지지 않는다(support/_shared/domain.ts 의 searchTemplates). 그래서 템플릿 쪽은
 * 걸러진 링크를 지어내지 않고 **그냥 목록**으로 보낸다 — 걸러졌다고 말해 놓고 안 걸러진 목록을
 * 보여 주는 것이 가장 나쁘다. 템플릿 목록에 유형 필터가 생기면 여기도 ?category= 를 붙인다.
 */
const TICKET_LIST_PATH = '/support/tickets';
const TEMPLATE_LIST_PATH = '/support/replies';

type ModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly category: SupportCategoryUsage };

interface CategoryRowProps {
  readonly category: SupportCategoryUsage;
  readonly deleting: boolean;
  readonly onEdit: (category: SupportCategoryUsage) => void;
  readonly onDelete: (category: SupportCategoryUsage) => void;
}

function CategoryRow({ category, deleting, onEdit, onDelete }: CategoryRowProps) {
  const inUse = categoryInUse(category);
  const usage = categoryUsageLabel(category);
  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        <span style={labelTextStyle}>{category.label}</span>
        <StatusBadge
          tone={category.active ? 'success' : 'neutral'}
          label={category.active ? '사용' : '미사용'}
        />
        {/* 참조 건수는 **삭제를 막는 근거**다 — 근거를 확인할 길이 같은 자리에 있어야 한다.
            티켓과 템플릿은 사는 곳이 다르므로 배지도 목적지도 둘로 나눈다(합계 하나로는 어디로
            가야 할지 알 수 없다). 0건인 쪽은 아예 그리지 않는다 — 열어 봐야 빈 목록이다. */}
        {inUse ? (
          <>
            {category.ticketCount > 0 && (
              <DetailCellLink
                to={`${TICKET_LIST_PATH}?category=${encodeURIComponent(category.id)}`}
                ariaLabel={`'${category.label}' 유형의 문의 ${formatNumber(category.ticketCount)}건 보기`}
              >
                <StatusBadge tone="info" label={`티켓 ${formatNumber(category.ticketCount)}`} />
              </DetailCellLink>
            )}
            {category.templateCount > 0 && (
              <DetailCellLink
                to={TEMPLATE_LIST_PATH}
                ariaLabel={`'${category.label}' 유형을 쓰는 답변 템플릿 ${formatNumber(category.templateCount)}건 — 템플릿 목록 열기`}
              >
                <StatusBadge tone="info" label={`템플릿 ${formatNumber(category.templateCount)}`} />
              </DetailCellLink>
            )}
          </>
        ) : (
          <StatusBadge tone="neutral" label={usage} />
        )}
      </span>
      <span style={actionsStyle}>
        <button
          type="button"
          className="tds-ui-btn-ghost tds-ui-focusable"
          style={buttonStyle('ghost')}
          aria-label={`${category.label} 수정`}
          onClick={() => onEdit(category)}
        >
          <Icon name="pencil" />
        </button>
        <button
          type="button"
          className="tds-ui-btn-ghost tds-ui-focusable"
          style={inUse ? buttonStyle('ghost', true) : dangerGhostStyle}
          aria-label={
            inUse ? `${category.label} — ${usage}라 삭제할 수 없습니다` : `${category.label} 삭제`
          }
          title={inUse ? `${usage} — 삭제할 수 없습니다` : undefined}
          disabled={inUse || deleting}
          onClick={() => onDelete(category)}
        >
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}

export default function CategoriesPage() {
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<SupportCategoryUsage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(
    CATEGORY_RESOURCE,
    supportCategoryAdapter,
  );

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만** 뜬다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 그래서 invalidate 가 걸릴
   * 때마다 **이미 채워져 있던 행이 스켈레톤으로 지워졌다** — 표를 훑던 운영자 밑에서 데이터가
   * 사라진다. 'refetch 중에는 이전 행을 유지한다' 가 react-query 를 쓰는 이유 그 자체인데
   * (ADR-0008 §3.2) 화면이 그 이득을 스스로 버리고 있었다.
   * (정의는 공유 useCrudList 와 글자까지 같다 — 이 화면은 그 훅을 쓰지 않아 규칙만 같이 둔다.)
   */
  const firstLoading = isFetching && data === undefined;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  const refreshing = isFetching && data !== undefined;
  const deleteCategory = useCrudDelete(CATEGORY_RESOURCE, supportCategoryAdapter);
  const deleting = deleteCategory.isPending;
  const categories = data ?? [];

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteCategory.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteCategory.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.label}' 유형을 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onSaved = (name: string, isEdit: boolean) => {
    setModal({ kind: 'closed' });
    toast.success(isEdit ? `'${name}' 유형을 저장했습니다.` : `'${name}' 유형을 추가했습니다.`);
  };

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <p style={hintStyle}>
          {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(categories.length)}개`}
          {refreshing && ' · 새로고침 중…'}
        </p>
        <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
          <Icon name="plus-circle" />
          유형 추가
        </Button>
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>문의 유형을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      ) : (
        <Card>
          {categories.length === 0 ? (
            <p style={hintStyle}>
              {firstLoading ? '불러오는 중…' : '등록된 문의 유형이 없습니다.'}
            </p>
          ) : (
            <ul style={listStyle}>
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  deleting={deleting}
                  onEdit={(target) => setModal({ kind: 'edit', category: target })}
                  onDelete={(target) => {
                    setDeleteError(null);
                    setPendingDelete(target);
                  }}
                />
              ))}
            </ul>
          )}
          <p style={hintStyle}>
            사용 중인 유형은 삭제할 수 없습니다 — 건수 배지를 누르면 그 유형을 쓰는 문의 목록(또는
            답변 템플릿 목록)이 열립니다. 거기서 유형을 바꾸거나, 사용여부를 꺼서 신규 선택에서
            숨기세요.
          </p>
        </Card>
      )}

      {modal.kind !== 'closed' && (
        <CategoryFormModal
          editing={modal.kind === 'edit' ? modal.category : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={onSaved}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="문의 유형 삭제"
          message={`'${pendingDelete.label}' 유형을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="유형 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
