// 알림 관리 픽스처 · 저장소 API (apps/admin/src/pages/notifications/**)
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건, 실제 발송 0건.
// 각 화면 data-source.ts 의 // TODO(backend) 주석이 연동 지점이다. 정본이 서버로 옮겨가면 이 배열이
// 서버 상태로 바뀐다.
//
// [왜 한 곳인가] 발송 규칙이 이메일/SMS 템플릿을 참조한다(규칙 화면은 템플릿명을 보여주고, 템플릿 삭제는
// 그 템플릿을 쓰는 규칙을 깨뜨린다). 세 화면이 같은 상태를 읽으므로 픽스처와 저장소 API 를 이 잎 모듈
// 한 곳에 모은다 (마케팅 _shared/store · 고객센터 _shared/store 와 같은 결).
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { sortByTrigger, sortRules } from './notification';
import type {
  EmailTemplate,
  EmailTemplateInput,
  NotificationChannel,
  NotificationRule,
  NotificationRuleInput,
  SmsTemplate,
  SmsTemplateInput,
  TriggerId,
} from './notification';

function nowIso(): string {
  return new Date().toISOString();
}

/* ── 템플릿 저장소 골격 ────────────────────────────────────────────────────────
 *
 * 이메일·SMS 템플릿은 필드만 다르고(제목 유무) 저장 방식이 같다: 가변 배열 + 일련번호 +
 * 목록(트리거순 정렬)·단건(없으면 throw)·추가·수정·삭제. 두 벌을 복사하면 한쪽만 고치는 사고가 난다
 * (클린코드 점검 축3 중복) — 골격은 여기 한 벌, 타입별로 다른 것(정규화·필드)만 build/patch 로 주입한다.
 * 모양은 공용 createCrudAdapter 의 spec(seed·build·patch)을 그대로 따른다 — 새 패턴을 만들지 않는다. */

interface TemplateShape {
  readonly id: string;
  readonly name: string;
  readonly trigger: TriggerId;
}

interface TemplateStoreSpec<T extends TemplateShape, Input> {
  readonly seed: readonly T[];
  /** 새 id 접두사 — 'ntf-email-' / 'ntf-sms-' */
  readonly idPrefix: string;
  readonly notFound: string;
  /** Input + 배정된 id + 저장 시각 → 새 항목(필드 정규화는 여기서) */
  readonly build: (input: Input, id: string, now: string) => T;
  /** 기존 항목 + Input + 저장 시각 → 갱신본 */
  readonly patch: (item: T, input: Input, now: string) => T;
}

interface TemplateStore<T extends TemplateShape, Input> {
  /** 트리거 순서로 정렬해 돌려준다 — 운영자가 이벤트 흐름대로 읽는다 */
  readonly list: () => readonly T[];
  readonly getOne: (id: string) => T;
  readonly add: (input: Input) => void;
  readonly update: (id: string, input: Input) => void;
  readonly remove: (id: string) => void;
  /** id 로 찾기 — 없으면 undefined(규칙 화면이 끊어진 연결을 경고로 그린다) */
  readonly find: (id: string) => T | undefined;
}

function createTemplateStore<T extends TemplateShape, Input>(
  spec: TemplateStoreSpec<T, Input>,
): TemplateStore<T, Input> {
  let items: readonly T[] = spec.seed;
  let seq = spec.seed.length;

  return {
    list: () => sortByTrigger(items),
    getOne: (id) => {
      const found = items.find((item) => item.id === id);
      if (found === undefined) throw new Error(spec.notFound);
      return found;
    },
    add: (input) => {
      seq += 1;
      items = [...items, spec.build(input, `${spec.idPrefix}${String(seq)}`, nowIso())];
    },
    update: (id, input) => {
      items = items.map((item) => (item.id === id ? spec.patch(item, input, nowIso()) : item));
    },
    remove: (id) => {
      /**
       * [참조 무결성] 규칙이 쓰고 있는 템플릿은 지우지 않는다.
       *
       * 이 파일 머리말이 이미 그 위험을 적어 뒀다 — "템플릿 삭제는 그 템플릿을 쓰는 규칙을
       * 깨뜨린다". 그런데 검사(rulesUsingTemplate)만 있고 부르는 곳이 없었다. 인증번호
       * 템플릿(ntf-sms-4 · security.verification-code)을 지우면 그 규칙은 템플릿 없는 규칙이
       * 되고 인증번호가 나가지 않는다 — **로그인이 막힌다.** 규칙 화면이 '템플릿 없음' 배지를
       * 띄우긴 하지만 그건 다른 화면에서, 이미 망가진 뒤의 이야기다.
       *
       * 409 로 던진다: 이것은 '잠시 후 다시 시도'로 풀리는 실패가 아니라 **먼저 규칙을
       * 떼어내야** 풀리는 실패다 (support/_shared/store removeCategory 선례와 같은 결).
       */
      const used = rulesUsingTemplate(id);
      if (used > 0) {
        throw new HttpError(
          HTTP_STATUS.conflict,
          `발송 규칙 ${String(used)}건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다. 규칙에서 먼저 템플릿을 바꾸세요.`,
        );
      }
      items = items.filter((item) => item.id !== id);
    },
    find: (id) => items.find((item) => item.id === id),
  };
}

