// OAuth 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// ┌ client secret 을 폼에서 어떻게 다루는가 ───────────────────────────────────┐
// │ 폼의 `secret` 필드는 **저장된 시크릿이 아니라 "새로 넣을 값"** 이다.            │
// │   빈 문자열  = 그대로 둔다(기존 시크릿 유지)                                  │
// │   값이 있음  = 이 값으로 교체한다                                            │
// │                                                                          │
// │ 그래서 저장된 시크릿은 폼에 **채워지지 않는다** — 채우면 DOM 에 평문이 살고,     │
// │ 그 순간 '마스킹' 은 눈속임이 된다. 화면은 `hasSecret` 불리언만 알고,           │
// │ 저장 여부는 `••••••••••••` 로 표시한다 (_shared/secret.ts).                   │
// │                                                                          │
// │ Apple 의 `.p8` 개인키도 **똑같은 규칙**을 따른다 — `hasPrivateKey` 불리언 +     │
// │ '새로 고른 파일 이름' 한 칸. 파일 **내용은 폼 상태에 들어오지 않는다**.          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 제공자마다 자격증명의 **모양이 다르다** — 한 덩어리로 뭉치지 않는다 ──────────┐
// │ Google·카카오·네이버·Facebook·LINE 은 (client_id + client_secret) 짝이지만,     │
// │ **Apple 에는 정적 client secret 이 없다.** Apple 의 `client_secret` 은          │
// │ 우리 서버가 ES256 으로 서명해 만드는 **JWT** 이고, 그 서명에 필요한 재료가       │
// │ Services ID · Team ID · Key ID · `.p8` 개인키 넷이다                          │
// │ (https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret).
// │                                                                          │
// │ 그래서 `secret: string` 한 칸에 Apple 을 **욱여넣지 않는다** — 넣는 순간         │
// │ '무엇을 넣어야 하는 칸인지' 아무도 답할 수 없게 되고, 나머지 세 값은 갈 곳을      │
// │ 잃는다. 대신 `provider` 를 판별자로 하는 **합집합 타입**으로 갈라 둔다:          │
// │   · client-secret 갈래 : google · kakao · naver · facebook · line             │
// │   · apple-key    갈래 : apple                                               │
// │ 모든 필드를 선택(optional)으로 만든 납작한 타입이었다면 '이 제공자에 이 값이      │
// │ 있는가' 를 타입이 답해 주지 못하고 런타임 분기가 화면 곳곳에 번진다.             │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 형식 검사를 어디까지 하는가 — '막는 것' 과 '알려 주는 것' 을 나눈다 ──────────┐
// │ **시크릿·키의 길이나 문자셋은 검사하지 않는다.** 근거:                          │
// │   · Google 은 `GOCSPX-` 접두어를 어디에서도 **보장하지 않는다** — 2021 이전에    │
// │     발급된 시크릿은 그 접두어가 없다. 접두어를 요구하면 멀쩡한 값이 거절된다.     │
// │   · 카카오 REST API 키·네이티브 앱 키, 네이버 Client Secret 의 형식은            │
// │     **문서화된 적이 없다** — 오늘 맞는 정규식이 내일 틀린다.                     │
// │   · Meta 는 앱 ID·앱 시크릿의 자릿수를 **문서화하지 않는다**. '16자리 숫자 /     │
// │     32자 hex' 는 널리 퍼진 관찰값일 뿐 규약이 아니다.                           │
// │   · LINE 도 Channel ID·Channel secret 의 자릿수를 **문서화하지 않는다**.        │
// │ 그래서 길이 상한(폭주 방지)만 두고, 형식은 **경고(warn)** 로만 말한다.           │
// │                                                                          │
// │ 예외는 Google **Client ID 접미어** 하나다 — `.apps.googleusercontent.com` 은   │
// │ 문서화된 규약이라 막아도 된다. 단 **접미어만** 본다: Google 자신의 Playground   │
// │ ID 가 `407408718192.apps.googleusercontent.com` 이라 '대시 세그먼트' 를 요구하면 │
// │ 실재하는 ID 를 거절한다.                                                     │
// │                                                                          │
// │ Apple 의 Team ID·Key ID 는 문서가 **10자**라고 명시하지만(위 URL) 그래도        │
// │ **막지 않고 경고만** 한다 — 자릿수 규약이 바뀌면 멀쩡한 값이 거절되고, 그 대가는 │
// │ '오타를 즉시 잡아 준다' 는 이득보다 크다.                                      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 카카오 어드민 키를 **수집하지 않는 이유** ──────────────────────────────────┐
// │ 어드민 키는 앱 전체를 대리하는 마스터 키다(사용자 강제 탈퇴·메시지 발송 등).      │
// │ **카카오 로그인에는 필요하지 않다** — 로그인은 REST API 키 + 시크릿으로 끝난다.  │
// │ 필요 없는 최고 권한 자격증명을 받아 두면 유출 시 피해만 커진다. 그래서 이 화면은  │
// │ 어드민 키 입력란을 **두지 않는다**. (누가 다시 추가하려 한다면 이 주석이 이유다.) │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ '1초 회원가입' 이 **여기에 없는 이유** ────────────────────────────────────┐
// │ 1초 회원가입은 OAuth 소셜 로그인이 아니라 **본인인증(휴대폰 실명확인) 상품**이다. │
// │ client_id/client_secret 로 인가 코드를 주고받는 흐름이 아니므로 이 화면의 모델에  │
// │ 들어올 수 없다. 그 자리는 연동 목록의 '간편 본인인증' 옆이다                     │
// │ (/settings/api-keys · ../api-keys/integrations.ts). 여기에 타일만 얹으면        │
// │ **열리지 않는 폼**이 되고, 그것은 기능이 아니라 거짓 약속이다.                   │
// └──────────────────────────────────────────────────────────────────────────┘
import * as z from 'zod/mini';

/**
 * client_id + client_secret 짝으로 끝나는 제공자들.
 * Apple 은 여기 없다 — 정적 시크릿이 없다(파일 머리말).
 */
const CLIENT_SECRET_PROVIDERS = ['google', 'kakao', 'naver', 'facebook', 'line'] as const;

export type ClientSecretProviderId = (typeof CLIENT_SECRET_PROVIDERS)[number];

