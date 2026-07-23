/**
 * Design System/Templates/Company/Logo List — 로고 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: 메뉴 en = "Company"(기업 관리). 이 한 화면이 두 라우트를 겸한다 —
 * packages/ui/pages/_data/pages.ts 의 Company 그룹 `['/company/partners', '파트너사', 'Partners']` 와
 * `['/company/clients', '고객사', 'Clients']`. 데이터 모양(로고·이름·링크·정렬·노출)과 화면이 같아
 * config(resource·entityLabel·adapter)만 갈아 끼운다.
 *
 * 대응 실화면: apps/admin/src/pages/company/logo-list/LogoListPage.tsx 와 그 하위 조립
 * (LogoListTable.tsx · LogoFormModal.tsx). 로고는 **순서가 곧 의미**라 페이지네이션이 없다 — 전부 한
 * 화면에 그리고 드래그·위/아래 버튼으로 옮긴다. 재정렬은 검색어가 없는 자연 순서에서만 켠다(걸러진
 * 부분집합을 재정렬하면 의미가 흐려진다). 등록/수정은 별도 라우트가 아니라 **모달**이다 — 필드가 셋뿐이라
 * 목록을 떠날 이유가 없다. 로고 이미지는 목록에 두지 않고 모달에서만 다룬다(소유자 확정).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   LogoListTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·
 *                    ReorderGripHeaderCell·ReorderGripCell·ReorderMoveButtons·RowActions)
 *   LogoFormModal → DS Modal + FormField/input + ImageUploadField + Button
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   이름 검색                  → SearchField
 *   추가 버튼                  → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   재정렬 손잡이 · 순번          → ReorderGripHeaderCell/ReorderGripCell · SeqHeaderCell/SeqCell
 *   순서 이동 버튼              → ReorderMoveButtons (+ moveArrayItem 로 order 재계산)
 *   이름 · 링크 · 상태 열         → Table columns(3열) — 링크는 새 탭 <a>, 없으면 —
 *   노출 인라인 토글            → ToggleSwitch (busy = 요청 중)
 *   행 액션(수정·삭제)          → RowActions (연필 → 수정 모달, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인 · 일괄 삭제 확인    → ConfirmDialog(intent=delete)
 *   등록/수정 모달              → Modal + FormField/input + ImageUploadField
 *   목록 표                     → Table (leadingHead=선택+손잡이+순번 / trailingHead=행 액션)
 *   빈 결과                     → Empty (검색 지우기 복구)
 *   조회 실패 배너              → Alert(danger) + Button(secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 로고 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Empty as EmptyState,
  FormField,
  Icon,
  ImageUploadField,
  Modal,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  Table,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Logo List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 logo-list/types 미러) ──────────────────────────────────────────────────────── */

const NAME_MAX_LENGTH = 60;
const SELECT_ALL_LABEL_ID = 'logo-select-all-label';
const SKELETON_ROWS = 4;

/* ── 데모 데이터(실화면 partners/data-source 의 PARTNER_SEED 미러) ───────────────────────────── */

/** 인라인 SVG 로고 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const logoDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" fill="${hue}"/><text x="80" y="46" font-family="sans-serif" font-size="15" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

interface DemoLogo {
  readonly id: string;
  readonly name: string;
  readonly logoUrl: string;
  /** 클릭 시 이동할 링크(선택) */
  readonly linkUrl: string;
  /** 정렬 순서 — 작을수록 앞에 온다 */
  readonly order: number;
  /** 노출 여부 — 목록에서 바로 ON/OFF 토글한다 */
  readonly active: boolean;
}

const DEMO_LOGOS: readonly DemoLogo[] = [
  {
    id: 'partners-1',
    name: '알파클라우드',
    logoUrl: logoDataUri('ALPHA', 'steelblue'),
    linkUrl: 'https://example.com/alpha',
    order: 1,
    active: true,
  },
  {
    id: 'partners-2',
    name: '베타로지스틱스',
    logoUrl: logoDataUri('BETA', 'seagreen'),
    linkUrl: 'https://example.com/beta',
    order: 2,
    active: true,
  },
  {
    id: 'partners-3',
    name: '감마소프트',
    logoUrl: logoDataUri('GAMMA', 'peru'),
    linkUrl: '',
    order: 3,
    active: false,
  },
  {
    id: 'partners-4',
    name: '델타네트웍스',
    logoUrl: logoDataUri('DELTA', 'slategray'),
    linkUrl: 'https://example.com/delta',
    order: 4,
    active: true,
  },
];

