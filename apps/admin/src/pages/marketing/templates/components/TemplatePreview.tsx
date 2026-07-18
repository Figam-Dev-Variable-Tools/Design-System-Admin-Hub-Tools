// 발송 템플릿 미리보기 (발송 템플릿 화면 전용 — apps/admin/src/pages/marketing/templates/**)
//
// 채널을 고르면 수신자가 실제로 보게 될 모습을 목업으로 보여준다. 치환변수(#{이름})는 표본값으로
// 치환해 '완성된 메시지' 처럼 보이게 한다(applyVariableSamples).
//
// [프레임은 _shared/preview 가 갖는다] 종전에는 이 파일이 휴대폰·메일 목업을 자기 스타일로 다시
// 그렸고, 발송 폼의 PhoneMessagePreview·EmailPreview 와 near-verbatim 복제였다. 그 결과 같은
// '휴대폰' 이 화면마다 다른 폭으로 보였다. 프레임(껍데기)은 공용이고, 이 파일은 **템플릿이 가진
// 값을 프레임에 어떻게 넣을지**만 정한다 — 발신번호·수신거부처럼 템플릿에 없는 값은 넘기지 않는다.
import type { CSSProperties, ReactNode } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  countVariables,
  looksLikeRichText,
  messageChannelLabel,
  richTextToPlainText,
  TEMPLATE_VARIABLE_MAX,
} from '../../_shared/messaging';
import type { MessageChannel } from '../../_shared/messaging';
import { KakaoFrame } from '../../_shared/preview/KakaoFrame';
import { MailFrame } from '../../_shared/preview/MailFrame';
import { PhoneFrame } from '../../_shared/preview/PhoneFrame';

const EMPTY_BODY = '(본문 미입력)';
const EMPTY_TITLE = '(제목 미입력)';

/** 발신 채널명 — 템플릿에는 발신 정보가 없으므로 표본값으로 그린다 */
const SAMPLE_CHANNEL_NAME = '스페이스플래닝';
const SAMPLE_SENDER = '스페이스플래닝 <no-reply@example.com>';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const headerLabelStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const emptyStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
};

/**
 * 채널이 공유하는 body 를 **그 채널이 실제로 발송할 평문**으로 만든다.
 *
 * [이 자리가 `<p></p>` 를 글자로 뱉던 곳이다] body 는 채널이 공유하는 한 개의 필드고 이메일만 HTML 을
 * 쓴다. 이메일로 쓰다 알림톡으로 바꾸면 HTML 이 남는데, 그것을 문자열 그대로 그리면 React 가
 * 이스케이프해 태그가 **글자로** 찍혔다. 빈 검사도 함께 뚫렸다 — `'<p></p>'.trim()` 은 빈 문자열이
 * 아니라서 '(본문 미입력)' 이 뜨지 않았다.
 *
 * 원인은 채널 전환에서 고쳤지만(convertBodyForChannel), **이미 저장된 레코드**에는 여전히 HTML 이
 * 들어 있을 수 있다. 미리보기는 저장 값을 믿지 않고 자기가 그릴 수 있는 형태로 만들어 그린다.
 */
function toPlain(raw: string): string {
  return looksLikeRichText(raw) ? richTextToPlainText(raw) : raw;
}

/** 비었으면 회색 안내 문구로, 아니면 표본 치환한 평문으로 */
function renderText(raw: string, emptyLabel: string): ReactNode {
  const applied = applyVariableSamples(toPlain(raw));
  if (applied.trim() === '') return <span style={emptyStyle}>{emptyLabel}</span>;
  return applied;
}

interface TemplatePreviewProps {
  readonly channel: MessageChannel;
  readonly title: string;
  readonly body: string;
}

/**
 * 채널별 목업. 세 채널이 각자 다른 매체라 프레임이 다르다:
 *   sms      → 휴대폰 문자 말풍선 + 바이트/유형 배지(SMS↔LMS 자동 승격을 눈으로 확인)
 *   email    → 메일 클라이언트(제목·본문)
 *   alimtalk → 카카오톡 대화 + 강조표기(제목)·본문, 변수 개수 상한 안내
 */
export function TemplatePreview({ channel, title, body }: TemplatePreviewProps) {
  return (
    <div style={wrapStyle}>
      <div style={headerRowStyle}>
        <span style={headerLabelStyle}>{messageChannelLabel(channel)}</span>
        <StatusBadge tone="neutral" label="치환변수는 표본값" />
      </div>
      {channel === 'sms' && <SmsMock body={body} />}
      {channel === 'email' && <EmailMock title={title} body={body} />}
      {channel === 'alimtalk' && <KakaoMock title={title} body={body} />}
    </div>
  );
}

function SmsMock({ body }: { readonly body: string }) {
  // 바이트는 **실제로 발송될 평문** 기준으로 센다. HTML 이 섞인 값을 그대로 세면 태그 길이까지
  // 얹혀 SMS↔LMS 승격 판정이 틀린다.
  const bytes = byteLengthOf(toPlain(body));

  return (
    <PhoneFrame
      body={renderText(body, EMPTY_BODY)}
      kind={classifySms(bytes, false)}
      bytes={bytes}
    />
  );
}

function EmailMock({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <MailFrame
      subject={renderText(title, EMPTY_TITLE)}
      from={SAMPLE_SENDER}
      body={applyVariableSamples(body)}
      emptyLabel={EMPTY_BODY}
    />
  );
}

function KakaoMock({ title, body }: { readonly title: string; readonly body: string }) {
  const variableCount = countVariables(body) + countVariables(title);
  const overVariableLimit = variableCount > TEMPLATE_VARIABLE_MAX;
  const emphasis = applyVariableSamples(toPlain(title));

  return (
    <div style={wrapStyle}>
      <KakaoFrame
        channelName={SAMPLE_CHANNEL_NAME}
        emphasis={emphasis.trim() === '' ? undefined : emphasis}
        body={renderText(body, EMPTY_BODY)}
        buttons={['채널 추가']}
      />
      <div style={headerRowStyle}>
        <StatusBadge
          tone={overVariableLimit ? 'danger' : 'neutral'}
          label={`치환변수 ${String(variableCount)} / ${String(TEMPLATE_VARIABLE_MAX)}`}
        />
        {overVariableLimit && <span style={emptyStyle}>변수 상한 초과 — 심사에서 반려됩니다.</span>}
      </div>
    </div>
  );
}
