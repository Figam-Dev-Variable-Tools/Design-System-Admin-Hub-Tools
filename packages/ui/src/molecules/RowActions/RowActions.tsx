// RowActions — 목록 행의 인라인 액션(수정·삭제) (molecule · contracts/RowActions.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/RowActions.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 콘텐츠 목록의 행 끝 액션이 '수정 연필 + 삭제 휴지통'으로 동일해 한 벌로 올렸다. 도메인을 모른다 —
// 콜백과 접근성 라벨(label)·진행중 잠금(disabled)만 받는다. onEdit/onDelete 는 각각 있을 때만 그 버튼을 그린다.
// 삭제는 여기서 곧바로 지우지 않는다 — 호출부가 onDelete 안에서 확인 다이얼로그를 연다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
import type { RowActionsProps } from '../../../generated/types/RowActions.types';
import './RowActions.css';

/** 수정 — 연필 (currentColor·1.25em, 장식) */
function PencilGlyph() {
  return (
    <svg
      className="tds-rowactions__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      <path d="M15 5l3 3" />
    </svg>
  );
}

/** 삭제 — 휴지통 */
function TrashGlyph() {
  return (
    <svg
      className="tds-rowactions__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

export function RowActions({ label, disabled = false, onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="tds-rowactions">
      {onEdit !== undefined && (
        <button
          type="button"
          className="tds-rowactions__btn"
          aria-label={`${label} 수정`}
          disabled={disabled}
          onClick={() => onEdit()}
        >
          <PencilGlyph />
        </button>
      )}
      {onDelete !== undefined && (
        <button
          type="button"
          className="tds-rowactions__btn tds-rowactions__btn--danger"
          aria-label={`${label} 삭제`}
          disabled={disabled}
          onClick={() => onDelete()}
        >
          <TrashGlyph />
        </button>
      )}
    </span>
  );
}
