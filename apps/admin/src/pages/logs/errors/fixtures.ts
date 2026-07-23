// 오류 로그 더미 데이터 (apps/admin/src/pages/logs/errors/**)
//
// 백엔드가 붙으면 이 파일은 삭제된다. 규율은 ../fixture-lib.ts 참조.
//
// [무엇을 이야기하는 데이터인가]
//   ① **결제 게이트웨이 타임아웃(치명) — 어제 새벽 3시 41분, 340회.**
//      API 로그의 5xx 스파이크와 **같은 시각**이다. 두 화면을 나란히 놓으면 사건이 재구성된다:
//      게이트웨이가 죽었고 → 주문 API 가 500 을 뱉었고 → 회원의 결제가 실패했다.
//      감사 화면이 여러 개인 이유가 이것이다 — 한 사건은 여러 로그에 자국을 남긴다.
//   ② 일상 경고 — 이미지 업로드 용량 초과 같은 것. 매일 조금씩 있고 아무 일도 아니다.
//   ③ 정산 배치 실패 — 조용하지만 돈이 걸린 오류.
// 스택/컨텍스트 페이로드에는 토큰과 커넥션 문자열이 **실제로 들어 있다** — 마스킹 확인용이다.
import { atKst, HISTORY_DAYS, newestFirst, padId } from '../fixture-lib';
import type { ErrorLogEntry, ErrorSeverity } from './types';

interface Draft {
  readonly occurredAtIso: string;
  readonly severity: ErrorSeverity;
  readonly source: string;
  readonly code: string;
  readonly message: string;
  readonly occurrences: number;
  readonly payload: unknown;
}

/**
 * 결제 게이트웨이 타임아웃 — **이 화면이 존재하는 이유.**
 * 340회다. 1회였다면 재시도로 끝났을 것이고, 340회는 사고다. 그 차이를 말하는 것이 occurrences 다.
 */
function paymentOutage(now: Date): readonly Draft[] {
  return [
    {
      occurredAtIso: atKst(1, 3, 41, 2, now),
      severity: 'critical',
      source: '결제 서비스',
      code: 'PAYMENT_GATEWAY_TIMEOUT',
      message: '결제 게이트웨이 응답 시간 초과 — 주문 생성이 연쇄 실패했어요.',
      occurrences: 340,
      payload: {
        stack: [
          'PaymentGatewayError: upstream timed out after 30000ms',
          '    at PaymentClient.authorize (payment/client.ts:118)',
          '    at OrderService.create (orders/service.ts:64)',
          '    at POST /api/orders',
        ].join('\n'),
        context: {
          gateway: 'pg-partner-a',
          endpoint: 'https://pg.example.com/v2/authorize',
          apiKey: 'pg_live_88f21c9a77b40e13',
          timeoutMs: 30000,
          affectedOrders: 340,
        },
      },
    },
    {
      occurredAtIso: atKst(1, 3, 52, 40, now),
      severity: 'error',
      source: '주문 API',
      code: 'ORDER_CREATE_FAILED',
      message: '결제 승인 실패로 주문을 생성하지 못했어요.',
      occurrences: 128,
      payload: {
        stack: 'OrderCreateError: payment declined (upstream 503)\n    at OrderService.create',
        context: { retryable: true, upstream: 'PAYMENT_GATEWAY_TIMEOUT' },
      },
    },
  ];
}

/** 정산 배치 실패 — 조용하지만 돈이 걸린 오류. 커넥션 문자열에 비밀번호가 들어 있다 */
function settlementFailures(now: Date): readonly Draft[] {
  return [
    {
      occurredAtIso: atKst(3, 4, 12, 8, now),
      severity: 'critical',
      source: '정산 배치',
      code: 'SETTLEMENT_DB_CONNECTION_LOST',
      message: '정산 집계 중 데이터베이스 연결이 끊어졌어요 — 당일 정산이 중단되었어요.',
      occurrences: 3,
      payload: {
        stack: 'ConnectionLostError: server closed the connection unexpectedly',
        context: {
          job: 'settlement-daily',
          connectionString: 'postgres://svc_settle:Str0ngPass!@db.internal:5432/settle',
          rowsProcessed: 8420,
          rowsExpected: 12840,
        },
      },
    },
  ];
}

/** 일상 경고 — 매일 조금씩 있고 아무 일도 아니다. 이것이 신호와 잡음을 가르는 대조군이다 */
function routineWarnings(now: Date): readonly Draft[] {
  const out: Draft[] = [];

  for (let day = 0; day < HISTORY_DAYS; day += 2) {
    out.push({
      occurredAtIso: atKst(day, 11 + (day % 8), (day * 7) % 60, (day * 3) % 60, now),
      severity: 'warning',
      source: '이미지 업로드',
      code: 'UPLOAD_SIZE_EXCEEDED',
      message: '허용 용량을 초과한 이미지 업로드가 거부되었어요.',
      occurrences: 1 + (day % 5),
      payload: {
        context: { limitMb: 5, receivedMb: 6 + (day % 4), contentType: 'image/png' },
      },
    });

    if (day % 6 !== 0) continue;
    out.push({
      occurredAtIso: atKst(day, 19, (day * 11) % 60, (day * 5) % 60, now),
      severity: 'warning',
      source: '알림 발송',
      code: 'SMS_RATE_LIMITED',
      message: '발송 한도에 걸려 일부 SMS 가 지연되었어요.',
      occurrences: 2 + (day % 7),
      payload: {
        context: {
          provider: 'sms-partner-b',
          token: 'smsp_live_4d19c7b2a8e35f60',
          delayedCount: 2 + (day % 7),
        },
      },
    });
  }

  return out;
}

/** 산발적 오류 — 재현되지 않는 것들. 감사에서는 '있었다'는 사실만으로 충분할 때가 있다 */
function sporadicErrors(now: Date): readonly Draft[] {
  const out: Draft[] = [];

  for (let day = 1; day < HISTORY_DAYS; day += 7) {
    out.push({
      occurredAtIso: atKst(day, 14, (day * 13) % 60, (day * 7) % 60, now),
      severity: 'error',
      source: '알림 발송',
      code: 'EMAIL_BOUNCED',
      message: '수신 거부된 주소로 발송을 시도했어요.',
      occurrences: 1 + (day % 3),
      payload: { context: { recipient: 'user1099@example.com', bounceType: 'hard' } },
    });
  }

  return out;
}

function build(now: Date = new Date()): readonly ErrorLogEntry[] {
  const drafts = [
    ...paymentOutage(now),
    ...settlementFailures(now),
    ...routineWarnings(now),
    ...sporadicErrors(now),
  ];

  const entries = drafts.map((draft, index) => ({
    id: `ER-${padId(index + 1, 5)}`,
    occurredAtIso: draft.occurredAtIso,
    severity: draft.severity,
    source: draft.source,
    code: draft.code,
    message: draft.message,
    occurrences: draft.occurrences,
    traceId: `trace-${padId(index + 1, 8)}`,
    payload: draft.payload,
  }));

  return newestFirst(entries);
}

export const ERROR_LOGS: readonly ErrorLogEntry[] = build();
