// AI 프로바이더 연동 상태 — **저장된 자격증명의 사실만 안다** (시스템 설정 섹션 소유)
//
// ┌ 이 파일이 **비밀** 값을 갖지 않는 이유 ────────────────────────────────────┐
// │ 여기에는 API 키의 **평문이 없다.** 어떤 필드가 저장돼 있는지(storedFields)와    │
// │ 사용 설정이 켜져 있는지(enabled)만 안다.                                     │
// │                                                                          │
// │ 이것은 ../_shared/secret.ts 가 선언한 섹션 규약을 그대로 따르는 것이다:        │
// │ **평문을 담을 자리를 만들지 않는 것이 방어다.** 자리가 있으면 언젠가 화면에      │
// │ 그려진다 — 목록에, devtools 에, 스크린샷에.                                  │
// │                                                                          │
// │ ⚠ **비밀이 아닌 칸은 다르다**(엔드포인트·배포명·리전·API 버전). 그것은 리소스   │
// │ 주소이지 자격증명이 아니고, 되읽지 못하면 폼이 쓸모없어진다. 그래서 값을 갖는    │
// │ 자리를 **따로** 둔다(AiConnectionRecord.publicValues) — 한 자루에 섞지 않는     │
// │ 것이 요점이다.                                                              │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 가짜 성공을 만들지 않는다 ─────────────────────────────────────────────────┐
// │ 저장되지도 않는데 '연동됨' 으로 보이게 하거나 저장 성공 배너를 띄우는 것은        │
// │ **금지다.** 그것이 이 화면에서 삭제된 renameApiKey 의 결함이었다 —              │
// │ 없는 id 를 조용히 지나치고 성공 토스트를 띄웠다(FS-069 §7.1).                  │
// │                                                                          │
// │ ✔ **이제 저장 경로가 있다** — /settings/api-keys/:providerId (BE-069 §7.5 #1  │
// │ 해소). 그래서 이 모듈의 규율이 더 중요해졌다: 저장이 **실제로 일어난 뒤에만**    │
// │ 상태가 바뀌고(./data-source.ts 가 문서를 갱신한다), 성공 토스트도 그때만 뜬다.   │
// │                                                                          │
// │ ⚠ 그래도 **검증(verify)은 여전히 시늉하지 않는다** — 아래 lastVerifiedAt 참고.  │
// └──────────────────────────────────────────────────────────────────────────┘

/**
 * 자격증명 필드의 종류 — 연동마다 요구하는 조합이 다르다(단일 키로 끝나지 않는 곳이 있다).
 *
 * [순서가 뜻을 갖는다] 저장 문서의 `storedSecrets` 를 이 순서로 정렬한다(../api-keys/data-source.ts)
 * — 같은 자격증명이 저장 순서에 따라 다른 배열로 남으면 충돌 비교가 흔들린다. 그러므로 **가운데에
 * 끼워 넣지 말고 뒤에 붙인다.**
 */