/**
 * 제공자 전체. **런타임 목록을 따로 두지 않는다** — 두면 이 목록과
 * `OAUTH_PROVIDER_META` 가 서로 어긋날 수 있고, 어긋나도 아무도 모른다.
 * 메타 표(Record<OAuthProviderId, …>)가 여섯을 모두 채우도록 타입이 강제하므로
 * 그 표가 곧 열거다.
 */
export type OAuthProviderId = ClientSecretProviderId | 'apple';

/**
 * 자격증명의 **모양**. 화면은 이 값으로 어떤 입력칸을 그릴지 정한다 —
 * 제공자 id 를 하나씩 나열해 분기하면 제공자가 늘 때마다 화면이 함께 틀린다.
 */
export type CredentialKind = 'client-secret' | 'apple-key';

interface ProviderMeta {
  /** 문구에 끼워 넣는 짧은 이름 ('Google 로그인을 끕니다') */
  readonly label: string;
  /** 카드 제목 — 운영자가 부르는 이름 그대로 */
  readonly title: string;
  /** 자격증명의 모양 — 화면이 그릴 입력칸을 정한다 */
  readonly credentialKind: CredentialKind;
  /** Redirect URI 를 제공자 콘솔이 부르는 이름 (네이버는 'Callback URL', Apple 은 'Return URL') */
  readonly redirectLabel: string;
  /**
   * 이 제공자만의 Redirect URI 규칙 한 줄 — 없으면 null.
   * '정확히 일치' 는 모두에게 해당하므로 여기 적지 않는다(화면이 공통 문구로 말한다).
   */
  readonly redirectNote: string | null;
  /** 콘솔에서 이 값들을 어디서 발급받는지 — 운영자가 두 화면을 오가며 헤매지 않게 */
  readonly consoleHint: string;
  /**
   * 자격증명이 **아닌** 콘솔 쪽 준비물 — 심사·검증·채널 상태 등.
   * 값을 다 넣어도 로그인이 안 되는 이유는 대개 여기 있는데, 이 화면에는 그 사실이
   * 드러날 자리가 없다. 없으면 null(억지로 한 줄 지어내지 않는다).
   */
  readonly consoleNotice: string | null;
  /**
   * 이 제공자가 Redirect URI 에 **localhost·IP 를 허용하는가**.
   * Apple 만 false — 문서가 한 문장으로 금지한다(REDIRECT_LOCALHOST_RULE).
   */
  readonly allowsLocalRedirect: boolean;
}

/**
 * client_id/client_secret 갈래에서만 뜻이 있는 라벨들.
 * Apple 은 이 표에 없다 — 물어보면 타입이 막는다(총함수 조회 대상이 다르다).
 */
interface ClientSecretMeta {
  /**
   * Client ID 를 제공자 콘솔이 부르는 이름 — 화면 라벨을 콘솔 용어에 맞춘다.
   * 카카오는 같은 값을 'REST API 키' 라 부른다. 'Client ID' 라고만 적으면 운영자가 콘솔에서
   * 그 이름을 못 찾아 헤맨다.
   */
  readonly clientIdLabel: string;
  /**
   * Client Secret 을 콘솔이 부르는 이름.
   *
   * [왜 API 이름을 괄호로 함께 적는가] Google 문서만 해도 같은 `client_secret` 을
   * '클라이언트 보안 비밀번호' · '클라이언트 보안 비밀' · '클라이언트 비밀번호' 세 가지로 번역한다.
   * 한국어 라벨 하나만 적으면 운영자가 콘솔에서 그 단어를 못 찾는다 — API 이름이 유일한 고정점이다.
   */
  readonly secretLabel: string;
  /**
   * 저장된 시크릿을 잃어버렸을 때 **무엇을 해야 하는가**.
   * 제공자마다 답이 다르다 — Google 은 '다시 확인' 이 아예 불가능하다(아래 GOOGLE_SECRET_RECOVERY).
   */
  readonly secretRecovery: string;
  /** 네이티브 앱 키를 받는가 (카카오만) */
  readonly hasNativeAppKey: boolean;
  /** iOS URL 스키마를 Client ID 에서 **파생**해 보여주는가 (Google 만) */
  readonly hasIosUrlScheme: boolean;
}

/**
 * Google 시크릿 분실 시의 유일한 복구 경로 — **재발급(회전)이다.**
 *
 * 2025-06(신규 클라이언트) · 2025-11(기존 클라이언트)부터 Google Cloud Console 은 client secret 을
 * **생성 시점 단 한 번만** 전체로 보여주고, 그 뒤로는 마지막 4자만 남긴다.
 * 그러므로 '콘솔에서 다시 확인하세요' 는 **더 이상 실행 불가능한 안내**다 — 그렇게 적으면
 * 운영자는 존재하지 않는 버튼을 찾아 헤맨다.
 */
const GOOGLE_SECRET_RECOVERY =
  '저장된 시크릿은 여기서도, Google Cloud Console 에서도 다시 볼 수 없어요. 값을 잃어버렸다면 콘솔에서 시크릿을 회전(재발급)한 뒤 새 값을 넣으세요.';

