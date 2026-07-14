// 공통 카드 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [표면은 @tds/ui 가 소유한다] 배경·테두리·라운드·패딩은 디자인 시스템 Card(atom)의 것이다 —
// 여기서 다시 그리지 않는다. 예전에는 같은 토큰을 손으로 조합한 사본(cardStyle)이 있었다.
//
// [그럼 이 파일은 왜 남는가] DS Card 의 children 은 임의의 노드다 — 카드가 자식들 사이의 간격을
// 정해 주지 않는다(정해 주면 모든 소비자에게 강요된다). 이 앱의 카드는 '제목 + 본문' 을 space.4
// 간격으로 쌓는다는 **앱의 규약**을 갖고 있고, 여기 남는 것은 그 규약뿐이다 (20여 호출부가 공유한다).
import type { HTMLAttributes, ReactNode } from 'react';
import { Card as TdsCard } from '@tds/ui';

import { cardBodyStyle, cardTitleStyle } from './styles';

export function Card({
  children,
  ...rest
}: { readonly children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'style' | 'children'>) {
  return (
    <TdsCard {...rest}>
      <div style={cardBodyStyle}>{children}</div>
    </TdsCard>
  );
}

/**
 * 카드 제목 — 오른쪽에 액션(버튼 등)을 함께 놓을 수 있다.
 * id 를 주면 Card 의 aria-labelledby 로 연결한다.
 */
export function CardTitle({
  id,
  children,
  action,
}: {
  readonly id?: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <h2 id={id} style={cardTitleStyle}>
      <span>{children}</span>
      {action}
    </h2>
  );
}
