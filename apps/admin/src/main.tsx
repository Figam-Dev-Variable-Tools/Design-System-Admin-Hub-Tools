// TDS Admin Hub 엔트리
//
// [토큰 CSS 선행 조건] '@tds/ui/tokens.css'는 tokens/tokens.json에서 자동 생성되는
// @tds/ui의 공개 서브패스 export다 (packages/ui/generated/tokens/tokens.css → exports "./tokens.css").
// dev 서버 기동 전 리포 루트에서 `pnpm codegen`을 반드시 먼저 실행한다 — 미실행 시 이 import가 실패한다.
// 공개 서브패스이므로 deep import가 아니다 (eslint no-restricted-imports 예외 — eslint.config.js 참조).
import '@tds/ui/tokens.css';
// 토큰 CSS 다음에 와야 한다 — 전역 기본값이 토큰 변수를 참조한다.
import './app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PermissionProvider } from './shared/permissions/PermissionProvider';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root 컨테이너가 없습니다 — index.html을 확인하세요.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </BrowserRouter>
  </StrictMode>,
);
