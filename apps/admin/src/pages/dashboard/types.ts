// 대시보드 도메인 타입 (전송 타입을 생성 타입으로 교체)
import type { DeepReadonly } from '../../shared/api/immutable';
import type { components } from '../../shared/api/schema';

/** 상단 탭 — 업무 영역 */
export type TabId = 'products' | 'inquiries' | 'sales';

export interface TabDef {
  readonly id: TabId;
  readonly label: string;
}

/**
 * 탭의 정적 목록 — **화면에 그대로 렌더하지 않는다.**
 * 무엇을 보여줄지는 권한이 정한다: DashboardPage 가 이 목록을 권한으로 걸러
 * `visibleTabs` 를 만들고, TabBar 는 그 걸러진 목록만 받는다 (FS-002-EL-012 · EL-013).
 */
export const TABS: readonly TabDef[] = [
  { id: 'products', label: '상품' },
  { id: 'inquiries', label: '문의' },
  { id: 'sales', label: '영업' },
];

export const DEFAULT_TAB: TabId = 'products';

/* ── 전송 타입 — 손으로 쓰지 않는다 (ADR-0008 §3.5 집행) ──────────────────────
 *
 * 아래 3종은 **순수 전송 타입**이다: 표시 로직도 파생 필드도 없다 — 서버 응답 그 자체다.
 * 그래서 손으로 베껴 쓰지 않고 **OpenAPI 스키마에서 생성한 타입을 그대로 참조**한다.
 * 원천은 openapi/openapi.yaml (그 원천은 BE-002 명세)이고, `pnpm openapi:types` 가 생성한다.
 *
 * 스키마가 바뀌면 재생성만으로 여기가 따라오고, 화면이 어긋나면 **tsc 가 즉시 깨진다.**
 * 예전에는 이 파일이 서버 응답 모양을 손으로 베껴 두고 있었다 — 어긋나도 아무도 몰랐다.
 * (`cards` 가 2장 고정 튜플이라는 계약도 스키마의 `prefixItems` 가 지킨다 — ADR-0008 §6.3)
 *
 * ※ 화면 전용 개념(TabId · TABS · DEFAULT_TAB)은 전송 타입이 아니다 — 위에 그대로 남는다.
 * ※ ListRow 는 ListCardData.rows 안에서만 쓰여 별도 별칭을 두지 않는다.
 */
// DeepReadonly 로 감싸는 이유는 shared/api/immutable.ts 참조 (생성기가 mutable 을 낸다 — 의존성 관리 쪽 후속 과제)
export type ListCardData = DeepReadonly<components['schemas']['ListCardData']>;
export type TabData = DeepReadonly<components['schemas']['TabData']>;
