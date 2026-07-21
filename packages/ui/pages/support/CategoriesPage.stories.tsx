/**
 * Design System/Templates/Support/Inquiry Categories — 문의 유형 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Support"(고객센터)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Support 그룹에서 확정된다. 화면 영문명은 `/support/categories` → "Inquiry Categories"(경로가 이름을
 * 담지 못해 한국어 라벨 '문의 유형'의 뜻을 살려 붙인 예외).
 *
 * 대응 실화면: apps/admin/src/pages/support/categories/CategoriesPage.tsx (라우트 /support/categories)
 * 와 그 하위 조립(components/CategoryFormModal.tsx). 목록 + 추가/수정 모달 + 삭제 확인. **사용 중 차단**:
 * 그 유형을 쓰는 티켓/템플릿이 1건이라도 있으면 삭제 버튼을 잠근다(고아 참조 방지). 사용여부(active)는
 * 소프트 비활성으로 신규 선택에서만 숨긴다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다. 실화면 조각을 DS 표면으로 갈음한다:
 *   요약 + 추가 CTA           → 토큰만 쓴 <p> + Button(primary) + Icon(plus-circle)
 *   카드 표면                 → Card
 *   행 목록                   → 토큰만 쓴 <ul>/<li> (라벨 + StatusBadge ×2 + IconButton ×2)
 *   사용여부 배지             → StatusBadge (active → '사용'(success) / '미사용'(neutral))
 *   사용량 배지               → StatusBadge (categoryUsageLabel 미러: '사용 안 함' / '티켓 N · 템플릿 N')
 *   수정/삭제 버튼            → IconButton + Icon(pencil/trash) (사용 중이면 삭제 disabled)
 *   조회 실패 배너            → Alert(danger) + Button(secondary)
 *   추가/수정 모달            → Modal + TextField + ToggleSwitch(사용여부)
 *   삭제 확인                 → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  IconButton,
  Modal,
  StatusBadge,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Inquiry Categories',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/domain SupportCategoryUsage 미러) ─────────────────────────────── */

const CATEGORY_LABEL_MAX = 30;

interface DemoCategory {
  readonly id: string;
  readonly label: string;
  /** 사용여부 — 끄면 신규 문의/템플릿의 유형 선택에서 숨는다(기존 참조는 유지) */
  readonly active: boolean;
  readonly ticketCount: number;
  readonly templateCount: number;
}

