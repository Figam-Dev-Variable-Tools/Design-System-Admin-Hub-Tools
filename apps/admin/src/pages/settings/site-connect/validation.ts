// 사이트 연동 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// ┌ 연동 키를 폼에서 어떻게 다루는가 — ../api-keys · ../oauth 와 **같은 규약** ─┐
// │ 폼의 `secretInput` 은 저장된 키가 아니라 **"새로 넣을 값"** 이다.             │
// │   빈 문자열  = 그대로 둔다(기존 키 유지)                                     │
// │   값이 있음  = 이 값으로 교체한다                                           │
// │                                                                          │
// │ 저장된 키는 폼에 **채워지지 않는다** — 채우면 DOM 에 평문이 살고 그 순간        │
// │ '마스킹' 은 눈속임이 된다. 모델이 아는 것은 `hasSecret` 불리언뿐이고,          │
// │ 화면이 그리는 고정 길이 글리프는 가린 표시가 아니라 **우리가 가진 정보의 전부**  │
// │ 다 (../_shared/secret.ts).                                                │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [교차 필드 규칙은 여기 없다] '연동을 켜려면 도메인과 키가 있어야 한다' 는 필드 하나로 판정되지
// 않는다. 그 규칙은 ./rules.ts 의 `enableBlock` 이 갖는다 — 토글의 disabled 와 저장 거절이
// **같은 술어**를 읽어야 하고, 스키마는 그 자리를 표현하지 못한다(객체 수준 이슈는 필드에 붙지
// 않아 화면 어디에도 그려지지 않는다).
import * as z from 'zod/mini';

import { optionalText } from '../_shared/validation';

export const SITE_URL_MAX = 200;
export const ALLOWED_ORIGINS_MAX = 1_000;
export const SECRET_MAX = 200;

/**
 * 홈페이지 도메인 — **https 만 받는다.**
 *
 * 이 주소는 유입 이벤트를 보내는 쪽의 신원이다. 평문 http 를 허용하면 그 이벤트가 중간에서
 * 읽히고 바뀔 수 있고, 그러면 유입 데이터는 관측이 아니라 추측이 된다.
 */
const HTTPS_URL_RE = /^https:\/\/[^\s/?#]+\.[^\s/?#]+/;

export interface SiteConnectValues {
  /** 연동 사용 — 켜는 조건은 ./rules.ts 의 enableBlock 이 정한다 */
  readonly enabled: boolean;
  readonly siteUrl: string;
  /** 줄바꿈으로 구분한 추가 허용 출처 — 서브도메인·스테이징을 함께 받는다 */
  readonly allowedOrigins: string;
  /** 키가 저장돼 있는가. **값은 담기지 않는다** */
  readonly hasSecret: boolean;
  /** 새로 넣을 키 — 빈 문자열이면 '그대로 둔다'(머리말) */
  readonly secretInput: string;
}

export const siteConnectSchema = z.object({
  enabled: z.boolean(),
  siteUrl: z.string().check(
    z.refine((value) => value.trim() === '' || HTTPS_URL_RE.test(value.trim()), {
      error: 'https:// 로 시작하는 도메인을 입력하세요.',
    }),
    z.refine((value) => value.trim().length <= SITE_URL_MAX, {
      error: '홈페이지 도메인이 너무 깁니다.',
    }),
  ),
  allowedOrigins: optionalText(ALLOWED_ORIGINS_MAX, '추가 허용 출처가 너무 깁니다.'),
  hasSecret: z.boolean(),
  secretInput: optionalText(SECRET_MAX, '연동 키가 너무 깁니다.'),
});

/** 폼의 초기 골격 — 조회가 도착하면 reset() 이 실제 값으로 갈아끼운다 */
export const EMPTY_SITE_CONNECT: SiteConnectValues = {
  enabled: false,
  siteUrl: '',
  allowedOrigins: '',
  hasSecret: false,
  secretInput: '',
};
