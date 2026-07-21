// 활동 정보 카드 — 전부 읽기 전용.
//
// [건수는 목적지를 가진다] '구매평 3건' 을 읽은 운영자의 다음 행동은 언제나 '그 3건을 보여 줘' 다.
// 글자로만 두면 그 다음 걸음이 없어 목록 화면에서 이름을 다시 타이핑하게 된다.
//
// [무엇을 링크했고 왜 그것만인가 — 목적지를 열기 전에 확인한 것]
//   · 구매평 → /products/reviews : 이 목록은 검색어를 URL(`?q=`)로 소유하고(useListState · IA-13),
//     searchReviews 가 **작성자**를 훑는다. 그래서 회원의 표시명(nickname)으로 건다 — 그 목록의
//     '작성자' 칸에 실려 있는 값이 그것이기 때문이다.
//   · 문의 → /support/tickets : 같은 방식으로 `?q=` 를 읽고, searchTickets 가 **고객명**을 훑는다.
//     여기는 실명(name)으로 건다.
//   · 게시물·댓글은 **링크하지 않는다.** 이 앱에 회원 글/댓글 목록 화면이 아직 없다 —
//     비슷한 화면으로 보내는 것은 답이 아니라 새로운 오해다. 화면이 생기면 여기 두 줄을 늘린다.
import { Link } from 'react-router-dom';

import { Card, CardTitle, ddStyle, dlStyle, dtStyle } from '../../../shared/ui';
import { formatDateTime, formatNumber, formatRelativeOrDate } from '../../../shared/format';
import type { MemberDetail } from '../types';

/** 값이 비면 '—' — 빈칸이 누락처럼 보이지 않게 한다 */
function text(value: string): string {
  return value.trim() === '' ? '—' : value;
}

interface CountLinkProps {
  readonly label: string;
  readonly count: number;
  /** 이미 걸러진 목록의 경로 — 0건이면 무시된다 */
  readonly to: string;
  readonly ariaLabel: string;
}

/** 0건은 링크가 아니다 — 열어 봐야 빈 목록이고, 없는 것을 있는 것처럼 보이게 하지 않는다 */
function CountLink({ label, count, to, ariaLabel }: CountLinkProps) {
  const shown = `${label} ${formatNumber(count)}건`;
  if (count === 0) return <>{shown}</>;

  return (
    <Link to={to} className="tds-ui-link tds-ui-focusable" aria-label={ariaLabel}>
      {shown}
    </Link>
  );
}

interface ActivityCardProps {
  readonly detail: MemberDetail;
}

export function ActivityCard({ detail }: ActivityCardProps) {
  const { activity } = detail;
  const reviewQuery = encodeURIComponent(detail.nickname);
  const ticketQuery = encodeURIComponent(detail.name);

  return (
    <Card aria-labelledby="member-activity-title">
      <CardTitle id="member-activity-title">활동 정보</CardTitle>

      <dl style={dlStyle}>
        <dt style={dtStyle}>가입일</dt>
        <dd style={ddStyle}>
          {formatRelativeOrDate(detail.joinedAtIso)}
          {/* 상대 시각으로 접히면 정확한 일시를 알 수 없다 — 괄호로 함께 보여준다 */}
          {` (${formatDateTime(detail.joinedAtIso)})`}
        </dd>

        <dt style={dtStyle}>로그인</dt>
        <dd style={ddStyle}>
          {`${formatRelativeOrDate(detail.lastLoginAtIso)} · 총 ${formatNumber(detail.loginCount)}회`}
        </dd>

        <dt style={dtStyle}>최종 로그인 IP</dt>
        <dd style={ddStyle}>{text(detail.lastLoginIp)}</dd>

        <dt style={dtStyle}>작성</dt>
        <dd style={ddStyle}>
          {/* 게시물·댓글은 갈 목록이 없어 글자로 남는다(머리말 참조) */}
          {`게시물 ${formatNumber(activity.posts)}건 · 댓글 ${formatNumber(activity.comments)}건 · `}
          <CountLink
            label="구매평"
            count={activity.reviews}
            to={`/products/reviews?q=${reviewQuery}`}
            ariaLabel={`${detail.nickname} 님이 쓴 구매평 ${formatNumber(activity.reviews)}건 보기`}
          />
          {' · '}
          <CountLink
            label="문의"
            count={activity.inquiries}
            to={`/support/tickets?q=${ticketQuery}`}
            ariaLabel={`${detail.name} 님의 문의 ${formatNumber(activity.inquiries)}건 보기`}
          />
        </dd>
      </dl>
    </Card>
  );
}