/* ── 이메일 템플릿 ─────────────────────────────────────────────────────────────
 *
 * 전부 정보성(트랜잭션) 문구다 — (광고) 표기·수신거부 문구가 하나도 없는 것이 마케팅 픽스처와의 차이다. */

const EMAIL_SEED: readonly EmailTemplate[] = [
  {
    id: 'ntf-email-1',
    name: '주문 접수 안내',
    trigger: 'order.placed',
    subject: '[스페이스플래닝] 주문이 접수되었습니다 (#{주문번호})',
    body: '#{이름}님, 주문이 정상 접수되었습니다.\n\n주문번호: #{주문번호}\n\n결제가 확인되면 다시 안내드리겠습니다.',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'ntf-email-2',
    name: '결제 완료 영수증',
    trigger: 'order.paid',
    subject: '[스페이스플래닝] 결제가 완료되었습니다',
    body: '#{이름}님, 결제가 정상 처리되었습니다.\n\n주문번호: #{주문번호}\n결제금액: #{결제금액}원\n\n이용해 주셔서 감사합니다.',
    updatedAt: '2026-07-11T09:30:00.000Z',
  },
  {
    id: 'ntf-email-3',
    name: '배송 출발 안내',
    trigger: 'delivery.started',
    subject: '[스페이스플래닝] 상품이 출발했습니다',
    body: '#{이름}님, 주문하신 상품이 출발했습니다.\n\n택배사: #{택배사}\n송장번호: #{송장번호}\n\n배송 조회는 택배사 홈페이지에서 가능합니다.',
    updatedAt: '2026-07-12T14:00:00.000Z',
  },
  {
    id: 'ntf-email-4',
    name: '가입 환영 안내',
    trigger: 'account.created',
    subject: '[스페이스플래닝] 가입을 환영합니다',
    body: '#{이름}님, 회원가입이 완료되었습니다.\n\n이제 모든 서비스를 이용하실 수 있습니다.',
    updatedAt: '2026-07-05T08:00:00.000Z',
  },
  {
    id: 'ntf-email-5',
    name: '비밀번호 재설정 인증번호',
    trigger: 'account.password-reset',
    subject: '[스페이스플래닝] 비밀번호 재설정 인증번호',
    body: '#{이름}님, 아래 인증번호를 입력해 주세요.\n\n인증번호: #{인증번호}\n\n본인이 요청하지 않았다면 즉시 고객센터로 알려주세요.',
    updatedAt: '2026-07-13T11:20:00.000Z',
  },
  {
    id: 'ntf-email-6',
    name: '새 기기 로그인 알림',
    trigger: 'security.login-new-device',
    subject: '[스페이스플래닝] 새로운 기기에서 로그인되었습니다',
    body: '#{이름}님, 새로운 기기에서 로그인이 감지되었습니다.\n\n접속기기: #{접속기기}\n\n본인이 아니라면 즉시 비밀번호를 변경해 주세요.',
    updatedAt: '2026-07-14T19:05:00.000Z',
  },
  {
    id: 'ntf-email-7',
    name: '휴면 전환 예고',
    trigger: 'account.dormant',
    subject: '[스페이스플래닝] 휴면 계정 전환 예정 안내',
    body: '#{이름}님, 장기간 접속하지 않아 #{휴면예정일}에 휴면 계정으로 전환될 예정입니다.\n\n로그인하시면 휴면 전환이 취소됩니다.',
    updatedAt: '2026-07-09T07:00:00.000Z',
  },
];

