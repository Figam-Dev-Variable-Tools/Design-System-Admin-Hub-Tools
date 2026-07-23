/**
 * Design System/Templates/Company/Partners — 파트너사 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/partners` → 메뉴 en = "Company"(기업 관리),
 * 화면 en = "Partners" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/partners', '파트너사', 'Partners']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/partners/PartnersPage.tsx (라우트 /company/partners).
 * 실화면은 고객사(/company/clients)와 **같은 모듈**(company/logo-list/LogoListPage)을 공유하고
 * config(resource·entityLabel·adapter)만 주입한다 — 데이터 모양(로고·이름·링크·정렬·노출)과 화면
 * (검색 + 추가/수정 모달 + 삭제팝업)이 동일하기 때문이다.
 *
 * [이 목록이 다른 목록과 갈라지는 지점]
 *   · **정렬 순서가 곧 의미다.** 로고는 노출되는 차례가 정해져 있어 페이지네이션 없이 전부 한 화면에
 *     그리고, 드래그 그립 + 위/아래 버튼으로 순서를 바꾼다. 재정렬은 **검색어가 없을 때만** 켠다 —
 *     걸러진 부분집합의 순서 이동은 뜻이 흐려진다.
 *   · **로고 이미지는 목록에 없다.** 이미지는 등록/수정 모달에서만 다룬다(소유자 확정).
 *   · **등록/수정이 별도 라우트가 아니라 모달**이다 — 필드가 셋(이름·로고·링크)뿐이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   LogoListTable(손으로 그린 <table>) → DS Table + 선택·순번·재정렬 프리미티브
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   이름 검색(IME 안전 · URL 소유)  → SearchField
 *   추가 CTA                       → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸        → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   드래그 그립 열                   → ReorderGripHeaderCell · ReorderGripCell (검색어 없을 때만)
 *   순번 열                         → SeqHeaderCell · SeqCell
 *   노출 인라인 토글                 → ToggleSwitch (실화면 onToggleActive)
 *   위/아래 순서 이동                → ReorderMoveButtons
 *   행 액션(수정 모달·삭제)          → RowActions
 *   선택 일괄 삭제 바                → SelectionBar + Button(danger)
 *   삭제 확인 / 일괄 삭제 확인        → ConfirmDialog(intent=delete)
 *   등록·수정 모달                   → Modal + FormField + ImageUploadField
 *   목록 표                         → Table (leadingHead=선택+그립+순번 / trailingHead=행 액션)
 *   빈 결과                         → Empty (검색 지우기 복구)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 로고 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
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
  TextField,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Partners',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 logo-list/types.ts 의 LogoItem 미러) ──────────────────────────────────── */

interface DemoLogo {
  readonly id: string;
  readonly name: string;
  /** 로고 이미지 URL — 목록에는 열이 없고 모달에서만 다룬다 */
  readonly logoUrl: string;
  /** 클릭 시 이동할 링크(선택) */
  readonly linkUrl: string;
  /** 정렬 순서 — 작을수록 앞에 온다 */
  readonly order: number;
  /** 노출 여부 — 목록에서 바로 ON/OFF 토글한다 */
  readonly active: boolean;
}

/** 인라인 SVG 로고 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="66" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const DEMO_LOGOS: readonly DemoLogo[] = [
  {
    id: 'partners-1',
    name: '알파클라우드',
    logoUrl: svgDataUri('ALPHA', 'steelblue'),
    linkUrl: 'https://example.com/alpha',
    order: 1,
    active: true,
  },
  {
    id: 'partners-2',
    name: '베타로지스틱스',
    logoUrl: svgDataUri('BETA', 'seagreen'),
    linkUrl: 'https://example.com/beta',
    order: 2,
    active: true,
  },
  {
    id: 'partners-3',
    name: '감마소프트',
    logoUrl: svgDataUri('GAMMA', 'peru'),
    linkUrl: '',
    order: 3,
    active: false,
  },
  {
    id: 'partners-4',
    name: '델타네트웍스',
    logoUrl: svgDataUri('DELTA', 'mediumpurple'),
    linkUrl: 'https://example.com/delta',
    order: 4,
    active: true,
  },
];

const ENTITY_LABEL = '파트너사';
const NAME_MAX_LENGTH = 60;
const SELECT_ALL_LABEL_ID = 'partners-select-all-label';

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 3개 — 선택·그립·순번은 leading, 액션은 trailing 으로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '이름' },
  { id: 'link', header: '링크' },
  { id: 'status', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

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
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
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
  color: cssVar('color.action.primary.default'),
  verticalAlign: 'bottom',
};

const emptyLinkStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
};

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const controlBaseStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

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

/* ── 등록/수정 모달(실화면 LogoFormModal 미러 — 필드 셋: 이름 · 로고 이미지 · 링크 URL) ─────────── */

interface LogoFormModalProps {
  readonly editing: DemoLogo | null;
  readonly onClose: () => void;
}

