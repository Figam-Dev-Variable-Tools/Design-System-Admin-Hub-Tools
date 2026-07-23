// 사슬 밖에서 들어온 '새로 등록' 주소를 받아 내는 화면 조각 (영업 파이프라인 공용)
//
// ┌ 왜 필요한가 — 버튼만 숨기면 막은 것이 아니다 ────────────────────────────┐
// │ 영업 파이프라인의 세 칸(견적·계약·프로젝트)은 **앞 칸에서만** 생긴다. 목록의  │
// │ 등록 CTA 는 지웠지만 `/sales/quotes/new` 같은 주소는 라우트 표에 그대로 남아  │
// │ 있다(App.tsx — 다른 소유자). 주소창·즐겨찾기·옛 링크로 들어오면 빈 폼이 열리고 │
// │ 거기서 저장한 견적은 원본 문의가 없는 유령이 된다.                          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [왜 조용한 404 가 아닌가] 빈 화면과 404 는 **고장과 구분되지 않는다.** 운영자는 자기가 뭘 잘못
// 눌렀는지, 그럼 어디로 가야 하는지 알 수 없다. 그래서 '없다' 가 아니라 **'여기서는 만들지 않는다,
// 만드는 곳은 저기다'** 라고 말하고 그 문까지 링크한다. 시스템 설정의 알 수 없는 AI 프로바이더
// 주소가 이미 같은 관용구를 쓴다(settings/api-keys/AiConnectionPage — '이 화면이 아는 AI
// 프로바이더가 아닙니다' + 목록으로 돌아가기).
//
// [수정·삭제는 막지 않는다] 막은 것은 **생성**뿐이다. 이 조각은 `:id` 가 없는 등록 모드에서만
// 그려지고, `/:id/edit` 는 평소처럼 폼을 연다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { Alert, pageTitleStyle } from '../../../shared/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

/** 문장과 두 링크를 한 줄에 두되, 좁은 화면에서는 접힌다 */
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

interface ChainOnlyCreateNoticeProps {
  /** 화면 제목 — '견적 등록' 처럼 사용자가 기대한 것 */
  readonly title: string;
  /**
   * 왜 여기서 만들 수 없는지 + 어디서 만드는지 — **한 문장으로 다음 행동까지** 말한다.
   * '권한이 없습니다' 같은 문장은 금지다: 이것은 권한 문제가 아니라 순서 문제다.
   */
  readonly reason: string;
  /** 실제로 만드는 곳으로 가는 문 */
  readonly source: { readonly to: string; readonly label: string };
  /** 이 화면의 목록 — 이미 있는 것을 찾으러 갈 길 */
  readonly list: { readonly to: string; readonly label: string };
}

export function ChainOnlyCreateNotice({ title, reason, source, list }: ChainOnlyCreateNoticeProps) {
  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{title}</h1>
        <p style={descriptionStyle}>
          영업 파이프라인(문의 → 견적 → 계약 → 프로젝트)은 앞 칸에서만 다음 칸이 생겨요.
        </p>
      </div>
      <Alert tone="warning">
        <div style={rowStyle}>
          <span>{reason}</span>
          <Link to={source.to} className="tds-ui-link tds-ui-focusable">
            {source.label}
          </Link>
          <Link to={list.to} className="tds-ui-link tds-ui-focusable">
            {list.label}
          </Link>
        </div>
      </Alert>
    </div>
  );
}
