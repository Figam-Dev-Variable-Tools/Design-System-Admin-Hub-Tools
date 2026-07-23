// 결제(PG) 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// ┌ 비밀을 폼에서 어떻게 다루는가 — OAuth 와 **똑같은 규칙**이다 ─────────────┐
// │ 폼의 `secretInputs[key]` 는 저장된 비밀이 아니라 **"새로 넣을 값"** 이다.     │
// │   빈 문자열 = 그대로 둔다(기존 값 유지)                                     │
// │   값이 있음 = 이 값으로 교체한다                                            │
// │                                                                          │
// │ 저장된 비밀은 폼에 **채워지지 않는다** — 채우면 DOM 에 평문이 살고, 그 순간   │
// │ '마스킹' 은 눈속임이 된다. 화면은 `storedSecrets` 에 이름이 있는지만 알고,    │
// │ 저장 여부는 `••••••••••••` 로 표시한다 (../_shared/secret.ts).              │
// │                                                                          │
// │ ⚠ 어떤 값이 비밀인지는 **이 파일이 정하지 않는다** — 카탈로그의             │
// │   `visibility` 가 정한다(shared/commerce/pg-catalog.ts). 이니시스 signkey ·  │
// │   KCP site_key 처럼 '키' 라는 이름 때문에 식별자로 오해되는 서명 재료가       │
// │   평문 칸으로 새어 나가지 않게 하려면 판정이 한 곳에만 있어야 한다.           │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 형식은 검사하지 않는다 — '막는 것' 과 '알려 주는 것' 을 나눈다 ─────────────┐
// │ 상점 ID·클라이언트 키·CID 의 길이·문자셋·접두어를 판정하지 않는다. PG 마다   │
// │ 다르고(`imp_…`·영문 8자·숫자 10자) 어느 형식도 문서로 보장받지 못했다 —      │
// │ 형식을 정규식으로 박아 두면 PG 사가 채번 규칙을 바꾸는 날 **멀쩡한 값이       │
// │ 거절된다.** 막는 것은 **비어 있음**과 **길이 폭주** 둘뿐이고, 나머지는       │
// │ 경고(warn)로만 말한다 (../oauth/validation.ts 가 세운 것과 같은 규율).       │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 스키마가 셋인 이유 ──────────────────────────────────────────────────────┐
// │ 화면이 목록(/settings/payment)과 상세(/settings/payment/:target)로 갈렸다.  │
// │   · 문서 전체   — 저장 페이로드의 최종 관문이자 테스트가 겨누는 표면          │
// │   · 목록        — 마스터 스위치와 안내 문구만. **자격증명을 검증하지 않는다** │
// │     : 그 오류를 고칠 입력칸이 목록에 없다. 검증하면 저장 버튼이 이유 없이     │
// │       죽은 것처럼 보인다(OAuth 가 같은 이유로 목록 스키마를 좁혔다).          │
// │       대신 화면이 **경고 + 상세로 가는 링크**로 말한다.                      │
// │   · 대상 하나   — 그 PG 의 자격증명·결제수단만                              │
// └──────────────────────────────────────────────────────────────────────────┘
import * as z from 'zod/mini';

import {
  connectionHasAnyValue,
  connectionHasSecret,
  connectionPublicValue,
  connectionTarget,
  emptyConnection,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_MODES,
  PG_CONTRACT_STATUSES,
  PG_TARGETS,
  pgLabel,
  pgMeta,
  unsupportedMethods,
} from '../../../shared/commerce/pg-catalog';
import type { PaymentMethod, PgConnection, PgTargetId } from '../../../shared/commerce/pg-catalog';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';

/** 자격증명 한 칸의 상한 — 형식 판정이 아니라 붙여넣기 사고(문서 한 편이 들어오는 것)를 막는 숫자다 */
export const PG_CREDENTIAL_MAX = 200;

/** 안내 문구 상한 — 상품 카드 아래 한 문단에 들어가는 길이다 */
export const INQUIRY_GUIDE_MAX = 200;

/* ── 폼이 다루는 값 ────────────────────────────────────────────────────────── */

/**
 * 폼의 연결 값 — **도메인의 `PgConnection` 을 그대로 쓰지 않는다.**
 *
 * 도메인 쪽은 `mode` 를 판별자로 갖는 합집합이라(pg-catalog.ts) 게이트웨이 갈래에는
 * `publicValues` 자체가 없다. 그 합집합을 RHF 에 그대로 담으면 `register` 의 경로가 갈래마다
 * 갈라져 화면이 '이 갈래에 이 칸이 있던가' 를 매번 되묻게 된다.
 *
 * 그래서 **폼은 평평하고 도메인은 갈라져 있다** — 경계에서 한 번만 변환한다(./types.ts).
 * 합집합의 값어치(타입이 '이 연결에 이 값이 있는가' 를 답한다)는 저장되는 쪽에 남고,
 * 입력의 편의는 폼 쪽에 남는다.
 */
