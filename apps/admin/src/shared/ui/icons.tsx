// 공통 아이콘 (A40 소유 — apps/admin/src/shared/ui/**)
//
// [무엇이 여기 사는가] **두 개 이상의 페이지**(또는 공통 컴포넌트)가 쓰는 아이콘만 둔다.
// 한 페이지에서만 쓰는 아이콘은 그 페이지의 icons.tsx 에 남긴다 (예: members 의 ⋯/내보내기/뒤로).
// 사이드바·대시보드가 쓰는 내비게이션 아이콘은 shared/icons.tsx 가 갖는다 — 여기는 UI 프리미티브용이다.
//
// 크기는 1em 기준 — 부모의 font-size 와 color(currentColor)를 따라간다. raw px 리터럴 0건.
import type { SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

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

/** 배너 닫기 / 모달 닫기 / 토스트 닫기 — × */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

/** 안내 — 원 안에 i */
export function InfoCircleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M12 11v5" />
    </svg>
  );
}

/** 성공 — 원 안에 체크 (토스트 success · 확인 완료) */
export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** 취소 — 원 안에 × (토스트 cancelled) */
export function XCircleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

/** 경고/실패 — 삼각형 안에 느낌표 (토스트 danger · discard 확인) */
export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 4 3 20h18Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** 생성 — 원 안에 + (ConfirmDialog intent="create") */
export function PlusCircleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

/** 수정 — 연필 (ConfirmDialog intent="update" · 표의 편집 액션) */
export function PencilIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      <path d="M15 5l3 3" />
    </svg>
  );
}

/** 삭제 — 휴지통 (ConfirmDialog intent="delete") */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

/**
 * 내보내기 — 아래로 받는 화살표.
 *
 * [승격 이력] 원래 pages/members/icons.tsx 에 있었다. 로그인 이력 화면이 같은 내보내기 버튼을
 * 갖게 되면서 **두 번째 소비자**가 생겼다 — 페이지를 가로질러 import 하는 대신 여기로 올렸다
 * (README 규칙 1·2). 회원 화면만 쓰던 ⋯/뒤로 아이콘은 그대로 그 페이지에 남는다.
 */
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

/** 검색 — 돋보기 (회원/운영자 검색) */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** 페이지네이션 이전 */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/** 페이지네이션 다음 */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
