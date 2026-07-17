// CSV 내보내기
//
// [왜 여기 있나] 회원 목록과 로그인 이력이 **같은 방식으로** CSV 를 받는다.
// 원래 이 코드(BOM 상수 + Blob + a[download])는 MembersPage.tsx 안에 인라인으로 있었다.
// 두 번째 소비자가 생기는 순간 복사하면 두 화면의 CSV 가 서로 다르게 깨지기 시작한다 —
// 그래서 화면에서 뽑아 여기로 올렸다. 로그인 이력은 회원 화면을 import 하지 않는다(클린코드 점검 축1).
//
// [도메인을 모른다] 회원·운영자·로그인 이력이 뭔지 모른다. **헤더 문자열과 셀 문자열**만 받는다.
// 무엇을 어떤 라벨로 내보낼지는 각 페이지의 data-source.ts 가 정한다.
//
// [백엔드 없음] 서버가 CSV 를 직접 내려주게 되면 `toCsvText` 는 사라지고 `downloadCsv` 만 남는다
// (응답 본문을 그대로 Blob 으로 감싸면 된다).
import { formatDate } from './format';

/** CSV 선두의 UTF-8 BOM — 없으면 Excel 이 한글을 깨뜨린다 */
const BOM = String.fromCodePoint(0xfeff);

/**
 * 엑셀이 **수식으로 해석하는** 선두 문자. RFC 4180 의 따옴표 감싸기는 이것을 막지 못한다 —
 * 큰따옴표는 CSV 파서를 위한 것이고, 셀 값이 정해진 뒤 수식 판정은 그 다음에 일어난다.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * 부호·천단위 구분·소수까지 포함한 **순수한 수**. 엑셀은 이런 값을 수식이 아니라 수로 읽으므로
 * 무력화할 필요가 없다 — 오히려 무력화하면 숫자 열이 텍스트가 되어 집계가 깨진다.
 * ('+5,000' · '-1,000' = formatSignedNumber(순증감) · '-5.2' = formatPercentValue)
 */
const PLAIN_NUMBER = /^[+-]?[\d,]*\.?\d+$/;

/**
 * CSV 수식 주입 방어 — 선두의 `=`/`+`/`-`/`@`/탭/CR 을 작은따옴표로 무력화한다.
 *
 * [왜 필요한가] 셀에는 **우리가 만들지 않은 문자열**이 들어간다(검색 키워드·닉네임·그룹 등
 * 제3자 입력). `=cmd|'/C calc'!A0` 같은 값이 그대로 실리면, 운영자가 CSV 를 엑셀로 여는 순간
 * 그 셀은 데이터가 아니라 **명령**이 된다. 내보내기는 읽기 동작이어야 한다.
 *
 * 순수한 수는 예외다(PLAIN_NUMBER) — 수식이 될 수 없고, 가리면 분석이 깨진다.
 */
function neutralizeFormula(value: string): string {
  if (!FORMULA_LEAD.test(value)) return value;
  if (PLAIN_NUMBER.test(value)) return value;
  return `'${value}`;
}

/**
 * 구분자·따옴표·줄바꿈을 품은 셀은 큰따옴표로 감싸고 내부 따옴표는 이중화한다 (RFC 4180).
 * 수식 무력화가 **먼저**다 — 붙인 작은따옴표까지 따옴표 안에 들어가야 한다.
 */
function escapeCell(value: string): string {
  const safe = neutralizeFormula(value);
  if (!/["\r\n,]/.test(safe)) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
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
