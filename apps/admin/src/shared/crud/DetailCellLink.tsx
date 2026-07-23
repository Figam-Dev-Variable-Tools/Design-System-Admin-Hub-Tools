// 목록 행에서 상세로 가는 **키보드 경로**.
//
// [왜 이게 따로 있나 — 지우면 안 되는 이유] DS Table 의 행 클릭(onActivate)은 **마우스 전용**이다.
// 계약이 그렇게 못 박았다: `<tr>` 에 role·tabIndex 를 씌우면 표 시맨틱이 깨지므로, 행 클릭은
// "접근 가능한 경로가 이미 존재한다는 전제 위의 보조 수단"일 뿐이다(Table.contract.json anatomy).
// 그 전제를 만드는 것이 바로 이 링크다 — 키보드 사용자는 Tab 으로 이 링크에 닿아 Enter 로 상세를 연다.
//
// 그래서 **읽기 전용 목록의 식별 열(주문번호·제목·주제 등)은 이 컴포넌트로 감싼다.** 마우스
// 사용자는 행 아무 데나 눌러도 되고(onActivate), 키보드 사용자는 이 링크로 같은 곳에 닿는다.
// 둘은 중복이 아니라 서로 다른 입력 수단의 경로다 — DS Table 가드가 `<a>` 내부 클릭을 행
// 활성화에서 제외하므로 둘이 충돌하지도 않는다.
//
// [실측된 사고] 2026-07-21 클러스터1 이관에서 "행 활성화가 키보드 경로를 이미 제공한다" 고
// 잘못 판단해 이 링크들을 지웠다. 그 결과 Returns·Inquiry·Ticket 상세로 가는
// **키보드 경로가 사라졌다**(마우스 테스트만 통과해 못 잡았다). 이 컴포넌트가 그 판단을 이름으로
// 못 박아 재발을 막는다.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface DetailCellLinkProps {
  /** 상세 경로 — rowTarget.href(item) 와 같은 값을 준다(경로를 두 번 적지 않게) */
  readonly to: string;
  /** 링크 텍스트가 그 자체로 무엇의 상세인지 말하지 못할 때(순번·아이콘 등) 접근 이름을 준다 */
  readonly ariaLabel?: string;
  readonly children: ReactNode;
}

export function DetailCellLink({ to, ariaLabel, children }: DetailCellLinkProps) {
  return (
    <Link
      to={to}
      className="tds-ui-link tds-ui-focusable"
      {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
    >
      {children}
    </Link>
  );
}
