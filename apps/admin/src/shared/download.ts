// CSV 내보내기 (A40 소유 — apps/admin/src/shared/**)
//
// [왜 여기 있나] 회원 목록과 로그인 이력이 **같은 방식으로** CSV 를 받는다.
// 원래 이 코드(BOM 상수 + Blob + a[download])는 MembersPage.tsx 안에 인라인으로 있었다.
// 두 번째 소비자가 생기는 순간 복사하면 두 화면의 CSV 가 서로 다르게 깨지기 시작한다 —
// 그래서 화면에서 뽑아 여기로 올렸다. 로그인 이력은 회원 화면을 import 하지 않는다(A83 축1).
//
// [도메인을 모른다] 회원·운영자·로그인 이력이 뭔지 모른다. **헤더 문자열과 셀 문자열**만 받는다.
// 무엇을 어떤 라벨로 내보낼지는 각 페이지의 data-source.ts 가 정한다.
//
// [백엔드 없음] 서버가 CSV 를 직접 내려주게 되면 `toCsvText` 는 사라지고 `downloadCsv` 만 남는다
// (응답 본문을 그대로 Blob 으로 감싸면 된다).
import { formatDate } from './format';

/** CSV 선두의 UTF-8 BOM — 없으면 Excel 이 한글을 깨뜨린다 */
const BOM = String.fromCodePoint(0xfeff);

/** 구분자·따옴표·줄바꿈을 품은 셀은 큰따옴표로 감싸고 내부 따옴표는 이중화한다 (RFC 4180) */
function escapeCell(value: string): string {
  if (!/["\r\n,]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * 헤더 + 행 → CSV 본문.
 *
 * 셀은 **이미 사람이 읽는 문자열**이어야 한다 — 여기서 포맷하지 않는다.
 * 특히 결과/상태 열은 호출부가 진짜 값('실패')을 그대로 넣는다.
 * **실패를 성공 톤으로 옮겨 적는 자리는 이 함수 안에 존재하지 않는다.**
 */
export function toCsvText(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((cells) => cells.map(escapeCell).join(',')).join('\n');
}

/** 브라우저에 파일로 떨군다 — `<baseName>-YYYY-MM-DD.csv` */
export function downloadCsv(baseName: string, csv: string): void {
  const blob = new Blob([BOM, csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${baseName}-${formatDate(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
