// AI 연동 자격증명 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// ┌ 비밀 칸을 폼에서 어떻게 다루는가 ──────────────────────────────────────────┐
// │ 폼의 비밀 칸은 **저장된 값이 아니라 "새로 넣을 값"** 이다.                     │
// │   빈 문자열  = 그대로 둔다(기존 값 유지)                                     │
// │   값이 있음  = 이 값으로 교체한다                                            │
// │                                                                          │
// │ 그래서 저장된 API 키는 폼에 **채워지지 않는다** — 채우면 DOM 에 평문이 살고,    │
// │ 그 순간 '마스킹' 은 눈속임이 된다. 화면은 저장 여부만 알고 `••••` 로 표시한다   │
// │ (../_shared/secret.ts). ../oauth 의 client secret 과 **같은 규약**이다.       │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 폼은 카탈로그에서 만들어진다 — 칸을 손으로 나열하지 않는다 ─────────────────┐
// │ 어떤 칸을 그릴지도, 무엇이 필수인지도 전부 `entry.credentials` 에서 나온다     │
// │ (./integrations.ts). 손으로 나열하면 **요구와 폼이 갈라지고**, 갈라진 순간      │
// │ Azure 는 저장은 되는데 호출이 404 가 난다 — 가장 진단하기 어려운 고장이다.      │
// │                                                                          │
// │ 그래서 이 파일에는 'Azure 는 배포명이 필요하다' 같은 문장이 **없다.** 그것은    │
// │ 카탈로그의 사실이고, 여기 다시 적으면 정본이 둘이 된다.                        │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 형식 검사를 어디까지 하는가 — '막는 것' 과 '알려 주는 것' 을 나눈다 ──────────┐
// │ **API 키의 길이·문자셋·접두어를 검사하지 않는다.** `sk-` 로 시작한다는 것은     │
// │ 관찰이지 규약이 아니고, 프로바이더가 키 형식을 바꾸는 날 멀쩡한 값이 거절된다.   │
// │ 카탈로그 전 항목에 그 위험이 있고 우리는 그중 어느 형식도 문서로 보장받지 못했다. │
// │                                                                          │
// │ 막는 것은 **비어 있음**과 **길이 폭주** 둘뿐이다. 그 외의 의심은 경고로만       │
// │ 말한다(endpointWarning) — ../oauth/validation.ts 가 세운 것과 같은 규율이다.   │
// │                                                                          │
// │ ✔ **모델 id 도 같은 규율을 따른다**(modelIdWarning). 여기서만은 유혹이 더 크다 —  │
// │ '모델 목록을 카탈로그에 박고 고르게 하면 오타가 없다' 는 것이다. 그런데 그 목록은  │
// │ 우리 배포 주기보다 빨리 낡고(예: claude-opus-4-1-20250805 는 2026-08-05 retire),  │
// │ **키마다 보이는 모델이 다르다.** 박아 둔 목록은 그날부터 멀쩡한 값을 거절한다.     │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 켜지 않은 연동은 검증하지 않는다 ──────────────────────────────────────────┐
// │ 끄는 것은 **언제나 허용한다** — 자격증명이 반쯤 채워져 있어도 끌 수 있어야 한다.  │
// │ 반대로 `enabled: true` 로 저장하려면 필수 칸이 다 와야 한다: 켜기와 자격증명을   │
// │ 분리해 받으면 '켰는데 안 된다' 가 생긴다(BE-069 §7.7.2 #4).                    │
// └──────────────────────────────────────────────────────────────────────────┘
import * as z from 'zod/mini';

import { AI_CREDENTIAL_FIELDS, credentialIsSecret } from './ai-connections';
import type { AiCredentialField, AiCredentialFieldKey } from './ai-connections';

/**
 * 길이 상한 — **형식이 아니라 폭주를 막는다.**
 *
 * 어떤 프로바이더도 이보다 긴 키를 쓰지 않지만, 그것이 이 숫자의 근거는 아니다: 근거는
 * '붙여넣기 사고로 문서 한 편이 들어오는 것을 막는다' 이다. 형식 판정으로 읽히면 안 된다.
 */