const emailStore = createTemplateStore<EmailTemplate, EmailTemplateInput>({
  seed: EMAIL_SEED,
  idPrefix: 'ntf-email-',
  notFound: '이메일 템플릿을 찾을 수 없습니다',
  build: (input, id, now) => ({
    id,
    name: input.name.trim(),
    trigger: input.trigger,
    subject: input.subject.trim(),
    body: input.body.trim(),
    updatedAt: now,
  }),
  patch: (item, input, now) => ({
    ...item,
    name: input.name.trim(),
    trigger: input.trigger,
    subject: input.subject.trim(),
    body: input.body.trim(),
    updatedAt: now,
  }),
});

export const listEmailTemplates = emailStore.list;
export const getEmailTemplate = emailStore.getOne;
export const addEmailTemplate = emailStore.add;
export const updateEmailTemplate = emailStore.update;
export const removeEmailTemplate = emailStore.remove;

/* ── SMS 템플릿 ────────────────────────────────────────────────────────────────
 *
 * 90byte 안팎으로 맞춘 정보성 문구. 'ntf-sms-3' 은 일부러 90byte 를 넘겨 LMS 로 승격되는 표본이다
 * (폼의 바이트 카운터·승격 안내가 실제로 걸리는지 눈으로 확인할 수 있게 둔다). */

const SMS_SEED: readonly SmsTemplate[] = [
  {
    id: 'ntf-sms-1',
    name: '주문 접수 안내(SMS)',
    trigger: 'order.placed',
    body: '[스페이스플래닝] #{이름}님, 주문(#{주문번호})이 접수되었습니다.',
    updatedAt: '2026-07-10T10:05:00.000Z',
  },
  {
    id: 'ntf-sms-2',
    name: '배송 출발 안내(SMS)',
    trigger: 'delivery.started',
    body: '[스페이스플래닝] #{이름}님, 상품이 출발했습니다. #{택배사} #{송장번호}',
    updatedAt: '2026-07-12T14:10:00.000Z',
  },
  {
    id: 'ntf-sms-3',
    name: '주문 취소 안내(SMS)',
    trigger: 'order.canceled',
    body: '[스페이스플래닝] #{이름}님, 주문(#{주문번호})이 취소되었습니다. 결제하신 #{결제금액}원은 카드사 정책에 따라 3~5영업일 내에 환불됩니다. 문의는 고객센터로 연락해 주세요.',
    updatedAt: '2026-07-11T16:40:00.000Z',
  },
  {
    id: 'ntf-sms-4',
    name: '인증번호 발송(SMS)',
    trigger: 'security.verification-code',
    body: '[스페이스플래닝] 인증번호 #{인증번호} 를 입력해 주세요.',
    updatedAt: '2026-07-14T09:00:00.000Z',
  },
  {
    id: 'ntf-sms-5',
    name: '배송 완료 안내(SMS)',
    trigger: 'delivery.completed',
    body: '[스페이스플래닝] #{이름}님, 상품이 배송 완료되었습니다.',
    updatedAt: '2026-07-13T18:20:00.000Z',
  },
];

const smsStore = createTemplateStore<SmsTemplate, SmsTemplateInput>({
  seed: SMS_SEED,
  idPrefix: 'ntf-sms-',
  notFound: 'SMS 템플릿을 찾을 수 없습니다',
  build: (input, id, now) => ({
    id,
    name: input.name.trim(),
    trigger: input.trigger,
    body: input.body.trim(),
    updatedAt: now,
  }),
  patch: (item, input, now) => ({
    ...item,
    name: input.name.trim(),
    trigger: input.trigger,
    body: input.body.trim(),
    updatedAt: now,
  }),
});

export const listSmsTemplates = smsStore.list;
export const getSmsTemplate = smsStore.getOne;
export const addSmsTemplate = smsStore.add;
export const updateSmsTemplate = smsStore.update;
export const removeSmsTemplate = smsStore.remove;

/* ── 발송 규칙 ─────────────────────────────────────────────────────────────────
 *
 * 'security.verification-code' SMS 규칙은 재시도 3회다 — 인증번호가 안 가면 로그인을 못 하기 때문이다.
 * 'account.dormant' 는 꺼둔 표본(운영자가 휴면 예고를 잠시 중단한 상태). */

