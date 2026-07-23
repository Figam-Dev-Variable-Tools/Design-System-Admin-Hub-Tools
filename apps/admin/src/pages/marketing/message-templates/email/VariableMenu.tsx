// 변수 삽입 드롭다운 — 이메일 빌더 툴바의 ✨ Variable
//
// [왜 껍데기만 남았나] 예전에는 이 파일이 자기 목록(`./variables.ts` 의 VARIABLE_GROUPS —
// City/Gender/Name/Occupation/Preference, 토큰 `#{FIRST_NAME}`)을 들고 있었다. 그 목록은
// 목업에서 온 예시였고 이 관리자가 실제로 다루는 값과 아무 관계가 없었다 — 회원 이름도, 견적
// 합계금액도, 쿠폰 코드도 넣을 수 없었다.
//
// 이제 목록의 정본은 `shared/domain/template-variable-catalog.ts` 하나이고, 그리는 일은 세 화면
// 공용 `marketing/_shared/TemplateVariablePicker` 한 벌이 맡는다. 이 파일에 남은 것은 **이 화면
// 고유의 두 가지**뿐이다: 드롭다운의 자리(툴바 버튼 기준 절대 배치)와 안내 문구.
//
// [안내 문구가 왜 화면마다 다른가] 이메일 빌더의 미리보기는 토큰을 표본값으로 덮지 않고 그대로
// 보여 준다(components/VariableText.tsx 머리말 — 어느 자리가 치환되는지를 확인하는 화면이라
// 그렇다). 발송 폼의 미리보기는 반대로 치환한다. 한 문구로 뭉치면 둘 중 하나는 화면이 하지
// 않는 일을 설명하게 되므로 문구를 밖에서 넣는다.
import { TemplateVariablePicker } from '../../_shared/TemplateVariablePicker';
import { variableMenuStyle } from './styles';

interface VariableMenuProps {
  /** 잎을 눌렀을 때 — `#{member.name}` 문자열이 넘어온다 */
  readonly onInsert: (token: string) => void;
}

export function VariableMenu({ onInsert }: VariableMenuProps) {
  return (
    <div style={variableMenuStyle}>
      <TemplateVariablePicker
        onInsert={onInsert}
        caption="고른 변수는 커서 자리에 들어가요. 미리보기에는 토큰 그대로 보이고, 발송 시점에 값으로 치환돼요."
      />
    </div>
  );
}
