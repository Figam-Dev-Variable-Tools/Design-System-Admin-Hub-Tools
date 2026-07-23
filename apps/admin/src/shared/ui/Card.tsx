// 공통 카드
//
// [표면은 @tds/ui 가 소유한다] 배경·테두리·라운드·패딩은 디자인 시스템 Card(atom)의 것이다 —
// 여기서 다시 그리지 않는다. 예전에는 같은 토큰을 손으로 조합한 사본(cardStyle)이 있었다.
//
// [그럼 이 파일은 왜 남는가] DS Card 의 children 은 임의의 노드다 — 카드가 자식들 사이의 간격을
// 정해 주지 않는다(정해 주면 모든 소비자에게 강요된다). 이 앱의 카드는 '제목 + 본문' 을 space.4
// 간격으로 쌓는다는 **앱의 규약**을 갖고 있고, 여기 남는 것은 그 규약뿐이다 (20여 호출부가 공유한다).
import type { HTMLAttributes, ReactNode } from 'react';
import { Card as TdsCard, inlineBadgeRowStyle } from '@tds/ui';

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
 *
 * [제목 묶음이 왜 flex 인가 — 배지가 제목에 붙어 읽히던 자리] 호출부의 절반은 제목 옆에 상태
 * 배지를 함께 넘긴다(`{ticket.title}<StatusBadge …/>`). 안쪽 `<span>` 이 **평범한 인라인 span**
 * 이었을 때는 둘 사이에 간격이 0 이라 '…오지 않아요높음' 으로 한 낱말처럼 보였다. 몇몇 화면은
 * 각자 `titleGroupStyle` 지역 사본을 만들어 우회했고(4벌), 만들지 않은 화면은 그대로 붙어 있었다.
 *
 * 간격은 **여기 안쪽 span 이** 준다 — 바깥 `<h2>`(cardTitleStyle)의 `space-between` 은 '제목 묶음'
 * 과 '오른쪽 액션' 을 가르는 축이라 건드리면 제목이 좌우로 벌어진다. 두 축을 섞지 않는다.
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
      <span style={inlineBadgeRowStyle}>{children}</span>
      {action}
    </h2>
  );
}