let rules: readonly NotificationRule[] = [
  {
    id: 'ntf-rule-1',
    trigger: 'order.placed',
    channel: 'email',
    templateId: 'ntf-email-1',
    enabled: true,
    retryPolicy: 'once',
    updatedAt: '2026-07-10T10:10:00.000Z',
  },
  {
    id: 'ntf-rule-2',
    trigger: 'order.placed',
    channel: 'sms',
    templateId: 'ntf-sms-1',
    enabled: true,
    retryPolicy: 'once',
    updatedAt: '2026-07-10T10:12:00.000Z',
  },
  {
    id: 'ntf-rule-3',
    trigger: 'order.paid',
    channel: 'email',
    templateId: 'ntf-email-2',
    enabled: true,
    retryPolicy: 'once',
    updatedAt: '2026-07-11T09:35:00.000Z',
  },
  {
    id: 'ntf-rule-4',
    trigger: 'delivery.started',
    channel: 'sms',
    templateId: 'ntf-sms-2',
    enabled: true,
    retryPolicy: 'none',
    updatedAt: '2026-07-12T14:15:00.000Z',
  },
  {
    id: 'ntf-rule-5',
    trigger: 'account.created',
    channel: 'email',
    templateId: 'ntf-email-4',
    enabled: true,
    retryPolicy: 'none',
    updatedAt: '2026-07-05T08:05:00.000Z',
  },
  {
    id: 'ntf-rule-6',
    trigger: 'account.password-reset',
    channel: 'email',
    templateId: 'ntf-email-5',
    enabled: true,
    retryPolicy: 'thrice',
    updatedAt: '2026-07-13T11:25:00.000Z',
  },
  {
    id: 'ntf-rule-7',
    trigger: 'security.verification-code',
    channel: 'sms',
    templateId: 'ntf-sms-4',
    enabled: true,
    retryPolicy: 'thrice',
    updatedAt: '2026-07-14T09:05:00.000Z',
  },
  {
    id: 'ntf-rule-8',
    trigger: 'security.login-new-device',
    channel: 'email',
    templateId: 'ntf-email-6',
    enabled: true,
    retryPolicy: 'once',
    updatedAt: '2026-07-14T19:10:00.000Z',
  },
  {
    id: 'ntf-rule-9',
    trigger: 'account.dormant',
    channel: 'email',
    templateId: 'ntf-email-7',
    enabled: false,
    retryPolicy: 'none',
    updatedAt: '2026-07-09T07:05:00.000Z',
  },
];

let ruleSeq = rules.length;

export function listRules(): readonly NotificationRule[] {
  return sortRules(rules);
}

export function getRule(id: string): NotificationRule {
  const found = rules.find((rule) => rule.id === id);
  if (found === undefined) throw new Error('발송 규칙을 찾을 수 없습니다');
  return found;
}

export function addRule(input: NotificationRuleInput): void {
  ruleSeq += 1;
  rules = [...rules, { id: `ntf-rule-${String(ruleSeq)}`, ...input, updatedAt: nowIso() }];
}

export function updateRule(id: string, input: NotificationRuleInput): void {
  rules = rules.map((rule) => (rule.id === id ? { ...rule, ...input, updatedAt: nowIso() } : rule));
}

export function removeRule(id: string): void {
  rules = rules.filter((rule) => rule.id !== id);
}

/* ── 화면 간 조회 (규칙 ↔ 템플릿) ───────────────────────────────────────────── */

/** 규칙 폼의 템플릿 드롭다운 후보 — 채널과 트리거가 **둘 다** 맞는 템플릿만.
 *  트리거가 다른 템플릿을 걸면 그 이벤트가 주지 않는 변수가 빈칸으로 나간다. */
export function templateOptionsFor(
  channel: NotificationChannel,
  trigger: TriggerId,
): readonly { readonly id: string; readonly name: string }[] {
  const source = channel === 'email' ? emailStore.list() : smsStore.list();
  return source
    .filter((template) => template.trigger === trigger)
    .map((template) => ({ id: template.id, name: template.name }));
}

/** 규칙 목록이 보여줄 템플릿명 — 삭제된 템플릿을 가리키면 빈 문자열(화면이 경고를 띄운다) */
export function templateNameOf(channel: NotificationChannel, templateId: string): string {
  const store = channel === 'email' ? emailStore : smsStore;
  return store.find(templateId)?.name ?? '';
}

/** 이 템플릿을 쓰는 규칙 수 — 템플릿 삭제 전 경고에 쓴다(끊어진 규칙 예방) */
export function rulesUsingTemplate(templateId: string): number {
  return rules.filter((rule) => rule.templateId === templateId).length;
}
