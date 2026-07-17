// 고객센터(CS) 픽스처 · 저장소 API
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건. 각 화면 data-source.ts 의
// // TODO(backend) 주석이 연동 지점이다. 정본이 서버로 옮겨가면 이 배열이 서버 상태로 바뀐다.
//
// [왜 한 곳인가] 유형 삭제 차단(사용 중)은 티켓·템플릿을 세어야 한다. 세 화면이 같은 상태를 참조하므로
// 픽스처와 저장소 API 를 이 잎 모듈 한 곳에 모은다(상품 _shared/store 와 같은 결).
import { countCategoryUsage } from './usage';
import type {
  ReplyTemplate,
  ReplyTemplateInput,
  SupportCategory,
  SupportCategoryInput,
  SupportCategoryUsage,
  Ticket,
  TicketInput,
} from './domain';
import { sortTickets, TEMPLATE_ALL_LABEL } from './domain';

/* ── 문의 유형 ─────────────────────────────────────────────────────────────── */

let categories: readonly SupportCategory[] = [
  { id: 'cat-order', label: '주문/결제', active: true },
  { id: 'cat-delivery', label: '배송', active: true },
  { id: 'cat-return', label: '교환/반품', active: true },
  { id: 'cat-account', label: '회원/계정', active: true },
  { id: 'cat-tech', label: '기술지원', active: true },
  { id: 'cat-etc', label: '기타', active: false },
];

/* ── 1:1 문의(티켓) ────────────────────────────────────────────────────────── */

let tickets: readonly Ticket[] = [
  {
    id: 'tkt-1',
    ticketNo: 'CS-20260714-001',
    title: '결제가 두 번 청구되었습니다',
    categoryId: 'cat-order',
    categoryLabel: '주문/결제',
    channel: 'kakao',
    priority: 'urgent',
    status: 'in_progress',
    assignee: '김상담',
    customerName: '박고객',
    contact: 'park@example.com',
    receivedAt: '2026-07-14T09:12:00',
    body: '어제 주문 결제가 카드로 두 번 승인되었습니다. 한 건 취소 부탁드립니다.',
    timeline: [
      {
        id: 'te-1',
        at: '2026-07-14T09:12:00',
        author: '시스템',
        kind: 'received',
        text: '카카오톡 문의 접수',
      },
      {
        id: 'te-2',
        at: '2026-07-14T09:20:00',
        author: '김상담',
        kind: 'assign',
        text: '김상담 배정',
      },
      {
        id: 'te-3',
        at: '2026-07-14T09:22:00',
        author: '김상담',
        kind: 'note',
        text: '결제 로그 확인 중 — 중복 승인 여부 조회 요청',
      },
    ],
  },
  {
    id: 'tkt-2',
    ticketNo: 'CS-20260714-002',
    title: '배송이 일주일째 오지 않아요',
    categoryId: 'cat-delivery',
    categoryLabel: '배송',
    channel: 'web',
    priority: 'high',
    status: 'received',
    assignee: '',
    customerName: '이지연',
    contact: '010-1234-5678',
    receivedAt: '2026-07-14T11:40:00',
    body: '7월 7일에 주문했는데 아직 배송 출발 안내가 없습니다. 확인 부탁드립니다.',
    timeline: [
      {
        id: 'te-4',
        at: '2026-07-14T11:40:00',
        author: '시스템',
        kind: 'received',
        text: '웹 문의 접수',
      },
    ],
  },
  {
    id: 'tkt-3',
    ticketNo: 'CS-20260713-018',
    title: '반품 접수 방법 문의',
    categoryId: 'cat-return',
    categoryLabel: '교환/반품',
    channel: 'naver',
    priority: 'normal',
    status: 'answered',
    assignee: '최지원',
    customerName: '정민수',
    contact: 'jung@example.com',
    receivedAt: '2026-07-13T15:05:00',
    body: '사이즈가 맞지 않아 반품하고 싶은데 절차를 알려주세요.',
    timeline: [
      {
        id: 'te-5',
        at: '2026-07-13T15:05:00',
        author: '시스템',
        kind: 'received',
        text: '네이버톡톡 문의 접수',
      },
      {
        id: 'te-6',
        at: '2026-07-13T15:30:00',
        author: '최지원',
        kind: 'assign',
        text: '최지원 배정',
      },
      {
        id: 'te-7',
        at: '2026-07-13T15:45:00',
        author: '최지원',
        kind: 'reply',
        text: '마이페이지 > 주문내역에서 반품 신청이 가능합니다. 회수 택배가 방문합니다.',
      },
      {
        id: 'te-8',
        at: '2026-07-13T15:46:00',
        author: '최지원',
        kind: 'status',
        text: "상태를 '답변완료'로 변경",
      },
    ],
  },
  {
    id: 'tkt-4',
    ticketNo: 'CS-20260712-007',
    title: '비밀번호 재설정이 안 됩니다',
    categoryId: 'cat-account',
    categoryLabel: '회원/계정',
    channel: 'email',
    priority: 'low',
    status: 'closed',
    assignee: '최지원',
    customerName: '한서준',
    contact: 'han@example.com',
    receivedAt: '2026-07-12T10:00:00',
    body: '비밀번호 찾기 메일이 오지 않습니다.',
    timeline: [
      {
        id: 'te-9',
        at: '2026-07-12T10:00:00',
        author: '시스템',
        kind: 'received',
        text: '이메일 문의 접수',
      },
      {
        id: 'te-10',
        at: '2026-07-12T10:40:00',
        author: '최지원',
        kind: 'reply',
        text: '스팸함 확인 후 재발송했습니다. 정상 수신 확인되었습니다.',
      },
      {
        id: 'te-11',
        at: '2026-07-12T11:00:00',
        author: '최지원',
        kind: 'status',
        text: "상태를 '종결'로 변경",
      },
    ],
  },
];

