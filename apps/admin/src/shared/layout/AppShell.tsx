// AppShell — TDS Admin Hub 레이아웃 셸
//
// 좌측 고정 사이드바 + 우측 콘텐츠. 사이드바 구조는 ./nav-config.ts 가 소유하고
// 여기서는 렌더만 한다. 인증 후 화면이 <Outlet />으로 들어온다.
//
// [DS 로 옮긴 것 / 여기 남은 것 — 이 파일의 뼈대]
// 사이드바의 시각·행 상호작용·폭·펼침 애니메이션은 전부 @tds/ui 의 Sidebar 가 가져갔다.
// 여기 남은 것은 **앱만 아는 사실** 넷이다:
//   (1) 내비게이션 트리가 무엇인가        → nav-config 의 NAV_SECTIONS
//   (2) 지금 어느 잎이 켜져야 하는가      → findCoveringLeaf (헤더 <h1> 과 같은 함수)
//   (3) 어느 가지가 펼쳐져야 하는가       → findCoveringBranch + '한 번에 하나만' 규칙
//   (4) 이 역할이 무엇을 볼 수 있는가     → usePermissions
// DS 가 이것들을 배우면 이 앱에서만 쓸 수 있는 컴포넌트가 된다 (contracts/Sidebar.contract.json).
//
// [스타일 규칙 — G6 체크리스트]
// - 모든 스타일 값은 토큰 CSS 변수(var(--tds-*))만 사용 — 하드코딩 색상 hex / px 리터럴 0건.
// - React 스타일에서 단축 속성(padding)과 개별 속성(paddingLeft)을 섞지 않는다 — 병합이 깨진다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { cssVar, Sidebar } from '@tds/ui';

import AppHeader from './AppHeader';
import LogoPlaceholder from './LogoPlaceholder';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { RouteErrorScreen } from '../errors/ErrorScreens';
import { RequirePermission } from '../permissions/RequirePermission';
import { Icon, visuallyHiddenStyle } from '../ui';
import { usePermissions } from '../permissions/PermissionProvider';
import { navGroupResourceId, navPageResourceId } from '../permissions/resources';
import { findCoveringBranch, findCoveringLeaf, findNavLabel, NAV_SECTIONS } from './nav-config';
import type { NavEntry, NavIconName } from './nav-config';

/**
 * 내비게이션 아이콘 — DS Icon 하나로 그린다.
 *
 * [예전엔 왜 30줄짜리 switch 였나] NavIconName 14종을 앱 로컬 컴포넌트(LayoutGridIcon …)에
 * 손으로 이어 붙이고 있었다. NavIconName 은 contracts/Icon.contract.json 의 name enum 의
 * **부분집합**이라 그 배선표 자체가 불필요했다 — 이름을 그대로 넘기면 된다.
 * 덕분에 '메뉴에 아이콘을 추가했는데 switch 에 case 를 빠뜨려 아무것도 안 그려지는' 경로가
 * 구조적으로 사라졌다.
 *
 * [픽셀이 바뀌는가 — 14종 중 13종은 바뀌지 않는다. 기계적으로 그렇다]
 *   DS 기하는 tools/codegen/src/extract-icons.ts 가 apps/admin/src/shared/icons.tsx 에서
 *   **추출한 것**이라 13종은 같은 원본의 같은 패스다. 예외는 image 하나 —
 *   그것만 assets/icons/ds-icon-geometry.json 의 DS 저작본이 앱 사본을 이긴다(추출기가
 *   DS 저작본에 우선권을 준다). 즉 이 변경으로 모양이 달라지는 사이드바 행은
 *   **'이미지 관리' 한 줄뿐**이고, 나머지 13줄은 바이트 동일이다.
 *   (실제 렌더 비교는 VRT 단의 몫이다 — 여기서는 원천 대조까지만 확인했다.)
 *
 * ⚠️ shared/icons.tsx 의 14개 컴포넌트를 지우지 마라. 호출부는 사라졌지만 그 파일은
 *    codegen 의 **저작 원천**이고, 지우면 계약 enum 에서 아이콘이 사라진다.
 */
