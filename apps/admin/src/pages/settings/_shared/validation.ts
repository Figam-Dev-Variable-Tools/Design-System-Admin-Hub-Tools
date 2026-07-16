// 설정 폼 검증 공용 조각 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [왜 shared/crud 의 requiredText 를 쓰지 않는가 — ERP-13]
// 그 조각은 문구를 조립한다: `${label}을(를) 입력하세요.` → 화면에 **'사이트명을(를) 입력하세요'** 가
// 그대로 렌더된다. 스펙(ERP-13)은 사용자 대상 문자열에서 `'을(를)'|'이(가)'|'은(는)'` 을 0건으로 못박는다 —
// 받침 유무로 조사를 골라야 하고, 그건 값을 보간할 때만 런타임 로직이 필요하다.
//
// 이 섹션의 라벨은 **전부 작성 시점에 확정된 리터럴**이다('사이트명'·'대표 이메일'·'Redirect URI').
// 그래서 조사 헬퍼 없이도 옳은 문구를 쓸 수 있다 — 코드가 조사를 조립하지 않고, **문구를 통째로 받는다**.
//
// ⚠ 보간이 필요한 화면(예: 사용자가 지은 이름을 문구에 끼우는 곳)은 이 방법으로 풀 수 없다.
//    그때는 shared/format 의 조사 헬퍼가 있어야 한다 — 아직 없다(보고서에 기재).
import * as z from 'zod/mini';

/** 필수 텍스트 — 비면 missing, 최대 길이를 넘으면 tooLong. 두 문구를 통째로 받는다 */
export function requiredText(
  max: number,
  messages: { readonly missing: string; readonly tooLong: string },
) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', { error: messages.missing }),
    z.refine((value) => value.trim().length <= max, { error: messages.tooLong }),
  );
}

/** 선택 텍스트 — 비어도 되고, 채우면 최대 길이를 지켜야 한다 */
export function optionalText(max: number, tooLong: string) {
  return z.string().check(z.refine((value) => value.trim().length <= max, { error: tooLong }));
}

/**
 * 이메일 — 형식 검사는 '@ 앞뒤가 비어 있지 않고 도메인에 점이 있다' 까지만 한다.
 * RFC 5322 전체를 정규식으로 흉내 내면 실재하는 주소를 거절한다(그 판정은 발송이 한다).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredEmail(messages: { readonly missing: string; readonly malformed: string }) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', { error: messages.missing }),
    z.refine((value) => EMAIL_RE.test(value.trim()), { error: messages.malformed }),
  );
}

/** 국내 전화번호 — 02-000-0000 / 010-0000-0000 / 1588-0000 */
const PHONE_RE = /^(\d{2,4})-(\d{3,4})-(\d{4})$|^\d{4}-\d{4}$/;

export function requiredPhone(messages: { readonly missing: string; readonly malformed: string }) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', { error: messages.missing }),
    z.refine((value) => PHONE_RE.test(value.trim()), { error: messages.malformed }),
  );
}

/**
 * 붙여넣기 정규화 — 전화번호에서 숫자만 남기고 하이픈을 다시 넣는다.
 * ('02) 1234-5678' / '+82 2 1234 5678' 같은 입력을 사람이 지우게 하지 않는다 (ERP-14 취지)
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/^\+82\s*/, '0').replace(/\D/g, '');
  if (digits.length < 8) return raw.trim();

  // 1588-0000 류(대표번호 8자리)
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  // 서울 02 는 국번이 2자리다
  if (digits.startsWith('02')) {
    const rest = digits.slice(2);
    const head = rest.length >= 8 ? rest.slice(0, 4) : rest.slice(0, 3);
    return `02-${head}-${rest.slice(head.length)}`;
  }
  const head = digits.slice(0, 3);
  const rest = digits.slice(3);
  const mid = rest.length >= 8 ? rest.slice(0, 4) : rest.slice(0, rest.length - 4);
  return `${head}-${mid}-${rest.slice(mid.length)}`;
}
