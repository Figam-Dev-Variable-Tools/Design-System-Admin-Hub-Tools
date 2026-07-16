// 회원 활동 로그 더미 데이터 (apps/admin/src/pages/logs/member-activity/**)
//
// 실명·실재 호스트 0건의 규율은 ../fixture-lib.ts 에 적혀 있다. 백엔드가 붙으면 이 파일은 삭제된다.
//
// [무엇을 이야기하는 데이터인가]
//   ① 일상 — 로그인·주문·리뷰. 대부분은 아무 일도 아니다.
//   ② **결제 실패 → 재시도 → 성공** — CS 문의('결제가 두 번 됐어요')의 답이 이 연쇄에 있다.
//   ③ **탈퇴** — 탈퇴 회원은 memberId 가 null 이다(가리킬 레코드가 없다). 그래도 **로그는 남는다** —
//      탈퇴했다고 그 사람이 한 주문의 기록까지 사라지면 정산도 분쟁 대응도 불가능하다.
// 주문/결제 페이로드에는 카드번호·전화번호·주소가 **실제로 들어 있다** — 마스킹이 도는지 보기 위해서다.
import { atKst, HISTORY_DAYS, newestFirst, padId, pick, usualIp } from '../fixture-lib';
import type { MemberActivity, MemberActivityEntry, MemberOutcome } from './types';

interface Member {
  readonly id: string | null;
  readonly account: string;
  readonly name: string;
}

const MEMBERS: readonly Member[] = [
  { id: 'M-00003', account: 'user1003@example.com', name: '김**' },
  { id: 'M-00017', account: 'user1017@example.com', name: '이**' },
  { id: 'M-00042', account: 'user1042@example.com', name: '박**' },
  { id: 'M-00058', account: 'user1058@example.com', name: '최**' },
  { id: 'M-00071', account: 'user1071@example.com', name: '정**' },
  { id: 'M-00099', account: 'user1099@example.com', name: '강**' },
];

const DEVICES = [
  'Chrome 126 · Windows 11',
  'Safari 17 · iOS 17',
  'Samsung Internet 25 · Android 14',
  'Edge 126 · Windows 10',
];

interface Draft {
  readonly member: Member;
  readonly occurredAtIso: string;
  readonly activity: MemberActivity;
  readonly summary: string;
  readonly outcome: MemberOutcome;
  readonly failureReason: string | null;
  readonly device: string;
  readonly ip: string;
  readonly payload: unknown;
}

function routine(now: Date): readonly Draft[] {
  const out: Draft[] = [];

  for (let day = 0; day < HISTORY_DAYS; day += 1) {
    MEMBERS.forEach((member, index) => {
      if ((day + index) % 3 !== 0) return;
      const seed = day * 11 + index;
      const device = pick(DEVICES, seed, 'Chrome 126 · Windows 11');

      out.push({
        member,
        occurredAtIso: atKst(day, 8 + (index % 10), (seed * 7) % 60, seed % 60, now),
        activity: 'login',
        summary: '로그인',
        outcome: 'success',
        failureReason: null,
        device,
        ip: usualIp(seed),
        payload: { method: 'POST', path: '/api/session', channel: index % 2 === 0 ? 'web' : 'app' },
      });

      if ((day + index) % 9 !== 0) return;

      const orderNo = `ORD-${padId(day * 7 + index + 1, 6)}`;
      const amount = 32000 + ((seed * 1300) % 200000);

      out.push({
        member,
        occurredAtIso: atKst(day, 12 + (index % 6), (seed * 13) % 60, (seed * 5) % 60, now),
        activity: 'order',
        summary: `주문 ${orderNo}`,
        outcome: 'success',
        failureReason: null,
        device,
        ip: usualIp(seed),
        payload: {
          method: 'POST',
          path: '/api/orders',
          orderNo,
          amount,
          shipping: {
            receiver: member.name,
            phone: '010-1234-5678',
            address: '서울특별시 중구 세종대로 000',
          },
        },
      });

      if ((day + index) % 18 !== 0) return;
      out.push({
        member,
        occurredAtIso: atKst(day, 20, (seed * 3) % 60, (seed * 7) % 60, now),
        activity: 'review',
        summary: `리뷰 작성 (${String((seed % 5) + 1)}점)`,
        outcome: 'success',
        failureReason: null,
        device,
        ip: usualIp(seed),
        payload: { method: 'POST', path: '/api/reviews', rating: (seed % 5) + 1, orderNo },
      });
    });
  }

  return out;
}

