/**
 * 하드코딩 검출 정규식 — tools/contract-test(계약 테스트)와 동일하게 유지해야 하는 규칙.
 *
 * ⚠ 이 목록을 변경하려면 아키텍처(Architecture AI) 승인 후 tools/contract-test 쪽 규칙과
 *   반드시 동시에 수정한다. 두 도구가 서로 다른 규칙으로 스캔하면 게이트 판정이 갈라진다.
 *
 * 차이점: contract-test(계약 테스트)는 위반을 blocker(게이트 차단)로 판정하지만,
 *         drift(디자인 드리프트)는 상시 감시 관점에서 severity "warning"으로 수집만 한다
 *         (차단 없음 — 알림 + 자동 Fix PR 트리거, 레지스트리 디자인 드리프트 blockCondition 참조).
 */

export interface HardcodeRule {
  id: string;
  /** 사람이 읽는 설명 (리포트에 그대로 출력) */
  title: string;
  pattern: RegExp;
}

export const HARDCODE_RULES: HardcodeRule[] = [
  {
    id: 'hex-color',
    title: '하드코딩 HEX 색상 (#fff, #ffffff, #ffffffff 등) — 토큰 var(--tds-*) 사용',
    pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
  },
  {
    id: 'px-value',
    title: '하드코딩 px 수치 — spacing/size 토큰 사용',
    pattern: /(?<![\w-])-?\d+(?:\.\d+)?px\b/g,
  },
  {
    id: 'color-function',
    title: '하드코딩 색상 함수 rgb()/rgba()/hsl()/hsla() — 색상 토큰 사용',
    pattern: /\b(?:rgba?|hsla?)\(/g,
  },
];

/**
 * 스캔 예외 마커 — 이 문자열을 포함한 줄은 검출에서 제외한다.
 * (정당한 예외는 코드 리뷰에서 코드 리뷰가 확인하며, 남용 시 디자인 드리프트이 리포트에 집계)
 */
export const IGNORE_MARKER = 'tds-ignore-hardcode';

/** 스캔 대상 확장자 (packages/ui/src 하위) */
export const SCAN_EXTENSIONS = ['.ts', '.tsx', '.css', '.scss'];
