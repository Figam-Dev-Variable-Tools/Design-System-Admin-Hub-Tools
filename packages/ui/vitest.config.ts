// Vitest 설정 (@tds/ui) — 소유: A30
//
// 이 패키지의 테스트는 **계약(contracts/*.contract.json)의 states[] 와 events[].blockedWhen 을
// 실제로 실행해 단언한다**. 렌더가 필요하므로 jsdom 환경 + @testing-library/react 를 쓴다.
//
// [왜 --passWithNoTests 를 지웠나]
//   `vitest run --passWithNoTests` 의 exit 0 은 "테스트가 통과했다"가 아니라 "테스트가 없다"였다.
//   단언을 가진 테스트가 실제로 존재하게 된 지금, 그 플래그는 초록불을 위조하는 장치일 뿐이다.
//   테스트 파일이 사라지면 이 스크립트는 **실패해야 한다** (A77 축1: 테스트 존재).
//
// [css: true 인 이유]
//   hover/active 같은 포인터 의사 클래스는 jsdom 에 실제 상태가 없다. 그 상태가 스타일에 반영되는지
//   증명하는 유일한 진짜 단언은 **스타일시트 규칙 자체**를 읽는 것이다 (`import css from './X.css?raw'`).
//   기본값(css: false)은 `?raw` 조차 빈 문자열로 스텁해 그 단언을 공허하게 만든다 — 켜 둔다.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false, // describe/it/expect 는 명시 import 한다 (암묵 전역 금지)
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    restoreMocks: true, // 스파이는 테스트마다 초기화 — 이전 테스트의 호출 기록이 새지 않는다
  },
  esbuild: {
    jsx: 'automatic',
  },
});