export const AI_CREDENTIAL_FIELDS = [
  'apiKey',
  /**
   * 프로바이더 기본 주소를 **갈아 끼우는** 값 — 비우면 클라이언트 기본값을 쓴다.
   *
   * ┌ 한때 선언만 있고 쓰는 항목이 0이었다 ─────────────────────────────────┐
   * │ 죽은 칸이었고, 죽은 칸은 '언젠가 쓰겠지' 라는 기대만 남긴다. 이제 모델      │
   * │ 4종이 전부 쓴다 — 근거는 **교체가 정상 사용법인 곳이 실재한다**는 것이다:   │
   * │   · xAI 공식 문서가 OpenAI 클라이언트에 `base_url="https://api.x.ai/v1"`  │
   * │     을 끼워 쓰라고 안내한다(docs.x.ai/docs/overview, 2026-07 확인).       │
   * │   · Gemini 는 OpenAI 호환 엔드포인트를 따로 연다                          │
   * │     (`https://generativelanguage.googleapis.com/v1beta/openai/`).        │
   * │ 프록시·게이트웨이·리전 대응도 이 한 칸으로 흡수된다 — 그것들을 위해 칸을    │
   * │ 따로 만들면 같은 값이 세 이름으로 불린다.                                │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  'baseUrl',
  'endpoint',
  'deployment',
  'apiVersion',
  'region',
  /**
   * AWS SigV4 서명 한 쌍 — **오늘 이 두 칸을 요구하는 카탈로그 항목은 0이다.**
   *
   * ┌ 그런데 왜 남아 있나 — 죽은 칸이 아니다 ────────────────────────────────┐
   * │ `baseUrl` 이 한때 그랬던 것처럼 '선언만 있고 쓰는 항목이 0' 으로 보이지만    │
   * │ 성격이 다르다. 이 둘은 **의도적으로 비워 둔 자리**이고 소비자가 실재한다:   │
   * │   · `CREDENTIAL_SECRECY` 가 Record 라 두 칸 모두 비밀 여부를 답해야 한다   │
   * │     (빠뜨리면 컴파일이 막힌다 — 아래 표).                                │
   * │   · `./validation.ts` 의 자격증명 스키마가 같은 키 집합을 갖고, 그 일치를   │
   * │     `api-keys.test.ts` 가 고정한다.                                     │
   * │   · `secretAccessKey` 는 `apiKey` 와 함께 **시크릿 판정의 정본 두 개**로   │
   * │     테스트가 못박고 있다(`api-keys.test.ts` — `['apiKey','secretAccessKey']`).│
   * │   · `accessKeyId` 는 CJ대한통운 항목이 **그 칸을 만들지 않는다**는 것을     │
   * │     지키는 부정 단언의 대상이다(같은 테스트). 지우면 그 단언이 양쪽 모두     │
   * │     참이 되어 아무것도 지키지 못하는 공허한 검사가 된다.                    │
   * │                                                                       │
   * │ 즉 '카탈로그 항목이 0' 은 화면이 이 칸을 **그리지 않는다**는 뜻이지         │
   * │ 표면이 죽었다는 뜻이 아니다. 필요해지면 카탈로그의 `credentials` 에 두 칸을 │
   * │ 더하는 것으로 끝나고, write-only 규칙은 위 비밀 판정에서 자동으로 따라온다. │
   * └───────────────────────────────────────────────────────────────────────┘
   */
  'accessKeyId',
  'secretAccessKey',
  /**
   * 계약 상대가 우리를 식별하는 번호 — CJ대한통운의 고객코드(주관고객번호)가 이 칸을 쓴다.
   *
   * **비밀이 아니다.** 이것은 인증 재료가 아니라 '어느 계약으로 부르는가' 를 가리키는 값이고,
   * 되읽을 수 없으면 폼이 쓸모없어진다(엔드포인트·배포명·리전과 같은 성격이다).
   */
  'customerCode',
  /* 아래 셋은 **뒤에 붙인 것**이다(위 '순서가 뜻을 갖는다' 절) — 가운데 끼우면 이미
   * 저장돼 있는 문서의 `storedSecrets` 정렬이 바뀌어 충돌 비교가 흔들린다. */
  /**
   * 어느 모델을 기본으로 부를 것인가 — **자유 입력이고 비밀이 아니다.**
   *
   * 카탈로그(선택지 목록)로 만들지 않는다. 근거는 ./integrations.ts 의 `defaultModelField`
   * 머리말에 있다(요약: 목록이 빠르게 낡고, 표시명과 API id 가 다르고, 키마다 보이는
   * 모델이 다르다). 검증도 막지 않고 **경고만** 한다(./validation.ts 의 modelIdWarning).
   */
  'defaultModel',
  /**
   * OpenAI 의 `OpenAI-Organization` 헤더 값. **비밀이 아니다** — 이 값만으로는 어떤 호출도
   * 인증되지 않는다(방증: Anthropic 은 `anthropic-organization-id` 를 **모든 응답 헤더에**
   * 실어 돌려준다 — 되돌려주는 값을 비밀이라 부를 수 없다).
   */
  'organizationId',
  /** OpenAI 의 `OpenAI-Project` 헤더 값. 위 조직 ID 와 같은 성격이다 */
  'projectId',
] as const;

export type AiCredentialFieldKey = (typeof AI_CREDENTIAL_FIELDS)[number];

