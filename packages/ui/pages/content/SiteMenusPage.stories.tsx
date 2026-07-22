/**
 * Design System/Templates/Content/Site Menus — 메뉴 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/menus` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Menus" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/menus', '메뉴 관리', 'Menus']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/menus/SiteMenusPage.tsx (라우트 /content/menus) 와
 * 그 규칙(types.ts) · 데이터(data-source.ts).
 *
 * [무엇의 메뉴인가 — 가장 헷갈리는 지점] 여기서 만드는 것은 **B2C 홈페이지의 메뉴**다. 어드민
 * 자신의 사이드바는 코드가 소유하고 운영자가 바꾸는 것이 아니다. 이름이 같아 헷갈리지만 둘은
 * 다른 세계이고, 이 화면은 사이드바를 알지 못한다.
 *
 * [위치 × 2뎁스] 같은 트리를 상단·하단·모바일 세 곳이 나눠 쓴다. 깊이는 2단계까지다 — 3단계를
 * 열면 '어디에 있는지' 를 사람이 추적하지 못하고 홈페이지의 드롭다운도 그 깊이를 그리지 못한다.
 *
 * [내부 링크는 끊길 수 있다 — 이 화면의 중심 판단] 메뉴가 가리키는 페이지는 페이지 관리가
 * 소유하고 그쪽에서 지워질 수 있다. 그 사실을 메뉴 레코드에 저장하지 않고 **볼 때마다 조회해**
 * 판정한다(저장하면 그 순간부터 낡는다). 판정은 넷으로 갈린다 — 복구 수단이 서로 다르기 때문이다:
 *   ok      : 살아 있고 공개돼 있다               → 할 일 없음
 *   missing : 가리키는 페이지가 사라졌다           → 붉은 '끊긴 링크'. 대상을 다시 고르거나 메뉴를 지운다
 *   hidden  : 페이지는 있는데 아직 공개 전이다     → 노란 '공개 전'. 페이지 쪽에서 발행하면 풀린다
 *   unknown : 페이지 목록 자체를 못 읽었다         → '(확인 불가)'. **데이터 사고가 아니라 배선 사고다**
 * 넷째를 셋째로 뭉개면 멀쩡한 메뉴가 붉게 칠해지고, 운영자는 살아 있는 링크를 지우러 간다.
 * 외부 URL 은 애초에 판정하지 않는다 — 남의 서버가 살아 있는지는 이 앱이 알 수 없다.
 *
 * [표가 아니라 목록인 이유] 행마다 계층·경고·삭제 가능 여부가 다르다. 공용 표 껍데기에는 행 단위
 * 잠금 사유를 실을 손잡이가 없어 카드 목록을 쓴다(상품 카테고리·미디어와 같은 판단).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   위치 탭(상단·하단·모바일)   → SegmentedControl
 *   메뉴 추가 / 하위 메뉴 추가   → Button(primary) · 토큰 <button> + Icon(plus-circle)
 *   끊긴 링크 요약 / 배선 실패   → Alert(danger) · Alert(warning)
 *   메뉴 카드 목록              → Card + 토큰 <ul>/<li> (2뎁스는 들여쓴 중첩 <ul>)
 *   하위 펼침/접기              → 토큰 <button>(aria-expanded · aria-controls) + Icon(chevron-*)
 *   대상 종류 배지              → StatusBadge (내부 페이지 · 외부 링크 · 게시판)
 *   끊긴 링크 / 공개 전 배지     → StatusBadge (danger · warning)
 *   페이지 열기(내부 참조)       → 토큰 <a>
 *   노출 토글                  → ToggleSwitch
 *   순서 이동                  → ReorderMoveButtons (형제 안에서만)
 *   수정 / 삭제                → 토큰 <button> + Icon(pencil · trash) — 막히면 사유를 접근 이름에
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   빈 위치                    → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
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
  Icon,
  ReorderMoveButtons,
  SegmentedControl,
  StatusBadge,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Site Menus',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts 미러) ─────────────────────────────────────────────────────── */

/** 어느 메뉴 영역인가 — 같은 트리를 세 곳이 나눠 쓴다 */
type MenuLocation = 'header' | 'footer' | 'mobile';

const MENU_LOCATIONS: readonly MenuLocation[] = ['header', 'footer', 'mobile'];

