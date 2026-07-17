// 기업 관리 폼 검증 공용 조각 (앱 공용 선언적 CRUD 프레임워크)
//
// 열 개 화면의 zod 스키마가 같은 규칙을 반복한다: '비면 막고, 최대 길이를 넘으면 막는다',
// '선택 URL 은 비어 있거나 http(s) 여야 한다'. 규칙의 정본은 각 화면의 스키마지만, 이 두 조각은
// 문구까지 같아 여기 한 벌만 둔다(모두 pages/company 아래라 결합이 아니다).
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../format';

/** URL 은 http(s) 로 시작하는 문자열만 받는다 */
const HTTP_URL_RE = /^https?:\/\/\S+$/;

/**
 * 필수 텍스트 — 공백만이면 막고, 최대 길이를 넘으면 막는다.
 *
 * [ERP-13] label 은 호출부가 주입한다('제목'·'회사명'·'메시지'…). 그래서 조사를 리터럴로 쓰면
 * '메시지을(를) 입력하세요' 가 나온다 — 받침을 보고 고른다.
 */
export function requiredText(label: string, max: number) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => value.trim().length <= max, {
      error: `${label}${topicParticle(label)} ${String(max)}자를 넘을 수 없습니다.`,
    }),
  );
}

/** 선택 URL — 비어 있으면 통과, 채우면 http(s) 여야 한다 */
export function optionalHttpUrl(label = '이미지 URL') {
  return z.string().check(
    z.refine((value) => value.trim() === '' || HTTP_URL_RE.test(value.trim()), {
      error: `${label} 은 http:// 또는 https:// 로 시작해야 합니다.`,
    }),
  );
}

/**
 * 필수 이미지 값 — **등록 여부만** 본다. 형식은 강제하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 http(s) 를 강제하지 않는가 — 이것은 '아직 갚지 못한 빚'이지 설계가 아니다]
 *
 * ImageUploadField 는 **업로드하지 않는다.** 값 콜백의 발화 지점은 정확히 둘뿐이다:
 *   · onChange(URL.createObjectURL(file))  → 언제나 `blob:…`
 *   · onChange('')                          → 제거
 * 그 필드에는 URL 을 손으로 칠 입력이 없다(계약 props: label/value/required/disabled/error/
 * hint/maxSizeMB/onChange). 즉 **사용자 조작으로 도달 가능한 값은 `blob:…` 과 `''` 뿐이다.**
 *
 * 그래서 여기서 `optionalHttpUrl` 처럼 http(s) 를 요구하면, 사용자는 이미지를 올린 순간
 * "http:// 로 시작해야 합니다" 를 보고 **그것을 만족시킬 방법이 없다** — 등록 폼은 영영 제출되지
 * 않고, 수정 폼은 이미지를 두 번 다시 바꿀 수 없게 된다. 검증을 조이는 것은 고침이 아니라
 * 막다른 길이다(깨진 썸네일을 저장하는 지금보다 오히려 나쁘다).
 *
 * 진짜 고칠 곳은 검증이 아니라 **업로드 이음매**다:
 *   TODO(backend): POST /api/uploads — 파일을 보내고 **응답 URL** 을 값으로 삼는다.
 *                  그 URL 이 들어오는 순간 이 함수는 optionalHttpUrl 과 같은 규칙으로 조인다.
 *
 * 그때까지 이 관대함은 **의도적으로 남긴 빚**이다. blob: 값은 폼을 떠나는 순간(언마운트 시
 * revokeObjectURL) 죽으므로 목록 썸네일이 깨진다 — 그 사실을 숨기려고 가짜 업로드 성공을
 * 지어내지 않는다. (ImageUploadField.tsx 헤더가 같은 것을 컴포넌트 쪽에서 말한다.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function requiredImage(label = '이미지') {
  return z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 등록하세요.`,
    }),
  );
}