const connectionFormSchema = z.object({
  /** 이 폼이 편집 중인 대상. 상세 화면에서는 라우트 파라미터가 정한다 */
  target: z.enum(PG_TARGETS),
  /** 공개 필드의 값 — 키는 `PgCredentialField.key` */
  publicValues: z.record(z.string(), z.string()),
  /** **새로 넣을** 비밀. 빈 문자열 = 기존 값 유지 */
  secretInputs: z.record(z.string(), z.string()),
  /** 저장된 비밀의 이름들 — 서버가 알려준 사실이지 입력이 아니다 */
  storedSecrets: z.array(z.string()),
});

/**
 * 세 스키마가 공유하는 문서 모양 — 검증 범위만 서로 다르다.
 *
 * 문서 **타입**은 이 검사 없는 스키마에서 뽑는다. 검사를 얹은 스키마에서 뽑으면 검사 콜백이
 * 다시 그 타입을 참조해 순환이 생기고, TS 는 그때 조용히 any 로 무너진다
 * (../oauth/validation.ts 가 같은 이유로 같은 구조를 쓴다).
 */
const paymentDocumentSchema = z.object({
  usePg: z.boolean(),
  connection: connectionFormSchema,
  mode: z.enum(PAYMENT_MODES),
  methods: z.array(z.enum(PAYMENT_METHODS)),
  contractStatus: z.enum(PG_CONTRACT_STATUSES),
  inquiryGuide: z.string(),
});

export type PaymentSettingsValues = z.infer<typeof paymentDocumentSchema>;
export type PgConnectionFormValues = PaymentSettingsValues['connection'];

/* ── 규칙의 정본 ───────────────────────────────────────────────────────────── */

/**
 * 검증 문제 한 건 — **필드 경로와 문구만** 담는다.
 * 규칙은 자기가 어느 화면에서 불리는지 알 필요가 없다.
 */
