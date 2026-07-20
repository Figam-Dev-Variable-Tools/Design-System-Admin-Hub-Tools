// 긴 폼의 좌측 구획 내비게이션 — '지금 어느 구획을 보고 있나' + '어디를 고쳐야 하나'
//
// [왜 FilterPanel 이 아닌가 — 이것은 필터가 아니다]
// 좌측 레일이라는 껍데기(FilterRail)는 목록 화면과 공유한다. 하지만 그 안에 들어가는 **내용**은
// 다르다. FilterPanel 은 컬렉션을 좁히는 상호배타 토글이고, 그래서 건수 배지와 `aria-pressed` 를
// 갖는다. 폼에는 좁힐 컬렉션이 없다 — 여기서 항목을 누르는 것은 '거르기' 가 아니라 '이동' 이다.
//
// [A11Y-12 의 반대편] 그러므로 상태 표기도 반대다:
//   · 필터(FilterPanel)  → `aria-pressed`  ('눌려 있다')
//   · 내비(FormSectionNav) → `aria-current` ('지금 여기다')
// 둘을 바꿔 달면 스크린리더가 '토글 버튼, 눌림' 으로 읽어 문서 안의 위치를 잃는다.
// shared/a11y-guard.test.ts 가 두 방향을 모두 지킨다.
//
// [건수 배지 자리에 무엇이 오나] 폼에서 그 자리에 놓을 사실은 '몇 건' 이 아니라 **'여기 오류가 있다'**
// 이다. 카드 일곱 장짜리 폼은 저장 버튼을 눌렀을 때 오류가 두 화면 아래에 있을 수 있다 — 레일이
// 그것을 한눈에 말해 준다. 색만으로 말하지 않는다(WCAG 1.4.1): 점 옆에 숨은 텍스트를 함께 낸다.
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import './FormSectionNav.css';
import { filterHeadingStyle, filterNavStyle, visuallyHiddenStyle } from './styles';
import { cssVar } from '@tds/ui';

/** 오류 표시의 접근성 텍스트 — 색(붉은 점)만으로 말하지 않는다 */
const INVALID_LABEL = '확인 필요';

/**
 * 판정 띠 — 뷰포트 **위쪽 20%** 만 남긴다. 여기에 걸친 구획이 '지금 읽고 있는 것'이다.
 *
 * 화면 전체를 보면 긴 폼에서는 늘 서너 구획이 동시에 걸려 판정이 흔들린다. 위쪽만 보면
 * 읽는 눈이 있는 자리 하나로 좁혀진다.
 *
 * 토큰이 아니라 비율인 이유: 이것은 여백이 아니라 **관측 창(root margin)** 이고,
 * IntersectionObserver 의 rootMargin 은 CSS 변수를 받지 않는다(계산된 길이만 받는다).
 */
const OBSERVER_ROOT_MARGIN = '0% 0% -80% 0%';

/** 구획 하나 — 레일의 한 줄이자 본문의 한 앵커 */
export interface FormSectionItem {
  /** 본문 앵커(FormSectionAnchor)의 id 와 같아야 한다 */
  readonly id: string;
  readonly label: string;
  /** 이 구획에 검증 오류가 남아 있다 — 붉은 점 + '확인 필요' */
  readonly invalid?: boolean;
}

interface FormSectionNavProps {
  /** nav 의 접근성 이름 — 한 화면에 레일이 둘 이상일 수 있어 각자 이름을 갖는다 */
  readonly navLabel: string;
  readonly heading: string;
  readonly items: readonly FormSectionItem[];
  /** 지금 보고 있는 구획의 id — 보통 useActiveSection 이 준다 */
  readonly activeId: string;
  readonly onJump: (id: string) => void;
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

/** 항목 — filterItemStyle 과 같은 시각 언어이되 배지 자리가 다르다(건수가 아니라 오류 점) */
function navItemStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: cssVar('space.2'),
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: cssVar('radius.md'),
    background: active ? cssVar('color.surface.raised') : 'transparent',
    color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: active
      ? cssVar('primitive.typography.font-weight.bold')
      : cssVar('primitive.typography.font-weight.regular'),
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color var(--tds-motion-duration-fast)',
  };
}

/** 차례 번호 — 이 레일이 '문서를 걷는 것' 이지 '거르는 것' 이 아님을 눈으로도 말한다 */
function stepStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: cssVar('space.5'),
    height: cssVar('space.5'),
    borderRadius: cssVar('radius.full'),
    background: active ? cssVar('color.action.primary.default') : cssVar('color.surface.raised'),
    color: active ? cssVar('color.text.on-primary') : cssVar('color.text.muted'),
    fontSize: 'var(--tds-typography-label-sm-font-size)',
    lineHeight: 'var(--tds-typography-label-sm-line-height)',
    fontVariantNumeric: 'tabular-nums',
  };
}

const labelStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
};

