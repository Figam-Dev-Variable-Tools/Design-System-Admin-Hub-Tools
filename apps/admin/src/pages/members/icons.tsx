// 회원 화면 **전용** 아이콘 — **DS Icon 의 저작(authoring) 원천이기도 하다. 지우지 마라.**
//
// [무엇이 여기 남았나] 회원 화면에서만 쓰는 것뿐이다 (⋯ / 뒤로).
// 여러 화면이 쓰는 아이콘(검색·연필·휴지통·닫기·ⓘ·좌우 화살표·**내보내기**)은 **shared/icons.tsx** 에
// 있다 — 여기서 복제하지 않는다. `DownloadIcon` 은 로그인 이력이 두 번째 소비자가 되면서 거기로 올라갔다.
// 정식 아이콘 자산은 아이콘 디자인 쪽 assets/icons/**, 공용 <Icon> 은 이미 packages/ui 로 승격돼
// contracts/Icon.contract.json 을 갖는다 — 새 호출부는 `<Icon name="…" />` 를 쓴다.
//
// ⚠️ [호출부가 없어도 죽은 코드가 아니다]
//   tools/codegen/src/extract-icons.ts 의 findIconFiles() 가 `apps/admin/src/**` 아래 `icons.tsx`
//   를 전부 긁어 packages/ui/generated/icons/icon-geometry.ts 를 만든다. 아래 `MoreHorizontalIcon`
//   은 렌더 호출부가 없지만 계약 enum 의 `more-horizontal` 기하가 **여기서** 나온다 —
//   지우면 그 이름이 enum 에서 사라져 `<Icon name="more-horizontal" />` 이 타입 에러가 된다.
//   (같은 규약의 상세 설명은 shared/icons.tsx 머리말에 있다.)
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

/** 행/페이지 액션 — 가로 점 셋 */
export function MoreHorizontalIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/** 리스트로 돌아가기 — 왼쪽 화살표 */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}
