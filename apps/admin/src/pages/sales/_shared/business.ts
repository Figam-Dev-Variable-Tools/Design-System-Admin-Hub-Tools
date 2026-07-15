// 영업 도메인 공용 순수 헬퍼 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 거래처(계정)와 견적서가 함께 쓰는 사업자등록번호 포맷·검증, 원화 표기를 한 곳에 둔다.
// pages/sales 아래 두 섹션만 소비하므로 결합이 아니라 섹션 그룹 내부 공용이다(products/_shared 선례).
import { formatNumber } from '../../../shared/format';

/** 사업자등록번호 가중치 — 국세청 체크섬 규칙(마지막 자리는 검증 숫자) */
const BIZ_NO_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5] as const;
const BIZ_NO_DIGITS = 10;

/** 숫자만 남긴다 — 하이픈·공백 제거 */
export function bizNoDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, BIZ_NO_DIGITS);
}

/** '000-00-00000' 표기 — 자리수가 모자라도 있는 만큼 하이픈을 넣는다(입력 중 표시용) */
export function formatBizNo(value: string): string {
  const digits = bizNoDigits(value);
  const head = digits.slice(0, 3);
  const mid = digits.slice(3, 5);
  const tail = digits.slice(5, 10);
  return [head, mid, tail].filter((part) => part !== '').join('-');
}

/**
 * 사업자등록번호 유효성 — 10자리 + 국세청 체크섬.
 * sum = Σ dᵢ·wᵢ(i=0..8) + ⌊(d₈·5)/10⌋, 검증숫자 = (10 − sum%10) % 10 = d₉.
 */
export function isValidBizNo(value: string): boolean {
  const digits = bizNoDigits(value);
  if (digits.length !== BIZ_NO_DIGITS) return false;

  const nums = [...digits].map((char) => Number(char));
  const at = (index: number): number => nums[index] ?? 0;
  let sum = 0;
  for (let index = 0; index < BIZ_NO_WEIGHTS.length; index += 1) {
    sum += at(index) * (BIZ_NO_WEIGHTS[index] ?? 0);
  }
  sum += Math.floor((at(8) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === at(9);
}

/** 원화 표기 — '1,200,000원' */
export function formatWon(amount: number): string {
  return `${formatNumber(amount)}원`;
}
