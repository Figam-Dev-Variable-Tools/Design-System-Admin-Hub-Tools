// 치환변수 삽입 바 — 발송 템플릿 · SMS 발송 · 이메일 발송 폼이 쓰는 자리
//
// [왜 칩 줄이 아니라 고르기 패널이 되었나] 예전에는 변수 다섯 개를 알약 버튼으로 늘어놓았다.
// 목록이 다섯일 때는 그것이 가장 빠른 UI 였다. 카탈로그가 6개 도메인 150여 항목이 된 지금 같은
// 모양을 쓰면 화면 절반이 버튼으로 덮이고, 원하는 것을 눈으로 훑는 시간이 검색보다 길어진다.
// 그래서 그리는 일은 세 화면 공용 TemplateVariablePicker(도메인 그룹 + 검색)에 넘겼다.
//
// [그런데 왜 이 파일이 남았나] 이 화면의 미리보기는 표본값으로 **치환한다**(EmailPreview·
// PhoneMessagePreview 가 applyVariableSamples 를 부른다). 메시지 템플릿 편집기의 미리보기는
// 치환하지 않는다. 안내 문구가 그 차이를 말해야 하므로, 문구를 아는 얇은 껍데기로 남는다 —
// 문구까지 공용 컴포넌트에 넣으면 둘 중 한 화면은 자기가 하지 않는 일을 설명하게 된다.
//
// [도메인을 모른다] 예전과 같다 — 어느 본문에 넣는지 알지 못하고 onInsert(token) 콜백만 받는다.
// 커서 자리에 넣을지 끝에 붙일지는 호출부가 정한다.
import { TemplateVariablePicker } from './TemplateVariablePicker';

interface VariableInsertBarProps {
  readonly onInsert: (token: string) => void;
  readonly disabled?: boolean;
}

export function VariableInsertBar({ onInsert, disabled = false }: VariableInsertBarProps) {
  return (
    <TemplateVariablePicker
      onInsert={onInsert}
      disabled={disabled}
      caption="치환변수 삽입 — 미리보기에서 표본값으로 치환돼요. 치환 후 길이는 수신자마다 달라져요."
    />
  );
}
