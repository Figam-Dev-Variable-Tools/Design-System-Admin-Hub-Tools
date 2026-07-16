// 감사 추적 표시 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [왜 설정 화면에 이것이 있는가] 시스템 설정은 여러 관리자가 드물게, 그러나 크게 바꾸는 값이다.
// '유지보수 모드가 왜 켜져 있지?' / '이 API Key 누가 만들었지?' 는 설정 화면에서 가장 자주 나오는
// 질문이고, 답이 화면에 없으면 로그를 뒤지거나 서로 묻게 된다. 마지막 변경자·시각을 값 옆에 둔다.
//
// [포맷] 날짜/상대시각은 손으로 만들지 않는다 — shared/format 의 공용 포매터를 통과한다(ERP-08).
import type { CSSProperties } from 'react';

import { formatDateTime, formatRelativeOrDate } from '../../../shared/format';
import type { AuditInfo } from './store';

const noteStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/**
 * '마지막 변경: 김운영 · 3시간전' — 정확한 일시는 title 로 남긴다.
 *
 * 상대 시각만 쓰면 감사에 필요한 정확도가 없고, 절대 시각만 쓰면 '최근인가?' 를 즉시 알 수 없다.
 * 둘 다 준다: 본문은 상대(빠른 판단), title 은 절대(정확한 기록).
 */
export function AuditNote({ audit }: { readonly audit: AuditInfo }) {
  return (
    <p style={noteStyle} title={formatDateTime(audit.updatedAt)}>
      마지막 변경: {audit.updatedBy} · {formatRelativeOrDate(audit.updatedAt)}
    </p>
  );
}