export const CREDENTIAL_VALUE_MAX = 500;

/**
 * 폼이 다루는 값 — 열두 칸을 모두 갖는다(안 쓰는 칸은 빈 문자열로 남는다).
 *
 * ⚠ 여기 적힌 칸 목록은 `AI_CREDENTIAL_FIELDS` 와 **같아야 한다.** zod/mini 에는 유니온에서
 * 객체 스키마를 만드는 표현이 없어 손으로 옮겨 적는다 — 어긋나면 그 칸의 폼 값이 스키마를 통과하지
 * 못하고, 고칠 입력칸이 없는 오류가 저장을 막는다. 테스트가 두 목록을 대조해 잡는다.
 */
const credentialsSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string(),
  endpoint: z.string(),
  deployment: z.string(),
  apiVersion: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  customerCode: z.string(),
  defaultModel: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
});

/**
 * 폼 문서 — 연동 하나.
 *
 * [왜 아홉 칸을 다 갖는가] RHF 의 등록 경로(`credentials.deployment`)가 정적이어야 하고,
 * 카탈로그가 요구하는 칸만 담으면 연동마다 폼 타입이 달라져 화면이 유니온 분기로 뒤덮인다.
 * **그리지 않는 칸은 빈 문자열로 남고 저장에서 빠진다**(../api-keys/data-source.ts 의
 * applyCredentials) — 화면에 없는 값이 저장되지 않는다는 사실은 그쪽이 보장한다.
 */
const connectionDocumentSchema = z.object({
  providerId: z.string(),
  enabled: z.boolean(),
  credentials: credentialsSchema,
  /** 저장된 비밀 칸들 — 서버가 알려준 **사실**이지 입력이 아니다 */
  storedSecrets: z.array(z.enum(AI_CREDENTIAL_FIELDS)),
});

export type AiConnectionFormValues = z.infer<typeof connectionDocumentSchema>;

/** 빈 폼 — 아직 조회가 끝나지 않았을 때의 기준선 */
export const EMPTY_CONNECTION_FORM: AiConnectionFormValues = {
  providerId: '',
  enabled: false,
  credentials: {
    apiKey: '',
    baseUrl: '',
    endpoint: '',
    deployment: '',
    apiVersion: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    customerCode: '',
    defaultModel: '',
    organizationId: '',
    projectId: '',
  },
  storedSecrets: [],
};

/**
 * 이 칸이 **채워져 있는가** — 비밀 칸은 '이미 저장돼 있음' 도 채워진 것으로 본다.
 *
 * 이 판정이 없으면 저장된 키가 있는 연동을 다시 저장할 때마다 키를 새로 입력하라고 요구한다 —
 * 그런데 우리는 그 키를 돌려줄 수 없으므로 운영자는 **콘솔에서 키를 재발급받아야 한다.**
 */
export function credentialFilled(
  field: AiCredentialField,
  values: AiConnectionFormValues,
): boolean {
  // 비밀 여부는 항목이 아니라 **칸 이름**이 정한다(./ai-connections.ts 의 CREDENTIAL_SECRECY)
  if (credentialIsSecret(field.key) && values.storedSecrets.includes(field.key)) return true;
  return values.credentials[field.key].trim() !== '';
}

/** 검증 문제 하나 — **칸 이름과 문구만** 담는다. 경로는 부르는 스키마가 붙인다 */
export interface CredentialIssue {
  readonly field: AiCredentialFieldKey;
  readonly message: string;
}

/**
 * 자격증명 검증의 **정본** — 카탈로그가 요구하는 칸을 그대로 본다.
 *
 * 꺼진 연동은 검증하지 않는다(파일 머리말) — 쓰지 않을 값을 채우라고 요구하지 않는다.
 */
