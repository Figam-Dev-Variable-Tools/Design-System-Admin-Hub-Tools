// 앱 공용 인라인 SVG 아이콘.
//
// 정식 아이콘 자산은 아이콘 디자인 쪽 assets/icons/** 이다. @tds/ui 에는 아직 범용 <Icon>
// 모듈이 없어(현재 shipped 15종은 아이콘을 ReactNode 슬롯으로 주입받는다) 앱이 인라인 SVG 로 갖는다.
// 여러 화면이 쓰는 것만 여기 두고, 한 화면 전용은 그 화면 폴더의 icons.tsx 에 남긴다.
//
// 크기는 1em 기준 — 부모의 font-size 와 color(currentColor)를 따라간다. raw px 리터럴 0건.
import type { SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

const BASE = {
  width: '1.25em',
  height: '1.25em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** 대시보드 홈 — 4분할 그리드 */
export function LayoutGridIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** 사내 공지 — 확성기 */
export function MegaphoneIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8a4 4 0 0 1 0 8" />
      <path d="M6 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

/** 고객 관리 — 사람 둘 */
export function UsersIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M15 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="8.5" cy="8" r="3.5" />
      <path d="M17 20v-1a4 4 0 0 0-2.5-3.7" />
      <path d="M15 4.5a3.5 3.5 0 0 1 0 7" />
    </svg>
  );
}

/** 상품/렌탈 관리 — 상자 */
export function BoxIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M21 8.5v7a1.5 1.5 0 0 1-.8 1.3l-7 3.7a1.5 1.5 0 0 1-1.4 0l-7-3.7A1.5 1.5 0 0 1 3 15.5v-7a1.5 1.5 0 0 1 .8-1.3l7-3.7a1.5 1.5 0 0 1 1.4 0l7 3.7A1.5 1.5 0 0 1 21 8.5Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

/** 통계 — 막대 차트 */
export function BarChartIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6" />
      <path d="M13 20V9" />
      <path d="M18 20v-9" />
    </svg>
  );
}

/** 환경설정 — 톱니 */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  );
}

/** 콘텐츠 관리 — 글이 있는 문서 */
export function FileTextIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

/** 기업 관리 — 건물 */
export function BuildingIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h2a2 2 0 0 1 2 2v10" />
      <path d="M2 21h20" />
      <path d="M8 7h4" />
      <path d="M8 11h4" />
      <path d="M8 15h4" />
    </svg>
  );
}

/** 포트폴리오 관리 — 이미지/갤러리 */
export function ImageIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </svg>
  );
}

/** 상품 관리 — 쇼핑백 */
export function ShoppingBagIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

/** 영업 관리 — 서류가방 */
export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <path d="M2 13h20" />
    </svg>
  );
}

/** 고객센터 — 헤드셋 */
export function HeadsetIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2Z" />
      <path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2Z" />
      <path d="M17 18v1a3 3 0 0 1-3 3h-2" />
    </svg>
  );
}

/** 예약/신청 관리 — 달력 */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

/** 로그 관리 — 두루마리 문서 */
export function ScrollTextIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M8 21h11a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1h-3" />
      <path d="M19 17V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1h3" />
      <path d="M7 7v12a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1h3" />
      <path d="M11 8h5" />
      <path d="M11 12h5" />
    </svg>
  );
}

/** 알림 관리 — 종 */
export function BellIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 6-3 7-3 7h18s-3-1-3-7" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

/** 서브메뉴 접힘 표시 — 오른쪽 화살표 */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** 서브메뉴 펼침 표시 — 아래 화살표 */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
