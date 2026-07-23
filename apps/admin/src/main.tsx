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
  throw new Error('#root 컨테이너가 없어요 — index.html을 확인하세요.');
}

createRoot(container).render(
  <StrictMode>
    {/*
      [v7 동작을 지금 켠다] 켜지 않으면 react-router 가 **모든 화면에서** 미래 플래그 경고 2건을
      콘솔에 쏜다 — 전 라우트 순회에서 204건이 나왔다. 경고를 필터로 지우는 대신 경고가 요구하는
      동작으로 옮긴다. 둘 다 이 앱에서는 안전하다:
        v7_startTransition   라우트 전환을 transition 으로 감싼다. 화면이 lazy 청크라(App.tsx)
                             청크를 받는 동안 이전 화면이 남는다 — 자리표시로 깜빡이지 않는다.
        v7_relativeSplatPath splat 라우트 안의 **상대** 경로 해석을 바꾼다. 이 앱의 splat은
                             '/marketing/message-templates/*' 하나뿐이고 절대 경로로 Navigate 하므로
                             해석 대상이 아니다.
    */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </BrowserRouter>
  </StrictMode>,
);
