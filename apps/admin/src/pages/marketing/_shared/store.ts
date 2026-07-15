// 마케팅 픽스처 · 저장소 API (A41 소유 — apps/admin/src/pages/marketing/**)
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건. 각 화면 data-source.ts 의
// // TODO(backend) 주석이 연동 지점이다. 정본이 서버로 옮겨가면 이 배열이 서버 상태로 바뀐다.
//
// [왜 한 곳인가] 세그먼트·발신번호/발신자는 SMS·이메일·뉴스레터가 함께 읽고, 발송 템플릿은 템플릿
// 화면이 쓰고 발송 화면이 읽는다. 여러 화면이 같은 상태를 참조하므로 픽스처와 저장소 API 를 이 잎
// 모듈 한 곳에 모은다(고객센터 _shared/store 와 같은 결).
import { sendableTemplatesFor } from './messaging';
import type {
  MessageChannel,
  MessageTemplate,
  MessageTemplateInput,
  Segment,
  SenderEmail,
  SenderNumber,
} from './messaging';

/* ── 수신자 세그먼트 ───────────────────────────────────────────────────────────
 *
 * 발송 대상 그룹. 실연동 시 세그먼트 빌더(상태·그룹·맞춤필드)가 서버에서 수신자 수를 계산해 준다. */
const SEGMENTS: readonly Segment[] = [
  {
    id: 'seg-all',
    label: '전체 수신동의 회원',
    recipientCount: 12840,
    description: '마케팅 수신에 동의한 전체 회원',
  },
  {
    id: 'seg-vip',
    label: 'VIP 등급',
    recipientCount: 640,
    description: '최근 6개월 구매금액 상위 5%',
  },
  {
    id: 'seg-dormant',
    label: '휴면 직전(90일 미방문)',
    recipientCount: 2130,
    description: '90일간 로그인·구매 없음',
  },
  {
    id: 'seg-cart',
    label: '장바구니 이탈',
    recipientCount: 415,
    description: '장바구니 담기 후 미결제 3일 경과',
  },
  {
    id: 'seg-newsletter',
    label: '뉴스레터 구독자',
    recipientCount: 5320,
    description: '뉴스레터 수신에 동의한 구독자',
  },
];

export function listSegments(): readonly Segment[] {
  return SEGMENTS;
}

/* ── 발신번호(SMS) · 발신자(이메일) ─────────────────────────────────────────────
 *
 * 발신번호 사전등록제(전기통신사업법 제84조의2): 검증(verified)된 번호로만 발신 가능. 미검증 번호는
 * 드롭다운에서 잠근다. */
const SENDER_NUMBERS: readonly SenderNumber[] = [
  { id: 'snd-main', number: '15881234', label: '대표번호', verified: true },
  { id: 'snd-mkt', number: '025771000', label: '마케팅센터', verified: true },
  { id: 'snd-new', number: '070123456789', label: '신규 등록(검수중)', verified: false },
];

const SENDER_EMAILS: readonly SenderEmail[] = [
  { id: 'from-news', email: 'news@spaceplanning.ai', name: '스페이스플래닝 뉴스', verified: true },
  {
    id: 'from-mkt',
    email: 'marketing@spaceplanning.ai',
    name: '스페이스플래닝 마케팅',
    verified: true,
  },
  {
    id: 'from-noreply',
    email: 'noreply@spaceplanning.ai',
    name: '스페이스플래닝',
    verified: false,
  },
];

export function listSenderNumbers(): readonly SenderNumber[] {
  return SENDER_NUMBERS;
}

export function listSenderEmails(): readonly SenderEmail[] {
  return SENDER_EMAILS;
}

/* ── 발송 템플릿 ───────────────────────────────────────────────────────────────── */

