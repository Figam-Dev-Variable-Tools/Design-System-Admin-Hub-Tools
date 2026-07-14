// TDS Admin Hub Vite 설정
// @tds/ui는 workspace 링크로 소스(src/index.ts)를 직접 컴파일한다 (lib mode 도입 전 방식).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  /**
   * [의존성 사전 번들 — CI 지뢰 제거]
   *
   * 증상: e2e 첫 실행에서 19건이 한꺼번에 실패했다. 원인은 테스트가 아니라 **dev 서버**다.
   * Vite 는 서버 시작 시 엔트리에서 크롤링한 의존성만 사전 번들(pre-bundle)한다. 크롤링이 놓친
   * 의존성을 나중에 브라우저가 요청하면 Vite 가 **런타임에 재최적화**하고 직후 **full page reload**
   * 를 강제한다. 그 리로드가 실행 중인 테스트의 페이지를 통째로 갈아엎는다 — 테스트는 죄가 없다.
   *
   * 재현이 까다로운 이유: `node_modules/.vite/deps` 를 지우면(첫 실행) 크롤러가 전부 훑어 대개
   * 성공하고, **낡은 캐시가 남아 있을 때만** 터진다. CI 러너의 캐시 복원이 정확히 그 상태다.
   *
   * 처방: 크롤러의 추측에 맡기지 않고 런타임 의존성을 **명시**한다. 여기 적힌 것은 서버 시작 시
   * 반드시 사전 번들되므로, 어떤 라우트를 먼저 열든 뒤늦은 재최적화가 일어나지 않는다.
   *
   * react/jsx-runtime 을 함께 적는 이유: 워크스페이스로 링크된 @tds/ui 는 사전 번들 대상이 아니라
   * **소스로 크롤링**되는데, 그 소스가 처음 로드되는 순간 자기 JSX 런타임을 새 의존성으로 끌어온다.
   * 앱이 @tds/ui 를 실제로 소비하기 시작한 지금 이 경로가 특히 뜨겁다.
   *
   * 의존성을 추가하면 여기에도 한 줄 추가한다.
   */
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hook-form',
      // ⚠ 'zod' 가 아니라 'zod/mini' 다 — 검증 파일들이 `import * as z from 'zod/mini'` 를 쓴다.
      //   여기에 'zod' 를 적으면 아무도 import 하지 않는 것을 번들하고, 정작 늦게 발견되는
      //   'zod/mini' 는 그대로 남는다. **적는 이름은 소스가 쓰는 그 이름이어야 한다.**
      'zod/mini',
    ],
  },
});
