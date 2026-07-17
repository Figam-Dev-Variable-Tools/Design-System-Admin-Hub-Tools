// 예약 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 경계값을 막는다: 시간 역전(종료≤시작)·정원 초과(인원>자원 정원)·예약금 음수·잘못된 날짜/시각.
// 과거 일시·더블부킹은 폼에서 경고(비차단)로 알린다 — 수정 중 과거 예약을 열 수 있어야 하기 때문.
// 숫자 필드(인원·예약금)는 입력 원값 보존을 위해 문자열로 받고 정수 형식을 판정한다.
import * as z from 'zod/mini';

import { requiredText } from '../../shared/crud';
import { isRealDate, toMinutes } from './_shared/calendar';
import { findResource, resourceCapacity } from './_shared/resources';
import {
  PARTY_SIZE_MAX,
  RESERVATION_MEMO_MAX,
  RESERVATION_REQUEST_MAX,
} from './_shared/reservation';

const INT_RE = /^\d+$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const reservationSchema = z
  .object({
    customerName: requiredText('고객명', 40),
    customerPhone: requiredText('연락처', 20),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    partySize: z.string(),
    resourceId: z.string(),
    staffId: z.string(),
    deposit: z.string(),
    request: z.string().check(
      z.refine((value) => value.trim().length <= RESERVATION_REQUEST_MAX, {
        error: `요청사항은 ${String(RESERVATION_REQUEST_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
    status: z.enum(['requested', 'confirmed', 'visited', 'noshow', 'cancelled']),
    memo: z.string().check(
      z.refine((value) => value.trim().length <= RESERVATION_MEMO_MAX, {
        error: `메모는 ${String(RESERVATION_MEMO_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
  })
  .check((ctx) => {
    // 방문 날짜 — 실재하는 날짜.
    if (!isRealDate(ctx.value.date)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.date,
        path: ['date'],
        message: '방문 날짜를 YYYY-MM-DD 형식으로 입력하세요.',
      });
    }
  })
  .check((ctx) => {
    // 시간 — 형식 + 종료 > 시작.
    const { startTime, endTime } = ctx.value;

    // [형식] 오류는 **틀린 그 칸에** 붙인다. 화면이 시작·종료를 각자의 FormField 로 그리므로
    // (PR #30) 한쪽에 몰아 주면 멀쩡한 칸이 무효로 표시되고 정작 틀린 칸은 조용하다.
    // 가장 흔한 입력이 '빈 종료 시각'이다 — '' 는 TIME_RE 를 통과하지 못한다.
    const startMalformed = !TIME_RE.test(startTime);
    const endMalformed = !TIME_RE.test(endTime);
    if (startMalformed) {
      ctx.issues.push({
        code: 'custom',
        input: startTime,
        path: ['startTime'],
        message: '시작 시각을 HH:MM 형식으로 입력하세요.',
      });
    }
    if (endMalformed) {
      ctx.issues.push({
        code: 'custom',
        input: endTime,
        path: ['endTime'],
        message: '종료 시각을 HH:MM 형식으로 입력하세요.',
      });
    }
    // 순서는 둘 다 형식이 옳아야 의미가 있다 — toMinutes 가 NaN 을 내면 비교가 조용히 거짓이 된다
    if (startMalformed || endMalformed) return;

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      ctx.issues.push({
        code: 'custom',
        input: endTime,
        path: ['endTime'],
        message: '종료 시각은 시작 시각보다 늦어야 합니다.',
      });
    }
  })
  .check((ctx) => {
    // 자원 — 등록된 자원이어야 한다.
    if (findResource(ctx.value.resourceId) === undefined) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.resourceId,
        path: ['resourceId'],
        message: '배정할 자원을 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    // 인원 — 정수 1 이상, 자원 정원 이하(정원 초과 차단).
    const raw = ctx.value.partySize.trim();
    if (!INT_RE.test(raw) || Number(raw) < 1) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.partySize,
        path: ['partySize'],
        message: '예약 인원은 1명 이상의 숫자로 입력하세요.',
      });
      return;
    }
    const size = Number(raw);
    if (size > PARTY_SIZE_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.partySize,
        path: ['partySize'],
        message: `예약 인원은 ${String(PARTY_SIZE_MAX)}명을 넘을 수 없습니다.`,
      });
      return;
    }
    const capacity = resourceCapacity(ctx.value.resourceId);
    if (capacity > 0 && size > capacity) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.partySize,
        path: ['partySize'],
        message: `선택한 자원의 정원(${String(capacity)}명)을 초과했습니다.`,
      });
    }
  })
  .check((ctx) => {
    // 예약금 — 0 이상의 정수(음수·소수 차단). 빈 값은 0 으로 본다.
    const raw = ctx.value.deposit.trim();
    if (raw !== '' && !INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.deposit,
        path: ['deposit'],
        message: '예약금은 0 이상의 숫자만 입력할 수 있습니다.',
      });
    }
  });

export type ReservationFormValues = z.infer<typeof reservationSchema>;
