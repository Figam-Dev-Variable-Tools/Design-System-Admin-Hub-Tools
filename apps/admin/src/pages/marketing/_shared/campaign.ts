// 이벤트/프로모션 공용 도메인 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// [왜 _shared 인가] 이벤트와 프로모션은 같은 뼈대를 쓴다: 노출기간·상태(예정/진행/종료)·혜택(쿠폰/적립)·
// 배너 연동. 상태/혜택 enum·라벨·톤과 기간→상태 파생 규칙을 한 곳에 둔다(marketing 내부 공용).
import type { StatusTone } from '../../../shared/ui';

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

const optionLabel = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

/* ── 진행 상태 (예정/진행/종료) ─────────────────────────────────────────────────── */

export type CampaignPhase = 'upcoming' | 'ongoing' | 'ended';

export const CAMPAIGN_PHASE_OPTIONS: readonly Option<CampaignPhase>[] = [
  { id: 'upcoming', label: '예정' },
  { id: 'ongoing', label: '진행' },
  { id: 'ended', label: '종료' },
] as const;

const PHASE_VALUES = ['upcoming', 'ongoing', 'ended'] as const;

function isCampaignPhase(value: unknown): value is CampaignPhase {
  return typeof value === 'string' && (PHASE_VALUES as readonly string[]).includes(value);
}

/** 드롭다운 문자열 → 상태(모르면 null). 이벤트·프로모션 목록 필터가 `as` 없이 값을 좁힌다 */
export function parseCampaignPhase(value: string): CampaignPhase | null {
  return isCampaignPhase(value) ? value : null;
}

export const campaignPhaseLabel = (v: CampaignPhase): string =>
  optionLabel(CAMPAIGN_PHASE_OPTIONS, v);

const PHASE_TONE: Record<CampaignPhase, StatusTone> = {
  upcoming: 'info',
  ongoing: 'success',
  ended: 'neutral',
};

export function campaignPhaseTone(phase: CampaignPhase): StatusTone {
  return PHASE_TONE[phase];
}

/** 기간으로 파생한 상태 — 관리자가 지정한 상태와 어긋나면 '기간상 XX' 힌트로 알린다(today 주입 가능) */
export function derivePhase(startAt: string, endAt: string, today: string): CampaignPhase {
  if (startAt !== '' && today < startAt) return 'upcoming';
  if (endAt !== '' && today > endAt) return 'ended';
  return 'ongoing';
}

/* ── 혜택 (쿠폰/적립/없음) ──────────────────────────────────────────────────────── */

export type BenefitType = 'none' | 'coupon' | 'points';

export const BENEFIT_TYPE_OPTIONS: readonly Option<BenefitType>[] = [
  { id: 'none', label: '혜택 없음' },
  { id: 'coupon', label: '쿠폰 발급' },
  { id: 'points', label: '적립금 지급' },
] as const;

export const benefitTypeLabel = (v: BenefitType): string => optionLabel(BENEFIT_TYPE_OPTIONS, v);

/** 혜택 유형이 상세값(쿠폰명·적립액)을 요구하는가 — '없음'만 상세가 필요 없다 */
export function benefitNeedsDetail(type: BenefitType): boolean {
  return type !== 'none';
}

/** 실재 날짜(YYYY-MM-DD) 여부 — 기간 검증에 공유 */
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