export function credentialIssues(
  fields: readonly AiCredentialField[],
  values: AiConnectionFormValues,
): readonly CredentialIssue[] {
  const issues: CredentialIssue[] = [];

  for (const field of fields) {
    const raw = values.credentials[field.key].trim();

    // 길이는 켜짐과 무관하게 본다 — 꺼진 채로도 저장되는 값이라 폭주를 그대로 두면 안 된다
    if (raw.length > CREDENTIAL_VALUE_MAX) {
      issues.push({
        field: field.key,
        message: `${field.label}는 ${String(CREDENTIAL_VALUE_MAX)}자를 넘을 수 없어요.`,
      });
      continue;
    }

    if (!values.enabled || !field.required) continue;

    if (!credentialFilled(field, values)) {
      issues.push({
        field: field.key,
        message: credentialIsSecret(field.key)
          ? `연동을 켜려면 ${field.label}를 입력해야 해요.`
          : `연동을 켜려면 ${field.label}를 입력하세요.`,
      });
    }
  }

  return issues;
}

/**
 * 이 프로바이더의 자격증명 스키마 — **그리는 칸만** 검증한다.
 *
 * 폼은 열두 칸을 담지만 화면에 보이는 것은 카탈로그가 요구한 칸뿐이다. 보이지 않는 칸까지
 * 검증하면 **고칠 입력칸이 없는 오류**가 저장을 막는다 — 그것이 '저장을 눌렀는데 아무 일도
 * 안 난다' 의 정체다(../oauth/validation.ts 의 제공자 범위 스키마와 같은 이유).
 */
export function aiConnectionSchema(fields: readonly AiCredentialField[]) {
  return connectionDocumentSchema.check((ctx) => {
    for (const issue of credentialIssues(fields, ctx.value)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.credentials[issue.field],
        path: ['credentials', issue.field],
        message: issue.message,
      });
    }
  });
}

/**
 * 엔드포인트가 '평소와 다르다' 는 **경고** — 저장을 막지 않는다.
 *
 * ┌ 왜 막지 않는가 ──────────────────────────────────────────────────────┐
 * │ Azure 리소스 주소는 대개 `https://<리소스>.openai.azure.com` 이지만,     │
 * │ 사설 엔드포인트·프록시·국가 클라우드(예: .azure.us)를 쓰는 조직이 있다.    │
 * │ 막으면 **실재하는 구성이 거절된다** — 오타를 즉시 잡는 이득보다 대가가 크다.│
 * │ 그래서 '확인해 보라' 고만 말한다(../oauth 의 clientIdFormatWarning 선례). │
 * └──────────────────────────────────────────────────────────────────────┘
 */
export function endpointWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (!trimmed.startsWith('https://')) {
    return '엔드포인트는 보통 https:// 로 시작해요. 주소를 다시 확인해 보세요.';
  }
  if (trimmed.includes('/openai/deployments/')) {
    return '배포 경로까지 붙어 있어요. 리소스 주소(https://내리소스이름.openai.azure.com)까지만 넣고 배포명은 아래 칸에 넣으세요.';
  }
  return null;
}

/**
 * 베이스 URL 이 '평소와 다르다' 는 **경고** — 저장을 막지 않는다.
 *
 * ┌ 무엇을 되묻고 무엇을 되묻지 않는가 ─────────────────────────────────────┐
 * │ 되묻는 것은 **스킴 하나**다. 경로는 되묻지 않는다 — 이 칸에 들어오는        │
 * │ 정상값이 실제로 경로를 갖는다:                                          │
 * │   · xAI          `https://api.x.ai/v1`                                 │
 * │   · Gemini 호환  `https://generativelanguage.googleapis.com/v1beta/openai/` │
 * │ '/v1 이 붙어 있다' 를 오타로 잡으면 두 프로바이더의 **공식 사용법이 거절된다.**│
 * │                                                                       │
 * │ 사내 프록시가 http 로만 열려 있는 구성도 실재하므로 http 도 막지 않는다 —   │
 * │ 다만 키가 평문으로 나가는 구성이라 한 번 되묻는다.                        │
 * └───────────────────────────────────────────────────────────────────────┘
 */
