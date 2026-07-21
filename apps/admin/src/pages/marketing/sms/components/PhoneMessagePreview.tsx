// SMS 발송 폼의 휴대폰 미리보기
//
// 프레임(휴대폰 껍데기·이미지 자리·바이트 배지)은 공용 PhoneFrame 이 갖는다. 이 파일은 **발송
// 시점에만 있는 값**을 프레임에 넣는 일만 한다 — 발신번호가 그것이다(템플릿에는 없다).
import { applyVariableSamples, byteLengthOf, formatPhone } from '../../_shared/messaging';
import type { SmsKind } from '../../_shared/messaging';
import { PhoneFrame } from '../../_shared/preview/PhoneFrame';

interface PhoneMessagePreviewProps {
  readonly senderNumber: string;
  /**
   * **발송 본문** — 입력칸의 글이 아니라 발신 표시 이름 접두까지 붙은 최종 문구다.
   *
   * [왜 여기서 접두를 붙이지 않나] 붙이는 순간 같은 계산이 두 곳이 된다: 폼은 이미 그 값으로
   * 유형(SMS/LMS)과 바이트 안내를 정했다(SmsFormPage 의 sendBody). 미리보기가 자기 판을 따로
   * 만들면 '화면이 보여 준 문자' 와 '화면이 말한 등급' 이 갈릴 수 있다.
   */
  readonly body: string;
  readonly kind: SmsKind;
  readonly hasImage: boolean;
}

export function PhoneMessagePreview({
  senderNumber,
  body,
  kind,
  hasImage,
}: PhoneMessagePreviewProps) {
  const rendered = applyVariableSamples(body);

  return (
    <PhoneFrame
      sender={senderNumber === '' ? '(발신번호 미선택)' : formatPhone(senderNumber)}
      // hasImage 는 폼이 이미 kind 판정(classifySms)에 넘겼다 — 여기서 다시 판정하지 않고
      // 프레임이 kind === 'mms' 로 이미지 자리를 그린다. 두 곳이 같은 질문에 답하면 갈라진다.
      kind={hasImage ? 'mms' : kind}
      bytes={byteLengthOf(body)}
      body={rendered.trim() === '' ? '(본문 미입력)' : rendered}
    />
  );
}