/* ── 답변 템플릿 ───────────────────────────────────────────────────────────── */

let templates: readonly ReplyTemplate[] = [
  {
    id: 'tpl-1',
    title: '결제 중복 확인 안내',
    categoryId: 'cat-order',
    categoryLabel: '주문/결제',
    body: '{{고객명}}님, 문의({{문의번호}}) 주셔서 감사합니다. 결제 내역 확인 결과 중복 승인 건은 자동 취소 처리되며 영업일 기준 3~5일 내 환불됩니다.',
  },
  {
    id: 'tpl-2',
    title: '배송 지연 사과 안내',
    categoryId: 'cat-delivery',
    categoryLabel: '배송',
    body: '{{고객명}}님, 배송이 지연되어 불편을 드려 죄송합니다. 확인 후 빠르게 출고되도록 조치하겠습니다.',
  },
  {
    id: 'tpl-3',
    title: '반품 절차 안내',
    categoryId: 'cat-return',
    categoryLabel: '교환/반품',
    body: '마이페이지 > 주문내역에서 반품 신청이 가능합니다. 신청 후 회수 택배가 방문하며, 상품 회수 후 환불이 진행됩니다.',
  },
  {
    id: 'tpl-4',
    title: '기본 접수 확인 인사',
    categoryId: '',
    categoryLabel: TEMPLATE_ALL_LABEL,
    body: '{{고객명}}님, 문의 주셔서 감사합니다. 담당자 {{담당자}}가 확인 후 신속히 답변드리겠습니다.',
  },
];

let categorySeq = categories.length;
let templateSeq = templates.length;

const categoryLabelOf = (categoryId: string): string =>
  categories.find((category) => category.id === categoryId)?.label ?? categoryId;

/* ── 유형 저장소 API ──────────────────────────────────────────────────────── */

function withUsage(category: SupportCategory): SupportCategoryUsage {
  const usage = countCategoryUsage(category.id, tickets, templates);
  return { ...category, ticketCount: usage.tickets, templateCount: usage.templates };
}

