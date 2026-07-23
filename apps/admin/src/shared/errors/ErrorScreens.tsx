// 복구 화면
//
// 렌더 예외(EXC-01)와 권한 없음(EXC-03)이 도달하는 두 화면. 둘 다 **셸 안쪽**에서 렌더되므로
// 사이드바·헤더는 그대로 살아 있고, 운영자는 여기서 다른 메뉴로 걸어 나갈 수 있다.
//
// [무엇을 보이지 않는가 — EXC-20]
// raw 서버 body·stack trace·status 코드를 산문으로 노출하지 않는다. 내부 구조를 흘리고 고장처럼
// 읽힌다. 대신 짧은 **참조 코드**만 보인다 — 로깅된 오류와 대조 가능한 유일한 기술 정보다.
// 그 규율의 강제 수단은 이제 계약이다: @tds/ui Result 에는 stack/서버 body 를 받을 prop 이 없다.
//
// [이 파일에 남은 것 = 앱의 몫]
// 껍데기(제목·설명·참조 코드·액션 줄의 시각과 배치)는 @tds/ui 의 Result 가 소유한다. 여기 남는 것은
// **문구와 이동**뿐이다 — 무슨 일이 일어났는지도, 어디로 빠져나가야 하는지도 이 앱만 아는 사실이다.
// 그 경계는 Sidebar 승격이 세운 기준과 같다(DS 는 그리고 앱이 정한다).
import { useNavigate } from 'react-router-dom';
import { Result } from '@tds/ui';

import { Button, buttonStyle } from '../ui';
import { PLAN_PAGE_PATH, PLAN_PORTAL_URL, PLAN_TIER_LABEL } from '../entitlements/plan';
import type { PlanTier } from '../entitlements/plan';

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
    <Result
      // h2 다 — 페이지의 h1 은 AppHeader 가 소유한다(화면 이름). 이 제목은 그 화면 **안의**
      // 상태이므로 h1 을 하나 더 만들면 '이 문서의 제목' 이 둘이 된다. Result 가 h2 로 고정한다.
      title="문제가 발생했어요"
      description="화면을 그리는 중 예상하지 못한 오류가 났어요. 다시 시도해도 같은 문제가 계속되면 아래 코드와 함께 알려 주세요."
      // 계약의 센티널은 **빈 문자열 = 그리지 않음** 이다. 참조 코드가 없는 예외(HTTP 응답이 아닌
      // 순수 렌더 오류)에서 빈 줄이 남지 않게 여기서 한 번만 흡수한다.
      reference={reference === null ? '' : `오류 코드 ${reference}`}
      actions={
        <>
          <Button variant="primary" onClick={onRetry}>
            다시 시도
          </Button>
          {/* 이동은 navigate 로 한다 — DS Button 은 <button> 만 렌더하는 Frozen 계약이라
              polymorphic `as` 가 없다. FormPageShell 의 '목록으로' 와 같은 배선이다. */}
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            대시보드로
          </Button>
        </>
      }
    />
  );
}

/**
 * 권한 없음 화면 (EXC-03).
 *
 * **재시도 버튼을 주지 않는다** — 다시 눌러도 또 403 이다. 할 수 있는 일은 권한이 있는 곳으로
 * 가는 것뿐이므로 대시보드 링크 하나만 둔다. 참조 코드도 없다 — 신고할 고장이 아니다.
 */
export function ForbiddenScreen() {
  const navigate = useNavigate();

  return (
    <Result
      title="접근 권한이 없어요"
      description="이 화면을 볼 수 있는 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요."
      actions={
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          대시보드로
        </Button>
      }
    />
  );
}

interface UpgradeScreenProps {
  /** 왜 잠겼는지 — 문구는 모듈 카탈로그가 짓는다(shared/entitlements/plan.ts 의 lockReason) */
  readonly reason: string;
  readonly upgradeTo: PlanTier;
}

/**
 * 플랜 잠금 화면 — ForbiddenScreen 과 **같은 뼈대, 다른 말투**.
 *
 * ┌ 왜 403 과 섞지 않는가 ───────────────────────────────────────────────────┐
 * │ '권한 요청' 과 '결제 필요' 는 **다른 사람이 다른 행동을 해야 한다.**       │
 * │   403      → 이 조직의 관리자가 역할에 권한을 켠다 (계정 안에서 끝난다)   │
 * │   잠금     → 계약 담당자가 사내 홈페이지에서 상위 플랜으로 올린다         │
 * │ 문구를 섞으면 운영자는 관리자에게 권한을 요청하고, 관리자도 켤 수 없어     │
 * │ 지원 티켓이 된다. 그래서 액션도 '대시보드로' 가 아니라 '플랜 보기' 다.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * [참조 코드가 없다] 신고할 고장이 아니라 계약 상태다 — ForbiddenScreen 과 같은 판단이다.
 *
 * [플랜을 여기서 바꾸지 않는다] 구독·결제·계약은 사내 홈페이지 소관이다. 이 어드민 안에 변경
 * 수단을 두면 실제 계약과 어긋나는 **두 번째 정본**이 생긴다 — 그래서 나가는 링크만 둔다.
 */
export function UpgradeScreen({ reason, upgradeTo }: UpgradeScreenProps) {
  const navigate = useNavigate();

  return (
    <Result
      title={`${PLAN_TIER_LABEL[upgradeTo]} 플랜에서 사용할 수 있어요`}
      description={`${reason} 플랜을 올리면 이 화면이 그대로 열리고, 지금까지 쌓인 데이터도 그대로 남아 있어요.`}
      actions={
        <>
          {/* 외부 이동이라 진짜 <a> 다 — DS Button 은 <button> 만 렌더하는 Frozen 계약이고,
              새 탭·복사·미리보기 같은 링크의 기본 동작을 버튼으로 흉내 낼 수 없다.
              rel 은 noopener·noreferrer 둘 다 — 새 창이 이 앱의 window 를 잡지 못하게 한다. */}
          <a
            href={PLAN_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tds-ui-focusable"
            style={buttonStyle('primary')}
          >
            플랜 보기
          </a>
          <Button variant="secondary" onClick={() => navigate(PLAN_PAGE_PATH)}>
            현재 플랜 확인
          </Button>
        </>
      }
    />
  );
}
