// SelectionBar — 선택 일괄 액션 바 (molecule · contracts/SelectionBar.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/SelectionBar.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 콘텐츠 목록 6종이 행을 체크박스로 고르면 상단에 '선택 개수 + 일괄 액션' 바가 뜬다. 도메인을 모른다 —
// 선택 개수(count)·단위 문구(noun)·해제 콜백(onClear)·액션 버튼(children)만 받는다. count 가 0 이면 렌더 안 함.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
import type { SelectionBarProps } from '../../../generated/types/SelectionBar.types';
import './SelectionBar.css';

export function SelectionBar({ count, noun = '건', children, onClear }: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className="tds-selectionbar" role="region" aria-label="선택 항목 일괄 작업">
      <span className="tds-selectionbar__count">
        {`${count.toLocaleString('ko-KR')}${noun} 선택됨`}
        {onClear !== undefined && (
          <button type="button" className="tds-selectionbar__clear" onClick={() => onClear()}>
            선택 해제
          </button>
        )}
      </span>
      <span className="tds-selectionbar__actions">{children}</span>
    </div>
  );
}
