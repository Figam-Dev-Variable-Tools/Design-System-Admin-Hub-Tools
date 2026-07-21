// 받은편지함 목록의 한 줄 — 메일을 열기 **전에** 수신자가 보는 전부
//
// [왜 프레임 위에 이것이 따로 서는가] MailFrame 은 '메일을 연 화면' 이다. 그런데 오픈율을 가르는
// 판단은 그보다 앞, 목록 화면에서 끝난다 — 보낸사람이 누구인지, 제목이 무엇인지, 그 뒤에 이어
// 붙는 한 줄이 무엇인지. 그 세 조각을 한 번도 보지 못한 채 본문만 다듬는 것이 지금까지의 미리보기가
// 답하지 못하던 질문이었다.
//
// [무엇을 흉내 내지 않는가] 특정 클라이언트(Gmail·Outlook)의 생김새를 베끼지 않는다. 베끼면
// '내 화면에서는 이렇게 안 보이는데' 라는 반문을 부르고, 그 반문에 답할 방법이 없다. 여기서
// 약속하는 것은 **세 조각의 순서와 잘림**뿐이다 — 그것은 어느 클라이언트에서나 같다.
import type { CSSProperties } from 'react';

import { cssVar, typography } from '@tds/ui';

import { inboxPreviewText } from '../messaging';

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  minWidth: 0,
};

const senderStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.semibold'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  overflowWrap: 'anywhere',
};

/**
 * 제목과 프리헤더가 **한 줄에 이어 붙는다** — 수신함이 실제로 그렇게 그린다.
 * 넘치면 말줄임으로 잘린다: 그 잘림이 곧 '제목이 너무 길다' 를 눈으로 보여 준다.
 */
const lineStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

const subjectStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

/** 프리헤더는 제목보다 흐리다 — 수신함에서도 그렇다 */
const previewStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
};

/** 프리헤더를 정하지 않았을 때의 안내 — 운영자만 본다(수신자에게 나가는 글자가 아니다) */
const fallbackNoteStyle: CSSProperties = {
  ...previewStyle,
  fontStyle: 'italic',
};

interface InboxRowProps {
  /** '보낸사람' 자리 — 표시 이름이 없으면 주소가 그 자리에 선다 */
  readonly from: string;
  /** 표본 치환·발신 이름 접두까지 끝난 제목 */
  readonly subject: string;
  /** 운영자가 정한 프리헤더. 비면 본문 앞머리가 그 자리를 대신한다 */
  readonly preheader: string;
  /** 본문 — 평문이든 HTML 이든 받는다(판단은 inboxPreviewText 가 한다) */
  readonly body: string;
}

export function InboxRow({ from, subject, preheader, body }: InboxRowProps) {
  const preview = inboxPreviewText(preheader, body);
  const trimmedSubject = subject.trim();

  return (
    <div style={rowStyle} aria-label="받은편지함 미리보기">
      <span style={senderStyle}>{from}</span>
      <span style={lineStyle}>
        <span style={subjectStyle}>
          {trimmedSubject === '' ? '(제목 없음)' : trimmedSubject}
          {'  '}
        </span>
        {preview === '' ? (
          <span style={fallbackNoteStyle}>
            (프리헤더가 비어 있고 본문도 아직 없습니다 — 수신함에는 제목만 보입니다)
          </span>
        ) : (
          <span style={previewStyle}>{preview}</span>
        )}
      </span>
    </div>
  );
}
