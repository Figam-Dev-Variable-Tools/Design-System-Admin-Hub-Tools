// 활동 정보 카드 — 전부 읽기 전용.
import { Card, CardTitle, ddStyle, dlStyle, dtStyle } from '../../../shared/ui';
import { formatDateTime, formatNumber, formatRelativeOrDate } from '../../../shared/format';
import type { MemberDetail } from '../types';

/** 값이 비면 '—' — 빈칸이 누락처럼 보이지 않게 한다 */
function text(value: string): string {
  return value.trim() === '' ? '—' : value;
}

interface ActivityCardProps {
  readonly detail: MemberDetail;
}

export function ActivityCard({ detail }: ActivityCardProps) {
  const { activity } = detail;

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
          {`게시물 ${formatNumber(activity.posts)}건 · 댓글 ${formatNumber(activity.comments)}건 · 구매평 ${formatNumber(activity.reviews)}건 · 문의 ${formatNumber(activity.inquiries)}건`}
        </dd>
      </dl>
    </Card>
  );
}