/**
 * 결제 실패 → 재시도 → 성공.
 *
 * CS 가 가장 자주 받는 문의가 '결제가 안 됐는데 돈이 나갔어요' 다. 개별 행으로는 답할 수 없고
 * **연쇄로만** 답할 수 있다: 한도 초과로 두 번 막혔고, 세 번째에 다른 카드로 성공했다.
 * 페이로드에 카드번호가 들어 있다 — 상세를 열면 반드시 가려져 있어야 한다.
 */
function paymentRetries(now: Date): readonly Draft[] {
  const member = MEMBERS[2];
  if (member === undefined) return [];

  const orderNo = 'ORD-020931';
  const base = {
    member,
    activity: 'payment' as MemberActivity,
    device: 'Safari 17 · iOS 17',
    ip: usualIp(21),
  };

  return [
    {
      ...base,
      occurredAtIso: atKst(2, 21, 4, 11, now),
      summary: `결제 시도 ${orderNo}`,
      outcome: 'failure',
      failureReason: '한도 초과',
      payload: {
        method: 'POST',
        path: '/api/payments',
        orderNo,
        amount: 128000,
        card: { number: '4111-1111-1111-1234', cvc: '123', expiry: '12/28' },
      },
    },
    {
      ...base,
      occurredAtIso: atKst(2, 21, 5, 2, now),
      summary: `결제 시도 ${orderNo}`,
      outcome: 'failure',
      failureReason: '한도 초과',
      payload: {
        method: 'POST',
        path: '/api/payments',
        orderNo,
        amount: 128000,
        card: { number: '4111-1111-1111-1234', cvc: '123', expiry: '12/28' },
      },
    },
    {
      ...base,
      occurredAtIso: atKst(2, 21, 7, 38, now),
      summary: `결제 완료 ${orderNo} · 128,000원`,
      outcome: 'success',
      failureReason: null,
      payload: {
        method: 'POST',
        path: '/api/payments',
        orderNo,
        amount: 128000,
        card: { number: '5555-5555-5555-4444', cvc: '456', expiry: '03/27' },
        approvalNo: 'APV-77120031',
      },
    },
  ];
}

/**
 * 탈퇴 — **로그는 남는다.**
 * 회원 레코드는 사라져도(memberId=null) 그 사람이 한 주문의 기록까지 사라지면
 * 정산도 분쟁 대응도 불가능하다. 계정이 아니라 **사건**을 기록하는 것이 감사 로그다.
 */
function withdrawals(now: Date): readonly Draft[] {
  const gone: Member = { id: null, account: 'user1120@example.com', name: '조**' };

  return [
    {
      member: gone,
      occurredAtIso: atKst(6, 15, 42, 19, now),
      activity: 'withdraw',
      summary: '탈퇴 (사유: 서비스를 더 이상 이용하지 않음)',
      outcome: 'success',
      failureReason: null,
      device: 'Chrome 126 · Windows 11',
      ip: usualIp(31),
      payload: {
        method: 'DELETE',
        path: '/api/members/me',
        reason: '서비스를 더 이상 이용하지 않음',
        email: gone.account,
        phone: '010-9876-5432',
      },
    },
  ];
}

/** 가입 — 픽스처의 가장 오래된 끝. 여기서부터 그 회원의 이야기가 시작된다 */
function signups(now: Date): readonly Draft[] {
  return MEMBERS.filter((_, index) => index % 2 === 0).map((member, i) => ({
    member,
    occurredAtIso: atKst(HISTORY_DAYS - 1 - i, 10, 12 + i, 30, now),
    activity: 'signup' as MemberActivity,
    summary: '가입',
    outcome: 'success' as MemberOutcome,
    failureReason: null,
    device: 'Chrome 126 · Windows 11',
    ip: usualIp(40 + i),
    payload: {
      method: 'POST',
      path: '/api/members',
      email: member.account,
      password: 'Passw0rd!2026',
      marketingConsent: i % 2 === 0,
    },
  }));
}

function build(now: Date = new Date()): readonly MemberActivityEntry[] {
  const drafts = [...routine(now), ...paymentRetries(now), ...withdrawals(now), ...signups(now)];

  const entries = drafts.map((draft, index) => ({
    id: `ML-${padId(index + 1, 5)}`,
    occurredAtIso: draft.occurredAtIso,
    memberAccount: draft.member.account,
    memberName: draft.member.name,
    memberId: draft.member.id,
    activity: draft.activity,
    summary: draft.summary,
    outcome: draft.outcome,
    failureReason: draft.failureReason,
    ip: draft.ip,
    device: draft.device,
    payload: draft.payload,
  }));

  return newestFirst(entries);
}

export const MEMBER_ACTIVITY_LOGS: readonly MemberActivityEntry[] = build();
