// SMS 발송 폼의 휴대폰 미리보기
//
// 프레임(휴대폰 껍데기·이미지 자리·바이트 배지)은 공용 PhoneFrame 이 갖는다. 이 파일은 **발송
// 시점에만 있는 값**을 프레임에 넣는 일만 한다 — 발신번호가 그것이다(템플릿에는 없다).
import { applyVariableSamples, byteLengthOf, formatPhone } from '../../_shared/messaging';
import type { SmsKind } from '../../_shared/messaging';
import { PhoneFrame } from '../../_shared/preview/PhoneFrame';

interface PhoneMessagePreviewProps {
  readonly senderNumber: string;
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