export interface PaymentIssue {
  /** RHF 경로 (`connection.publicValues.mid`) */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

/** 이 폼 값이 지금 들고 있는 값 — 저장된 것이든 새로 넣은 것이든 */
function publicValueOf(connection: PgConnectionFormValues, key: string): string {
  return connection.publicValues[key] ?? '';
}

function secretInputOf(connection: PgConnectionFormValues, key: string): string {
  return connection.secretInputs[key] ?? '';
}

/** 이 비밀이 저장돼 있거나, 지금 새로 넣는 중인가 */
function secretPresent(connection: PgConnectionFormValues, key: string): boolean {
  return connection.storedSecrets.includes(key) || secretInputOf(connection, key).trim() !== '';
}

/**
 * 자격증명 검증 — **이 화면의 규칙 정본**이다.
 *
 * `usePg` 가 필수 여부를 가른다: 꺼 둔 채로 미리 값을 넣어 두는 것은 정상적인 운영이고
 * (계약 전에 콘솔 값을 받아 적어 두는 일이 흔하다), 그때 빈 칸으로 저장을 막으면 아무것도
 * 저장할 수 없다. 켜져 있을 때만 '다 채웠는가' 를 묻는다 — OAuth 가 `enabled` 로 가르는 것과
 * 같은 판단이다.
 *
 * 길이 상한은 켜짐과 무관하게 본다 — 꺼진 채로도 저장되는 값이라 폭주를 그대로 두면 안 된다.
 */
export function credentialIssues(
  connection: PgConnectionFormValues,
  usePg: boolean,
): readonly PaymentIssue[] {
  const issues: PaymentIssue[] = [];
  const meta = pgMeta(connection.target);
  const label = meta.label;

  for (const field of meta.credentials) {
    if (field.visibility === 'secret') {
      const input = secretInputOf(connection, field.key).trim();

      if (usePg && field.required && !secretPresent(connection, field.key)) {
        issues.push({
          path: ['connection', 'secretInputs', field.key],
          message: `${label} ${field.label}를 입력하세요. 저장된 값이 없어요.`,
        });
      } else if (input.length > PG_CREDENTIAL_MAX) {
        issues.push({
          path: ['connection', 'secretInputs', field.key],
          message: `${field.label}는 ${String(PG_CREDENTIAL_MAX)}자를 넘을 수 없어요.`,
        });
      }
      continue;
    }

    const value = publicValueOf(connection, field.key).trim();

    if (usePg && field.required && value === '') {
      issues.push({
        path: ['connection', 'publicValues', field.key],
        message: `${label} ${field.label}를 입력하세요.`,
      });
    } else if (value.length > PG_CREDENTIAL_MAX) {
      issues.push({
        path: ['connection', 'publicValues', field.key],
        message: `${field.label}는 ${String(PG_CREDENTIAL_MAX)}자를 넘을 수 없어요.`,
      });
    }
  }

  return issues;
}

/**
 * 결제수단 검증 — 이 PG 가 실제로 띄울 수 있는 수단인가.
 *
 * 화면의 체크박스는 `supportedMethods` 에서 파생되므로 정상 경로로는 어긋날 수 없다. 그래도
 * 검증하는 이유: PG 를 바꾸면 앞 PG 에서 고른 수단이 폼에 남고, 그 상태로 저장되면 **체크는
 * 됐는데 결제창에 뜨지 않는** 상태가 조용히 만들어진다.
 */
export function methodIssues(
  target: PgTargetId,
  methods: readonly PaymentMethod[],
  usePg: boolean,
): readonly PaymentIssue[] {
  const issues: PaymentIssue[] = [];

  const unsupported = unsupportedMethods(target, methods);
  if (unsupported.length > 0) {
    const names = unsupported.map((method) => PAYMENT_METHOD_LABEL[method]).join(' · ');
    issues.push({
      path: ['methods'],
      message: `${pgLabel(target)}는 ${names}을(를) 지원하지 않아요. 체크를 풀어 주세요.`,
    });
    return issues;
  }

  // 결제수단이 하나도 없으면 결제창이 열려도 고를 것이 없다
  if (usePg && methods.length === 0) {
    issues.push({ path: ['methods'], message: '결제수단을 하나 이상 선택하세요.' });
  }

  return issues;
}

/**
 * 문의 전환 안내 문구 — PG 를 끈 동안 고객이 보는 유일한 설명이다.
 * 비면 고객은 왜 살 수 없는지 모른 채 '문의하기' 버튼만 본다.
 */
export function inquiryGuideIssues(value: PaymentSettingsValues): readonly PaymentIssue[] {
  const issues: PaymentIssue[] = [];
  const trimmed = value.inquiryGuide.trim();

  if (!value.usePg && trimmed === '') {
    issues.push({
      path: ['inquiryGuide'],
      message: 'PG 결제를 끄면 고객에게 보일 안내 문구가 필요해요.',
    });
  }

  if (trimmed.length > INQUIRY_GUIDE_MAX) {
    issues.push({
      path: ['inquiryGuide'],
      message: `안내 문구는 ${String(INQUIRY_GUIDE_MAX)}자를 넘을 수 없어요.`,
    });
  }

  return issues;
}

/* ── 스키마 ────────────────────────────────────────────────────────────────── */

/**
 * 우리 규칙(PaymentIssue) → zod 가 이해하는 모양.
 *
 * ctx 를 인자로 받지 않는다 — zod 의 ctx 타입을 우리 시그니처에 적어 두면 zod 를 올릴 때
 * 이 파일이 먼저 깨진다. 결과 배열만 만들어 호출부가 `ctx.issues.push(...)` 로 흘려 넣는다.
 */
function rawIssues(value: PaymentSettingsValues, issues: readonly PaymentIssue[]) {
  return issues.map((issue) => ({
    code: 'custom' as const,
    input: value as unknown,
    path: [...issue.path],
    message: issue.message,
  }));
}

/**
 * 문서 전체 — 마스터 스위치 · 자격증명 · 결제수단 · 안내 문구.
 * 저장 페이로드가 실제로 옳은지 보는 **최종 관문**이자 테스트가 겨누는 규칙 표면이다.
 */
export const paymentSettingsSchema = paymentDocumentSchema.check((ctx) => {
  const draft = ctx.value;

  ctx.issues.push(
    ...rawIssues(draft, [
      ...inquiryGuideIssues(draft),
      ...credentialIssues(draft.connection, draft.usePg),
      ...methodIssues(draft.connection.target, draft.methods, draft.usePg),
    ]),
  );
});

/**
 * 목록 화면(/settings/payment)의 폼 — **마스터 스위치와 안내 문구만** 바꿀 수 있다.
 *
 * 자격증명과 결제수단을 검증하지 않는 이유는 파일 머리말에 적었다: 고칠 칸이 이 화면에 없다.
 * 대신 켜 두고 자격증명이 반쪽인 상태는 **저장은 되되 결제가 열리지 않는다**(pgSellable 이
 * fail-closed 로 닫는다) — 화면은 그 사실을 경고와 링크로 말한다.
 */
export const paymentListSchema = paymentDocumentSchema.check((ctx) => {
  ctx.issues.push(...rawIssues(ctx.value, inquiryGuideIssues(ctx.value)));
});

/**
 * 상세 화면(/settings/payment/:target)의 폼 — **그 대상 하나만** 검증한다.
 *
 * 안내 문구는 여기서 보지 않는다: 이 화면은 문구를 그리지도, 저장하지도 않는다.
 */
export function pgTargetScopedSchema(target: PgTargetId) {
  return paymentDocumentSchema.check((ctx) => {
    const draft = ctx.value;
    if (draft.connection.target !== target) return;

    ctx.issues.push(
      ...rawIssues(draft, [
        ...credentialIssues(draft.connection, draft.usePg),
        ...methodIssues(target, draft.methods, draft.usePg),
      ]),
    );
  });
}

/* ── 경고 (저장을 막지 않는다) ─────────────────────────────────────────────── */

/**
 * 값이 '평소와 다르게 보인다' 는 알림 — **저장을 막지 않는다.**
 *
 * 형식은 PG 가 언제든 바꿀 수 있고 문서화되지 않은 것도 많다(파일 머리말). 그래서 여기서
 * 나오는 문장은 '틀렸다' 가 아니라 '확인해 보라' 다.
 */
export function credentialFormatWarning(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.includes(' '))
    return '값 안에 공백이 있어요. 붙여넣기할 때 앞뒤가 잘렸는지 확인하세요.';
  return null;
}

