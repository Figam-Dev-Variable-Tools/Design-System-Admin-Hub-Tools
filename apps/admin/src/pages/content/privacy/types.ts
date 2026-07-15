// 개인정보 처리방침 화면 **전용** 타입 (A41 소유 — apps/admin/src/pages/content/privacy/**)
//
// 약관과 '버전 문서 쌍'이지만 단일 문서다(종류 선택이 없다). 버전 이력 표(VersionHistoryTable)를
// 공유하되 약관 페이지를 가로질러 import 하지 않는다 — 공유는 도메인을 모르는 공통 모듈로만.
import type { StatusTone } from '../../../shared/ui';

/** 버전 상태 — 시행중/시행예정/만료 */
export type PrivacyStatus = 'active' | 'scheduled' | 'archived';

export const STATUS_LABEL: Record<PrivacyStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

export const STATUS_TONE: Record<PrivacyStatus, StatusTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

export const STATUS_OPTIONS: readonly { readonly id: PrivacyStatus; readonly label: string }[] = [
  { id: 'active', label: '시행중' },
  { id: 'scheduled', label: '시행예정' },
  { id: 'archived', label: '만료' },
];

export interface PrivacyVersion {
  readonly id: string;
  readonly version: string;
  /** 시행일 — 'YYYY-MM-DD' */
  readonly effectiveDate: string;
  readonly status: PrivacyStatus;
  readonly body: string;
}

export function isCurrent(version: PrivacyVersion): boolean {
  return version.status === 'active';
}

export const VERSION_MAX_LENGTH = 20;
export const BODY_MAX_LENGTH = 20000;
