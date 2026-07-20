// 본문 미리보기의 치환변수 — `#{토큰}` 을 파란 글자로 **그대로** 보여 준다
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 표본값으로 치환하지 않는가 — 기존 TemplatePreview 와 반대로 간다]
//
// marketing/templates 의 미리보기는 `#{이름}` 을 '홍길동' 으로 바꿔 그린다. 그쪽 화면의 질문이
// "수신자에게 어떻게 읽히는가" 라서 옳다.
//
// 이 화면의 질문은 다르다. 여기서 운영자가 확인해야 하는 것은 **어느 자리가 치환되는가** 다:
// 발송 시점에 값이 비면 그 자리는 빈칸으로 나가고, 변수 이름을 잘못 적으면 `#{이룸}` 이 문자
// 그대로 발송된다. 표본값으로 덮으면 그 두 사고가 미리보기에서 **똑같이 정상으로 보인다** —
// '홍길동' 과 '홍길동' 은 구분되지 않는다. 그래서 토큰을 지우지 않고, 대신 색으로 '여기는 치환될
// 자리' 임을 드러낸다.
// ─────────────────────────────────────────────────────────────────────────────
import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

/** 치환변수 문법 — `#{변수}` (솔라피·카카오 공통, _shared/messaging 의 countVariables 와 같은 모양) */
const VARIABLE_RE = /#\{[^}]+\}/g;

const tokenStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/**
 * 본문을 평문 조각과 변수 조각으로 가른다.
 *
 * split 의 캡처 없는 정규식은 구분자를 버리므로 matchAll 로 자른다 — 변수는 버릴 것이 아니라
 * 강조해야 할 조각이다. 순수 함수라 테스트가 DOM 없이 이 규칙만 겨눌 수 있다.
 */
export interface TextSegment {
  readonly text: string;
  readonly isVariable: boolean;
}

export function segmentsOf(body: string): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(VARIABLE_RE)) {
    const start = match.index;
    if (start > cursor) segments.push({ text: body.slice(cursor, start), isVariable: false });
    segments.push({ text: match[0], isVariable: true });
    cursor = start + match[0].length;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), isVariable: false });

  return segments;
}

export function VariableText({ body }: { readonly body: string }) {
  return (
    <>
      {segmentsOf(body).map((segment, index) => (
        // 같은 토큰이 본문에 여러 번 나올 수 있어 위치(index)가 키다 — 조각은 재정렬되지 않는다
        <Fragment key={`${String(index)}-${segment.text}`}>
          {segment.isVariable ? <span style={tokenStyle}>{segment.text}</span> : segment.text}
        </Fragment>
      ))}
    </>
  );
}