const DEMO_CATEGORIES: readonly DemoCategory[] = [
  { id: 'order', label: '주문/결제', active: true, ticketCount: 12, templateCount: 3 },
  { id: 'delivery', label: '배송', active: true, ticketCount: 7, templateCount: 2 },
  { id: 'refund', label: '교환/환불', active: true, ticketCount: 4, templateCount: 1 },
  { id: 'product', label: '제품 문의', active: false, ticketCount: 2, templateCount: 0 },
  { id: 'etc', label: '기타', active: true, ticketCount: 0, templateCount: 0 },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 참조 중이면(티켓·템플릿 합 > 0) 삭제할 수 없다 — 실화면 categoryInUse 미러 */
const categoryInUse = (category: DemoCategory): boolean =>
  category.ticketCount + category.templateCount > 0;

/** 사용량 문구 — '사용 안 함' / '티켓 N · 템플릿 N' — 실화면 categoryUsageLabel 미러 */
const categoryUsageLabel = (category: DemoCategory): string => {
  const total = category.ticketCount + category.templateCount;
  if (total === 0) return '사용 안 함';
  return `티켓 ${String(category.ticketCount)} · 템플릿 ${String(category.templateCount)}`;
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
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
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

/* ── 행 ───────────────────────────────────────────────────────────────────────────────────── */

interface CategoryRowProps {
  readonly category: DemoCategory;
  readonly onEdit: (category: DemoCategory) => void;
  readonly onDelete: (category: DemoCategory) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
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
        <StatusBadge tone={inUse ? 'info' : 'neutral'} label={usage} />
      </span>
      <span style={actionsStyle}>
        <IconButton
          icon={<Icon name="pencil" />}
          label={`${category.label} 수정`}
          size="sm"
          onClick={() => onEdit(category)}
        />
        {/* 사용 중이면 삭제를 잠근다 — 배지의 사용량이 이유를 함께 전달한다(색만으로 전달 금지) */}
        <IconButton
          icon={<Icon name="trash" />}
          label={
            inUse ? `${category.label} — ${usage}라 삭제할 수 없습니다` : `${category.label} 삭제`
          }
          size="sm"
          disabled={inUse}
          onClick={() => onDelete(category)}
        />
      </span>
    </li>
  );
}

/* ── 추가/수정 모달 ────────────────────────────────────────────────────────────────────────── */

interface CategoryModalProps {
  readonly editing: DemoCategory | null;
  readonly onClose: () => void;
}

function CategoryModal({ editing, onClose }: CategoryModalProps) {
  const isEdit = editing !== null;
  const [name, setName] = useState(editing?.label ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const nameRef = useRef<HTMLInputElement | null>(null);

  return (
    <Modal
      title={isEdit ? '문의 유형 수정' : '문의 유형 추가'}
      onClose={onClose}
      onSubmit={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="md" type="submit">
            {isEdit ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <div style={modalBodyStyle}>
        {/* TextField 가 라벨·필수 마커를 소유한다 — FormField 로 감싸면 라벨이 이중으로 그려진다 */}
        <TextField
          id="support-category-label"
          label="유형 이름"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 주문/결제"
          maxLength={CATEGORY_LABEL_MAX}
        />

        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>사용여부</span>
          <ToggleSwitch
            checked={active}
            onChange={setActive}
            label="유형 사용여부"
            onLabel="사용"
            offLabel="미사용"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

type ModalState =
  { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: DemoCategory };

interface CategoriesScreenProps {
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly categories?: readonly DemoCategory[];
  readonly initialModal?: ModalState;
  readonly initialDeleteId?: string;
}

function CategoriesScreen({
  loading = false,
  error = false,
  categories = DEMO_CATEGORIES,
  initialModal = { kind: 'closed' },
  initialDeleteId,
}: CategoriesScreenProps) {
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [pendingDelete, setPendingDelete] = useState<DemoCategory | null>(
    () => categories.find((category) => category.id === initialDeleteId) ?? null,
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>문의 유형</h1>

      <div style={toolbarStyle}>
        <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(categories.length)}개`}</p>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Icon name="plus-circle" />}
          onClick={() => setModal({ kind: 'create' })}
        >
          유형 추가
        </Button>
      </div>

      {error ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>문의 유형을 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <Card>
          {categories.length === 0 ? (
            <p style={summaryStyle}>{loading ? '불러오는 중…' : '등록된 문의 유형이 없습니다.'}</p>
          ) : (
            <ul style={listStyle}>
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={(target) => setModal({ kind: 'edit', category: target })}
                  onDelete={(target) => setPendingDelete(target)}
                />
              ))}
            </ul>
          )}
          <p style={hintStyle}>
            사용 중인 유형은 삭제할 수 없습니다 — 먼저 그 티켓·템플릿의 유형을 바꾸거나, 사용여부를
            꺼서 신규 선택에서 숨기세요.
          </p>
        </Card>
      )}

      {modal.kind !== 'closed' && (
        <CategoryModal
          editing={modal.kind === 'edit' ? modal.category : null}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="문의 유형 삭제"
          message={`'${pendingDelete.label}' 유형을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="유형 삭제"
          onConfirm={() => setPendingDelete(null)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** 정상: 문의 유형 목록(사용여부·사용량 배지 + 사용 중 항목의 삭제 잠금) */
export const Default: Story = {
  render: () => <CategoriesScreen />,
};

/** 로딩: 최초 조회 중 — 요약이 '불러오는 중…'(STATE-01, 표를 비우지 않는다) */
export const Loading: Story = {
  render: () => <CategoriesScreen loading categories={[]} />,
};

/** 빈 상태: 등록된 문의 유형 없음 */
export const Empty: Story = {
  render: () => <CategoriesScreen categories={[]} />,
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CategoriesScreen error />,
};

/** 유형 추가 모달 열림 */
export const AddCategory: Story = {
  render: () => <CategoriesScreen initialModal={{ kind: 'create' }} />,
};

/** 유형 수정 모달 열림(기존 이름·사용여부 채워짐) */
export const EditCategory: Story = {
  render: () => (
    <CategoriesScreen
      initialModal={{
        kind: 'edit',
        category: {
          id: 'product',
          label: '제품 문의',
          active: false,
          ticketCount: 2,
          templateCount: 0,
        },
      }}
    />
  ),
};

/** 삭제 확인: 미사용 유형에 대한 ConfirmDialog */
export const DeleteConfirm: Story = {
  render: () => <CategoriesScreen initialDeleteId="etc" />,
};