/**
 * **비밀 여부의 정본** — 칸 이름 하나당 한 번만 답한다.
 *
 * ┌ 왜 카탈로그 항목이 아니라 여기인가 ───────────────────────────────────────┐
 * │ 직전 기준에서는 카탈로그가 항목마다 `secret` 을 적었다. 그러면 같은 칸이       │
 * │ 한 프로바이더에서는 비밀이고 다른 프로바이더에서는 공개일 수 있는 자리가       │
 * │ **구조적으로 열려 있다.** 그리고 그 갈라짐은 조용하지 않다:                   │
 * │   · 저장(applyCredentials)이 비밀 칸의 평문을 버리는 근거가 이 값이다 —       │
 * │     한 곳에서 공개로 적히면 **그 프로바이더에서만 평문이 문서에 남는다.**      │
 * │   · 폼(AiCredentialFields)이 마스크를 그릴지 입력칸을 그릴지도 이 값이 정한다. │
 * │ 즉 오탈자 하나가 '이 프로바이더에서만 키가 평문으로 남는다' 가 된다.           │
 * │                                                                         │
 * │ 그래서 **비밀 여부는 칸의 성질이지 프로바이더의 선택이 아니다.** 표를 여기      │
 * │ 두고, 카탈로그 항목에서는 `secret` 을 **적을 수 없게** 했다(AiCredentialField │
 * │ 에 그 칸이 없다). 갈라질 자리를 없애는 것이 갈라짐을 검사하는 것보다 낫다.     │
 * │                                                                         │
 * │ 반대로 라벨·필수·힌트는 프로바이더마다 정당하게 다르므로 카탈로그가 갖는다.     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * `Record` 라서 **칸을 더하면 여기도 반드시 답해야 한다** — 빠뜨리면 컴파일이 막힌다.
 * (기본값을 두면 새 칸이 조용히 '공개' 가 된다. 그 방향의 실수가 더 비싸다.)
 */
export const CREDENTIAL_SECRECY: Readonly<Record<AiCredentialFieldKey, boolean>> = {
  // 인증 재료 — 저장 후 다시 보여줄 수 없다
  apiKey: true,
  secretAccessKey: true,
  // 아래는 전부 '어디로·무엇으로 보내는가' 를 가리키는 값이다. 되읽지 못하면 폼이 쓸모없어진다.
  // (accessKeyId 는 서명에 평문으로 실려 나가는 식별자다 — 짝인 secretAccessKey 만 비밀이다.)
  accessKeyId: false,
  baseUrl: false,
  endpoint: false,
  deployment: false,
  apiVersion: false,
  region: false,
  customerCode: false,
  defaultModel: false,
  organizationId: false,
  projectId: false,
};

/** 이 칸은 비밀인가 — 판단은 위 표 하나가 한다(항목마다 다시 정하지 않는다) */
export function credentialIsSecret(key: AiCredentialFieldKey): boolean {
  return CREDENTIAL_SECRECY[key];
}

/**
 * 한 자격증명 입력 칸의 요구 사항.
 *
 * **타입이 요구를 드러내야 한다** — '어차피 API 키 하나면 되겠지' 로 폼을 만들면
 * Azure OpenAI·Amazon Bedrock 처럼 키 하나로 되지 않는 곳에서 저장은 되는데 호출이 실패하는,
 * 가장 진단하기 어려운 형태의 고장이 된다.
 *
 * ⚠ **`secret` 이 여기 없다.** 비밀 여부는 칸의 성질이라 위 `CREDENTIAL_SECRECY` 가 정본이고,
 * 이 타입에 자리를 두지 않는 것이 '항목마다 다르게 적는' 사고를 구조적으로 막는 방법이다.
 * 필요하면 `credentialIsSecret(field.key)` 로 묻는다.
 */
export interface AiCredentialField {
  readonly key: AiCredentialFieldKey;
  readonly label: string;
  /** 없으면 연동이 성립하지 않는가 */
  readonly required: boolean;
  readonly hint: string;
}

/**
 * 저장된 연동 하나 — **값이 아니라 사실의 집합**이다.
 *
 * `storedFields` 는 '어느 칸이 채워져 있는가' 만 말한다. 값은 여기 없다.
 */