let templates: readonly MessageTemplate[] = [
  {
    id: 'tpl-sms-1',
    name: '주문 완료 안내(SMS)',
    channel: 'sms',
    title: '',
    body: '#{이름}님, 주문(#{주문번호})이 정상 접수되었습니다. 감사합니다.',
    approvalStatus: 'approved',
    rejectReason: '',
    updatedAt: '2026-07-10T10:00:00',
  },
  {
    id: 'tpl-sms-2',
    name: '여름 세일 광고(SMS)',
    channel: 'sms',
    title: '',
    body: '(광고) #{이름}님, 여름맞이 #{쿠폰명} 쿠폰이 발급되었습니다. 무료수신거부 080-123-4567',
    approvalStatus: 'approved',
    rejectReason: '',
    updatedAt: '2026-07-12T09:00:00',
  },
  {
    id: 'tpl-email-1',
    name: '월간 뉴스레터 기본형',
    channel: 'email',
    title: '[스페이스플래닝] #{이름}님을 위한 이달의 소식',
    body: '안녕하세요 #{이름}님,\n이번 달 새 소식과 혜택을 전해드립니다.\n\n감사합니다.',
    approvalStatus: 'approved',
    rejectReason: '',
    updatedAt: '2026-07-01T08:00:00',
  },
  {
    id: 'tpl-alim-1',
    name: '배송 출발 알림(알림톡)',
    channel: 'alimtalk',
    title: '배송 출발 안내',
    body: '#{이름}님, 주문하신 상품(#{주문번호})이 출발했습니다.',
    approvalStatus: 'approved',
    rejectReason: '',
    updatedAt: '2026-07-08T14:00:00',
  },
  {
    id: 'tpl-alim-2',
    name: '적립금 소멸 예정(알림톡)',
    channel: 'alimtalk',
    title: '적립금 소멸 예정 안내',
    body: '#{이름}님, 적립금 #{적립금}원이 곧 소멸될 예정입니다.',
    approvalStatus: 'inspecting',
    rejectReason: '',
    updatedAt: '2026-07-14T11:00:00',
  },
  {
    id: 'tpl-alim-3',
    name: '이벤트 참여 감사(알림톡)',
    channel: 'alimtalk',
    title: '이벤트 참여 감사',
    body: '#{이름} #{쿠폰명}',
    approvalStatus: 'rejected',
    rejectReason: '본문이 변수로만 구성되어 있습니다. 안내 문구를 추가해 주세요.',
    updatedAt: '2026-07-13T16:00:00',
  },
];

let templateSeq = templates.length;

function nowIso(): string {
  return new Date().toISOString();
}

export function listTemplates(): readonly MessageTemplate[] {
  return templates;
}

export function getTemplate(id: string): MessageTemplate {
  const found = templates.find((template) => template.id === id);
  if (found === undefined) throw new Error('발송 템플릿을 찾을 수 없습니다');
  return found;
}

export function addTemplate(input: MessageTemplateInput): void {
  templateSeq += 1;
  templates = [
    ...templates,
    {
      id: `tpl-${String(templateSeq)}`,
      name: input.name.trim(),
      channel: input.channel,
      title: input.title.trim(),
      body: input.body.trim(),
      approvalStatus: input.approvalStatus,
      rejectReason: input.rejectReason.trim(),
      updatedAt: nowIso(),
    },
  ];
}

export function updateTemplate(id: string, input: MessageTemplateInput): void {
  templates = templates.map((template) =>
    template.id === id
      ? {
          ...template,
          name: input.name.trim(),
          channel: input.channel,
          title: input.title.trim(),
          body: input.body.trim(),
          approvalStatus: input.approvalStatus,
          rejectReason: input.rejectReason.trim(),
          updatedAt: nowIso(),
        }
      : template,
  );
}

export function removeTemplate(id: string): void {
  templates = templates.filter((template) => template.id !== id);
}

/** 발송 화면 삽입 후보 — 채널별 발송 가능 템플릿(알림톡은 승인된 것만) */
export function listSendableTemplates(channel: MessageChannel): readonly MessageTemplate[] {
  return sendableTemplatesFor(templates, channel);
}
