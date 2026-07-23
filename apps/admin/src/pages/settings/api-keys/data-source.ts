// AI 연동 자격증명 저장소 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**)
//
// ┌ 이 파일이 생기면서 해소된 것 ──────────────────────────────────────────────┐
// │ **자격증명 저장 경로가 통째로 없었다**(BE-069 §7.5 #1) — `settingsPath` 가     │
// │ 전 항목 null 이라 '앱 설정' 버튼이 전부 비활성이었고, 그래서 저장된 연동이       │
// │ 0건이고 전 행이 연동 해제였다. 이제 저장이 실제로 일어난다.                     │
// │                                                                          │
// │ **그리고 저장만 일어난다.** 검증(verify)은 여전히 없다 — 그것은 서버가          │
// │ 프로바이더를 실제로 불러 봐야 성립하고, 브라우저가 부르면 키가 브라우저로        │
// │ 내려와야 한다(./ai-connections.ts 의 lastVerifiedAt). 그래서 이 저장소는        │
// │ **lastVerifiedAt 을 절대 채우지 않는다.**                                    │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 비밀은 여기까지도 오지 않는다 ─────────────────────────────────────────────┐
// │ 저장 요청에는 평문이 실리지만(그것이 유일한 자리다) **문서에는 실리지 않는다** — │
// │ applyCredentials 가 비밀 칸을 `storedSecrets` 라는 **이름의 목록**으로 바꾸고    │
// │ 평문을 버린다. 그래서 이 모듈이 들고 있는 문서를 통째로 출력해도 키는 없다.       │
// │                                                                          │
// │ 실제 백엔드에서는 이 자리가 해시/암호화 보관이 된다(BE-069 §7.7.2 #1) —        │
// │ 여기서는 **애초에 값을 버리는 것**으로 같은 성질을 얻는다.                      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [실패/충돌 재현] /settings/api-keys?fail=load · ?fail=save · ?fail=conflict
import { createRevisionedStore } from '../_shared/store';
import {
  AI_CREDENTIAL_FIELDS,
  connectionIsUsable,
  credentialIsSecret,
  toConnection,
} from './ai-connections';
import type { AiConnection, AiConnectionRecord, AiCredentialFieldKey } from './ai-connections';
import { integrationCatalogue, resolveIntegrations } from './integrations';
import type { Integration } from './integrations';
import { EMPTY_CONNECTION_FORM } from './validation';
import type { AiConnectionFormValues } from './validation';

export const aiConnectionsKey = ['settings', 'ai-connections'] as const;

/** 저장 문서 — 연동 하나가 배열의 한 항목이다 */
export interface AiConnectionsValues {
  readonly connections: readonly AiConnectionRecord[];
}

/**
 * 초기값 — **빈 목록이다.**
 *
 * 픽스처로 '연동된 것처럼' 채우지 않는다: 그러면 AI 화면의 응답 모드가 열리고, 열린 모드가
 * 아무 일도 하지 않는다. 이제 저장 경로가 있으므로 **운영자가 실제로 저장하면 열린다** —
 * 그것이 픽스처로 채우는 것과 결정적으로 다른 점이다.
 */
const DEFAULT_AI_CONNECTIONS: AiConnectionsValues = { connections: [] };