export function listCategoryUsage(): readonly SupportCategoryUsage[] {
  return categories.map(withUsage);
}

export function getCategoryUsage(id: string): SupportCategoryUsage {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) throw new Error('문의 유형을 찾을 수 없습니다');
  return withUsage(found);
}

/** 활성 유형만 — 신규 문의/템플릿의 유형 선택 드롭다운에 쓴다 */
export function listActiveCategories(): readonly SupportCategory[] {
  return categories.filter((category) => category.active);
}

export function addCategory(input: SupportCategoryInput): void {
  categorySeq += 1;
  categories = [
    ...categories,
    { id: `cat-${String(categorySeq)}`, label: input.label.trim(), active: input.active },
  ];
}

export function updateCategory(id: string, input: SupportCategoryInput): void {
  const trimmed = input.label.trim();
  categories = categories.map((category) =>
    category.id === id ? { ...category, label: trimmed, active: input.active } : category,
  );
  // 라벨 변경을 비정규화 라벨(티켓·템플릿)에도 반영한다(백엔드가 붙으면 서버가 정합성을 맡는다)
  tickets = tickets.map((ticket) =>
    ticket.categoryId === id ? { ...ticket, categoryLabel: trimmed } : ticket,
  );
  templates = templates.map((template) =>
    template.categoryId === id ? { ...template, categoryLabel: trimmed } : template,
  );
}

/** 사용 중이면 삭제하지 않는다(서버는 409 로 막는다). 프론트도 버튼을 잠근다. */
export function removeCategory(id: string): void {
  const usage = countCategoryUsage(id, tickets, templates);
  if (usage.tickets + usage.templates > 0) {
    throw new Error('사용 중인 문의 유형은 삭제할 수 없습니다.');
  }
  categories = categories.filter((category) => category.id !== id);
}

/* ── 티켓 저장소 API (문의는 고객이 만든다 — 관리자 생성/삭제 없음) ─────────── */

export function listTickets(): readonly Ticket[] {
  return sortTickets(tickets);
}

export function getTicket(id: string): Ticket {
  const found = tickets.find((ticket) => ticket.id === id);
  if (found === undefined) throw new Error('문의를 찾을 수 없습니다');
  return found;
}

export function updateTicket(id: string, input: TicketInput): void {
  tickets = tickets.map((ticket) =>
    ticket.id === id
      ? { ...ticket, ...input, categoryLabel: categoryLabelOf(input.categoryId) }
      : ticket,
  );
}

/* ── 템플릿 저장소 API ────────────────────────────────────────────────────── */

const withTemplateLabel = (template: ReplyTemplate): ReplyTemplate => ({
  ...template,
  categoryLabel:
    template.categoryId === '' ? TEMPLATE_ALL_LABEL : categoryLabelOf(template.categoryId),
});

export function listTemplates(): readonly ReplyTemplate[] {
  return templates.map(withTemplateLabel);
}

export function getTemplate(id: string): ReplyTemplate {
  const found = templates.find((template) => template.id === id);
  if (found === undefined) throw new Error('답변 템플릿을 찾을 수 없습니다');
  return withTemplateLabel(found);
}

export function addTemplate(input: ReplyTemplateInput): void {
  templateSeq += 1;
  templates = [
    ...templates,
    withTemplateLabel({
      id: `tpl-${String(templateSeq)}`,
      title: input.title.trim(),
      categoryId: input.categoryId,
      categoryLabel: '',
      body: input.body.trim(),
    }),
  ];
}

export function updateTemplate(id: string, input: ReplyTemplateInput): void {
  templates = templates.map((template) =>
    template.id === id
      ? withTemplateLabel({
          ...template,
          title: input.title.trim(),
          categoryId: input.categoryId,
          body: input.body.trim(),
        })
      : template,
  );
}

export function removeTemplate(id: string): void {
  templates = templates.filter((template) => template.id !== id);
}