/** 이름 키워드(대소문자·앞뒤 공백 무시) 필터 — 실화면 filterLogos 미러(순서 보존) */
const filterLogos = (list: readonly DemoLogo[], keyword: string): readonly DemoLogo[] => {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter((item) => item.name.toLowerCase().includes(needle));
};

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 등록/수정 모달 상태 — 닫힘 / 등록 / 수정(대상) — 실화면 ModalState 미러 */
type ModalState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; item: DemoLogo };

/* ── 표 열 정의(데이터 열 3개 — 선택·손잡이·순번은 leading, 액션은 trailing 으로 별도) ─────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '이름' },
  { id: 'link', header: '링크' },
  { id: 'status', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem·calc 만) ──────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const nameCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const linkCellStyle: CSSProperties = {
  display: 'inline-block',
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom',
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const emptyLinkStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
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

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 등록/수정 모달(실화면 LogoFormModal 미러: 하나의 모달이 등록과 수정을 겸한다) ─────────────── */

function LogoFormModal({
  entityLabel,
  editing,
  onClose,
}: {
  readonly entityLabel: string;
  /** 수정 대상 — null 이면 등록 */
  readonly editing: DemoLogo | null;
  readonly onClose: () => void;
}) {
  const isEdit = editing !== null;
  const [name, setName] = useState(editing?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(editing?.logoUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(editing?.linkUrl ?? '');

  return (
    <Modal
      title={isEdit ? `${entityLabel} 수정` : `${entityLabel} 추가`}
      onClose={onClose}
      onSubmit={onClose}
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
        <FormField htmlFor="logo-name" label="이름" required>
          <input
            id="logo-name"
            type="text"
            style={controlStyle(false)}
            maxLength={NAME_MAX_LENGTH}
            placeholder={`예: ${entityLabel} 이름`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>

        <ImageUploadField
          label="로고 이미지"
          required
          value={logoUrl}
          hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
          onChange={setLogoUrl}
        />

        <FormField htmlFor="logo-link" label="링크 URL" hint="클릭 시 이동할 주소 (선택)">
          <input
            id="logo-link"
            type="url"
            style={controlStyle(false)}
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface LogoListScreenProps {
  /** 도메인 명칭 — '파트너사' / '고객사' (실화면 config) */
  readonly entityLabel?: string;
  /** 최초 로드 스켈레톤 — Table loading (STATE-01) */
  readonly loading?: boolean;
  /** 조회 실패 — 표 대신 danger 배너 */
  readonly error?: boolean;
  readonly items?: readonly DemoLogo[];
  readonly initialKeyword?: string;
  readonly initialSelectedIds?: readonly string[];
  readonly initialModal?: ModalState;
}

function LogoListScreen({
  entityLabel = '파트너사',
  loading = false,
  error = false,
  items = DEMO_LOGOS,
  initialKeyword = '',
  initialSelectedIds = [],
  initialModal = { kind: 'closed' },
}: LogoListScreenProps) {
  const [logos, setLogos] = useState<readonly DemoLogo[]>(items);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [pendingDelete, setPendingDelete] = useState<DemoLogo | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const visible = useMemo(() => filterLogos(logos, keyword), [logos, keyword]);
  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;
  /** 재정렬은 검색어가 없는 자연 순서에서만 켠다 — 실화면 reorderable 미러 */
  const reorderable = keyword.trim() === '';

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visible) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const toggleActive = (id: string, next: boolean): void => {
    setLogos((prev) => prev.map((item) => (item.id === id ? { ...item, active: next } : item)));
  };

  // 위/아래 이동 → moveArrayItem 로 새 순서를 만들고 order 를 1..n 으로 다시 매긴다
  // (실화면 reorderLogosByIds 미러)
  const moveBy = (index: number, delta: number): void => {
    setLogos((prev) =>
      moveArrayItem(prev, index, index + delta).map((item, position) => ({
        ...item,
        order: position + 1,
      })),
    );
  };

  const removeLogos = (ids: readonly string[]): void => {
    const doomed = new Set(ids);
    setLogos((prev) =>
      prev
        .filter((item) => !doomed.has(item.id))
        .map((item, position) => ({ ...item, order: position + 1 })),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>{entityLabel}</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>{`${entityLabel} 목록을 불러오지 못했어요.`}</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다 — false 는 정의된 boolean 이라
    // exactOptionalPropertyTypes 위반이 아니다.
    selected: selectedIds.has(item.id),
    leading: [
      <RowSelectCell
        key="select"
        id={item.id}
        label={`${item.name} 선택`}
        checked={selectedIds.has(item.id)}
        onToggle={(checked) => toggleOne(item.id, checked)}
      />,
      ...(reorderable ? [<ReorderGripCell key="grip" />] : []),
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <span key="name" style={nameCellStyle}>
        {item.name}
      </span>,
      item.linkUrl.trim() !== '' ? (
        <a key="link" href={item.linkUrl} target="_blank" rel="noreferrer" style={linkCellStyle}>
          {item.linkUrl}
        </a>
      ) : (
        <span key="link" style={emptyLinkStyle}>
          —
        </span>
      ),
      <ToggleSwitch
        key="active"
        checked={item.active}
        label={`${item.name} 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
        onChange={(next) => toggleActive(item.id, next)}
      />,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <span style={rowActionsWrapStyle}>
          {reorderable && (
            <ReorderMoveButtons
              label={item.name}
              index={index}
              count={visible.length}
              locked={false}
              onMove={moveBy}
            />
          )}
          <RowActions
            label={item.name}
            onEdit={() => setModal({ kind: 'edit', item })}
            onDelete={() => setPendingDelete(item)}
          />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>{entityLabel}</h1>

      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <SearchField
            value={keyword}
            label={`${entityLabel} 이름 검색`}
            placeholder={`${entityLabel} 이름 검색`}
            onChange={setKeyword}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Icon name="plus-circle" />}
          onClick={() => setModal({ kind: 'create' })}
        >
          {`${entityLabel} 추가`}
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button variant="danger" onClick={() => setBulkOpen(true)}>
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Card>
        <Table
          caption={`${entityLabel} 목록 — 체크박스로 선택하고, 각 행에서 노출 여부를 토글하거나 수정·삭제할 수 있어요.${
            reorderable ? ' 각 행의 위/아래 버튼으로 정렬 순서를 바꿔요.' : ''
          }`}
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <SelectAllHeaderCell
              key="select-all"
              label={`이 페이지의 ${entityLabel} 전체 선택`}
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={toggleAll}
            />,
            ...(reorderable ? [<ReorderGripHeaderCell key="grip-head" />] : []),
            <SeqHeaderCell key="seq-head" />,
          ]}
          trailingHead={[
            <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
              <span style={visuallyHidden}>행 액션</span>
            </th>,
          ]}
          loading={loading}
          skeletonRows={SKELETON_ROWS}
          empty={
            <EmptyState
              label={entityLabel}
              hasQuery={keyword.trim() !== ''}
              onClearSearch={() => setKeyword('')}
            />
          }
        />
      </Card>

      {modal.kind !== 'closed' && (
        <LogoFormModal
          entityLabel={entityLabel}
          editing={modal.kind === 'edit' ? modal.item : null}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title={`${entityLabel} 삭제`}
          message={`'${pendingDelete.name}'을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeLogos([pendingDelete.id]);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title={`${entityLabel} 일괄 삭제`}
          message={`선택한 ${entityLabel} ${fmt(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel={`${fmt(selectedCount)}건 삭제`}
          onConfirm={() => {
            removeLogos([...selectedIds]);
            setBulkOpen(false);
          }}
          onCancel={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

/** 정상: 파트너사 로고 4건 — 검색어가 없어 재정렬(손잡이 + 위/아래 버튼)이 켜져 있다 */
export const Default: Story = {
  render: () => <LogoListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 노출 토글·순서 이동의 재조회에서는 켜지 않는다(STATE-01) */
export const Loading: Story = {
  render: () => <LogoListScreen loading items={[]} />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯의 Empty 가 '검색 지우기' 복구를 준다(STATE-05).
 *  검색어가 걸려 있어 재정렬 열(손잡이·이동 버튼)은 사라진다 */
export const Empty: Story = {
  render: () => <LogoListScreen initialKeyword="등록되지 않은 회사" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <LogoListScreen initialSelectedIds={['partners-2', 'partners-3']} />,
};

/** 수정 모달: 연필을 누른 상태 — 하나의 모달이 등록과 수정을 겸한다(정렬 순서는 목록이 쥔다) */
export const EditModal: Story = {
  render: () => {
    const target = DEMO_LOGOS.find((item) => item.id === 'partners-2');
    return (
      <LogoListScreen
        {...(target !== undefined && { initialModal: { kind: 'edit', item: target } })}
      />
    );
  },
};