// TODO(backend): GET /api/settings/ai-connections (BE-069 EP-02)
//   응답: [{ providerId, enabled, storedFields[], lastVerifiedAt, connectedAt }]
//   **평문은 실리지 않는다.**
// TODO(backend): GET /api/settings/ai-connections/:providerId (BE-069 §7.7.2 #2)
//   상세 조회만 `secret: false` 인 칸의 **값**을 함께 준다(엔드포인트·배포명·리전·API 버전).
//   목록 응답에는 값이 없다 — '어떤 응답에 값이 있나' 를 한 줄로 답할 수 있게 성격을 가른다.
// TODO(backend): PUT /api/settings/ai-connections/:providerId (BE-069 EP-03)
//   요청: { enabled, credentials: Record<AiCredentialFieldKey, string> } + X-CSRF-Token
//   **요청에만 평문이 실리고 응답에는 실리지 않는다.** 요청 본문을 로깅하지 않는다.
//   부분 저장을 허용하지 않는다 — 연동 하나를 통째로 쓴다(그래서 PATCH 가 아니라 PUT 이다).
// TODO(backend): POST /api/settings/ai-connections/:providerId/verify (BE-069 EP-04)
//   **이 화면은 아직 부르지 않는다.** 프론트에서 검증 시늉을 내지 않는다.
//
//   ┌ 계약을 지금 적어 두는 이유 ─────────────────────────────────────────────┐
//   │ 2026-07 재조사에서 **무엇을 부를지가 확정됐다.** 네 곳 모두 '모델 목록'      │
//   │ 계열의 읽기 전용 엔드포인트를 갖는다:                                      │
//   │   · OpenAI    `GET /v1/models`                                          │
//   │   · Anthropic `GET /v1/models`                                          │
//   │   · Gemini    `GET /v1beta/models`                                      │
//   │   · xAI       `GET /v1/models` (그리고 `GET /v1/api-key` 가 키 이름·차단   │
//   │                여부까지 돌려준다 — 더 값싼 확인이다)                       │
//   │ 부작용이 없고, 과금이 없고, 실패가 곧 '이 키로는 안 된다' 를 뜻한다.         │
//   │ 계약을 지금 적어 두지 않으면 나중에 '검증' 이 채팅 한 번 보내기로 구현될 수   │
//   │ 있다 — 그것은 돈이 나가고 사이드이펙트가 있는 확인이다.                      │
//   └────────────────────────────────────────────────────────────────────────┘
//
//   요청: POST /api/settings/integrations/:id/verify + X-CSRF-Token (본문 없음)
//     → **키를 보내지 않는다.** 서버가 자기가 보관한 자격증명으로 부른다.
//   응답: { ok: boolean, checkedAt: string, reason: string | null }
//     · 이것이 전부다. 상대의 응답 본문·헤더·모델 목록을 그대로 흘리지 않는다.
//     · `ok === true` 일 때만 `lastVerifiedAt = checkedAt` 이 된다(프론트는 시각을 만들지 않는다).
//     · `reason` 은 **운영자가 고칠 수 있는 말**이어야 한다(401/403/네트워크 구분).
//   ⚠ 브라우저에서 직접 부르지 않는다 — 그러면 키가 브라우저로 내려와야 하고,
//     그 순간 '평문을 저장하지 않는다' 가 거짓이 된다(./ai-connections.ts 의 lastVerifiedAt).
//
// TODO(backend): GET /api/settings/integrations/:id/models
//   '기본 모델' 칸을 자유 입력 대신 **그 키로 실제로 보이는 목록**으로 도울 자리다.
//   응답: { models: string[] } — **id 문자열 배열만.** 키도, 상대 응답 원문도 넘어가지 않는다.
//   전역 카탈로그로 대신할 수 없는 이유는 ./integrations.ts 의 defaultModelField 머리말에 있다
//   (요약: 목록이 빠르게 낡고, 표시명과 id 가 다르고, **키마다 보이는 모델이 다르다**).
//   ⚠ 이 경로가 생겨도 **자유 입력을 없애지 않는다** — 목록에 없는 신모델을 넣어야 하는 날이 온다.
export const aiConnectionsStore = createRevisionedStore<AiConnectionsValues>(
  'api-keys',
  DEFAULT_AI_CONNECTIONS,
  { updatedBy: '김운영', updatedAt: '2026-07-05T02:10:00.000Z' },
);

/* ── 동기 조회 — 화면이 아니라 배선이 쓴다 ──────────────────────────────────
 *
 * 화면은 언제나 useSettingsQuery(fetch)를 쓴다. 아래 셋은 **AI 응답 모드 잠금 조회기**를 위한
 * 것이다: 그 계약이 동기라 Promise 를 돌려줄 수 없다(_shared/store.ts 의 peek 머리말). */

/** 저장된 연동 목록 — **사실만 아는 뷰**로 바꿔 돌려준다(값은 넘어가지 않는다) */
export function listAiConnections(): readonly AiConnection[] {
  return aiConnectionsStore.peek().value.connections.map(toConnection);
}