const MENU_LOCATION_LABEL: Readonly<Record<MenuLocation, string>> = {
  header: '상단',
  footer: '하단',
  mobile: '모바일',
};

const LOCATION_OPTIONS = MENU_LOCATIONS.map((value) => ({
  id: value,
  label: MENU_LOCATION_LABEL[value],
}));

/** 게시판 — 홈페이지가 이미 갖고 있는 목록 화면들 */
type BoardId = 'news' | 'notices' | 'faq';

const BOARD_LABEL: Readonly<Record<BoardId, string>> = {
  news: '뉴스·보도자료',
  notices: '공지사항',
  faq: 'FAQ',
};

/**
 * 메뉴가 가리키는 곳 — **판별 유니온**이다.
 * 종류를 밝히지 않고는 만들 수 없어야 '내부 페이지인 줄 알았는데 외부 URL' 이 생기지 않고,
 * 무엇보다 끊긴 링크 판정을 걸 자리가 내부 참조에만 생긴다.
 */
type MenuTarget =
  | { readonly kind: 'page'; readonly pageId: string }
  | { readonly kind: 'external'; readonly url: string }
  | { readonly kind: 'board'; readonly boardId: BoardId };

const MENU_TARGET_KIND_LABEL: Readonly<Record<MenuTarget['kind'], string>> = {
  page: '내부 페이지',
  external: '외부 링크',
  board: '게시판',
};

interface DemoMenu {
  readonly id: string;
  readonly location: MenuLocation;
  /** 상위 메뉴 id — null 이면 1뎁스. 2뎁스 아래는 만들지 않는다 */
  readonly parentId: string | null;
  readonly label: string;
  readonly target: MenuTarget;
  readonly visible: boolean;
  /** 형제 사이의 순서 — 1부터. 위치·부모가 같은 것끼리만 비교한다 */
  readonly order: number;
}

/* ── 페이지 카탈로그(실화면 shared/domain/site-page-catalog 미러) ───────────────────────────── */

interface CatalogPage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly published: boolean;
}

const CATALOG: readonly CatalogPage[] = [
  { id: 'pg-001', title: '사업영역', slug: 'business', published: true },
  { id: 'pg-002', title: '공간 기획', slug: 'business-planning', published: true },
  { id: 'pg-003', title: '시공 관리', slug: 'business-construction', published: true },
  // 아직 공개되지 않은 페이지 — '공개 전' 경고 경로를 실제로 밟게 한다
  { id: 'pg-004', title: '데이터 분석', slug: 'business-analytics', published: false },
  { id: 'pg-005', title: '이용약관', slug: 'terms', published: true },
];

/** 내부 참조의 건강 상태 — 넷으로 갈린다(머리말) */
type LinkHealth = 'ok' | 'missing' | 'hidden' | 'unknown';

function menuLinkHealth(target: MenuTarget, catalog: readonly CatalogPage[] | null): LinkHealth {
  // 외부 URL 은 판정하지 않는다 — 알 수 없는 것을 '끊겼다' 고 말하면 멀쩡한 링크가 붉어진다
  if (target.kind !== 'page') return 'ok';
  if (catalog === null) return 'unknown';
  const page = catalog.find((entry) => entry.id === target.pageId);
  if (page === undefined) return 'missing';
  return page.published ? 'ok' : 'hidden';
}

/** 이 메뉴에 붙일 경고 한 줄 — 문제가 없으면 null */
function menuLinkWarning(health: LinkHealth): string | null {
  switch (health) {
    case 'missing':
      return '연결된 페이지가 사라졌습니다.';
    case 'hidden':
      return '연결된 페이지가 아직 공개되지 않았습니다.';
    case 'unknown':
      return '페이지 목록을 확인할 수 없어 링크 상태를 알 수 없습니다.';
    case 'ok':
      return null;
  }
}

/** 링크가 실제로 가리키는 주소 표기 — 목록의 '대상' 칸이 읽는다 */
function menuTargetLabel(target: MenuTarget, catalog: readonly CatalogPage[] | null): string {
  switch (target.kind) {
    case 'external':
      return target.url;
    case 'board':
      return BOARD_LABEL[target.boardId];
    case 'page': {
      // '모른다' 와 '삭제됨' 은 다른 문구다 — 뭉개면 배선 사고가 데이터 사고로 읽힌다
      if (catalog === null) return '(확인 불가)';
      const page = catalog.find((entry) => entry.id === target.pageId);
      return page === undefined ? '(삭제된 페이지)' : `${page.title} (/${page.slug})`;
    }
  }
}