export function baseUrlWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (trimmed.startsWith('http://')) {
    return '평문(http) 주소예요. 사내 프록시가 아니라면 https 주소인지 다시 확인해 보세요.';
  }
  if (!trimmed.startsWith('https://')) {
    return '베이스 URL 은 보통 https:// 로 시작해요. 주소를 다시 확인해 보세요.';
  }
  return null;
}

/**
 * 모델 id 가 '모델 id 같지 않다' 는 **경고** — 역시 저장을 막지 않는다.
 *
 * ┌ 왜 형식(정규식)으로 막지 않는가 — 이 파일 머리말의 규율 그대로다 ────────┐
 * │ `^gpt-`·`^claude-` 를 박으면 실재하는 id 가 거절된다: `o3` ·             │
 * │ `grok-build-0.1` · `veo-3.1-generate-preview` 가 전부 그 모양이 아니다.   │
 * │ 게다가 **키마다 보이는 모델이 다르다** — 어떤 목록도 전역으로는 정확할 수  │
 * │ 없다(./integrations.ts 의 defaultModelField 머리말).                     │
 * │                                                                        │
 * │ 그래서 막는 것은 폭주·공백뿐이고(credentialIssues), 여기서는 **가장 흔한   │
 * │ 두 가지 헛디딤**만 되묻는다:                                             │
 * │   ① 표시명을 붙여 넣었다 → 값 안에 공백이 있다('GPT-5.6 Sol' 같은 것)      │
 * │   ② 주소를 붙여 넣었다   → http 로 시작한다(그건 위 베이스 URL 칸이다)     │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function modelIdWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return '모델 id 가 아닌 것 같아요 — 주소는 위 베이스 URL 칸에 넣어요. 그대로 저장할 수는 있어요.';
  }
  if (/\s/.test(trimmed)) {
    return '모델 id 가 아닌 것 같아요 — 표시명이 아니라 API 가 받는 id 를 넣으세요(표시명 GPT-5.6 Sol → id gpt-5.6-sol). 그대로 저장할 수는 있어요.';
  }
  return null;
}

/**
 * 리전이 '평소와 다르다' 는 경고 — 역시 막지 않는다.
 *
 * AWS 는 리전 코드 목록을 계속 늘린다. 목록을 코드에 박아 두면 **새 리전이 열리는 날 멀쩡한
 * 값이 거절된다** — 우리 화면이 AWS 보다 늦게 갱신되기 때문이다. 모양만 본다.
 */
export function regionWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // us-east-1 · ap-northeast-2 처럼 '문자-문자-숫자' 꼴이 아니면 되묻는다
  return /^[a-z]{2,4}(-[a-z]+)+-\d+$/.test(trimmed)
    ? null
    : '리전 코드 형태가 아니에요(예: us-east-1). 엔드포인트 주소에 그대로 들어가는 값이에요.';
}

/**
 * 고객코드가 '평소와 다르다' 는 경고 — 역시 막지 않는다.
 *
 * ┌ 왜 8자리인가, 그리고 왜 그걸로 막지 않는가 ──────────────────────────────┐
 * │ CJ대한통운 기업고객 계약 후 발급되는 고객코드(주관고객번호)가 **숫자 8자리** │
 * │ 라는 것은 독립된 두 출처(카페24 지원 문서 · plto 연동 가이드)가 같이 말한다. │
 * │ 그래서 자릿수를 되물을 근거는 있다.                                       │
 * │                                                                        │
 * │ 그래도 막지 않는 이유는 이 화면의 다른 경고와 같다: 우리가 본 것은 **재판매  │
 * │ 솔루션의 안내**이지 CJ 의 1차 문서가 아니고, 계약 형태에 따라 다른 자릿수를   │
 * │ 받는 고객이 있을 수 있다. 막으면 실재하는 구성이 거절된다.                  │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function customerCodeWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  return /^\d{8}$/.test(trimmed)
    ? null
    : '고객코드는 보통 숫자 8자리예요(주관고객번호). 값을 다시 확인해 보세요.';
}