/** 이 프로바이더의 저장된 문서 — 없으면 undefined. **폼이 되읽을 값을 담고 있다** */
export function findAiConnectionRecord(providerId: string): AiConnectionRecord | undefined {
  return aiConnectionsStore
    .peek()
    .value.connections.find((connection) => connection.providerId === providerId);
}

/** 이 프로바이더의 저장된 연동(사실 뷰) — 없으면 undefined */
export function findAiConnection(providerId: string): AiConnection | undefined {
  const record = findAiConnectionRecord(providerId);
  return record === undefined ? undefined : toConnection(record);
}

/* ── 저장 문서 만들기 ────────────────────────────────────────────────────── */

/** 아직 저장된 적 없는 프로바이더의 빈 문서 — 폼의 기준선이다 */
export function emptyConnectionRecord(providerId: string): AiConnectionRecord {
  return {
    providerId,
    enabled: false,
    publicValues: {},
    storedSecrets: [],
    // 둘 다 서버가 기록하는 값이다 — 새 문서에는 아직 없다
    lastVerifiedAt: null,
    connectedAt: null,
  };
}

/** 폼이 넘기는 입력 — 여덟 칸 전부를 문자열로 갖는다(안 쓰는 칸은 빈 문자열) */
export type CredentialInput = Readonly<Partial<Record<AiCredentialFieldKey, string>>>;

/**
 * 입력한 자격증명을 문서에 반영한다 — **평문은 여기서 버려진다.**
 *
 * 칸의 성격에 따라 처리가 갈린다:
 *   · 비밀 칸  : 값이 있으면 `storedSecrets` 에 이름만 남기고 평문은 버린다.
 *                **비어 있으면 기존 값을 유지한다**(빈 문자열 = '그대로 둔다' — OAuth 와 같은 규약).
 *   · 공개 칸  : 값을 그대로 담는다. **빈 문자열이면 키 자체를 넣지 않는다.**
 *
 * ┌ 빈 값을 '저장' 하지 않는 이유 ────────────────────────────────────────┐
 * │ 선택 칸을 빈 문자열로 저장해 두면 호출부가 그것을 **보낼 값으로 읽는다** —  │
 * │ 빈 조직 헤더나 빈 api-version 을 실제로 보내면 프로바이더가 401/400 으로   │
 * │ 거절한다. '비어 있음' 과 '없음' 을 구분하지 않고 **없음으로 수렴시킨다.**   │
 * └──────────────────────────────────────────────────────────────────────┘
 */
export function applyCredentials(
  base: AiConnectionRecord,
  secretKeys: readonly AiCredentialFieldKey[],
  input: CredentialInput,
): AiConnectionRecord {
  const publicValues: Partial<Record<AiCredentialFieldKey, string>> = {};
  const storedSecrets = new Set<AiCredentialFieldKey>(base.storedSecrets);

  for (const key of AI_CREDENTIAL_FIELDS) {
    const raw = input[key];
    if (raw === undefined) continue;
    const value = raw.trim();

    if (secretKeys.includes(key)) {
      // 새 값을 넣었을 때만 바뀐다 — 비워 두면 기존 비밀이 유지된다
      if (value !== '') storedSecrets.add(key);
      continue;
    }

    // 공개 칸은 비우는 것도 뜻이 있다(선택 칸을 지운다) — 그때는 키를 남기지 않는다
    if (value !== '') publicValues[key] = value;
  }

  return {
    ...base,
    publicValues,
    // 카탈로그에 없는 칸이 예전에 저장돼 있었어도 순서를 고정해 문서가 흔들리지 않게 한다
    storedSecrets: AI_CREDENTIAL_FIELDS.filter((key) => storedSecrets.has(key)),
  };
}

/** 이 프로바이더가 요구하는 자격증명 — 카탈로그가 정본이다 */
function credentialsOf(providerId: string) {
  return integrationCatalogue().find((entry) => entry.id === providerId)?.credentials ?? [];
}