// Record 로 두면 (OAuthProviderId 키) 조회가 총함수라 undefined 갈래가 없다.
const OAUTH_PROVIDER_META: Record<OAuthProviderId, ProviderMeta> = {
  google: {
    label: 'Google',
    title: '구글 로그인',
    credentialKind: 'client-secret',
    redirectLabel: '승인된 리디렉션 URI',
    redirectNote: null,
    consoleHint: 'Google Cloud Console → API 및 서비스 → 사용자 인증 정보',
    consoleNotice: null,
    allowsLocalRedirect: true,
  },
  kakao: {
    label: '카카오',
    title: '카카오 로그인 · 싱크',
    credentialKind: 'client-secret',
    redirectLabel: 'Redirect URI',
    redirectNote: null,
    consoleHint: 'Kakao Developers → 내 애플리케이션 → 앱 키 · 카카오 로그인',
    consoleNotice: null,
    allowsLocalRedirect: true,
  },
  naver: {
    label: '네이버',
    title: '네이버 로그인',
    credentialKind: 'client-secret',
    redirectLabel: 'Callback URL',
    redirectNote: null,
    consoleHint: 'NAVER Developers → 내 애플리케이션 → API 설정',
    consoleNotice: null,
    allowsLocalRedirect: true,
  },
  facebook: {
    label: 'Facebook',
    title: 'Facebook 로그인',
    credentialKind: 'client-secret',
    redirectLabel: '유효한 OAuth 리디렉션 URI',
    /*
     * Strict Mode 는 쿼리 파라미터까지 포함한 정확 일치를 요구하고 state 만 예외로 둔다.
     * https://developers.facebook.com/docs/facebook-login/security
     */
    redirectNote:
      'Meta는 엄격 모드에서 쿼리 파라미터까지 포함해 정확히 일치할 것을 요구해요(state 파라미터만 예외). 콘솔에 등록하지 않은 파라미터를 붙여 보내면 거절돼요.',
    consoleHint:
      'Meta for Developers → 내 앱 → 앱 설정 · 기본 설정 / 제품 → Facebook 로그인 → 설정',
    /*
     * 자격증명을 다 넣어도 **일반 사용자**는 로그인하지 못할 수 있다 — 개발 모드에서는
     * 역할(관리자·개발자·테스터)을 가진 계정만 인가된다.
     * https://developers.facebook.com/docs/development/build-and-test
     */
    consoleNotice:
      '앱이 개발 모드이면 앱에 등록된 역할(관리자·개발자·테스터) 계정만 로그인돼요. 일반 사용자에게 열려면 앱을 라이브로 전환하고, 필요한 권한이 고급 액세스라면 비즈니스 인증을 마쳐야 해요.',
    allowsLocalRedirect: true,
  },
  apple: {
    label: 'Apple',
    title: 'Apple 로그인',
    credentialKind: 'apple-key',
    redirectLabel: 'Return URL',
    redirectNote:
      'Apple은 https만 받고 도메인 이름을 요구해요 — localhost와 IP 주소는 쓸 수 없어 로컬 개발에도 실제 도메인이 필요해요.',
    consoleHint:
      'Apple Developer → Certificates, Identifiers & Profiles → Identifiers(Services IDs) · Keys',
    /*
     * Apple 의 client_secret 은 **만료되는 JWT** 다 — 최대 15777000초(약 6개월).
     * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
     * 값을 한 번 넣어 두고 잊으면 최대 6개월 뒤 로그인이 **조용히** 죽는다.
     */
    consoleNotice:
      'Apple 은 고정된 시크릿을 주지 않아요. 아래 네 값으로 서버가 client_secret(JWT)을 서명해 만들고, 그 JWT 는 최대 6개월(15777000초)까지만 유효해 주기적으로 다시 만들어야 해요. 유료 Apple Developer Program 멤버십이 필요해요.',
    /*
     * Apple 만 localhost·IP 를 금지한다. 문서 원문:
     * "The URI must use the HTTPS protocol, include a domain name, and can't contain
     *  an IP address or localhost, and must not contain a fragment identifer (#)."
     * https://developer.apple.com/documentation/signinwithapplerestapi/generate_and_validate_tokens
     */
    allowsLocalRedirect: false,
  },
  line: {
    label: 'LINE',
    title: 'LINE 로그인',
    credentialKind: 'client-secret',
    /*
     * [라벨을 영어로 두는 이유] LINE Developers 문서·콘솔에는 **한국어 로케일이 없다**
     * (developers.line.biz 의 /ko/ 경로는 403 이고 /en/ · /ja/ 만 존재한다).
     * 없는 한국어 라벨을 지어내면 운영자가 콘솔에서 그 단어를 영영 못 찾는다.
     */
    redirectLabel: 'Callback URL',
    /*
     * LINE 만 등록하지 않은 **쿼리 파라미터를 덧붙이는 것**을 허용한다(경로·호스트는 정확 일치).
     * https://developers.line.biz/en/docs/line-login/security-checklist/
     */
    redirectNote:
      'LINE은 경로까지는 정확히 일치해야 하지만, 요청 시 쿼리 파라미터를 덧붙이는 것은 허용해요.',
    consoleHint: 'LINE Developers Console → 채널 → Basic settings · LINE Login',
    /*
     * 채널은 만들면 Developing 으로 시작하고, 그 상태에서는 Admin·Tester 만 로그인된다.
     * Published 로 바꾸면 **되돌릴 수 없다**. 이메일 수집은 별도 신청이 필요하다.
     * https://developers.line.biz/en/docs/line-login/managing-users/
     */
    consoleNotice:
      '채널이 Developing 상태이면 채널의 Admin·Tester 로 등록된 계정만 로그인돼요. Published 로 바꾸면 되돌릴 수 없으니 확인을 마친 뒤 전환하세요. 이메일 수집(email 스코프)은 콘솔에서 별도로 신청해 승인받아야 해요.',
    allowsLocalRedirect: true,
  },
};

const CLIENT_SECRET_META: Record<ClientSecretProviderId, ClientSecretMeta> = {
  google: {
    clientIdLabel: '클라이언트 ID (client_id)',
    secretLabel: '클라이언트 보안 비밀번호 (client_secret)',
    secretRecovery: GOOGLE_SECRET_RECOVERY,
    hasNativeAppKey: false,
    hasIosUrlScheme: true,
  },
  kakao: {
    clientIdLabel: 'REST API 키 (client_id)',
    secretLabel: 'Client Secret (client_secret)',
    secretRecovery:
      '저장된 시크릿은 다시 볼 수 없어요. 값을 잃어버렸다면 Kakao Developers 에서 시크릿을 재발급한 뒤 새 값을 넣으세요.',
    hasNativeAppKey: true,
    hasIosUrlScheme: false,
  },
  naver: {
    clientIdLabel: 'Client ID (client_id)',
    secretLabel: 'Client Secret (client_secret)',
    secretRecovery:
      '저장된 시크릿은 다시 볼 수 없어요. 값을 잃어버렸다면 NAVER Developers 에서 시크릿을 재발급한 뒤 새 값을 넣으세요.',
    hasNativeAppKey: false,
    hasIosUrlScheme: false,
  },
  facebook: {
    /*
     * Meta 콘솔의 한국어 라벨은 '앱 ID' · '앱 시크릿 코드' 로 알려져 있으나,
     * 한국어 페이지 원문을 1차 문서에서 확정하지 못했다 — 그래서 영문 API 이름을
     * 괄호로 함께 적어 **고정점**을 남긴다(파일 머리말의 같은 이유).
     * https://developers.facebook.com/docs/facebook-login/security
     */
    clientIdLabel: '앱 ID (client_id)',
    secretLabel: '앱 시크릿 코드 (client_secret)',
    secretRecovery:
      '저장된 시크릿은 여기서 다시 볼 수 없어요. 값을 잃어버렸다면 Meta for Developers 의 앱 설정에서 앱 시크릿을 재설정한 뒤 새 값을 넣으세요.',
    hasNativeAppKey: false,
    hasIosUrlScheme: false,
  },
  line: {
    clientIdLabel: 'Channel ID (client_id)',
    secretLabel: 'Channel secret (client_secret)',
    secretRecovery:
      '저장된 시크릿은 여기서 다시 볼 수 없어요. 값을 잃어버렸다면 LINE Developers Console 의 Basic settings 에서 Channel secret 을 재발급한 뒤 새 값을 넣으세요.',
    hasNativeAppKey: false,
    hasIosUrlScheme: false,
  },
};

