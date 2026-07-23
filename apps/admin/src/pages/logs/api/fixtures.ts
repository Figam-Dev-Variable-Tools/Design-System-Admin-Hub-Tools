// API 로그 더미 데이터 (apps/admin/src/pages/logs/api/**)
//
// 실명·실재 호스트 0건의 규율은 ../fixture-lib.ts 에 적혀 있다. 백엔드가 붙으면 이 파일은 삭제된다.
//
// [무엇을 이야기하는 데이터인가]
//   ① 일상 — 200 이 대부분이고 빠르다. 정상은 조용하다.
//   ② **인증 실패 연쇄(401)** — 폐기된 키로 계속 두드리는 배치. 키 교체를 안 한 파트너사다.
//   ③ **느린 엔드포인트** — 정산 집계가 1초를 넘긴다. 응답 시간 정렬(ERP-04)이 이것을 찾아낸다.
//   ④ **5xx 스파이크** — 어제 새벽 잠깐. 오류 로그 화면의 같은 시각과 짝을 이룬다.
// 페이로드에는 Authorization 헤더와 API 키가 **실제로 들어 있다** — 마스킹이 도는지 보기 위해서다.
import { atKst, foreignIp, HISTORY_DAYS, newestFirst, padId, pick, usualIp } from '../fixture-lib';
import type { ApiLogEntry, HttpMethod } from './types';

interface Client {
  readonly name: string;
  readonly apiKey: string;
}

const CLIENTS: readonly Client[] = [
  { name: '모바일 앱', apiKey: 'sk_live_9f2a7c41d8e3b6a5' },
  { name: '웹 프론트', apiKey: 'sk_live_3b8d1e6f2c9a4d70' },
  { name: '파트너사 정산 배치', apiKey: 'sk_live_7e4c2b9a1f6d8305' },
];

interface Route {
  readonly method: HttpMethod;
  readonly path: string;
  readonly base: number;
}

const ROUTES: readonly Route[] = [
  { method: 'GET', path: '/api/products', base: 42 },
  { method: 'GET', path: '/api/members/me', base: 28 },
  { method: 'POST', path: '/api/orders', base: 180 },
  { method: 'GET', path: '/api/orders', base: 95 },
  { method: 'PATCH', path: '/api/members/me', base: 64 },
  { method: 'DELETE', path: '/api/carts/items', base: 38 },
];

interface Draft {
  readonly occurredAtIso: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly client: Client;
  readonly requestId: string;
  readonly clientIp: string;
  readonly payload: unknown;
}

function requestId(seed: number): string {
  return `req-${padId(seed, 8)}`;
}

/** 일상 — 200 이 대부분이고 빠르다. 정상은 조용하다 */
function routine(now: Date): readonly Draft[] {
  const out: Draft[] = [];

  for (let day = 0; day < HISTORY_DAYS; day += 1) {
    ROUTES.forEach((route, index) => {
      if ((day + index) % 2 !== 0) return;
      const seed = day * 17 + index;
      const client = pick(CLIENTS, seed, CLIENTS[0] ?? { name: '웹 프론트', apiKey: 'sk_live_x' });

      out.push({
        occurredAtIso: atKst(day, 9 + (index % 11), (seed * 7) % 60, seed % 60, now),
        method: route.method,
        path: route.path,
        status: 200,
        durationMs: route.base + ((seed * 13) % 60),
        client,
        requestId: requestId(seed * 3 + 1000),
        clientIp: usualIp(seed),
        payload: {
          request: { method: route.method, path: route.path, query: { page: (seed % 5) + 1 } },
          response: { status: 200, items: (seed % 20) + 1 },
        },
      });
    });
  }

  return out;
}