function NavIcon({ name }: { readonly name: NavIconName }): ReactNode {
  return <Icon name={name} />;
}

/* ── 스타일 (토큰 변수만) ──────────────────────────────────────────────── */

/* 첫 열이 auto 다 — 사이드바 폭의 정본은 DS 로 옮겨 갔다(Sidebar.css). 예전에는 앱이
   SIDEBAR_WIDTH 상수를 들고 그리드와 사이드바 양쪽에 같은 값을 먹였는데, 값이 두 곳에
   있으면 언젠가 갈라진다. */
const shellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  minHeight: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const contentColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  background: cssVar('color.surface.default'),
};

/* 본문 여백은 space.7(32px) — 넉넉한 여백은 Toss 의 하중 특성이고, 24px 에서 멈춘
   스케일로는 만들 수 없어 F3a 가 space.7~10 을 냈다 (TOKEN-08). 화면 130여 개가
   이 <main> 안에 들어오므로 여기 한 곳이 전역 page padding 의 정본이다. */
const mainStyle: CSSProperties = {
  flexGrow: 1,
  paddingTop: cssVar('space.7'),
  paddingBottom: cssVar('space.7'),
  paddingLeft: cssVar('space.7'),
  paddingRight: cssVar('space.7'),
};

/** <main> 의 앵커 id — skip link 의 목적지이자 라우트 이동 시 포커스 착지점 */
const MAIN_ID = 'tds-main';

/**
 * skip link (A11Y-06) — 평소엔 화면 밖, 포커스되면 좌상단에 뜬다.
 *
 * 모든 라우트가 **큰 다중 섹션 nav 를 main 앞에** 렌더한다. 우회로가 없으면 키보드/SR 사용자는
 * 화면을 옮길 때마다 메뉴 수십 개를 Tab 으로 지나야 한다 (WCAG 2.4.1).
 */
const skipLinkStyle: CSSProperties = {
  ...visuallyHiddenStyle,
};

const skipLinkFocusedStyle: CSSProperties = {
  position: 'absolute',
  top: cssVar('space.2'),
  left: cssVar('space.2'),
  zIndex: 1,
  width: 'auto',
  height: 'auto',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  overflow: 'visible',
  clip: 'auto',
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  textDecoration: 'none',
};

/* ── 렌더 ─────────────────────────────────────────────────────────────── */

/**
 * 본문으로 건너뛰기 (A11Y-06).
 *
 * 앵커 대신 button + focus() 를 쓴다: `<a href="#id">` 는 URL 에 해시를 남기고, 그 해시가 남은 채
 * 다른 라우트로 이동하면 react-router 가 스크롤 앵커로 오인한다. 목적은 '포커스 이동' 하나뿐이라
 * 그것만 한다.
 */
