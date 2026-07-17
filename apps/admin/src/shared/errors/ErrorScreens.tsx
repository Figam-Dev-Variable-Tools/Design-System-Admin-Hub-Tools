// 복구 화면
//
// 렌더 예외(EXC-01)와 권한 없음(EXC-03)이 도달하는 두 화면. 둘 다 **셸 안쪽**에서 렌더되므로
// 사이드바·헤더는 그대로 살아 있고, 운영자는 여기서 다른 메뉴로 걸어 나갈 수 있다.
//
// [무엇을 보이지 않는가 — EXC-20]
// raw 서버 body·stack trace·status 코드를 산문으로 노출하지 않는다. 내부 구조를 흘리고 고장처럼
// 읽힌다. 대신 짧은 **참조 코드**만 보인다 — 로깅된 오류와 대조 가능한 유일한 기술 정보다.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, pageTitleStyle } from '../ui';

const screenStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 'var(--tds-space-4)',
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  paddingLeft: 0,
  paddingRight: 0,
  maxWidth: 'calc(var(--tds-space-6) * 20)',
};

const bodyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

/** 참조 코드 — 운영자가 그대로 복사해 티켓에 붙인다. 숫자/영문이 섞여 tabular 로 고정한다 */
const referenceStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontFamily: 'var(--tds-typography-caption-md-font-family)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  userSelect: 'all',
};

interface RouteErrorScreenProps {
  readonly reference: string | null;
  readonly onRetry: () => void;
}

/**
 * 렌더 예외 복구 화면 (EXC-01).
 *
 * '다시 시도' 는 경계를 풀어 같은 화면을 다시 그린다 — 일시적 예외(늦게 도착한 데이터의 형태
 * 불일치 등)는 이걸로 복구된다. 영구적 버그라면 다시 같은 화면이 뜨고, 그때는 '대시보드로' 가
 * 탈출구이며 참조 코드가 신고 경로다.
 */
export function RouteErrorScreen({ reference, onRetry }: RouteErrorScreenProps) {
  const navigate = useNavigate();

  return (
    <div style={screenStyle} role="alert">
      {/* h2 다 — 페이지의 h1 은 AppHeader 가 소유한다(화면 이름). 이 제목은 그 화면 **안의**
          상태이므로 h1 을 하나 더 만들면 '이 문서의 제목' 이 둘이 된다. */}
      <h2 style={pageTitleStyle}>문제가 발생했어요</h2>
      <p style={bodyStyle}>
        화면을 그리는 중 예상하지 못한 오류가 났습니다. 다시 시도해도 같은 문제가 계속되면 아래
        코드와 함께 알려 주세요.
      </p>

      {reference !== null && <p style={referenceStyle}>오류 코드 {reference}</p>}

      <div style={actionsStyle}>
        <Button variant="primary" onClick={onRetry}>
          다시 시도
        </Button>
        {/* 이동은 navigate 로 한다 — DS Button 은 <button> 만 렌더하는 Frozen 계약이라
            polymorphic `as` 가 없다. FormPageShell 의 '목록으로' 와 같은 배선이다. */}
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          대시보드로
        </Button>
      </div>
    </div>
  );
}

/**
 * 권한 없음 화면 (EXC-03).
 *
 * **재시도 버튼을 주지 않는다** — 다시 눌러도 또 403 이다. 할 수 있는 일은 권한이 있는 곳으로
 * 가는 것뿐이므로 대시보드 링크 하나만 둔다.
 */
export function ForbiddenScreen() {
  const navigate = useNavigate();

  return (
    <div style={screenStyle} role="alert">
      {/* h2 — RouteErrorScreen 과 같은 이유(페이지 h1 은 AppHeader 소유) */}
      <h2 style={pageTitleStyle}>접근 권한이 없습니다</h2>
      <p style={bodyStyle}>
        이 화면을 볼 수 있는 권한이 없습니다. 필요하다면 관리자에게 권한을 요청해 주세요.
      </p>

      <Button variant="secondary" onClick={() => navigate('/dashboard')}>
        대시보드로
      </Button>
    </div>
  );
}
