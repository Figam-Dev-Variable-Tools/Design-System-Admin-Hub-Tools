// 이메일/뉴스레터 발송 폼의 미리보기
//
// [왜 _shared 인가] 이메일 발송·뉴스레터 두 폼이 같은 미리보기를 쓴다. 한 벌만 둔다.
//
// 프레임(메일 클라이언트 껍데기)은 preview/MailFrame 이 갖는다 — 템플릿 화면도 같은 프레임을 쓰므로
// 폭·여백이 한 곳에서 정해진다. 이 파일은 **발송 시점에만 있는 값**을 프레임에 넣는다:
// 발신자와 수신거부 링크가 그것이다(템플릿에는 없다).
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../shared/ui';
import { applyVariableSamples, withMessagingName } from './messaging';
import { MailFrame } from './preview/MailFrame';
import { cssVar } from '@tds/ui';

const unsubStyle: CSSProperties = {
  textDecorationLine: 'underline',
  color: cssVar('color.text.muted'),
};

interface EmailPreviewProps {
  readonly subject: string;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly body: string;
  readonly includeUnsubscribe: boolean;
}

export function EmailPreview({
  subject,
  senderName,
  senderEmail,
  body,
  includeUnsubscribe,
}: EmailPreviewProps) {
  /**
   * 제목에는 발신 표시 이름이 앞에 붙는다 — '메일·SMS 전용 사이트 이름' 설정의 메일 쪽 결과다.
   *
   * [왜 본문이 아니라 제목인가] 문자에서는 본문이 수신함에 그대로 보이는 유일한 줄이라 접두가
   * 본문에 붙는다. 메일에서 그 자리는 **제목**이다 — 수신함 목록에서 보이는 것이 제목이고,
   * 본문은 HTML 이라 앞에 평문을 끼우면 마크업이 깨진다. 채널이 다르면 '앞' 이 가리키는 자리도
   * 다르다(규칙 자체는 한 벌이다 — messaging.ts prefixMessagingName).
   *
   * [빈 제목은 그대로 빈 제목이다] 접두 규칙이 빈 문자열을 건드리지 않으므로(prefixMessagingName)
   * 아래 '(제목 미입력)' 안내가 접두에 가려지지 않는다.
   */
  const renderedSubject = applyVariableSamples(withMessagingName(subject));

  return (
    <MailFrame
      subject={renderedSubject.trim() === '' ? '(제목 미입력)' : renderedSubject}
      from={senderEmail === '' ? '(발신자 미선택)' : `${senderName} <${senderEmail}>`}
      // 이 폼의 본문은 평문(textarea)이지만 '템플릿 불러오기' 로 HTML 이 들어올 수 있다 —
      // 어느 쪽인지는 MailFrame 이 값을 보고 가린다.
      body={applyVariableSamples(body)}
      emptyLabel="(본문 미입력)"
      footer={
        includeUnsubscribe ? (
          <span>
            본 메일을 원치 않으시면 <span style={unsubStyle}>수신거부</span> 하실 수 있습니다.
          </span>
        ) : (
          <StatusBadge tone="danger" label="수신거부 링크 없음 — 마케팅 이메일 필수" />
        )
      }
    />
  );
}
