// Vitest 셋업 (@tds/admin) — 소유: A80
//
// toBeInTheDocument / toHaveAttribute 등 DOM 매처를 등록한다.
// 이것 없이는 `expect(el).toBeInTheDocument()` 가 런타임 에러이지 실패가 아니다.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 테스트 간 DOM 누수 차단 — 이전 테스트가 남긴 노드를 다음 테스트가 찾아내면
// 통과했다는 사실 자체가 거짓이 된다.
afterEach(() => {
  cleanup();
});