/**
 * 인증 실패 연쇄 — **폐기된 키로 계속 두드리는 배치.**
 *
 * 개별 401 은 흔하다. 이야기는 **같은 키가 30분마다 6번 막힌 것**이다 —
 * 파트너사가 키 교체를 안 했거나, 그 키가 유출돼 남이 쓰고 있거나 둘 중 하나다.
 * 페이로드의 Authorization 헤더는 상세에서 반드시 가려져야 한다.
 */
function authFailures(now: Date): readonly Draft[] {
  const client = CLIENTS[2];
  if (client === undefined) return [];

  return Array.from({ length: 6 }, (_, i) => ({
    occurredAtIso: atKst(1, 2 + i, 15, (i * 11) % 60, now),
    method: 'GET' as HttpMethod,
    path: '/api/settlements',
    status: 401,
    durationMs: 12 + i,
    client,
    requestId: requestId(4000 + i),
    clientIp: foreignIp(i + 2),
    payload: {
      request: {
        method: 'GET',
        path: '/api/settlements',
        headers: {
          authorization: `Bearer ${client.apiKey}`,
          'x-api-key': client.apiKey,
        },
      },
      response: { status: 401, code: 'INVALID_API_KEY', message: '유효하지 않은 API 키예요.' },
    },
  }));
}

/**
 * 느린 엔드포인트 — 정산 집계가 1초를 넘는다.
 * 표에서 이것을 찾는 방법은 **응답 시간 정렬** 하나뿐이다 (ERP-04 가 요구하는 그 정렬).
 */
function slowCalls(now: Date): readonly Draft[] {
  const client = CLIENTS[2];
  if (client === undefined) return [];

  return Array.from({ length: 5 }, (_, i) => ({
    occurredAtIso: atKst(i + 1, 4, 30, i * 7, now),
    method: 'GET' as HttpMethod,
    path: '/api/settlements/daily',
    status: 200,
    durationMs: 1400 + i * 620,
    client,
    requestId: requestId(5000 + i),
    clientIp: usualIp(i + 5),
    payload: {
      request: { method: 'GET', path: '/api/settlements/daily', query: { date: 'yesterday' } },
      response: { status: 200, rows: 12840 + i * 300 },
      timing: { db: 1200 + i * 500, render: 180 },
    },
  }));
}

/** 5xx 스파이크 — 어제 새벽 잠깐. 오류 로그 화면의 같은 시각과 짝을 이룬다 */
function serverErrors(now: Date): readonly Draft[] {
  const client = CLIENTS[0];
  if (client === undefined) return [];

  return Array.from({ length: 7 }, (_, i) => ({
    occurredAtIso: atKst(1, 3, 41 + i, (i * 13) % 60, now),
    method: 'POST' as HttpMethod,
    path: '/api/orders',
    status: i % 3 === 0 ? 503 : 500,
    durationMs: 30 + i * 4,
    client,
    requestId: requestId(6000 + i),
    clientIp: usualIp(i + 11),
    payload: {
      request: { method: 'POST', path: '/api/orders', body: { items: 2, couponCode: 'WELCOME10' } },
      response: {
        status: i % 3 === 0 ? 503 : 500,
        code: 'PAYMENT_GATEWAY_TIMEOUT',
        traceId: `trace-${padId(6000 + i, 8)}`,
      },
    },
  }));
}

function build(now: Date = new Date()): readonly ApiLogEntry[] {
  const drafts = [...routine(now), ...authFailures(now), ...slowCalls(now), ...serverErrors(now)];

  const entries = drafts.map((draft, index) => ({
    id: `API-${padId(index + 1, 5)}`,
    occurredAtIso: draft.occurredAtIso,
    method: draft.method,
    path: draft.path,
    status: draft.status,
    durationMs: draft.durationMs,
    client: draft.client.name,
    apiKey: draft.client.apiKey,
    requestId: draft.requestId,
    clientIp: draft.clientIp,
    payload: draft.payload,
  }));

  return newestFirst(entries);
}

export const API_LOGS: readonly ApiLogEntry[] = build();