function providerMeta(id: OAuthProviderId): ProviderMeta {
  return OAUTH_PROVIDER_META[id];
}

/**
 * 이 문자열이 우리가 아는 제공자 id 인가 — **주소창에서 온 값**을 좁히는 유일한 관문이다
 * (/settings/oauth/:provider).
 *
 * 판정을 메타 표에서 **파생**한다. 목록을 따로 적어 두면 제공자가 늘 때 그 목록만 낡고,
 * 낡은 순간 실재하는 제공자가 '없는 제공자' 로 거절된다 — 그리고 아무도 눈치채지 못한다.
 */
export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return Object.hasOwn(OAUTH_PROVIDER_META, value);
}

export function providerLabel(id: OAuthProviderId): string {
  return providerMeta(id).label;
}

/** 카드 제목 — '구글 로그인' 처럼 운영자가 부르는 이름 */
export function providerTitle(id: OAuthProviderId): string {
  return providerMeta(id).title;
}

/** 이 제공자의 자격증명이 어떤 모양인가 — 화면이 그릴 입력칸이 여기서 갈린다 */
export function providerCredentialKind(id: OAuthProviderId): CredentialKind {
  return providerMeta(id).credentialKind;
}

/** Redirect URI 필드에 붙일, 제공자 콘솔이 쓰는 이름 */
export function providerRedirectLabel(id: OAuthProviderId): string {
  return providerMeta(id).redirectLabel;
}

/** 이 제공자만의 Redirect URI 규칙 한 줄 — 없으면 null */
export function providerRedirectNote(id: OAuthProviderId): string | null {
  return providerMeta(id).redirectNote;
}

/** 이 제공자의 자격증명을 어디서 발급받는지 (콘솔 경로) */
export function providerConsoleHint(id: OAuthProviderId): string {
  return providerMeta(id).consoleHint;
}

/** 자격증명이 아닌 콘솔 쪽 준비물 — 없으면 null */
export function providerConsoleNotice(id: OAuthProviderId): string | null {
  return providerMeta(id).consoleNotice;
}

/** Client ID 필드에 붙일, 제공자 콘솔이 쓰는 이름 */
export function providerClientIdLabel(id: ClientSecretProviderId): string {
  return CLIENT_SECRET_META[id].clientIdLabel;
}

/** Client Secret 필드에 붙일 이름 — 한국어 라벨 + API 이름(client_secret) */
export function providerSecretLabel(id: ClientSecretProviderId): string {
  return CLIENT_SECRET_META[id].secretLabel;
}

/** 저장된 시크릿을 잃어버렸을 때의 복구 경로 — Google 은 '재발급' 뿐이다 */
export function providerSecretRecovery(id: ClientSecretProviderId): string {
  return CLIENT_SECRET_META[id].secretRecovery;
}

/** 네이티브 앱 키 입력을 두는가 (카카오만) */
export function providerHasNativeAppKey(id: ClientSecretProviderId): boolean {
  return CLIENT_SECRET_META[id].hasNativeAppKey;
}

/** iOS URL 스키마를 파생해 보여주는가 (Google 만) */
export function providerHasIosUrlScheme(id: ClientSecretProviderId): boolean {
  return CLIENT_SECRET_META[id].hasIosUrlScheme;
}

export const CLIENT_ID_MAX = 200;
export const CLIENT_SECRET_MAX = 200;
export const NATIVE_APP_KEY_MAX = 200;
/** Apple 의 공개 식별자들(Services ID·Team ID·Key ID) — 폭주 방지용 상한일 뿐이다 */
export const APPLE_ID_MAX = 200;
/** 업로드한 `.p8` 파일 이름 — 값이 아니라 '무엇을 올렸는지' 를 사람이 알아보는 꼬리표다 */
export const PRIVATE_KEY_FILE_NAME_MAX = 260;

/**
 * Google Client ID 의 문서화된 접미어. **접미어만** 본다 —
 * 앞부분의 모양(숫자만 / 숫자-해시)은 보장된 적이 없다.
 */
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

/**
 * Apple 이 문서에 명시한 Team ID · Key ID 의 길이(10자).
 * **막지 않고 경고만 한다** — 파일 머리말의 형식 정책과 같다.
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
const APPLE_ID_LENGTH = 10;

/** Apple 개인키 파일의 확장자 — 콘솔이 `.p8` 하나만 내려 준다 */
export const APPLE_PRIVATE_KEY_EXTENSION = '.p8';

/**
 * iOS URL 스키마 — **입력받지 않고 Client ID 에서 파생한다.**
 *
 * Google 이 iOS 앱에 요구하는 커스텀 스키마는 '역순 클라이언트 ID(reversed client ID)' 로
 * 정의돼 있다: `<id>.apps.googleusercontent.com` → `com.googleusercontent.apps.<id>`.
 *
 * [왜 자유 입력 필드를 두지 않는가] 자유 입력이면 운영자가 오타를 내거나 예전 값을 남겨 둘 수 있고,
 * 그러면 **Client ID 와 조용히 어긋난다** — 어긋난 순간 iOS 로그인만 실패하고, 그 실패는 이 화면
 * 어디에도 드러나지 않는다. 파생값은 어긋날 수 없다.
 *
 * 접미어가 맞지 않으면 null — 파생할 근거가 없다는 뜻이고, 화면은 '먼저 Client ID 를 넣으세요' 를 말한다.
 */
