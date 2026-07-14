// Card — 표면 컨테이너 (atom · contracts/Card.contract.json@1.0.0)
//
// 서피스 배경 + 테두리 + 라운드 + 내부 패딩만 제공하는 최소 단위 surface.
// 헤더/본문 구조나 도메인 데이터는 갖지 않는다 — 조립은 organism 이 한다 (ADR-0003).
//
// [aria-labelledby] 계약 a11y 가 "조립하는 쪽이 aria-labelledby(제목 id) 또는 aria-label 을 준다"고
// 규정하므로, 계약 props 외의 표준 HTML/ARIA 속성은 <section> 으로 그대로 전달한다.
// (새 prop 을 만드는 것이 아니라 네이티브 속성 패스스루다 — style 은 토큰 규칙 보호를 위해 차단)
import type { HTMLAttributes } from 'react';

import type { CardProps } from '../../../generated/types/Card.types';
import './Card.css';

type CardNativeProps = Omit<HTMLAttributes<HTMLElement>, 'style' | 'children' | 'className'>;

export function Card({
  children,
  padding = 'md',
  busy = false,
  ...native
}: CardProps & CardNativeProps) {
  return (
    <section
      className={`tds-card tds-card--${padding}`}
      aria-busy={busy ? true : undefined}
      {...native}
    >
      {children}
    </section>
  );
}
