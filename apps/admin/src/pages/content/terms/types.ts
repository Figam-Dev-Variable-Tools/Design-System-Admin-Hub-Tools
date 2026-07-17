// 약관 관리 화면 **전용** 타입
//
// 약관과 개인정보 처리방침은 '버전 문서 쌍'이다 — 버전 이력 표(VersionHistoryTable)를 공유하되
// 서로를 import 하지 않는다. 상태 → 색(tone) 매핑은 도메인 지식이라 페이지에 남긴다.
import type { StatusTone } from '../../../shared/ui';

/** 약관 종류 */
export interface TermsType {
  readonly id: string;
  readonly label: string;
}

/** 버전 상태 — 시행중/시행예정/만료 */
export type TermsStatus = 'active' | 'scheduled' | 'archived';

export const STATUS_LABEL: Record<TermsStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

/** 시행중=성공, 시행예정=정보, 만료=중립 */
export const STATUS_TONE: Record<TermsStatus, StatusTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

export const STATUS_OPTIONS: readonly { readonly id: TermsStatus; readonly label: string }[] = [
  { id: 'active', label: '시행중' },
  { id: 'scheduled', label: '시행예정' },
  { id: 'archived', label: '만료' },
];

export interface TermsVersion {
  readonly id: string;
  readonly typeId: string;
  /** 버전 표기 ('v1.2') */
  readonly version: string;
  /** 시행일 — 'YYYY-MM-DD' */
  readonly effectiveDate: string;
  readonly status: TermsStatus;
  readonly body: string;
}

/** 현재 시행본인가 — 상태가 '시행중'인 버전 */
export function isCurrent(version: TermsVersion): boolean {
  return version.status === 'active';
}

export const VERSION_MAX_LENGTH = 20;
export const BODY_MAX_LENGTH = 20000;