const MENU_DELETE_HAS_CHILDREN =
  '하위 메뉴가 있어 삭제할 수 없습니다. 하위 메뉴를 먼저 정리해 주세요.';

/**
 * 지울 수 없는 이유 — 지울 수 있으면 null.
 * 부모를 지우면 자식이 어디에도 속하지 않은 채 남아 홈페이지 어디에도 나타나지 않는다 —
 * 지워지지도 보이지도 않는 유령이 된다.
 */
function menuDeleteBlock(menus: readonly DemoMenu[], menuId: string): string | null {
  return menus.some((menu) => menu.parentId === menuId) ? MENU_DELETE_HAS_CHILDREN : null;
}

const rootMenus = (menus: readonly DemoMenu[], location: MenuLocation): readonly DemoMenu[] =>
  menus
    .filter((menu) => menu.location === location && menu.parentId === null)
    .sort((a, b) => a.order - b.order);

const childMenus = (menus: readonly DemoMenu[], parentId: string): readonly DemoMenu[] =>
  menus.filter((menu) => menu.parentId === parentId).sort((a, b) => a.order - b.order);

const brokenMenuCount = (
  menus: readonly DemoMenu[],
  catalog: readonly CatalogPage[] | null,
): number => menus.filter((menu) => menuLinkHealth(menu.target, catalog) === 'missing').length;

/** 형제들의 새 순서를 1..n 으로 다시 매긴다 — 형제가 아닌 메뉴는 손대지 않는다 */
function renumberSiblings(
  menus: readonly DemoMenu[],
  orderedIds: readonly string[],
): readonly DemoMenu[] {
  const position = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return menus.map((menu) => {
    const next = position.get(menu.id);
    return next === undefined ? menu : { ...menu, order: next };
  });
}

/* ── 데모 데이터(실화면 data-source.ts 의 SEED 미러) ────────────────────────────────────────── */

