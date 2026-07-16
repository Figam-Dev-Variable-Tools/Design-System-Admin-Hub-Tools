// SeqCell · SeqHeaderCell — 목록 표의 순번 열 (molecule 묶음 · 계약 비대상 · 함께 이동하는 표 조각)
//
// 목록 표 대부분이 '순번' 열을 갖는다(체크박스 다음, 1-based). 헤더/셀을 각 표가 손으로 그리면 정렬(가운데)·
// 숫자 표기(tabular-nums)가 표마다 어긋난다. RowSelectCell 과 같은 결로 여기 한 벌만 둔다. 도메인을 모른다 —
// 순번 숫자만 받는다.
//
// [계약을 두지 않은 이유] SeqHeaderCell 은 props 가 없고(계약 스키마는 prop ≥ 1 요구), SeqCell 은 순번 숫자
// 하나뿐인 순수 표시 셀이다 — TableSelection 묶음의 대표 계약(RowSelectCell·SelectAllHeaderCell)에 이미
// 담긴 표 셀 표면을 반복 계약할 실익이 없다. 함께 이동하는 표 조각으로 두고 테스트로 동작을 고정한다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import './SeqCell.css';

/** 표 헤더의 순번 열 — 가운데 정렬 */
export function SeqHeaderCell() {
  return (
    <th scope="col" className="tds-seqcell__head">
      순번
    </th>
  );
}

/** 표 행의 순번 셀 — 가운데 정렬, 1-based 숫자 표기(tabular-nums) */
export function SeqCell({ seq }: { readonly seq: number }) {
  return <td className="tds-seqcell">{seq.toLocaleString('ko-KR')}</td>;
}