const invalidDotStyle: CSSProperties = {
  flexShrink: 0,
  width: cssVar('space.2'),
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.danger.text'),
};

/**
 * 구획 내비게이션.
 *
 * 목록은 `<ol>` 이다 — 폼의 구획에는 차례가 있고, 그 차례가 곧 화면을 내려가는 순서다.
 */
export function FormSectionNav({
  navLabel,
  heading,
  items,
  activeId,
  onJump,
}: FormSectionNavProps) {
  return (
    <nav style={filterNavStyle} aria-label={navLabel}>
      <h2 style={filterHeadingStyle}>{heading}</h2>

      <ol style={listStyle}>
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="tds-ui-navitem tds-ui-focusable"
                style={navItemStyle(active)}
                // [A11Y-12] 여기는 '현재 위치' 다 — aria-pressed 가 아니다.
                // 현재가 아닌 항목에는 속성을 달지 않는다(hover 선택자도 이 부재를 본다).
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  onJump(item.id);
                }}
              >
                <span style={stepStyle(active)} aria-hidden="true">
                  {index + 1}
                </span>
                <span style={labelStyle}>{item.label}</span>
                {item.invalid === true && (
                  <>
                    <span style={invalidDotStyle} aria-hidden="true" />
                    <span style={visuallyHiddenStyle}>{INVALID_LABEL}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const anchorStyle: CSSProperties = {
  // 레일에서 뛰어온 구획이 화면 맨 위에 딱 붙지 않게 한 칸 띄운다
  scrollMarginTop: cssVar('space.7'),
};

/**
 * 본문 쪽 앵커 — 레일이 가리키는 목적지.
 *
 * `<section aria-label>` 이라 landmark(region)가 되고, 스크린리더는 레일을 쓰지 않고도 구획 단위로
 * 건너뛸 수 있다. `tabIndex={-1}` 은 **프로그램적 포커스만** 받는다(Tab 순서엔 끼지 않는다) —
 * 레일에서 점프했을 때 포커스가 따라와야 키보드 사용자가 스크롤만 하고 제자리에 남지 않는다.
 * 포커스를 가두지 않으므로 다음 Tab 은 그 구획의 첫 입력으로 자연히 넘어간다.
 */
export function FormSectionAnchor({
  id,
  label,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} aria-label={label} tabIndex={-1} style={anchorStyle}>
      {children}
    </section>
  );
}

/**
 * 구획으로 이동한다 — 스크롤 + 포커스.
 *
 * 스크롤만 옮기면 키보드/스크린리더 사용자는 화면만 움직이고 자기 위치는 레일에 남는다.
 * `prefers-reduced-motion` 을 존중한다 — 부드러운 스크롤이 어지럼증을 유발하는 사용자가 있다.
 */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (target === null) return;

  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  // preventScroll — 위 scrollIntoView 가 정한 위치를 포커스가 다시 흔들지 않게 한다
  target.focus({ preventScroll: true });
}

/**
 * 지금 화면에 보이는 구획을 따라간다.
 *
 * [왜 IntersectionObserver 인가] scroll 이벤트마다 getBoundingClientRect 를 일곱 번 부르면 스크롤이
 * 레이아웃 계산에 묶인다. 관측자는 브라우저가 프레임 밖에서 계산해 준다.
 *
 * [없는 환경] jsdom 처럼 관측자가 없는 환경에서는 첫 구획을 활성으로 두고 조용히 물러난다 —
 * 없는 API 를 흉내 내다 폼 전체를 던지게 하지 않는다.
 *
 * @param ids 구획 id 를 **문서 순서대로**. 렌더마다 새 배열을 넘기면 관측자가 매번 다시 붙는다 —
 *            모듈 상수나 useMemo 로 고정해 넘긴다.
 */
export function useActiveSection(ids: readonly string[]): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    /** id → 지금 판정선 안에 걸쳐 있는가 */
    const onScreen = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onScreen.set(entry.target.id, entry.isIntersecting);
        }
        // 띠에 걸친 것이 여럿이면(앞 구획의 꼬리 + 뒤 구획의 머리) **문서 순서상 마지막**이
        // 지금 막 들어선 구획이다 — 앞의 꼬리를 집으면 목차가 한 칸 뒤처져 따라온다
        // (레일에서 4번째로 점프했는데 3번째가 켜져 있는 그 증상이다).
        // 하나도 없으면(긴 구획 한복판 · 문서 끝) 직전 값을 유지한다 — 레일이 깜빡이지 않게.
        // (Array.prototype.findLast 는 ES2023 이고 이 앱의 target 은 ES2022 다 — 뒤에서부터 훑는다)
        for (let i = ids.length - 1; i >= 0; i -= 1) {
          const id = ids[i];
          if (id !== undefined && onScreen.get(id) === true) {
            setActiveId(id);
            break;
          }
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0 },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element !== null) observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return activeId;
}
