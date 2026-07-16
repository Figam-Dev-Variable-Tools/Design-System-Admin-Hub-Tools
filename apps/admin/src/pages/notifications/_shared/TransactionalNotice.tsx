// 트랜잭션 알림 안내 배너 (apps/admin/src/pages/notifications/**)
//
// [무엇을 드러내는가] 이 섹션과 마케팅 관리의 **역할 경계**와 그 **법적 근거**를 화면에서 말한다.
// 운영자가 '광고 문자를 여기서 보내면 되나?' 하고 헤매지 않도록, 세 화면 상단에 같은 문구로 선을 긋고
// 마케팅 관리로 가는 길을 준다. 선례: CustomerFaqPage 가 콘텐츠 FAQ 로 같은 방식의 안내 링크를 둔다
// (라우트 링크로만 연결한다 — 페이지 간 import 는 하지 않는다).
//
// [정보통신망법] 제50조의 (광고) 표기·야간(21~08시) 제한·수신거부 의무는 **광고성 정보에만** 적용된다.
// 주문·배송·계정·보안 알림은 거래관계에 따른 정보성 정보라 그 의무가 없다 — 그래서 이 섹션엔 야간 차단이
// 없고, 대신 광고 문구가 섞이면 저장을 막는다(정보성으로 위장한 광고는 위법).
import { Link } from 'react-router-dom';

import { Alert } from '../../../shared/ui';
import { noticeBodyStyle } from './styles';

interface TransactionalNoticeProps {
  /** 이 화면이 무엇을 다루는지 한 줄 — 화면마다 다르다 */
  readonly children: string;
}

export function TransactionalNotice({ children }: TransactionalNoticeProps) {
  return (
    <Alert tone="info">
      <div style={noticeBodyStyle}>
        <span>
          {children} 이벤트가 발생하면 시스템이 당사자에게 자동 발송하는 정보성 알림이라 (광고)
          표기·야간 발송 제한·수신거부가 적용되지 않습니다. 할인·쿠폰 같은 광고성 발송은 마케팅
          관리에서 합니다.
        </span>
        <Link to="/marketing/templates" className="tds-ui-link tds-ui-focusable">
          마케팅 관리로 이동
        </Link>
      </div>
    </Alert>
  );
}
