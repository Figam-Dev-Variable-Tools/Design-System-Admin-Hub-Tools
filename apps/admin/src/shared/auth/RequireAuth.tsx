// 인증 라우트 가드 + 세션 만료 감시 (A41 소유 — apps/admin/src/shared/auth/**)
//
// [EXC-02] 예전에는 세션 없이 /users/members 를 deep-link 해도 화면이 **그대로 렌더**됐다.
// LoginPage 는 `reason=session_expired` 를 읽을 준비가 돼 있었지만 그 값을 붙여 주는 곳이 없어
// 재인증 경로가 통째로 죽어 있었다. 여기서 두 구멍을 함께 막는다:
//   (a) 진입 시 세션 부재      → /login?returnUrl=<현재 경로>
//   (b) 세션 중간 만료(401)    → 세션 폐기 후 /login?returnUrl=<현재 경로>&reason=session_expired
// 두 경우 모두 로그인 성공 시 LoginPage 의 resolveReturnUrl 이 원래 경로로 되돌린다.
//
// [보안 경계가 아니다] 프론트 가드는 UX 다 — 실제 차단은 서버의 몫이다. 이 가드는 '세션 없는 사람이
// 빈 화면을 보고 무엇을 해야 할지 모르는 상태' 를 막는 것이지, 데이터를 지키는 장치가 아니다.
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { clearSession, readSession } from '../../pages/login/session';
import { subscribeToSessionExpiry } from './session-expiry';

/** 현재 위치를 returnUrl 로 만든다 — 쿼리까지 보존해야 필터가 걸린 목록으로 정확히 돌아온다 */
function returnUrlOf(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

function loginPathFor(returnUrl: string, reason?: string): string {
  const params = new URLSearchParams({ returnUrl });
  if (reason !== undefined) params.set('reason', reason);
  return `/login?${params.toString()}`;
}

/**
 * 세션 만료(401) 감시 — 라우터 안에 살아야 navigate 를 쓸 수 있다.
 *
 * RequireAuth 와 **분리한 이유**: 이 컴포넌트는 세션이 유효한 동안에도 계속 마운트돼 있어야
 * 한다(만료는 화면을 보고 있는 도중에 온다). 가드의 조건부 return 안에 두면 구독이 끊긴다.
 */
function SessionExpiryWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  // 이동에 필요한 값을 effect 안에서 최신으로 읽되, 구독은 한 번만 건다.
  const returnUrl = returnUrlOf(location.pathname, location.search);

  useEffect(
    () =>
      subscribeToSessionExpiry(() => {
        // 낡은 세션을 남겨 두면 /login 도착 즉시 RequireAuth 가 다시 통과시켜 왕복이 된다
        clearSession();
        navigate(loginPathFor(returnUrl, 'session_expired'), { replace: true });
      }),
    [navigate, returnUrl],
  );

  return null;
}

/**
 * 세션이 없으면 화면을 렌더하지 않고 재인증 경로로 보낸다.
 *
 * [왜 렌더 중에 판정하나] effect 로 미루면 보호된 화면이 **한 프레임 그려지고** 그 사이 쿼리가
 * 발사된다 — 인증되지 않은 요청이 나가고 깜빡임이 남는다. Navigate 를 렌더에서 반환해 그것을 막는다.
 */
export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const session = readSession();

  if (session === null) {
    return <Navigate to={loginPathFor(returnUrlOf(location.pathname, location.search))} replace />;
  }

  return (
    <>
      <SessionExpiryWatcher />
      {children}
    </>
  );
}