/* ── 목록 화면이 쓰는 파생 상태 ────────────────────────────────────────────── */

/**
 * 타일 하나의 상태 — **두 묶음이 여기서 파생된다.**
 *
 *   in-use : 마스터 스위치가 켜져 있고 이 대상이 지금 연결이다
 *   ready  : 이 대상에 **값이 실제로 저장돼 있고** 마스터 스위치만 꺼져 있다
 *   idle   : 그 밖
 *
 * ⚠ `ready` 는 '연결이 이 대상을 가리킨다' 만으로 성립하지 않는다. 기본 설정의 연결은
 * `emptyConnection('toss')` 라 값이 하나도 없는데도 toss 를 가리키기 때문에, 그것만 보면
 * 아무것도 넣은 적 없는 운영자에게 '값 저장됨' 이라고 말하게 된다(렌더 테스트가 잡아냈다).
 *
 * '자격증명이 완비인가' 는 이 축에 섞지 않는다 — 그것은 `pgSellable` 이 답하고, 타일은
 * 별도의 신호로 보여준다. 한 축에 두 사실을 섞으면 '사용 중인데 왜 결제가 안 되지' 를
 * 화면이 설명하지 못한다.
 */
export type PgTileStatus = 'in-use' | 'ready' | 'idle';

export function pgTileStatus(settings: PaymentSettings, target: PgTargetId): PgTileStatus {
  if (connectionTarget(settings.connection) !== target) return 'idle';
  if (settings.usePg) return 'in-use';
  return connectionHasAnyValue(settings.connection) ? 'ready' : 'idle';
}

/**
 * 저장된 설정 → 이 대상의 폼 연결 값.
 *
 * 지금 연결된 대상이면 저장된 값을 싣고, 아니면 **빈 연결**로 시작한다 — 앞 PG 의 값이 새 PG 의
 * 칸에 남으면 운영자는 '어디서 온 값인지' 를 영영 모른다.
 */
export function connectionFormFor(
  settings: PaymentSettings,
  target: PgTargetId,
): PgConnectionFormValues {
  const source: PgConnection =
    connectionTarget(settings.connection) === target
      ? settings.connection
      : emptyConnection(target);

  const publicValues: Record<string, string> = {};
  const secretInputs: Record<string, string> = {};
  const storedSecrets: string[] = [];

  for (const field of pgMeta(target).credentials) {
    if (field.visibility === 'secret') {
      // 평문은 절대 채우지 않는다 — 저장 여부만 안다
      secretInputs[field.key] = '';
      if (connectionHasSecret(source, field.key)) storedSecrets.push(field.key);
      continue;
    }
    publicValues[field.key] = connectionPublicValue(source, field.key);
  }

  return { target, publicValues, secretInputs, storedSecrets };
}
