// Vitest 셋업 (@tds/ui) — 담당: 컴포넌트 엔지니어
//
// globals:false 이므로 @testing-library/react 의 자동 cleanup 이 스스로 등록되지 않는다.
// 여기서 명시적으로 건다 — 이전 테스트가 남긴 DOM 이 다음 테스트의 쿼리를 오염시키면
// "지나가는 테스트"가 만들어진다(초록불 위조의 또 다른 형태).
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
