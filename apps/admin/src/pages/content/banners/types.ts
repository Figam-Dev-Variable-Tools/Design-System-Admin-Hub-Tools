// 배너 관리 화면 **전용** 타입 (A41 소유 — apps/admin/src/pages/content/banners/**)
//
// 팝업과 닮은 쌍이지만 서로 import 하지 않는다 — 공유는 도메인을 모르는 공통 모듈로만 한다.

/** 노출 위치 — 메인/서브 */
export type BannerPlacement = 'main' | 'sub';

export const PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  main: '메인',
  sub: '서브',
};

export const PLACEMENT_OPTIONS: readonly {
  readonly id: BannerPlacement;
  readonly label: string;
}[] = [
  { id: 'main', label: '메인' },
  { id: 'sub', label: '서브' },
];

export interface Banner {
  readonly id: string;
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly placement: BannerPlacement;
  /** 노출 기간 — 'YYYY-MM-DD' */
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  /** 정렬 순서 — 작을수록 앞(왼쪽/위)에 노출된다 */
  readonly order: number;
}

// [상태 표시는 토글로 이동] 목록의 ON/OFF 는 배지 대신 ToggleSwitch 로 바로 켜고 끈다.
// 배지용이던 enabledTone/enabledLabel 은 소비자가 사라져 삭제했다(A83 축5 죽은 코드 0 유지).

/* ── 필터 ────────────────────────────────────────────────────────────────── */

export type PlacementFilter = 'all' | BannerPlacement;

export const PLACEMENT_FILTERS: readonly {
  readonly id: PlacementFilter;
  readonly label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'main', label: '메인' },
  { id: 'sub', label: '서브' },
];

export interface BannerListResult {
  readonly banners: readonly Banner[];
  readonly total: number;
}

export const PAGE_SIZE = 10;
export const TITLE_MAX_LENGTH = 100;
