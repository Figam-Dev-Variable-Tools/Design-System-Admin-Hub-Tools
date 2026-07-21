/**
 * Design System/Templates/Portfolio/Portfolio Categories — 포트폴리오 카테고리 관리 화면
 * (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Portfolio"(포트폴리오 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Portfolio 그룹에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/portfolio/categories/PortfolioCategoriesPage.tsx
 * (라우트 /portfolio/categories). 목록 + 추가/수정 모달 + 삭제 확인. **사용 중 차단**: 카테고리를 쓰는
 * 포트폴리오가 1건이라도 있으면 삭제 버튼을 잠그고 'N개 사용 중'을 알린다(고아 항목 방지).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 조각을 DS 표면으로 갈음한다:
 *   요약 + 추가 CTA         → 토큰만 쓴 <p> + Button(primary) + Icon(plus-circle)
 *   카드 표면               → Card
 *   행 목록                 → 토큰만 쓴 <ul>/<li> (라벨 + StatusBadge + IconButton ×2)
 *   사용량 배지             → StatusBadge (usageLabel 미러: '미사용' / 'N개 사용 중')
 *   수정/삭제 버튼          → IconButton + Icon(pencil/trash) (사용 중이면 삭제 disabled)
 *   조회 실패 배너          → Alert(danger) + Button(secondary)
 *   추가/수정 모달          → Modal + FormField/TextField
 *   삭제 확인               → ConfirmDialog(intent=delete)
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
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Portfolio/Portfolio Categories',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/store 픽스처 + listCategoryUsage 미러) ─────────────────────────── */

const CATEGORY_NAME_MAX = 40;

interface DemoCategory {
  readonly id: string;
  readonly label: string;
  readonly itemCount: number;
}

const DEMO_CATEGORIES: readonly DemoCategory[] = [
  { id: 'residential', label: '주거 공간', itemCount: 2 },
  { id: 'office', label: '오피스', itemCount: 1 },
  { id: 'commercial', label: '상업 공간', itemCount: 1 },
  { id: 'exhibition', label: '전시·문화', itemCount: 0 },
];

/** ko-KR 자릿수 구분 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 사용 여부 문구 — 실화면 categories/types.usageLabel 미러 */
const usageLabel = (itemCount: number): string =>
  itemCount === 0 ? '미사용' : `${fmt(itemCount)}개 사용 중`;

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

const errorRowStyle: CSSProperties = {
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

/* ── 행 ───────────────────────────────────────────────────────────────────────────────────── */

interface CategoryRowProps {
  readonly category: DemoCategory;
  readonly onEdit: (category: DemoCategory) => void;
  readonly onDelete: (category: DemoCategory) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const inUse = category.itemCount > 0;
  const usage = usageLabel(category.itemCount);
  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        <span style={labelTextStyle}>{category.label}</span>
        <StatusBadge tone={inUse ? 'info' : 'neutral'} label={usage} />
      </span>
      <span style={actionsStyle}>
        <IconButton
          icon={<Icon name="pencil" />}
          label={`${category.label} 수정`}
          size="sm"
          onClick={() => onEdit(category)}
        />
        {/* 사용 중이면 삭제를 잠근다 — 배지의 'N개 사용 중'이 이유를 함께 전달한다(색만으로 전달 금지) */}
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
  const nameRef = useRef<HTMLInputElement | null>(null);

  return (
    <Modal
      title={isEdit ? '카테고리 수정' : '카테고리 추가'}
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
          id="portfolio-category-name"
          label="카테고리 이름"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 주거 공간"
          maxLength={CATEGORY_NAME_MAX}
        />
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
      <h1 style={headingStyle}>카테고리</h1>

      <div style={toolbarStyle}>
        <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(categories.length)}개`}</p>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Icon name="plus-circle" />}
          onClick={() => setModal({ kind: 'create' })}
        >
          카테고리 추가
        </Button>
      </div>

      {error ? (
        <Alert tone="danger">
          <div style={errorRowStyle}>
            <span>카테고리를 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : (
        <Card>
          {categories.length === 0 ? (
            <p style={summaryStyle}>{loading ? '불러오는 중…' : '등록된 카테고리가 없습니다.'}</p>
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
            사용 중인 카테고리는 삭제할 수 없습니다 — 먼저 그 포트폴리오들의 분류를 바꾸거나
            삭제하세요.
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
          title="카테고리 삭제"
          message={`'${pendingDelete.label}' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="카테고리 삭제"
          onConfirm={() => setPendingDelete(null)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** 정상: 카테고리 목록(사용 중 배지 + 사용 중 항목의 삭제 잠금) */
export const Default: Story = {
  render: () => <CategoriesScreen />,
};

/** 로딩: 최초 조회 중 — 요약이 '불러오는 중…'(STATE-01, 표를 비우지 않는다) */
export const Loading: Story = {
  render: () => <CategoriesScreen loading categories={[]} />,
};

/** 빈 상태: 등록된 카테고리 없음 */
export const Empty: Story = {
  render: () => <CategoriesScreen categories={[]} />,
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CategoriesScreen error />,
};

/** 카테고리 추가 모달 열림 */
export const AddCategory: Story = {
  render: () => <CategoriesScreen initialModal={{ kind: 'create' }} />,
};

/** 카테고리 수정 모달 열림(기존 이름 채워짐) */
export const EditCategory: Story = {
  render: () => (
    <CategoriesScreen
      initialModal={{
        kind: 'edit',
        category: { id: 'residential', label: '주거 공간', itemCount: 2 },
      }}
    />
  ),
};

/** 삭제 확인: 미사용 카테고리에 대한 ConfirmDialog */
export const DeleteConfirm: Story = {
  render: () => <CategoriesScreen initialDeleteId="exhibition" />,
};
