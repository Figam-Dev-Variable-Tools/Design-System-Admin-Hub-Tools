// AppShell — TDS Admin Hub 레이아웃 셸 (A40 소유 — apps/admin/src/**)
//
// 좌측 고정 사이드바 + 우측 콘텐츠. 사이드바 구조는 ./nav-config.ts 가 소유하고
// 여기서는 렌더만 한다. 인증 후 화면이 <Outlet />으로 들어온다.
//
// [스타일 규칙 — G6 체크리스트]
// - 모든 스타일 값은 토큰 CSS 변수(var(--tds-*))만 사용 — 하드코딩 색상 hex / px 리터럴 0건.
// - 토큰에 없는 파생 치수(사이드바 폭 등)는 space 토큰의 calc 배수로만 표현한다.
// - 보더 두께는 px 리터럴 대신 CSS 키워드(thin)를 사용한다.
// - React 스타일에서 단축 속성(padding)과 개별 속성(paddingLeft)을 섞지 않는다 — 병합이 깨진다.
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import './app-shell.css';
import AppHeader from './AppHeader';
import LogoPlaceholder from './LogoPlaceholder';
import { SIDEBAR_WIDTH, TOP_BAR_HEIGHT } from './layout-metrics';
import {
  BarChartIcon,
  BellIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  HeadsetIcon,
  ImageIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShoppingBagIcon,
  UsersIcon,
} from '../icons';
import { usePermissions } from '../permissions/PermissionProvider';
import { navGroupResourceId, navPageResourceId } from '../permissions/resources';
import { NAV_SECTIONS } from './nav-config';
import type { NavBranch, NavEntry, NavIconName } from './nav-config';

function NavIcon({ name }: { readonly name: NavIconName }): ReactNode {
  switch (name) {
    case 'layout-grid':
      return <LayoutGridIcon />;
    case 'users':
      return <UsersIcon />;
    case 'file-text':
      return <FileTextIcon />;
    case 'building':
      return <BuildingIcon />;
    case 'image':
      return <ImageIcon />;
    case 'shopping-bag':
      return <ShoppingBagIcon />;
    case 'briefcase':
      return <BriefcaseIcon />;
    case 'headset':
      return <HeadsetIcon />;
    case 'megaphone':
      return <MegaphoneIcon />;
    case 'calendar':
      return <CalendarIcon />;
    case 'bar-chart':
      return <BarChartIcon />;
    case 'scroll-text':
      return <ScrollTextIcon />;
    case 'bell':
      return <BellIcon />;
    case 'settings':
      return <SettingsIcon />;
  }
}

/* ── 스타일 (토큰 변수만) ──────────────────────────────────────────────── */

const shellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${SIDEBAR_WIDTH} minmax(0, 1fr)`,
  minHeight: '100vh',
  background: 'var(--tds-color-surface-default)',
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const sidebarStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--tds-color-surface-default)',
  borderRight: 'thin solid var(--tds-color-border-default)',
};

/**
 * 브랜드 영역 — 실제 로고 자산이 들어오면 <LogoPlaceholder /> 만 교체한다.
 *
 * 높이를 AppHeader 와 동일한 TOP_BAR_HEIGHT 로 고정해, 두 영역의 아래 구분선이
 * 한 줄로 이어지게 한다. 내용 높이에 따라 흘러가게 두면 선이 어긋난다.
 */
const brandStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  height: TOP_BAR_HEIGHT,
  paddingLeft: 'var(--tds-space-5)',
  paddingRight: 'var(--tds-space-5)',
  borderBottom: 'thin solid var(--tds-color-border-default)',
};

const navStyle: CSSProperties = {
  flexGrow: 1,
  overflowY: 'auto',
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-6)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-primitive-typography-font-size-12)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-primitive-typography-line-height-normal)',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

/**
 * 최상위 항목(잎/가지 공통) — 아이콘 + 라벨 [+ 화살표].
 *
 * 활성 표시 = 흰 배경 + 각진 모서리 + 왼쪽 파란 2px 테두리.
 * 비활성에도 같은 두께의 투명 테두리를 둬서 활성 전환 시 라벨이 밀리지 않게 한다.
 */
function rowStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--tds-space-3)',
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: 'var(--tds-space-3)',
    paddingBottom: 'var(--tds-space-3)',
    paddingLeft: 'var(--tds-space-3)',
    paddingRight: 'var(--tds-space-3)',
    border: 'none',
    borderLeftStyle: 'solid',
    borderLeftWidth: 'var(--tds-border-width-medium)',
    borderLeftColor: active ? 'var(--tds-color-action-primary-default)' : 'transparent',
    borderRadius: 0,
    background: 'var(--tds-color-surface-default)',
    color: active ? 'var(--tds-color-action-primary-default)' : 'var(--tds-color-text-default)',
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-body-md-font-size)',
    fontWeight: active
      ? 'var(--tds-primitive-typography-font-weight-medium)'
      : 'var(--tds-primitive-typography-font-weight-regular)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    textDecoration: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color var(--tds-motion-duration-fast)',
  };
}

const rowLabelStyle: CSSProperties = { flexGrow: 1 };

const chevronStyle: CSSProperties = {
  display: 'inline-flex',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
};

/** 서브 항목 — 아이콘 없이 들여쓰기. 활성 표시는 최상위 항목과 동일 규칙 */
function subRowStyle(active: boolean): CSSProperties {
  return {
    display: 'block',
    boxSizing: 'border-box',
    paddingTop: 'var(--tds-space-2)',
    paddingBottom: 'var(--tds-space-2)',
    // 아이콘 폭(1.25em ≈ space.5) + gap(space.3) 만큼 들여쓴다
    paddingLeft: 'calc(var(--tds-space-5) + var(--tds-space-6))',
    paddingRight: 'var(--tds-space-3)',
    borderLeftStyle: 'solid',
    borderLeftWidth: 'var(--tds-border-width-medium)',
    borderLeftColor: active ? 'var(--tds-color-action-primary-default)' : 'transparent',
    borderRadius: 0,
    background: 'var(--tds-color-surface-default)',
    color: active ? 'var(--tds-color-action-primary-default)' : 'var(--tds-color-text-muted)',
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: active
      ? 'var(--tds-primitive-typography-font-weight-medium)'
      : 'var(--tds-primitive-typography-font-weight-regular)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    textDecoration: 'none',
    transition: 'background-color var(--tds-motion-duration-fast)',
  };
}

const subListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  margin: 0,
  marginTop: 'var(--tds-space-1)',
  padding: 0,
  listStyle: 'none',
};

const contentColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  background: 'var(--tds-color-surface-default)',
};

const mainStyle: CSSProperties = {
  flexGrow: 1,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  paddingLeft: 'var(--tds-space-6)',
  paddingRight: 'var(--tds-space-6)',
};

/* ── 렌더 ─────────────────────────────────────────────────────────────── */

/**
 * 확장형 항목 — 현재 경로가 basePath 아래면 기본 펼침.
 * branch 임이 타입으로 보장되므로 훅 앞의 조건부 return 이 없다 (Rules of Hooks).
 */
function BranchEntry({
  icon,
  item,
  pathname,
}: {
  readonly icon: NavIconName;
  readonly item: NavBranch;
  readonly pathname: string;
}) {
  const [open, setOpen] = useState(() => pathname.startsWith(item.basePath));
  const panelId = `nav-panel-${item.basePath.replace(/\//g, '-')}`;

  return (
    <li>
      <button
        type="button"
        className="tds-nav-row"
        style={rowStyle(false)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <NavIcon name={icon} />
        <span style={rowLabelStyle}>{item.label}</span>
        <span style={chevronStyle}>{open ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
      </button>

      {open && (
        <ul id={panelId} style={subListStyle}>
          {item.children.map((child) => (
            <li key={child.to}>
              <NavLink
                to={child.to}
                end
                className="tds-nav-row"
                style={({ isActive }) => subRowStyle(isActive)}
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const { can } = usePermissions();

  /**
   * 메뉴 가시성 판정 — 활성 역할의 **read** 권한만 본다 (등록/수정/삭제/내보내기는 화면 안의 일).
   *
   * - 잎: 그 경로의 read 가 꺼졌으면 서브메뉴에서 사라진다.
   * - 가지: 그룹의 read 가 꺼졌거나, 살아남은 잎이 하나도 없으면 그룹째 사라진다.
   *   (권한 모델이 '그룹 = 자식의 합집합' 을 강제하므로 두 조건은 사실상 같지만,
   *    사이드바가 모델의 불변식에 기대지 않도록 여기서도 잎을 직접 센다.)
   */
  function visibleEntry(entry: NavEntry): NavEntry | null {
    const item = entry.item;

    if (item.kind === 'leaf') {
      return can(navPageResourceId(item.to), 'read') ? entry : null;
    }

    if (!can(navGroupResourceId(item.basePath), 'read')) return null;

    const children = item.children.filter((leaf) => can(navPageResourceId(leaf.to), 'read'));
    if (children.length === 0) return null;

    return { ...entry, item: { ...item, children } };
  }

  // 권한이 꺼진 메뉴는 렌더하지 않는다. 그 결과 항목이 하나도 없는 섹션은 제목까지 감춘다.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.map(visibleEntry).filter((entry): entry is NavEntry => entry !== null),
  })).filter((section) => section.entries.length > 0);

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <div style={brandStyle}>
          <LogoPlaceholder />
        </div>

        <nav style={navStyle} aria-label="주 내비게이션">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 style={sectionTitleStyle}>{section.title}</h2>
              <ul style={listStyle}>
                {section.entries.map((entry) =>
                  entry.item.kind === 'leaf' ? (
                    <li key={entry.item.to}>
                      <NavLink
                        to={entry.item.to}
                        end
                        className="tds-nav-row"
                        style={({ isActive }) => rowStyle(isActive)}
                      >
                        <NavIcon name={entry.icon} />
                        <span style={rowLabelStyle}>{entry.item.label}</span>
                      </NavLink>
                    </li>
                  ) : (
                    <BranchEntry
                      key={entry.item.basePath}
                      icon={entry.icon}
                      item={entry.item}
                      pathname={pathname}
                    />
                  ),
                )}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div style={contentColumnStyle}>
        <AppHeader />
        <main style={mainStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
