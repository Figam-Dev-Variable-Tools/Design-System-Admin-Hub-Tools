// 권한 관리 화면 로컬 아이콘 (A41 소유 — apps/admin/src/pages/permissions/**)
//
// 이 파일은 이 화면에만 필요한 아이콘(자물쇠 · '+')을 둔다.
// 연필(수정)·휴지통(삭제)은 여기 없다 — 그 둘은 shared/ui 배럴에서 가져온다 (RolePanel 참조).
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

/** 추가 — + */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** 시스템 역할(슈퍼어드민) — 자물쇠. 읽기 전용임을 색 말고도 알린다 */
export function LockIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