/**
 * 문서에 이 프로바이더의 새 상태를 끼워 넣는다 — **이 프로바이더 자리만** 바뀐다.
 *
 * OAuth 상세 화면의 `providerSavePayload` 와 같은 규약이다: 화면에 보이는 것이 이 프로바이더
 * 하나이므로 저장이 쓰는 것도 하나여야 한다. 나머지 연동은 **서버가 준 최신 문서 그대로**다 —
 * 보이지도 않는 값을 조용히 쓰는 '저장' 은 기능이 아니라 결함이다.
 */
export function connectionSavePayload(
  server: AiConnectionsValues,
  target: string,
  edited: AiConnectionRecord,
): AiConnectionsValues {
  const stamped = stampConnectedAt(
    server.connections.find((connection) => connection.providerId === target),
    edited,
  );

  const exists = server.connections.some((connection) => connection.providerId === target);

  return {
    connections: exists
      ? server.connections.map((connection) =>
          connection.providerId === target ? stamped : connection,
        )
      : [...server.connections, stamped],
  };
}

/**
 * `connectedAt` — **연동이 처음 성립한 순간**을 찍는다.
 *
 * ┌ 이것은 프론트가 시각을 지어내는 것이 아니다 ────────────────────────────┐
 * │ BE-069 §7.2.1 이 정의한 규칙 그대로다: 기록 시점은 **저장 시각이 아니라**   │
 * │ `disconnected → connected` 로 **처음 넘어간 순간**이고, 해제 후 재연동해도  │
 * │ 최초 값을 유지한다.                                                     │
 * │                                                                        │
 * │ 이 함수는 백엔드가 없는 동안 **서버 자리를 대신하는 픽스처 저장소**의 일부다 │
 * │ (_shared/store.ts 가 `updatedBy`·`updatedAt` 을 찍는 것과 같은 자리다).     │
 * │ 그래서 화면이 아니라 여기 있다 — **페이지는 시각을 만들지 않는다.**         │
 * │                                                                        │
 * │ ⚠ '설정을 마지막으로 고친 시각' 으로 대신하지 않는다. 그것은 다른 사실이고,  │
 * │ 옆에 '연동 시작일' 이라 적으면 거짓말이 된다(integrations.ts).             │
 * └────────────────────────────────────────────────────────────────────────┘
 */
function stampConnectedAt(
  before: AiConnectionRecord | undefined,
  next: AiConnectionRecord,
): AiConnectionRecord {
  // 이미 기록이 있으면 건드리지 않는다 — 재연동해도 최초 값을 유지한다
  if (next.connectedAt !== null) return next;

  const required = credentialsOf(next.providerId);
  const wasConnected = before !== undefined && connectionIsUsable(required, toConnection(before));
  const isConnected = connectionIsUsable(required, toConnection(next));

  if (wasConnected || !isConnected) return next;

  // TODO(backend): 서버가 세션·서버 시각으로 찍는다 — 프론트가 보내는 값을 신뢰하면 안 된다
  return { ...next, connectedAt: new Date().toISOString() };
}

/* ── 저장 문서 ↔ 폼 ──────────────────────────────────────────────────────── */

/**
 * 저장 문서 → 폼 값. **비밀 칸은 비운 채로** 온다.
 *
 * 되읽는 것은 `secret: false` 인 칸뿐이다(엔드포인트·배포명·리전·API 버전) — 그 값이 없으면
 * 운영자가 배포명을 매번 다시 입력해야 하고 한 글자 틀리면 호출이 404 가 난다.
 * 비밀 칸에 채울 값은 **우리도 갖고 있지 않다**: 저장 여부(`storedSecrets`)만 넘긴다.
 */
export function recordToForm(record: AiConnectionRecord): AiConnectionFormValues {
  const credentials = { ...EMPTY_CONNECTION_FORM.credentials };

  for (const key of AI_CREDENTIAL_FIELDS) {
    credentials[key] = record.publicValues[key] ?? '';
  }

  return {
    providerId: record.providerId,
    enabled: record.enabled,
    credentials,
    // RHF 은 폼 값을 제자리에서 바꾼다 — 저장 문서의 배열을 그대로 넘기면 그쪽이 오염된다
    storedSecrets: [...record.storedSecrets],
  };
}