export function iosUrlScheme(clientId: string): string | null {
  const trimmed = clientId.trim();
  if (!trimmed.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) return null;

  const bare = trimmed.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length);
  if (bare === '') return null;

  return `com.googleusercontent.apps.${bare}`;
}

/**
 * 자격증명 형식에 대한 **경고** — 저장을 막지 않는다.
 *
 * 형식은 제공자가 언제든 바꿀 수 있고 문서화되지 않은 것도 많다(파일 머리말). 그래서 여기서
 * 나오는 문장은 '틀렸다' 가 아니라 '평소와 다르게 보인다' 이며, 저장 버튼을 잠그지 않는다.
 */
export function clientIdFormatWarning(id: ClientSecretProviderId, clientId: string): string | null {
  const trimmed = clientId.trim();
  if (trimmed === '') return null;
  // Google 접미어는 스키마가 **막는다**(문서화된 규약) — 경고로 중복해 말하지 않는다
  if (id === 'google') return null;

  if (trimmed.includes(' ')) return '값에 공백이 있어요. 붙여넣기할 때 앞뒤가 잘렸는지 확인하세요.';
  return null;
}

/**
 * Apple Team ID · Key ID 가 **평소와 다른 길이**일 때의 경고 — 저장을 막지 않는다.
 * 문서는 10자라고 적지만(APPLE_ID_LENGTH), 자릿수 규약이 바뀌면 멀쩡한 값을 거절하게 된다.
 */
export function appleIdLengthWarning(value: string, fieldLabel: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length === APPLE_ID_LENGTH) return null;

  return `${fieldLabel}는 보통 ${String(APPLE_ID_LENGTH)}자예요. 앞뒤가 잘리지 않았는지 확인하세요.`;
}

/** oob(복사·붙여넣기) 흐름 — 2023-01-31 로 **완전히 종료**됐다. 지금 등록하면 로그인이 실패한다 */
const OOB_REDIRECT_URIS: readonly string[] = [
  'urn:ietf:wg:oauth:2.0:oob',
  'urn:ietf:wg:oauth:2.0:oob:auto',
  'oob',
];

/** 로컬 개발 호스트 — 제공자들이 http 와 IP 를 예외로 허용하는 유일한 대상 */
const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]'];

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * 경로 이동(`/..`)을 **원문에서** 찾는다.
 *
 * `new URL()` 은 `/a/../b` 를 `/b` 로 **정규화해 버린다** — 파싱한 뒤에 보면 이미 사라지고 없다.
 * 그래서 반드시 원문을 본다. 퍼센트 인코딩된 점(`%2e`)도 같은 이유로 막는다:
 * 우리 쪽 정규화와 제공자 쪽 정규화가 달라지면 '정확히 일치' 가 성립하지 않는다.
 */
