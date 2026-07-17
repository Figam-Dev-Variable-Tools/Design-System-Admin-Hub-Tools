// Vitest 설정 (@tds/admin)
//
// [왜 이 파일이 필요한가]
//   프론트 구현이 로그인 이력 화면을 만들며 정확히 지적했다: 이 앱에는 jsdom 도 @testing-library 도 없어서
//   **행 클릭 → 상세 이동**을 DOM 수준에서 단언할 수 없었다. 경로 계산 함수(`detailPathOf`)만
//   테스트할 수 있었을 뿐이다. 그것은 "사용자가 행을 눌렀을 때 실제로 이동하는가"를 증명하지 않는다.
//   순수 규칙 테스트만 가능한 환경은 화면의 동작을 검증할 수 없다.
//
// [왜 --passWithNoTests 를 지웠나]  ← apps/admin/package.json
//   `vitest run --passWithNoTests` 의 exit 0 은 "테스트가 통과했다"가 아니라 "테스트가 없다"였다.
//   그 초록불이 G5·G6 체크리스트의 증거로 인용돼 왔다 (ADR-0010). 테스트가 실재하는 지금,
//   그 플래그는 초록불을 위조하는 장치일 뿐이다 — 테스트가 사라지면 이 스크립트는 **실패해야 한다**.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false, // describe/it/expect 는 명시 import 한다 (암묵 전역 금지)
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // [css 는 기본값(false) 그대로 둔다 — 앱 테스트는 스타일시트를 import 해 읽지 않는다]
    //   토큰 가드(shared/token-guard.test.ts)는 CSS 를 `?raw` 로 import 하지 않고 node:fs 로 직접
    //   읽는다. css:true 로 vite CSS 파이프라인을 켜면 앱 전체 CSS 를 변환하느라 메모리가 급증해
    //   (verify:all 은 ui/admin 스위트를 병렬 실행한다) JS heap OOM 이 났다. fs 로 읽으면 그 비용이
    //   없고, **css 설정에 관계없이 항상 실제 바이트**를 보므로 빈 스텁 위에서 공허 통과할 수도 없다.
    restoreMocks: true, // 스파이는 테스트마다 초기화 — 이전 테스트의 호출 기록이 새지 않는다
  },
});