export interface AiConnection {
  readonly providerId: string;
  /** 운영자가 이 프로바이더를 쓰겠다고 켰는가 */
  readonly enabled: boolean;
  /** 저장돼 있는 자격증명 칸들 — **평문은 담기지 않는다** */
  readonly storedFields: readonly AiCredentialFieldKey[];
  /**
   * 마지막으로 **실제 호출로** 연결을 확인한 시각. 확인한 적 없으면 null.
   *
   * [지금은 항상 null 이다] 연결 검증은 서버가 프로바이더를 실제로 한 번 불러 봐야 성립한다 —
   * 브라우저에서 부르면 키가 브라우저로 내려와야 하고, 그 순간 '평문을 저장하지 않는다' 가 거짓이 된다.
   * 그래서 **검증한 척하지 않는다.** connectedAt 을 설정 수정 시각으로 대신하지 않는 것과 같은 규율이다.
   */
  readonly lastVerifiedAt: string | null;
  /** 이 연동을 처음 붙인 시각 — 서버가 기록한다. 없으면 null */
  readonly connectedAt: string | null;
}

/**
 * 저장소에 **실제로 들어 있는** 한 건 — `AiConnection`(사실만 아는 뷰)의 원본이다.
 *
 * ┌ 왜 두 타입인가 — 되읽을 수 있는 값과 없는 값이 갈리기 때문이다 ────────────┐
 * │ `secret: true` 인 칸(API 키)은 **저장 후 다시 돌려주지 않는다**. 그래서 값이   │
 * │ 아니라 '저장돼 있다' 는 사실만 남는다(`storedSecrets`).                       │
 * │                                                                          │
 * │ 반면 `secret: false` 인 칸(엔드포인트·배포명·리전·API 버전)은 **비밀이 아니고**  │
 * │ 되읽을 수 있어야 한다 — 폼이 기존 값을 못 보여주면 운영자가 배포명을 매번 다시  │
 * │ 입력해야 하고, 한 글자 틀리면 호출이 404 가 난다(BE-069 §7.7.2 #2).           │
 * │                                                                          │
 * │ 두 값을 한 자루에 담지 않는 것이 이 타입의 요점이다: **비밀이 들어갈 자리가**   │
 * │ `publicValues` 에 **구조적으로 없다.**                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export interface AiConnectionRecord {
  readonly providerId: string;
  readonly enabled: boolean;
  /** 비밀이 아닌 칸의 **값** — 폼이 되읽는다. 빈 문자열은 '저장 안 됨' 이다 */
  readonly publicValues: Readonly<Partial<Record<AiCredentialFieldKey, string>>>;
  /** 저장된 **비밀** 칸의 이름들 — 값은 여기에도, 어디에도 없다 */
  readonly storedSecrets: readonly AiCredentialFieldKey[];
  readonly lastVerifiedAt: string | null;
  readonly connectedAt: string | null;
}

/**
 * 저장돼 있는 칸의 이름들 — 비밀이든 아니든 '채워져 있다' 는 사실로 합친다.
 *
 * 빈 문자열은 **저장되지 않은 것으로 센다**: 빈 값을 보낸 것과 보내지 않은 것을 구분하지 않는다
 * (프로바이더에 빈 문자열 헤더를 보내면 401 이 난다 — 그래서 애초에 저장하지 않는다).
 */
export function storedFieldsOf(record: AiConnectionRecord): readonly AiCredentialFieldKey[] {
  const filled = AI_CREDENTIAL_FIELDS.filter((key) => {
    const value = record.publicValues[key];
    return value !== undefined && value.trim() !== '';
  });

  return [...filled, ...record.storedSecrets];
}

/** 저장 문서 → 화면·판정이 쓰는 **사실만 아는 뷰**. 값은 넘어가지 않는다 */
export function toConnection(record: AiConnectionRecord): AiConnection {
  return {
    providerId: record.providerId,
    enabled: record.enabled,
    storedFields: storedFieldsOf(record),
    lastVerifiedAt: record.lastVerifiedAt,
    connectedAt: record.connectedAt,
  };
}

/**
 * 연동이 **성립하는가** — 켜져 있고, 필수 자격증명이 빠짐없이 저장돼 있어야 한다.
 *
 * 둘 중 하나만으로는 부족하다: 켜기만 하고 키가 없으면 호출이 401 이고,
 * 키만 있고 꺼져 있으면 운영자가 쓰지 않겠다고 정한 것이다.
 */
export function connectionIsUsable(
  required: readonly AiCredentialField[],
  connection: AiConnection | undefined,
): boolean {
  if (connection === undefined || !connection.enabled) return false;
  return required
    .filter((field) => field.required)
    .every((field) => connection.storedFields.includes(field.key));
}
