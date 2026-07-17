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

// [삭제됨] parseCampaignPhase / isCampaignPhase / PHASE_VALUES
//   이벤트·프로모션 목록이 URL 문자열을 좁힐 때 쓰던 사본이다. IA-13 롤아웃으로 공용
//   `shared/crud/parseFilter` 가 그 자리를 가져가며(허용 목록은 위 CAMPAIGN_PHASE_OPTIONS 의
//   id 에서 파생) 마지막 소비자가 사라졌다 (A83 축5 죽은 코드 0).

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

// [날짜 검증은 shared/format 이 갖는다] 여기 있던 isRealDate 는 형식만 보고 **실재 여부를 보지
// 않아** 2026-02-31 을 통과시켰다 — Date 가 3월 3일로 굴리므로 getTime() 이 NaN 이 아니다.
// 같은 이름의 사본이 앱에 10벌 있었고 그중 5벌만 왕복 검사를 했다. 정본 isCalendarDate
// (shared/format)는 UTC 정오 앵커로 왕복 검사를 하고 타입가드 + 테스트를 갖고 있다.
// 소비자(events·promotions)는 그쪽을 직접 쓴다.