/**
 * 폼 값 → 저장 문서. 평문은 여기서 마지막으로 존재하고 `applyCredentials` 가 버린다.
 *
 * ┌ `secretKeys` 의 정본이 어디인가 — 이 함수가 그 질문의 급소다 ─────────────┐
 * │ 이 목록에서 빠진 칸의 값은 **평문 그대로 `publicValues` 에 저장된다.**        │
 * │ 그래서 '어느 칸이 비밀인가' 가 항목마다 다르게 적힐 수 있으면, 오탈자 하나가   │
 * │ **그 프로바이더에서만 키가 평문으로 남는** 사고가 된다.                       │
 * │                                                                          │
 * │ 그래서 판단을 항목에서 뺐다: 비밀 여부는 **칸 이름 하나**가 갖는다             │
 * │ (./ai-connections.ts 의 CREDENTIAL_SECRECY). 카탈로그는 어떤 칸을 요구하는지  │
 * │ 만 말하고, 그 칸이 비밀인지는 말하지 않는다 — 말할 자리가 타입에 없다.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function formToRecord(
  base: AiConnectionRecord,
  values: AiConnectionFormValues,
): AiConnectionRecord {
  const secretKeys = credentialsOf(values.providerId)
    .map((field) => field.key)
    .filter(credentialIsSecret);

  return applyCredentials({ ...base, enabled: values.enabled }, secretKeys, values.credentials);
}

/* ── 해소된 상태 — 카탈로그 + 저장된 자격증명 ─────────────────────────────────
 *
 * [왜 integrations.ts 가 아니라 여기인가] 상태를 해소하려면 **저장소를 읽어야 한다.**
 * integrations.ts 가 저장소를 읽으면 data-source → integrations → data-source 순환이 된다
 * (이 파일은 `connectedAt` 판정에 카탈로그의 `required` 를 써야 한다). 그래서 순수한 쪽
 * (카탈로그·필터·집계)이 integrations.ts 에 남고, **저장소를 아는 쪽이 이 파일**이다. */

/** 저장소를 읽어 해소한다 — 목록 화면이 쓰는 진입점 */
export function currentIntegrations(): readonly Integration[] {
  return resolveIntegrations(listAiConnections());
}

/**
 * 공통 층이 읽는 프로바이더 상태 — **핵심 4종으로 좁혀서** 넘긴다.
 *
 * 카탈로그는 이보다 넓지만(파운데이션 모델 2종 + 배송 1종을 포함한다), 응답 모드 잠금이 그것들까지
 * 알 이유가 없다 — 특히 배송 연동은 AI 와 아무 관계가 없다. 유니온을 넓히면 소비자 쪽 분기가
 * 항목을 하나 더할 때마다 깨진다.
 *
 * [지금은 '모델' 분류와 같은 넷이다 — 그래도 파생시키지 않는다] 카탈로그가 좁아지면서 핵심 4종이
 * 마침 `category === 'model'` 인 항목 전부와 같아졌다. 그렇다고 분류에서 파생시키면, 분류에 모델
 * 하나를 더하는 순간 **AI 화면의 잠금 계약이 조용히 넓어진다**. 여기 적힌 넷은 그 화면이 아는
 * 유니온이지 이 카탈로그의 파생값이 아니다.
 *
 * ⚠ `enabled === true` 는 '**자격증명이 갖춰졌다**' 이지 '방금 호출해 확인했다' 가 아니다 —
 * 후자는 `lastVerifiedAt` 이고 그것은 서버만 채울 수 있다(./ai-connections.ts).
 */
export function aiProviderStatuses(): readonly {
  readonly id: 'openai' | 'claude' | 'gemini' | 'grok';
  readonly label: string;
  readonly enabled: boolean;
}[] {
  const resolved = currentIntegrations();
  const core = ['openai', 'claude', 'gemini', 'grok'] as const;

  return core.map((id) => {
    const integration = resolved.find((item) => item.id === id);
    return {
      id,
      label: integration?.name ?? id,
      // 저장된 자격증명이 없으면 false — fail-closed 다(없는 기능을 열어 두지 않는다)
      enabled: integration?.status === 'connected',
    };
  });
}