function SkipToMain() {
  const [focused, setFocused] = useState(false);

  return (
    <button
      type="button"
      className="tds-ui-focusable"
      style={focused ? skipLinkFocusedStyle : skipLinkStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={() => {
        document.getElementById(MAIN_ID)?.focus();
      }}
    >
      본문으로 건너뛰기
    </button>
  );
}

/**
 * 라우트 변경 시 포커스를 main 으로 옮기고 새 화면을 알린다 (A11Y-07).
 *
 * NavLink 이동은 포커스를 **누른 nav 항목에 남기고** 아무것도 announce 하지 않는다 — SR 사용자는
 * 화면이 바뀐 사실조차 모른 채 nav 를 다시 훑는다.
 *
 * [최초 진입에는 포커스를 옮기지 않는다] 페이지를 처음 열었을 때 포커스를 강제로 main 에 두면
 * 첫 Tab 이 main **안쪽**으로 들어가 skip link 를 건너뛴다 — A11Y-06 이 깨진다. 그래서 '이동'
 * 에만 반응한다.
 *
 * [왜 boolean 플래그가 아니라 pathname 을 기억하나 — StrictMode]
 * `firstRender` boolean 은 **StrictMode 에서 틀린다**: 개발 모드는 effect 를 mount→unmount→remount
 * 로 두 번 돌리므로, 첫 실행이 플래그를 소비하고 **재실행이 최초 진입을 '이동' 으로 오인해** main 에
 * 포커스를 준다(실측: 첫 Tab 이 skip link 가 아니라 탭바에 떨어졌다). 마지막으로 포커스를 준
 * 경로를 기억하면 몇 번을 다시 돌든 결과가 같다(멱등) — 같은 경로면 아무 일도 하지 않는다.
 */
function RouteFocusAnnouncer({ label }: { readonly label: string }) {
  const { pathname } = useLocation();
  const focusedPathRef = useRef(pathname);

  useEffect(() => {
    if (focusedPathRef.current === pathname) return;
    focusedPathRef.current = pathname;
    // preventScroll — focus() 의 기본 동작은 대상을 화면 안으로 끌어오는 것이라, 여기서 막지 않으면
    // 바로 아래 scrollTo(0) 와 싸운다. 포커스 이동만 시키고 스크롤 위치는 다음 줄이 정한다.
    document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  // polite live region — 이동한 화면의 이름을 읽어 준다. 항상 마운트돼 있어야 주입이 announce 된다.
  return (
    <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
      {label}
    </div>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();

  /**
   * 펼쳐진 가지 — 항상 0개 또는 1개다.
   *
   * [경로가 정본, 클릭은 그 위의 덧칠] 화면을 옮기면 그 화면이 속한 가지만 열려 있어야 하므로
   * 이동 때마다 경로 기준으로 되돌린다. 그 사이 사용자가 다른 가지를 눌러 둘러보는 것은 허용하되,
   * 그때도 눌린 가지 하나만 남기고 나머지는 닫는다.
   *
   * [effect 가 아니라 렌더 중 조정] useEffect 로 맞추면 **닫힌 프레임이 한 번 그려진 뒤** 열려서
   * 메뉴가 깜빡인다. 렌더 도중의 setState 는 커밋 전에 즉시 재실행되므로 중간 프레임이 없다.
   *
   * [DS 가 아니라 여기 있는 이유] '한 번에 하나만' 도 '경로가 바뀌면 그 가지를 연다' 도 경로를
   * 아는 쪽만 강제할 수 있는 규칙이다. Sidebar 는 onToggle 로 의사만 올리고 openId 를 되받는다.
   */
  const routeBasePath = findCoveringBranch(pathname);

  /**
   * 지금 켜져야 할 잎 — 사이드바 전체가 이 한 번의 판정을 나눠 쓴다.
   *
   * [왜 NavLink 를 쓰지 않았나] NavLink 의 `end`(정확 일치)는 잎 경로에만 불이 들어온다. 그래서
   * '/settings/oauth/kakao' · '/users/members/U-1' · '/products/prd-2/edit' 처럼 잎 **아래**에 있는
   * 모든 상세·편집 라우트에서 사이드바가 통째로 꺼졌다 — 운영자는 자기가 어느 메뉴에 있는지 잃는다.
   * `end` 를 떼면 반대로 '/products' 가 '/products/categories' 까지 삼킨다.
   *
   * 답은 nav-config 에 있다: findCoveringLeaf 는 '세그먼트 경계 기준 **최장** 일치하는 잎'을
   * 돌려주고, 헤더의 <h1>(findNavLabel) 이 그 규칙으로 화면 이름을 정한다. 판정이 두 벌이 되면
   * 헤더와 사이드바가 서로 다른 곳을 가리키므로 **같은 답 하나**를 Sidebar 의 activeHref 로 넘긴다.
   * aria-current 도 DS 안에서 같은 판정으로 나간다.
   */
  const activeLeafTo = findCoveringLeaf(pathname)?.to ?? '';

  const [openBasePath, setOpenBasePath] = useState<string | null>(routeBasePath);
  const [syncedPath, setSyncedPath] = useState(pathname);

  if (syncedPath !== pathname) {
    setSyncedPath(pathname);
    setOpenBasePath(routeBasePath);
  }

  /**
   * 메뉴 가시성 판정 — 활성 역할의 **read** 권한만 본다 (등록/수정/삭제/내보내기는 화면 안의 일).
   *
   * - 잎: 그 경로의 read 가 꺼졌으면 서브메뉴에서 사라진다.
   * - 가지: 그룹의 read 가 꺼졌거나, 살아남은 잎이 하나도 없으면 그룹째 사라진다.
   *   (권한 모델이 '그룹 = 자식의 합집합' 을 강제하므로 두 조건은 사실상 같지만,
   *    사이드바가 모델의 불변식에 기대지 않도록 여기서도 잎을 직접 센다.)
   *
   * DS 는 **이미 걸러진 목록**을 받는다 — 어떤 역할이 무엇을 보는지는 제품의 사실이다.
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
  // 가지의 id 는 basePath, 잎의 id 는 to — openBasePath 와 같은 좌표계여야 펼침이 이어진다.
  const sections = NAV_SECTIONS.map((section) => ({
    id: section.title,
    title: section.title,
    entries: section.entries.map(visibleEntry).filter((entry): entry is NavEntry => entry !== null),
  }))
    .filter((section) => section.entries.length > 0)
    .map((section) => ({
      id: section.id,
      title: section.title,
      items: section.entries.map((entry) => {
        const item = entry.item;
        const icon = <NavIcon name={entry.icon} />;

        if (item.kind === 'leaf') {
          return { id: item.to, label: item.label, href: item.to, icon };
        }

        return {
          id: item.basePath,
          label: item.label,
          icon,
          children: item.children.map((child) => ({
            id: child.to,
            label: child.label,
            href: child.to,
          })),
        };
      }),
    }));

  return (
    <div style={shellStyle}>
      {/* shell 의 첫 focusable — 첫 Tab 이 여기 멈춘다 (A11Y-06) */}
      <SkipToMain />

      <Sidebar
        label="주 내비게이션"
        sections={sections}
        activeHref={activeLeafTo}
        openId={openBasePath ?? ''}
        brand={<LogoPlaceholder />}
        onToggle={(id) => {
          setOpenBasePath((prev) => (prev === id ? null : id));
        }}
        // DS 는 진짜 <a href> 를 그리고 수식키 없는 왼쪽 클릭만 올려 준다 — SPA 이동을 여기서 잇는다.
        // 새 탭 열기·가운데 클릭은 애초에 여기까지 오지 않고 브라우저가 처리한다.
        onNavigate={(href) => {
          void navigate(href);
        }}
      />

      <div style={contentColumnStyle}>
        <AppHeader />

        {/* tabIndex=-1 — 프로그램적 포커스만 받는다(Tab 순서엔 끼지 않는다). skip link 와
            라우트 이동(RouteFocusAnnouncer)이 이 지점으로 포커스를 보낸다 (A11Y-06/07). */}
        <main id={MAIN_ID} tabIndex={-1} style={mainStyle}>
          <RouteFocusAnnouncer label={findNavLabel(pathname)} />

          {/*
            [경계의 자리 — EXC-01] <Outlet> 바로 바깥이다. 화면이 던져도 여기서 멈추므로
            사이드바·헤더는 살아남고 운영자는 다른 메뉴로 걸어 나갈 수 있다. resetKey=pathname 이라
            **다른 화면으로 이동하는 것만으로 경계가 스스로 풀린다**.

            [순서] 경계가 권한 가드보다 바깥이다 — 403 화면 자체가 던져도 앱이 죽지 않는다.
          */}
          <ErrorBoundary
            resetKey={pathname}
            fallback={({ reference, reset }) => (
              <RouteErrorScreen reference={reference} onRetry={reset} />
            )}
          >
            <RequirePermission>
              <Outlet />
            </RequirePermission>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
