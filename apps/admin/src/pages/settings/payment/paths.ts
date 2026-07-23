// 결제 설정 화면의 경로 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/payment/**)
//
// 목록과 상세가 서로의 주소를 만든다(타일 → 상세, 뒤로가기 → 목록). 문자열을 양쪽에 적어 두면
// 한쪽만 고쳐졌을 때 **링크가 조용히 죽는다** — 타입 검사도 테스트도 그걸 잡아 주지 못한다.
// 그래서 주소는 여기 한 군데서만 만든다 (../oauth/paths.ts 와 같은 규약).
import { PAYMENT_SETTINGS_PATH } from '../../../shared/commerce/payment-settings';
import type { PgTargetId } from '../../../shared/commerce/pg-catalog';

/**
 * 결제 서비스 목록 — 마스터 스위치·미리보기·두 묶음이 사는 곳.
 *
 * 문자열을 여기서 다시 적지 않는다: 상품·프로그램 화면이 "결제 설정으로 가세요" 를 말할 때 쓰는
 * 주소가 shared/commerce 에 이미 있고, 그것과 갈라지면 안내 링크만 죽는다.
 */
export const PAYMENT_LIST_PATH = PAYMENT_SETTINGS_PATH;

/** PG 하나의 자격증명 화면 — App.tsx 의 `/settings/payment/:target` 과 짝이다 */
export function pgTargetPath(target: PgTargetId): string {
  return `${PAYMENT_LIST_PATH}/${target}`;
}
