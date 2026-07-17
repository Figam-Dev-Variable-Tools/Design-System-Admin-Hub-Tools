// 통계 섹션 도메인 타입 (전송 타입을 생성 타입으로 교체)
import type { DeepReadonly } from '../../shared/api/immutable';
import type { components } from '../../shared/api/schema';

/** 방문자 차트 조회 기간 */
export type StatsRange = 'day' | 'week' | 'month';

interface StatsRangeDef {
  readonly id: StatsRange;
  readonly label: string;
}

export const STATS_RANGES: readonly StatsRangeDef[] = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
];

export const DEFAULT_STATS_RANGE: StatsRange = 'day';

/* ── 전송 타입 — 손으로 쓰지 않는다 (ADR-0008 §3.5 집행) ──────────────────────
 *
 * 아래 4종은 **순수 전송 타입**이다 (표시 로직 0). 서버 응답을 손으로 베껴 쓰지 않고
 * OpenAPI 스키마에서 **생성한 타입을 그대로 참조**한다 — 원천은 BE-002 명세다.
 * 스키마가 바뀌면 `pnpm openapi:types` 재생성만으로 따라오고, 어긋나면 tsc 가 깨진다.
 *
 * ※ 화면 전용 개념(StatsRange · STATS_RANGES · DEFAULT_STATS_RANGE)은 전송 타입이 아니다 — 위에 남는다.
 */
// DeepReadonly 로 감싸는 이유는 shared/api/immutable.ts 참조 (생성기가 mutable 을 낸다 — 의존성 관리 쪽 후속 과제)
export type VisitorPoint = DeepReadonly<components['schemas']['VisitorPoint']>;
export type PeriodRow = DeepReadonly<components['schemas']['PeriodRow']>;
export type PeriodSummary = DeepReadonly<components['schemas']['PeriodSummary']>;
export type StatsData = DeepReadonly<components['schemas']['StatsData']>;
