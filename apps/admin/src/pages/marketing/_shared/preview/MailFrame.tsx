// 이메일 클라이언트 목업 프레임 (마케팅 발송 화면 공용)
//
// [폭이 600px 인 이유] 이메일 템플릿의 사실상 표준 폭이다. 종전에는 상한이 없어 미리보기 열을
// 그대로 채웠고(700px+), 실제 메일보다 훨씬 넓은 줄바꿈을 보여 줬다 — 목업이 거짓말을 한 셈이다.
//
// [본문은 HTML 이다] 이메일만 리치 텍스트를 쓴다. 저장 값이 이 앱의 sanitize 를 거쳤다고 가정하지
// 않고 그릴 때 다시 sanitize 한다(RichTextField 와 같은 원칙) — 그 판단은 이 컴포넌트가 갖는다.
import type { CSSProperties, ReactNode } from 'react';

import { cssVar, sanitizeRichText, typography } from '@tds/ui';

import { isHtmlBodyEmpty, looksLikeRichText } from '../messaging';
import { MAIL_WIDTH, MAIL_WIDTH_MOBILE, MOCK_BODY_MIN_HEIGHT } from '../preview-metrics';

/**
 * 미리보기 폭.
 *
 * [왜 폭을 바꿔 볼 수 있어야 하나] 이메일은 600px 을 기준으로 짜이지만 실제 열람의 절반 이상이
 * 360px 안팎의 화면에서 일어난다. 데스크톱 폭에서만 확인한 본문은 모바일에서 **버튼 문구가 두 줄로
 * 접히고 다단이 무너진 채** 나간다 — 그것을 발송 뒤에 알게 되는 것이 지금까지의 미리보기였다.
 *
 * 폭만 바꾼다. 기기 껍데기(노치·상태바)를 그리지 않는 이유는 그것이 답하지 않는 질문이기 때문이다 —
 * 알고 싶은 것은 '이 폭에서 내 본문이 어떻게 접히는가' 지 '아이폰처럼 보이는가' 가 아니다.
 */
export type MailDevice = 'desktop' | 'mobile';

const frameBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  background: cssVar('color.surface.raised'),
};

const subjectStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
  overflowWrap: 'anywhere',
};

const fromStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
};

const bodyBase: CSSProperties = {
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
  overflowWrap: 'anywhere',
  minHeight: MOCK_BODY_MIN_HEIGHT,
};

/** HTML 본문은 pre-wrap 을 쓰지 않는다 — 태그 사이 공백이 그대로 보인다. 서식은 마크업이 만든다 */
const htmlBodyStyle: CSSProperties = bodyBase;

/** 평문 본문은 반대다 — 줄바꿈을 살릴 것이 pre-wrap 밖에 없다 */
const plainBodyStyle: CSSProperties = {
  ...bodyBase,
  whiteSpace: 'pre-wrap',
};

const emptyBodyStyle: CSSProperties = {
  ...bodyBase,
  color: cssVar('color.text.muted'),
};

const footerStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
};

interface MailFrameProps {
  readonly subject: ReactNode;
  /** '보낸사람:' 줄의 내용 */
  readonly from: ReactNode;
  /** 본문 — 표본 치환까지 끝난 값. 평문이든 HTML 이든 받는다(아래 참고) */
  readonly body: string;
  readonly emptyLabel: string;
  /** 하단 영역 — 수신거부 안내 등. 없으면 그리지 않는다 */
  readonly footer?: ReactNode;
  /** 미리보기 폭. 기본은 데스크톱(600px) — 종전 동작 그대로다 */
  readonly device?: MailDevice;
}

/**
 * [왜 평문/HTML 을 프레임이 스스로 가리나]
 * 이메일 본문의 표현은 화면마다 다르다 — 템플릿은 리치 텍스트 에디터라 HTML 이고, 발송 폼은
 * textarea 라 평문이다. 그런데 발송 폼에는 '템플릿 불러오기' 가 있어서 **평문 화면에 HTML 이
 * 흘러들어온다**. 호출부가 플래그로 알려주는 방식이면 그 경로에서 틀린 플래그를 넘기게 되고,
 * 실제로 그 자리에서 `<p>` 가 글자로 찍혔다. 값을 보고 판단하면 어느 경로로 들어와도 맞는다.
 */
export function MailFrame({ subject, from, body, emptyLabel, footer, device }: MailFrameProps) {
  const rich = looksLikeRichText(body);
  // sanitize 는 HTML 일 때만 — 평문에 걸면 '<' 를 태그로 오해해 본문을 잘라 먹는다
  const html = rich ? sanitizeRichText(body) : '';
  const empty = rich ? isHtmlBodyEmpty(html) : body.trim() === '';
  const frameStyle: CSSProperties = {
    ...frameBase,
    maxWidth: device === 'mobile' ? MAIL_WIDTH_MOBILE : MAIL_WIDTH,
  };

  return (
    <div style={frameStyle} aria-label="이메일 미리보기">
      <div style={headerStyle}>
        <span style={subjectStyle}>{subject}</span>
        <span style={fromStyle}>보낸사람: {from}</span>
      </div>

      {empty && <div style={emptyBodyStyle}>{emptyLabel}</div>}
      {!empty &&
        (rich ? (
          // sanitizeRichText 허용목록(script/style/on* 제거)을 지난 값만 들어온다
          <div style={htmlBodyStyle} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div style={plainBodyStyle}>{body}</div>
        ))}

      {footer !== undefined && <div style={footerStyle}>{footer}</div>}
    </div>
  );
}