function LogoFormModal({ editing, onClose }: LogoFormModalProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(editing?.logoUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(editing?.linkUrl ?? '');
  const isEdit = editing !== null;

  return (
    <Modal
      title={isEdit ? `${ENTITY_LABEL} 수정` : `${ENTITY_LABEL} 추가`}
      onClose={onClose}
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
        <TextField
          id="logo-name"
          label="이름"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={NAME_MAX_LENGTH}
          placeholder={`예: ${ENTITY_LABEL} 이름`}
        />

        <ImageUploadField
          label="로고 이미지"
          required
          value={logoUrl}
          onChange={setLogoUrl}
          hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
        />

        <FormField htmlFor="logo-link" label="링크 URL" hint="클릭 시 이동할 주소 (선택)">
          <input
            id="logo-link"
            type="url"
            style={controlBaseStyle}
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
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
  /** 모달 초기 상태 — FormModal 상태에서 '추가' 모달을 열어 둔다 */
  readonly modalOpen?: boolean;
}

function PartnersScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
  modalOpen = false,
}: LogoListScreenProps) {
  const [logos, setLogos] = useState<readonly DemoLogo[]>(DEMO_LOGOS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoLogo | null>(null);
  const [formOpen, setFormOpen] = useState(modalOpen);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (needle === '') return logos;
    return logos.filter((logo) => logo.name.toLowerCase().includes(needle));
  }, [logos, keyword]);

  // 재정렬은 검색어가 없는 자연 순서에서만 켠다(실화면 reorderable 미러)
  const reorderable = keyword.trim() === '';

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

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
      for (const logo of visible) {
        if (checked) next.add(logo.id);
        else next.delete(logo.id);
      }
      return next;
    });
  };

  // 검색어가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다(실화면 useListState 미러)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };

  const toggleActive = (id: string, next: boolean): void => {
    setLogos((prev) => prev.map((logo) => (logo.id === id ? { ...logo, active: next } : logo)));
  };

  /** 위/아래 한 칸 이동 — 옮긴 뒤 order 를 1..n 으로 다시 매긴다(실화면 reorderLogosByIds 미러) */
  const moveBy = (index: number, delta: number): void => {
    setLogos((prev) =>
      moveArrayItem(prev, index, index + delta).map((logo, position) => ({
        ...logo,
        order: position + 1,
      })),
    );
  };

  const removeLogo = (id: string): void => {
    setLogos((prev) => prev.filter((logo) => logo.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((logo, index) => ({
    id: logo.id,
    selected: selectedIds.has(logo.id),
    leading: [
      <RowSelectCell
        key="select"
        id={logo.id}
        label={`${logo.name} 선택`}
        checked={selectedIds.has(logo.id)}
        onToggle={(checked) => toggleOne(logo.id, checked)}
      />,
      ...(reorderable ? [<ReorderGripCell key="grip" />] : []),
      <SeqCell key="seq" seq={index + 1} />,
    ],
    /* 셀은 DS Table 이 각자 keyed <td> 로 감싸지만, 배열 리터럴 안의 JSX 는 react/jsx-key 가
       키를 요구한다 — 열 id 로 키를 준다(위치 고정이라 안정적이다). */
    cells: [
      <span key="name" style={nameCellStyle}>
        {logo.name}
      </span>,
      logo.linkUrl.trim() === '' ? (
        <span key="link" style={emptyLinkStyle}>
          —
        </span>
      ) : (
        <a key="link" style={linkCellStyle} href={logo.linkUrl} target="_blank" rel="noreferrer">
          {logo.linkUrl}
        </a>
      ),
      <ToggleSwitch
        key="status"
        checked={logo.active}
        onChange={(next) => toggleActive(logo.id, next)}
        label={`${logo.name} 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
      />,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <span style={rowActionsWrapStyle}>
          {reorderable && (
            <ReorderMoveButtons
              label={logo.name}
              index={index}
              count={visible.length}
              locked={false}
              onMove={moveBy}
            />
          )}
          <RowActions
            label={logo.name}
            onEdit={() => setFormOpen(true)}
            onDelete={() => setConfirming(logo)}
          />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>파트너사</h1>

      {/* 툴바 — 이름 검색(좌) + 추가 CTA(우) */}
      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <SearchField
            label="파트너사 이름 검색"
            value={keyword}
            placeholder="파트너사 이름 검색"
            onChange={changeKeyword}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Icon name="plus-circle" />}
          onClick={() => setFormOpen(true)}
        >
          파트너사 추가
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeLogo(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="파트너사 목록 — 체크박스로 선택하고, 각 행에서 노출 여부를 ON/OFF 토글하거나 수정·삭제할 수 있어요. 검색어가 없을 때는 각 행의 위/아래 버튼으로 정렬 순서를 바꿔요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 파트너사 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          ...(reorderable ? [<ReorderGripHeaderCell key="grip-head" />] : []),
          <SeqHeaderCell key="seq" />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={4}
        empty={
          <EmptyState
            label={ENTITY_LABEL}
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => changeKeyword('')}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="파트너사 삭제"
          message={`'${confirming.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeLogo(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {formOpen && <LogoFormModal editing={null} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

/** 정상: 파트너사가 순서대로 채워진 기본 상태(재정렬 켜짐 · 선택 없음) */
export const Default: Story = {
  render: () => <PartnersScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <PartnersScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Empty(검색 지우기 복구). 검색 중이라 재정렬 열이 사라진다 */
export const Empty: Story = {
  render: () => <PartnersScreen initialKeyword="등록되지 않은 회사" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <PartnersScreen initialSelectedIds={['partners-2', 'partners-3']} />,
};

/** 추가 모달: 등록/수정을 겸하는 한 벌의 모달 — 이름 · 로고 이미지 · 링크 URL 셋뿐이다 */
export const FormModal: Story = {
  render: () => <PartnersScreen modalOpen />,
};