const DEMO_MENUS: readonly DemoMenu[] = [
  {
    id: 'mn-001',
    location: 'header',
    parentId: null,
    label: '회사소개',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-002',
    location: 'header',
    parentId: null,
    label: '사업영역',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-003',
    location: 'header',
    parentId: 'mn-002',
    label: '공간 기획',
    target: { kind: 'page', pageId: 'pg-002' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-004',
    location: 'header',
    parentId: 'mn-002',
    label: '시공 관리',
    target: { kind: 'page', pageId: 'pg-003' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-005',
    location: 'header',
    parentId: 'mn-002',
    // 아직 발행되지 않은 페이지를 가리킨다 — '공개 전' 경로를 화면에서 실제로 밟게 한다
    label: '데이터 분석',
    target: { kind: 'page', pageId: 'pg-004' },
    visible: false,
    order: 3,
  },
  {
    id: 'mn-006',
    location: 'header',
    parentId: null,
    label: '뉴스',
    target: { kind: 'board', boardId: 'news' },
    visible: true,
    order: 3,
  },
  {
    id: 'mn-007',
    location: 'header',
    parentId: null,
    // 삭제된 페이지를 가리킨다 — 끊긴 링크 경로를 화면에서 실제로 밟게 한다
    label: '채용',
    target: { kind: 'page', pageId: 'pg-지워짐' },
    visible: true,
    order: 4,
  },
  {
    id: 'mn-008',
    location: 'footer',
    parentId: null,
    label: '이용약관',
    target: { kind: 'page', pageId: 'pg-005' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-009',
    location: 'footer',
    parentId: null,
    label: '고객센터',
    target: { kind: 'board', boardId: 'faq' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-010',
    location: 'mobile',
    parentId: null,
    label: '회사소개',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-011',
    location: 'mobile',
    parentId: null,
    label: '블로그',
    target: { kind: 'external', url: 'https://example.com/blog' },
    visible: true,
    order: 2,
  },
];

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

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

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

/** 2뎁스 행은 상위 아래에 들여쓴다 — 계층이 한눈에 보이게 */
const childListStyle: CSSProperties = {
  ...listStyle,
  marginTop: cssVar('space.2'),
  paddingLeft: cssVar('space.6'),
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
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
  overflowWrap: 'anywhere',
};

const targetTextStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

/** 토큰만 쓴 ghost 버튼 — DS Button 을 못 쓰는 자리(아이콘만 있는 압축 액션)의 시각 갈음 */
const ghostButtonStyle = (blocked: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: 'transparent',
  color: blocked ? cssVar('color.text.disabled') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  cursor: blocked ? 'not-allowed' : 'pointer',
});

const dangerGhostStyle = (blocked: boolean): CSSProperties => ({
  ...ghostButtonStyle(blocked),
  color: blocked ? cssVar('color.text.disabled') : cssVar('color.feedback.danger.text'),
});

const disclosureSpacerStyle: CSSProperties = {
  display: 'inline-block',
  inlineSize: cssVar('space.6'),
  flexShrink: 0,
};

const pageLinkStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 한 행(1뎁스·2뎁스가 같은 모양을 쓴다) ────────────────────────────────────────────────── */

interface MenuRowProps {
  readonly menu: DemoMenu;
  readonly index: number;
  readonly siblingCount: number;
  readonly health: LinkHealth;
  readonly targetLabel: string;
  readonly deleteBlocked: string | null;
  readonly locked: boolean;
  /** 하위를 펼쳤나 — 1뎁스에만 준다. undefined 면 토글 자체가 없다 */
  readonly expanded?: boolean;
  readonly childPanelId?: string;
  readonly childCount?: number;
  readonly onToggleExpand?: () => void;
  readonly onMove: (index: number, delta: number) => void;
  readonly onToggleVisible: (menu: DemoMenu, next: boolean) => void;
  readonly onDelete: (menu: DemoMenu) => void;
  readonly onAddChild?: (parent: DemoMenu) => void;
}

function MenuRow({
  menu,
  index,
  siblingCount,
  health,
  targetLabel,
  deleteBlocked,
  locked,
  expanded,
  childPanelId,
  childCount = 0,
  onToggleExpand,
  onMove,
  onToggleVisible,
  onDelete,
  onAddChild,
}: MenuRowProps) {
  const isRoot = menu.parentId === null;
  const togglable = expanded !== undefined && onToggleExpand !== undefined && childCount > 0;
  const blocked = deleteBlocked !== null;
  const warning = menuLinkWarning(health);

  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        {togglable ? (
          <button
            type="button"
            style={ghostButtonStyle(false)}
            aria-expanded={expanded}
            aria-controls={childPanelId}
            aria-label={`${menu.label} 하위 메뉴 ${expanded === true ? '접기' : '펼치기'} (${fmt(childCount)}개)`}
            onClick={onToggleExpand}
          >
            <Icon name={expanded === true ? 'chevron-down' : 'chevron-right'} />
          </button>
        ) : (
          <span aria-hidden="true" style={disclosureSpacerStyle} />
        )}

        <span style={labelTextStyle}>{menu.label}</span>
        <StatusBadge tone="neutral" label={MENU_TARGET_KIND_LABEL[menu.target.kind]} />
        <span style={targetTextStyle}>{targetLabel}</span>

        {/* 끊긴 링크는 배지로 먼저 눈에 띄고, 왜 그런지는 바로 옆 문장이 말한다 */}
        {health === 'missing' && <StatusBadge tone="danger" label="끊긴 링크" />}
        {health === 'hidden' && <StatusBadge tone="warning" label="공개 전" />}
        {health === 'unknown' && <StatusBadge tone="warning" label="확인 불가" />}
        {warning !== null && <span style={targetTextStyle}>{warning}</span>}

        {menu.target.kind === 'page' && health !== 'missing' && (
          <a
            href="#site-page-edit-target"
            style={pageLinkStyle}
            aria-label={`${menu.label} 이 가리키는 페이지 열기`}
          >
            페이지 열기
          </a>
        )}
      </span>

      <span style={actionsStyle}>
        {/* 노출 토글 — 지우지 않고 잠깐 내리는 손잡이 */}
        <ToggleSwitch
          label={`${menu.label} 노출 여부`}
          checked={menu.visible}
          onLabel="노출"
          offLabel="숨김"
          onChange={(next) => onToggleVisible(menu, next)}
        />

        {/* 순서 이동 — 형제 안에서만 움직인다 */}
        <ReorderMoveButtons
          label={menu.label}
          index={index}
          count={siblingCount}
          locked={locked}
          onMove={onMove}
        />

        {/* 하위 추가는 1뎁스에만 — 2뎁스 아래로는 만들지 않는다 */}
        {isRoot && onAddChild !== undefined && (
          <button
            type="button"
            style={ghostButtonStyle(false)}
            aria-label={`${menu.label} 하위 메뉴 추가`}
            title="하위 메뉴 추가"
            onClick={() => onAddChild(menu)}
          >
            <Icon name="plus-circle" />
          </button>
        )}

        <button type="button" style={ghostButtonStyle(false)} aria-label={`${menu.label} 수정`}>
          <Icon name="pencil" />
        </button>

        {/* 못 누르는 이유를 그대로 접근 이름에 싣는다 — 화면이 사유를 다시 지어내지 않는다 */}
        <button
          type="button"
          style={dangerGhostStyle(blocked)}
          aria-label={blocked ? `${menu.label} — ${deleteBlocked ?? ''}` : `${menu.label} 삭제`}
          {...(blocked && { title: deleteBlocked ?? '' })}
          disabled={blocked}
          onClick={() => onDelete(menu)}
        >
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface SiteMenusScreenProps {
  readonly loading?: boolean;
  readonly initialLocation?: MenuLocation;
  /** 페이지 목록 조회기가 배선되지 않은 상태 — null 은 '없다' 가 아니라 '모른다' 다 */
  readonly catalogUnavailable?: boolean;
  readonly initialCollapsedIds?: readonly string[];
  readonly pendingDeleteId?: string;
}

function SiteMenusScreen({
  loading = false,
  initialLocation = 'header',
  catalogUnavailable = false,
  initialCollapsedIds = [],
  pendingDeleteId,
}: SiteMenusScreenProps) {
  const [menus, setMenus] = useState<readonly DemoMenu[]>(DEMO_MENUS);
  const [location, setLocation] = useState<MenuLocation>(initialLocation);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(initialCollapsedIds),
  );
  const [pendingDelete, setPendingDelete] = useState<DemoMenu | null>(
    () => DEMO_MENUS.find((menu) => menu.id === pendingDeleteId) ?? null,
  );

  const catalog = catalogUnavailable ? null : CATALOG;
  const broken = brokenMenuCount(menus, catalog);
  const roots = useMemo(() => rootMenus(menus, location), [menus, location]);

  const toggleExpand = (rootId: string): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  /** 형제 배열 안에서 한 칸 옮긴다 — 옮긴 뒤 번호를 1..n 으로 다시 매긴다 */
  const moveWithin =
    (siblings: readonly DemoMenu[]) =>
    (index: number, delta: number): void => {
      const orderedIds = moveArrayItem(
        siblings.map((menu) => menu.id),
        index,
        index + delta,
      );
      setMenus((prev) => renumberSiblings(prev, orderedIds));
    };

  const onToggleVisible = (menu: DemoMenu, next: boolean): void => {
    setMenus((prev) =>
      prev.map((entry) => (entry.id === menu.id ? { ...entry, visible: next } : entry)),
    );
  };

  const removeMenu = (id: string): void => {
    setMenus((prev) => prev.filter((menu) => menu.id !== id));
  };

  const rowPropsFor = (menu: DemoMenu, index: number, siblings: readonly DemoMenu[]) => ({
    menu,
    index,
    siblingCount: siblings.length,
    health: menuLinkHealth(menu.target, catalog),
    targetLabel: menuTargetLabel(menu.target, catalog),
    deleteBlocked: menuDeleteBlock(menus, menu.id),
    locked: loading,
    onMove: moveWithin(siblings),
    onToggleVisible,
    onDelete: (target: DemoMenu) => setPendingDelete(target),
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>메뉴 관리</h1>

      <div style={toolbarStyle}>
        <SegmentedControl
          ariaLabel="메뉴 위치"
          value={location}
          options={LOCATION_OPTIONS}
          onChange={(next) => {
            const found = MENU_LOCATIONS.find((value) => value === next);
            if (found !== undefined) setLocation(found);
          }}
        />
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          메뉴 추가
        </Button>
      </div>

      {/* 끊긴 링크는 데이터 사고다 — 개수를 먼저 알리고, 어느 행인지는 배지가 가리킨다 */}
      {broken > 0 && (
        <Alert tone="danger">
          {`연결된 페이지가 사라진 메뉴가 ${fmt(broken)}건 있습니다. 그대로 두면 방문자가 없는 주소로 이동합니다.`}
        </Alert>
      )}
      {/* 배선 사고는 데이터 사고와 다른 색·다른 문장으로 말한다 */}
      {catalog === null && (
        <Alert tone="warning">
          페이지 목록을 불러올 수 없어 내부 링크가 살아 있는지 확인하지 못했습니다.
        </Alert>
      )}

      <Card>
        <div style={cardBodyStyle}>
          {loading ? (
            <p style={hintStyle}>불러오는 중…</p>
          ) : roots.length === 0 ? (
            <EmptyState
              label="메뉴"
              action={
                <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
                  메뉴 추가
                </Button>
              }
            />
          ) : (
            <ul style={listStyle}>
              {roots.map((root, index) => {
                const panelId = `site-menu-children-${root.id}`;
                const children = childMenus(menus, root.id);
                const expanded = !collapsed.has(root.id);
                return (
                  <li key={root.id} style={groupStyle}>
                    <ul style={listStyle}>
                      <MenuRow
                        {...rowPropsFor(root, index, roots)}
                        expanded={expanded}
                        childPanelId={panelId}
                        childCount={children.length}
                        onToggleExpand={() => toggleExpand(root.id)}
                        onAddChild={() => {
                          /* 실화면: 하위 메뉴 추가 모달을 부모 id 로 연다 */
                        }}
                      />
                    </ul>
                    {children.length > 0 && expanded && (
                      <ul id={panelId} style={childListStyle}>
                        {children.map((child, childIndex) => (
                          <MenuRow key={child.id} {...rowPropsFor(child, childIndex, children)} />
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p style={hintStyle}>
            메뉴는 2단계까지 만들 수 있습니다. 하위 메뉴가 있는 메뉴는 하위를 먼저 정리해야 삭제할
            수 있습니다.
          </p>
        </div>
      </Card>

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="메뉴 삭제"
          message={`'${pendingDelete.label}' 메뉴를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="메뉴 삭제"
          onConfirm={() => {
            removeMenu(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상(상단): 2뎁스 트리 · 게시판 참조 · **끊긴 링크**(채용)와 **공개 전 페이지를 가리키는 메뉴**
 * (데이터 분석)가 한 화면에 함께 선다 — 둘은 다른 색·다른 문장·다른 복구 수단이다.
 */
export const Default: Story = {
  render: () => <SiteMenusScreen />,
};

/** 최초 로드: 목록 자리에 '불러오는 중' — 순서 이동은 그동안 잠긴다(STATE-01) */
export const Loading: Story = {
  render: () => <SiteMenusScreen loading />,
};

/** 하단 위치: 같은 트리를 세 곳이 나눠 쓴다 — 위치를 바꾸면 다른 형제 집합이 선다 */
export const FooterLocation: Story = {
  render: () => <SiteMenusScreen initialLocation="footer" />,
};

/**
 * 페이지 목록 미배선: 내부 링크의 상태를 **판정하지 못한 상태**다. 끊겼다고 말하지 않고
 * '(확인 불가)' 라고 말한다 — 배선 사고를 데이터 사고처럼 그리면 멀쩡한 메뉴가 지워진다.
 */
export const CatalogUnavailable: Story = {
  render: () => <SiteMenusScreen catalogUnavailable />,
};

/**
 * 삭제 차단: 하위 메뉴가 있는 '사업영역' 을 지우려 하면 확인 창 이전에 버튼이 잠긴다.
 * 이 스토리는 지울 수 있는 메뉴('회사소개')의 확인 창을 세워 두 경로를 나란히 보여 준다.
 */
export const DeleteConfirm: Story = {
  render: () => <SiteMenusScreen pendingDeleteId="mn-001" />,
};

/** 모바일 위치: 외부 링크만 있는 트리 — 외부 URL 은 건강 판정 대상이 아니다 */
export const MobileLocation: Story = {
  render: () => <SiteMenusScreen initialLocation="mobile" />,
};