function hasPathTraversal(raw: string): boolean {
  if (raw.toLowerCase().includes('%2e')) return true;

  const schemeEnd = raw.indexOf('//');
  const afterScheme = schemeEnd < 0 ? raw : raw.slice(schemeEnd + 2);
  // 첫 조각은 호스트다 — 경로 조각만 봐도 충분하다
  return afterScheme.split(/[/?#]/).includes('..');
}

/** redirectUriError 의 선택 규칙 — 넘기지 않으면 로컬 예외를 허용한다(제공자 다수의 규칙) */
interface RedirectUriOptions {
  /**
   * localhost·127.0.0.1·[::1] 를 허용하는가.
   *
   * Apple 만 false 로 넘긴다 — 문서가 https 와 도메인 이름을 요구하고 IP·localhost 를
   * 한 문장으로 금지한다(OAUTH_PROVIDER_META.apple 의 주석에 원문).
   */
  readonly allowLocalhost?: boolean;
}

/**
 * Redirect URI 검증 — 제공자가 실제로 거는 규칙을 그대로 건다.
 *
 * - **oob 금지** — `urn:ietf:wg:oauth:2.0:oob` 흐름은 2023-01-31 로 종료됐다
 * - **와일드카드(`*`) 금지** — 매칭은 패턴이 아니라 문자열 일치다
 * - **절대 URL** 이어야 한다(상대 경로는 제공자가 거절한다)
 * - **fragment(#) 금지** — 인가 코드가 그 자리에 붙는다
 * - **userinfo(`user:pass@`) 금지**
 * - **경로 이동(`/..`) 금지** — 정규화 전후가 달라 '정확히 일치' 가 깨진다
 * - **날 IP 금지** (localhost · 127.0.0.1 · [::1] 만 예외 — Apple 은 그 예외도 없다)
 * - **https** 여야 한다. 예외는 위 로컬 호스트뿐이다 — http 운영 주소는 인가 코드가 평문으로 흐른다.
 *
 * ┌ 정규화하지 않는다 ────────────────────────────────────────────────────────┐
 * │ 제공자의 매칭은 **대소문자와 끝 슬래시까지 포함한 정확한 문자열 일치**다.        │
 * │ Meta 는 Strict Mode 에서 쿼리 파라미터까지 정확히 일치할 것을 요구한다           │
 * │ (state 만 예외) — https://developers.facebook.com/docs/facebook-login/security │
 * │ 그래서 '친절하게' 끝 슬래시를 떼거나 소문자로 바꾸면 **오히려 로그인이 깨진다** — │
 * │ 콘솔에 등록된 값과 한 글자라도 달라지는 순간 제공자가 거절한다.                  │
 * │ 이 함수는 판정만 하고 값은 **손대지 않는다**.                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 이걸 저장 시점에 막지 않으면 실패는 로그인 순간에, 사용자 앞에서 난다.
 */
export function redirectUriError(value: string, options: RedirectUriOptions = {}): string | null {
  const { allowLocalhost = true } = options;
  const trimmed = value.trim();
  if (trimmed === '') return 'Redirect URI를 입력하세요.';

  if (OOB_REDIRECT_URIS.includes(trimmed.toLowerCase())) {
    return 'oob(복사·붙여넣기) 방식은 2023년 1월 31일로 완전히 종료됐어요. https로 시작하는 실제 주소를 등록하세요.';
  }

  if (trimmed.includes('*')) {
    return 'Redirect URI에는 와일드카드(*)를 쓸 수 없어요. 쓸 주소를 하나씩 정확히 등록해야 해요.';
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Redirect URI는 https:// 로 시작하는 전체 주소여야 해요.';
  }

  if (url.hash !== '') return 'Redirect URI에는 # 이후 값을 넣을 수 없어요.';

  if (url.username !== '' || url.password !== '') {
    return 'Redirect URI에 로그인 정보(user:password@)를 넣을 수 없어요.';
  }

  if (hasPathTraversal(trimmed)) {
    return "Redirect URI에 상위 경로 이동('/..')을 넣을 수 없어요. 최종 주소를 그대로 적으세요.";
  }

  const isLocal = LOCAL_HOSTS.includes(url.hostname);
  const isRawIp = IPV4_RE.test(url.hostname) || url.hostname.startsWith('[');

  // Apple 은 로컬 예외가 없다 — localhost 도 IP 도 문서가 한 문장으로 금지한다
  if (!allowLocalhost && (isLocal || isRawIp)) {
    return 'Apple은 Return URL에 localhost나 IP 주소를 허용하지 않아요. 실제 도메인이 있는 https 주소를 등록하세요.';
  }

  if (isRawIp && !isLocal) {
    return 'Redirect URI 호스트에는 IP 주소를 쓸 수 없어요. 도메인을 등록하세요. (localhost만 예외예요)';
  }

  if (url.protocol === 'https:') return null;
  if (url.protocol === 'http:' && isLocal && allowLocalhost) return null;

  return 'Redirect URI는 https:// 여야 해요. (http는 localhost에서만 허용돼요)';
}

/* ── 자격증명 스키마 — provider 를 판별자로 갈라 둔다(파일 머리말) ──────────── */

/** 모든 제공자가 공유하는 것 — 켜짐과 돌아올 주소뿐이다 */
const providerBase = {
  enabled: z.boolean(),
  redirectUri: z.string(),
} as const;

const clientSecretProviderSchema = z.object({
  ...providerBase,
  provider: z.enum(CLIENT_SECRET_PROVIDERS),
  clientId: z.string(),
  /** 새로 넣을 시크릿. 빈 문자열 = 기존 유지 */
  secret: z.string(),
  /** 저장된 시크릿이 있는가 — 서버가 알려준 사실이지 입력이 아니다 */
  hasSecret: z.boolean(),
  /**
   * 네이티브 앱 키 — **카카오만 쓴다**(providerHasNativeAppKey).
   *
   * 시크릿이 아니다: 모바일 앱에 심겨 배포되므로 애초에 비밀이 될 수 없다. 그래서 평문으로
   * 왕복하고 마스킹하지 않는다 — 비밀이 아닌 값을 비밀처럼 다루면 진짜 비밀의 취급이 헐거워진다.
   * 다른 제공자에서는 빈 문자열로 남고 화면에 렌더되지 않는다.
   */
  nativeAppKey: z.string(),
});

/**
 * Apple — 정적 시크릿이 없는 유일한 제공자.
 *
 * 네 값이 모두 있어야 서버가 client_secret(JWT)을 서명할 수 있다:
 *   servicesId → JWT `sub` 이자 `client_id`
 *   teamId     → JWT `iss`
 *   keyId      → JWT 헤더 `kid`
 *   .p8 개인키 → ES256 서명 키 (**우리가 보관하되 화면으로 돌려보내지 않는다**)
 */
const appleProviderSchema = z.object({
  ...providerBase,
  provider: z.literal('apple'),
  /** Services ID — 콘솔이 요구하는 reverse-DNS 문자열. 비밀이 아니다 */
  servicesId: z.string(),
  /** Team ID — 개발자 계정 식별자. 비밀이 아니다 */
  teamId: z.string(),
  /** Key ID — `.p8` 키의 식별자. 비밀이 아니다 */
  keyId: z.string(),
  /**
   * **새로 고른** `.p8` 파일의 이름. 빈 문자열 = 새로 고르지 않음(기존 키 유지).
   * `secret` 과 정확히 같은 규칙이다 — 다만 여기 실리는 것은 이름뿐이고
   * **파일 내용은 폼 상태에 들어오지 않는다**.
   */
  privateKeyFileName: z.string(),
  /** 저장된 개인키가 있는가 — 서버가 알려준 사실이지 입력이 아니다 */
  hasPrivateKey: z.boolean(),
});

/**
 * [discriminatedUnion 이 아니라 union 인 이유] 판별자 `provider` 의 값이 한쪽은 **다섯 개**라
 * (enum) 판별자 표를 만드는 방식과 잘 맞지 않는다. 게다가 사람이 읽을 메시지는 전부 아래
 * `.check()` 가 만들고 멤버 스키마는 **모양만** 본다 — 합집합 분기 실패 메시지를 쓸 일이 없다.
 * TypeScript 쪽에서는 provider 리터럴이 서로 겹치지 않으므로 그대로 판별 합집합으로 좁혀진다.
 */
const providerSchema = z.union([clientSecretProviderSchema, appleProviderSchema]);

/**
 * 표시 정책 — **자격증명이 아니다.**
 *
 * `kakaoTalkInAppLoginOnly` 는 카카오가 주는 값이 아니라 **우리 로그인 화면의 정책**이다:
 * 카카오톡 인앱 브라우저 안에서는 다른 소셜 버튼을 숨기고 카카오 로그인만 보여준다
 * (인앱 브라우저는 구글 로그인 등을 차단하므로, 눌러도 안 되는 버튼을 보여주지 않는다).
 *
 * 그래서 providers[] 안이 아니라 **여기 따로** 산다 — 자격증명 옆에 두면 언젠가 카카오 콘솔에서
 * 찾아야 하는 값으로 오해받는다.
 */
const displaySchema = z.object({
  kakaoTalkInAppLoginOnly: z.boolean(),
});

/**
 * 제공자 한 명의 검증 문제 — **필드 이름과 문구만** 담는다.
 * 경로(`providers.3.clientId`)는 부르는 스키마가 붙인다 — 규칙은 자기가 어느 문서의 몇 번째에
 * 실려 있는지 알 필요가 없다.
 */
export interface ProviderIssue {
  readonly field: string;
  readonly message: string;
}

/**
 * 켜진 제공자 하나를 검증한다 — **자격증명 규칙의 정본**이다.
 *
 * 화면이 목록(/settings/oauth)과 상세(/settings/oauth/:provider)로 갈렸으므로 스키마도 셋이 됐다
 * (문서 전체 · 목록 · 제공자 하나). 셋 다 이 함수를 부른다 — 규칙을 복제하면 언젠가 목록에서
 * 통과한 값이 상세에서 막히고, 어느 쪽이 진짜인지 아무도 답하지 못한다.
 *
 * 꺼진 제공자는 검증하지 않는다 — 쓰지 않을 값을 채우라고 요구하지 않는다.
 */
export function providerIssues(provider: OAuthProviderValues): readonly ProviderIssue[] {
  if (!provider.enabled) return [];

  const issues: ProviderIssue[] = [];
  const label = providerLabel(provider.provider);

  /** 필드 하나의 필수·상한을 같은 모양으로 본다 — 갈래마다 다시 쓰면 문구가 어긋난다 */
  const checkText = (field: string, value: string, fieldLabel: string, max: number): void => {
    const trimmed = value.trim();
    if (trimmed === '') {
      issues.push({ field, message: `${label} ${fieldLabel}를 입력하세요.` });
      return;
    }
    if (trimmed.length > max) {
      issues.push({ field, message: `${fieldLabel}는 ${String(max)}자를 넘을 수 없어요.` });
    }
  };

  if (provider.provider === 'apple') {
    /* ── Apple — 시크릿 한 칸이 아니라 서명 재료 넷이다(파일 머리말) ────── */
    checkText('servicesId', provider.servicesId, 'Services ID', APPLE_ID_MAX);
    checkText('teamId', provider.teamId, 'Team ID', APPLE_ID_MAX);
    checkText('keyId', provider.keyId, 'Key ID', APPLE_ID_MAX);

    // 저장된 키도, 새로 고른 파일도 없으면 서버가 client_secret 을 서명할 수 없다.
    // **내용은 검사하지 않는다** — 우리는 파일 이름만 안다(내용은 화면에 오지 않는다).
    if (!provider.hasPrivateKey && provider.privateKeyFileName.trim() === '') {
      issues.push({
        field: 'privateKeyFileName',
        message: `${label} 로그인을 켜려면 .p8 개인키 파일을 올려야 해요.`,
      });
    } else if (provider.privateKeyFileName.trim().length > PRIVATE_KEY_FILE_NAME_MAX) {
      issues.push({
        field: 'privateKeyFileName',
        message: `파일 이름은 ${String(PRIVATE_KEY_FILE_NAME_MAX)}자를 넘을 수 없어요.`,
      });
    }
  } else {
    const clientIdLabel = providerClientIdLabel(provider.provider);
    const secretLabel = providerSecretLabel(provider.provider);
    const clientId = provider.clientId.trim();

    if (clientId === '') {
      issues.push({ field: 'clientId', message: `${label} ${clientIdLabel}를 입력하세요.` });
    } else if (clientId.length > CLIENT_ID_MAX) {
      issues.push({
        field: 'clientId',
        message: `${clientIdLabel}는 ${String(CLIENT_ID_MAX)}자를 넘을 수 없어요.`,
      });
    } else if (provider.provider === 'google' && !clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
      // 접미어만 본다 — 앞부분의 모양은 보장된 적이 없다(파일 머리말)
      issues.push({
        field: 'clientId',
        message: `구글 클라이언트 ID는 '${GOOGLE_CLIENT_ID_SUFFIX}' 로 끝나야 해요.`,
      });
    }

    // 켜는데 시크릿이 아예 없으면(저장된 것도, 새로 넣은 것도) 인증이 성립하지 않는다.
    // **길이 상한만** 본다 — 접두어·문자셋은 검사하지 않는다(파일 머리말).
    if (!provider.hasSecret && provider.secret.trim() === '') {
      issues.push({ field: 'secret', message: `${label} ${secretLabel}를 입력하세요.` });
    } else if (provider.secret.trim().length > CLIENT_SECRET_MAX) {
      issues.push({
        field: 'secret',
        message: `${secretLabel}는 ${String(CLIENT_SECRET_MAX)}자를 넘을 수 없어요.`,
      });
    }

    // 네이티브 앱 키는 **선택**이다 — 웹 로그인만 쓰는 사이트는 필요하지 않다.
    // 길이 상한만 걸고 형식은 보지 않는다(문서화된 형식이 없다).
    if (provider.nativeAppKey.trim().length > NATIVE_APP_KEY_MAX) {
      issues.push({
        field: 'nativeAppKey',
        message: `네이티브 앱 키는 ${String(NATIVE_APP_KEY_MAX)}자를 넘을 수 없어요.`,
      });
    }
  }

  // Redirect URI 규칙은 제공자마다 한 군데만 다르다 — 로컬 예외를 주는가(Apple 은 아니다)
  const uriError = redirectUriError(provider.redirectUri, {
    allowLocalhost: providerMeta(provider.provider).allowsLocalRedirect,
  });
  if (uriError !== null) issues.push({ field: 'redirectUri', message: uriError });

  return issues;
}

/**
 * [교차 규칙] '카카오톡 인앱에서 카카오 로그인만 노출' 은 카카오 로그인이 켜져 있을 때만 뜻이 있다.
 * 카카오가 꺼진 채로 이 정책이 켜지면 인앱 브라우저 방문자에게는 **로그인 수단이 하나도 남지
 * 않는다** — 다른 소셜 버튼은 이 정책이 숨기고, 카카오 버튼은 제공자가 꺼져 있어 없다.
 * 두 값은 각자 보면 멀쩡하고 함께 볼 때만 틀리므로 필드가 아니라 문서 수준에서 잡는다.
 *
 * [화면이 갈려도 규칙은 성립한다] 카카오의 `enabled` 는 이제 다른 라우트(상세)에서 바뀌지만,
 * 두 화면이 **같은 문서 한 벌**을 읽으므로(oauthSettingsKey 캐시) 목록 화면의 폼에도 최신
 * `enabled` 가 실려 있다. 정책과 제공자를 함께 볼 수 있는 곳이 목록이고, 그래서 정책 카드도
 * 목록에 산다.
 */
function displayPolicyMessage(value: OAuthSettingsValues): string | null {
  if (!value.display.kakaoTalkInAppLoginOnly) return null;

  const kakao = value.providers.find((provider) => provider.provider === 'kakao');
  if (kakao !== undefined && kakao.enabled) return null;

  return '카카오 로그인이 꺼져 있어 이 정책을 켤 수 없어요. 켜면 카카오톡 인앱 브라우저 방문자에게 로그인 수단이 남지 않아요.';
}

/**
 * 세 스키마가 공유하는 문서 모양 — 검증 범위만 서로 다르다.
 *
 * 문서 **타입**은 이 검사 없는 스키마에서 뽑는다(`OAuthSettingsValues`). 검사를 얹은 스키마에서
 * 뽑으면 검사 콜백이 다시 그 타입을 참조해 순환이 생기고, TS 는 그때 조용히 any 로 무너진다.
 */
const oauthDocumentSchema = z.object({
  providers: z.array(providerSchema),
  display: displaySchema,
});

/**
 * 문서 전체 — 표시 정책 + 켜진 제공자 전부.
 * 저장 페이로드가 실제로 옳은지 보는 **최종 관문**이자 테스트가 겨누는 규칙 표면이다.
 */
export const oauthSettingsSchema = oauthDocumentSchema.check((ctx) => {
  const policyMessage = displayPolicyMessage(ctx.value);
  if (policyMessage !== null) {
    ctx.issues.push({
      code: 'custom',
      input: ctx.value.display.kakaoTalkInAppLoginOnly,
      path: ['display', 'kakaoTalkInAppLoginOnly'],
      message: policyMessage,
    });
  }

  ctx.value.providers.forEach((provider, index) => {
    for (const issue of providerIssues(provider)) {
      ctx.issues.push({
        code: 'custom',
        input: provider,
        path: ['providers', index, issue.field],
        message: issue.message,
      });
    }
  });
});

/**
 * 목록 화면(/settings/oauth)의 폼 — **표시 정책과 로그인 버튼 순서만** 바꿀 수 있다.
 *
 * 그래서 자격증명은 검증하지 않는다. 검증하면 다른 제공자의 오류가 이 화면을 막는데,
 * 그 오류를 **고칠 입력칸이 이 화면에 없다** — 저장 버튼이 이유 없이 죽은 것처럼 보인다.
 * 자격증명은 그것을 그리는 화면(상세)이 검증한다.
 */
export const oauthListSchema = oauthDocumentSchema.check((ctx) => {
  const policyMessage = displayPolicyMessage(ctx.value);
  if (policyMessage !== null) {
    ctx.issues.push({
      code: 'custom',
      input: ctx.value.display.kakaoTalkInAppLoginOnly,
      path: ['display', 'kakaoTalkInAppLoginOnly'],
      message: policyMessage,
    });
  }
});

/**
 * 상세 화면(/settings/oauth/:provider)의 폼 — **그 제공자 하나만** 검증한다.
 *
 * 폼은 문서 전체를 담지만(RHF 등록 경로 `providers.N.*` 를 그대로 쓰기 위해서다) 화면에 보이는
 * 것은 한 제공자뿐이다. 다른 제공자까지 검증하면 **보이지도 않고 고칠 수도 없는 오류**가 저장을
 * 막는다 — 그것이 '저장을 눌렀는데 아무 일도 안 난다' 의 정체다.
 * 표시 정책도 여기서는 보지 않는다: 이 화면은 정책을 그리지도, 저장하지도 않는다.
 */
export function oauthProviderScopedSchema(target: OAuthProviderId) {
  return oauthDocumentSchema.check((ctx) => {
    ctx.value.providers.forEach((provider, index) => {
      if (provider.provider !== target) return;
      for (const issue of providerIssues(provider)) {
        ctx.issues.push({
          code: 'custom',
          input: provider,
          path: ['providers', index, issue.field],
          message: issue.message,
        });
      }
    });
  });
}

export type OAuthSettingsValues = z.infer<typeof oauthDocumentSchema>;
export type OAuthProviderValues = OAuthSettingsValues['providers'][number];
export type ClientSecretProviderValues = Extract<
  OAuthProviderValues,
  { readonly provider: ClientSecretProviderId }
>;
export type AppleProviderValues = Extract<OAuthProviderValues, { readonly provider: 'apple' }>;

/** Apple 갈래인가 — 화면이 어떤 입력칸을 그릴지 이 판정으로 가른다 */
export function isAppleProvider(provider: OAuthProviderValues): provider is AppleProviderValues {
  return provider.provider === 'apple';
}

/** client_id/client_secret 갈래인가 */
export function isClientSecretProvider(
  provider: OAuthProviderValues,
): provider is ClientSecretProviderValues {
  return provider.provider !== 'apple';
}

/**
 * 이 제공자가 로그인에 **실제로 쓸 수 있는 상태**인가.
 *
 * 갈래마다 '다 갖췄다' 의 뜻이 다르다 — Apple 은 시크릿 하나가 아니라 서명 재료 넷이 필요하고,
 * 그중 `.p8` 은 저장돼 있어야 한다(방금 고른 파일은 아직 서버에 없다).
 *
 * 연동 목록(/settings/api-keys)이 '연동 완료' 를 판정할 때 이 함수를 쓴다. 판정을 그쪽에 복제하면
 * 두 화면이 서로 다른 답을 내놓는다 — 판정은 자격증명을 아는 이 파일이 소유한다.
 */
export function providerIsUsable(provider: OAuthProviderValues): boolean {
  if (!provider.enabled) return false;

  if (isAppleProvider(provider)) {
    return (
      provider.servicesId.trim() !== '' &&
      provider.teamId.trim() !== '' &&
      provider.keyId.trim() !== '' &&
      provider.hasPrivateKey
    );
  }

  return provider.clientId.trim() !== '' && provider.hasSecret;
}
