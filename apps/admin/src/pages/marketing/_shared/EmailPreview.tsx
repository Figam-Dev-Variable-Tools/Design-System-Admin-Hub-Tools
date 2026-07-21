// 이메일/뉴스레터 발송 폼의 미리보기
//
// [왜 _shared 인가] 이메일 발송·뉴스레터 두 폼이 같은 미리보기를 쓴다. 한 벌만 둔다.
//
// 프레임(메일 클라이언트 껍데기)은 preview/MailFrame 이 갖는다 — 템플릿 화면도 같은 프레임을 쓰므로
// 폭·여백이 한 곳에서 정해진다. 이 파일은 **발송 시점에만 있는 값**을 프레임에 넣는다:
// 발신자와 수신거부 링크가 그것이다(템플릿에는 없다).
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 미리보기가 답하는 질문 두 가지]
//   (1) 열기 **전** — 받은편지함 목록에서 어떻게 보이는가 (InboxRow: 보낸사람 · 제목 · 프리헤더)
//   (2) 열기 **후** — 본문이 이 폭에서 어떻게 접히는가 (MailFrame + 데스크톱/모바일 전환)
// 종전에는 (2)만, 그것도 데스크톱 폭 하나만 있었다. 오픈율을 가르는 판단은 (1)에서 끝나고,
// 실제 열람의 절반 이상은 좁은 화면에서 일어난다 — 둘 다 보이지 않으면 미리보기가 절반만 답한다.
//
// [다크 모드 — 판단과 근거]
// 이 컴포넌트의 **크롬**(프레임·라벨·세그먼트)은 전부 토큰(cssVar)이라 어드민 테마를 그대로 따른다.
// 반면 **메일 본문**은 다크 모드를 흉내 내지 않는다. 근거:
//   · 메일 클라이언트의 다크 모드는 우리가 제어할 수 없다. iOS Mail·Outlook.com 은 인라인 색을
//     **강제로 반전**시키고(그 규칙은 클라이언트마다 다르다), Gmail 웹은 대체로 반전하지 않는다.
//     한 벌의 흉내로는 어느 쪽도 맞힐 수 없고, 맞히지 못하는 미리보기는 없는 것보다 나쁘다.
//   · 발송 HTML 이 실을 수 있는 대응(`@media (prefers-color-scheme)`)은 `<style>` 을 걷어내는
//     클라이언트에서 통째로 사라진다 — 다단을 미디어 쿼리로 만들지 않은 것과 같은 이유다
//     (render-html.ts renderColumnsRow 머리말).
// 그래서 여기서는 **발송될 색을 그대로** 보여 준다. 다크 모드 대응이 필요해지면 그것은 미리보기의
// 토글이 아니라 렌더러의 일이고(색 대비를 반전에 견디게 고르는 쪽), 그때 이 주석을 근거로 다시 판단한다.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../shared/ui';
import { applyVariableSamples, withMessagingName } from './messaging';
import { InboxRow } from './preview/InboxRow';
import { MailFrame } from './preview/MailFrame';
import type { MailDevice } from './preview/MailFrame';
import { cssVar, SegmentedControl } from '@tds/ui';

const unsubStyle: CSSProperties = {
  textDecorationLine: 'underline',
  color: cssVar('color.text.muted'),
};

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const captionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

/**
 * 폭 전환 — 편집기 툴바와 같은 세그먼트다(message-templates/email/EmailToolbar DEVICE_OPTIONS).
 *
 * [왜 탭이 아니라 세그먼트인가] 데스크톱/모바일은 같은 것을 다른 폭으로 보는 **배타 선택**이라
 * radiogroup 시맨틱이 맞다. 보는 대상이 통째로 바뀌는 전환(편집↔미리보기)만 탭이다.
 * labelHidden 이 라벨을 시각적으로만 감추므로 접근 가능한 이름은 그대로 남는다.
 */
const DEVICE_OPTIONS = [
  { id: 'desktop', label: '데스크톱 폭', icon: 'desktop', labelHidden: true },
  { id: 'mobile', label: '모바일 폭', icon: 'mobile', labelHidden: true },
] as const;

function isMailDevice(value: string): value is MailDevice {
  return value === 'desktop' || value === 'mobile';
}

interface EmailPreviewProps {
  readonly subject: string;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly body: string;
  readonly includeUnsubscribe: boolean;
  /**
   * 운영자가 정한 프리헤더. 이 폼에는 아직 그 칸이 없으므로 대개 비어 있고, 그때는 **본문 앞머리**가
   * 수신함의 그 자리를 대신한다(inboxPreviewText). 값을 주는 화면이 생기면 그대로 이어진다.
   */
  readonly preheader?: string;
}

export function EmailPreview({
  subject,
  senderName,
  senderEmail,
  body,
  includeUnsubscribe,
  preheader,
}: EmailPreviewProps) {
  /**
   * [왜 폭이 지역 상태인가] 어느 폭으로 보고 있는지는 **편집 중에만 의미가 있는 것**이라
   * 폼 값이 아니다. 부모로 올리면 이 미리보기를 쓰는 모든 화면이 미리보기의 내부 사정을 알아야 한다
   * (EmailBuilder 가 device 를 자기 안에 두는 것과 같은 경계다).
   */
  const [device, setDevice] = useState<MailDevice>('desktop');

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
  const renderedBody = applyVariableSamples(body);
  const from = senderEmail === '' ? '(발신자 미선택)' : `${senderName} <${senderEmail}>`;

  return (
    <div style={stackStyle}>
      <div style={toolbarStyle}>
        <span style={captionStyle}>받은편지함에서 보이는 모습</span>
        <SegmentedControl
          size="sm"
          ariaLabel="미리보기 너비"
          value={device}
          options={DEVICE_OPTIONS}
          onChange={(next) => {
            if (isMailDevice(next)) setDevice(next);
          }}
        />
      </div>

      <InboxRow
        from={from}
        subject={renderedSubject}
        preheader={applyVariableSamples(preheader ?? '')}
        body={renderedBody}
      />

      <MailFrame
        device={device}
        subject={renderedSubject.trim() === '' ? '(제목 미입력)' : renderedSubject}
        from={from}
        // 이 폼의 본문은 평문(textarea)이지만 '템플릿 불러오기' 로 HTML 이 들어올 수 있다 —
        // 어느 쪽인지는 MailFrame 이 값을 보고 가린다.
        body={renderedBody}
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
    </div>
  );
}
