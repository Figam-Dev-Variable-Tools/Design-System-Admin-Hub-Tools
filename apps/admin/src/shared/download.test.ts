// CSV 직렬화 회귀 테스트 (apps/admin/src/shared/download.ts)
//
// [왜 수식 주입이 여기서 막혀야 하나] 셀에는 우리가 만들지 않은 문자열이 들어간다 — 검색 키워드·
// 닉네임·그룹은 제3자가 정한 값이다. download.ts 는 도메인을 모르므로 '이 열은 안전하다'는 판단을
// 호출부에 맡길 수 없다. 마지막 관문이 여기다.
import { describe, expect, it } from 'vitest';

import { toCsvText } from './download';

/** 헤더를 뺀 첫 데이터 줄 */
function firstRow(cells: readonly string[]): string {
  return toCsvText(['h'], [cells]).split('\n')[1] ?? '';
}

describe('toCsvText — 수식 주입 방어', () => {
  it('선두 = 를 무력화한다 — 운영자가 엑셀로 열어도 명령이 실행되지 않는다', () => {
    // 고전적인 DDE 페이로드. 그대로 실리면 셀이 데이터가 아니라 명령이 된다.
    // 쉼표·따옴표가 없으니 RFC 4180 감싸기는 걸리지 않는다 — 작은따옴표만 붙는다.
    expect(firstRow(["=cmd|'/C calc'!A0"])).toBe(`'=cmd|'/C calc'!A0`);
  });

  it('선두 @ 를 무력화한다', () => {
    expect(firstRow(['@SUM(1+9)*cmd'])).toBe(`'@SUM(1+9)*cmd`);
  });

  it('선두 + 로 시작하는 수식을 무력화한다', () => {
    expect(firstRow(['+cmd|calc'])).toBe(`'+cmd|calc`);
  });

  it('선두 - 로 시작하는 수식을 무력화한다 — 수처럼 시작해도 수가 아니면 막는다', () => {
    expect(firstRow(['-1+cmd|calc'])).toBe(`'-1+cmd|calc`);
  });

  it('선두 탭으로 수식을 숨겨도 무력화한다 — 엑셀은 앞 공백을 흘리고 수식을 본다', () => {
    expect(firstRow(['\t=1+1'])).toBe(`'\t=1+1`);
  });

  it('선두 CR 로 수식을 숨겨도 무력화한다', () => {
    // CR 은 RFC 4180 감싸기에도 걸리므로 작은따옴표가 큰따옴표 안에 들어간다.
    expect(firstRow(['\r=1+1'])).toBe(`"'\r=1+1"`);
  });

  it('무력화는 따옴표 감싸기보다 먼저다 — 작은따옴표가 큰따옴표 안에 들어간다', () => {
    // 쉼표를 품은 수식은 RFC 4180 감싸기 + 무력화가 함께 걸린다.
    expect(firstRow(['=HYPERLINK("http://evil","클릭")'])).toBe(
      `"'=HYPERLINK(""http://evil"",""클릭"")"`,
    );
  });
});

describe('toCsvText — 진짜 수는 건드리지 않는다', () => {
  // 무력화가 과하면 숫자 열이 텍스트가 되어 집계가 깨진다 — 그건 고침이 아니라 다른 고장이다.
  it('음수 적립금은 그대로 둔다 (formatSignedNumber)', () => {
    expect(firstRow(['-1,000'])).toBe('"-1,000"');
  });

  it('양의 부호가 붙은 순증감은 그대로 둔다 (formatSignedNumber)', () => {
    expect(firstRow(['+5,000'])).toBe('"+5,000"');
  });

  it('음수 비율은 그대로 둔다 (formatPercentValue)', () => {
    expect(firstRow(['-5.2'])).toBe('-5.2');
  });

  it('평범한 수·문자열은 그대로 둔다', () => {
    expect(firstRow(['3', '홍**', '2026-07-17'])).toBe('3,홍**,2026-07-17');
  });
});

describe('toCsvText — RFC 4180 (기존 계약 유지)', () => {
  it('쉼표를 품은 셀은 큰따옴표로 감싼다', () => {
    expect(firstRow(['김**, 테스트'])).toBe('"김**, 테스트"');
  });

  it('내부 큰따옴표는 이중화한다', () => {
    expect(firstRow(['그는 "안녕" 이라 했다'])).toBe('"그는 ""안녕"" 이라 했다"');
  });

  it('줄바꿈을 품은 셀은 큰따옴표로 감싼다', () => {
    // 셀 안의 줄바꿈은 줄을 넘어가므로 firstRow(=split('\n')) 로는 볼 수 없다 — 전체를 본다.
    expect(toCsvText(['h'], [['첫 줄\n둘째 줄']])).toBe('h\n"첫 줄\n둘째 줄"');
  });

  it('헤더도 같은 규칙을 탄다', () => {
    expect(toCsvText(['=악성'], []).split('\n')[0]).toBe(`'=악성`);
  });
});
