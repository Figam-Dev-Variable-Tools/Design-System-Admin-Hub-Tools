// 프로그램 문의 저장소 — 목록·상세가 공유하는 정본 픽스처 + 상태 전이 규칙
//
// [이 문의는 어디서 들어오는가] 결제대행(PG)을 끄면 프로그램 페이지의 '후원하기' 버튼이
// '문의하기' 로 바뀐다. 후원하려던 사람이 그 자리에서 남긴 글이 여기로 들어온다. 항목을 만드는
// 것은 **후원자**이고 관리자는 답변하고 종결할 뿐이다 — 그래서 화면에는 등록 폼이 없다.
//
// [상품 문의와 왜 따로 사는가] 묻는 내용이 다르다. 상품은 '지금 살 수 있는 물건' 이지만 프로그램은
// **아직 만들어지지 않은 것에 돈을 먼저 거는 일**이라, 문의는 리워드 구성·배송 예정·환불 조건에
// 몰린다. 그래서 이 모듈에는 상품 문의에 없는 축(topic)이 하나 더 있다. 페이지 폴더는 각자
// 자기 저장소를 갖는다는 이 저장소의 규약도 함께 지킨다(다른 페이지의 모듈을 가져다 쓰지 않는다).
//
// [왜 답변과 상태를 한 함수가 옮기는가] '답변은 저장됐는데 상태는 아직 접수' 인 순간이 생기면
// 미답변 집계·목록 배지·경과 문구가 한꺼번에 거짓말을 한다. 두 사실이 갈라지지 않게 답변 본문·
// 답변 시각·상태는 **applyProgramAnswer 한 곳에서만 함께** 움직인다.
//
// [id 가 곧 문의번호다] 후원자가 부르는 번호와 관리자가 여는 URL 이 같은 값이어야 서로를 지목할
// 수 있다. 시각은 UTC(Z)로 저장하고 표기만 KST 로 환산한다(ERP-09) — 그래서 번호에 박히는 날짜도
// 문자열을 자르지 않고 KST 달력일로 계산한다.
import { seoulDayOf } from '../../../../shared/format';

/**
 * 처리 상태.
 *
 * `received`(접수) → `answering`(답변 중) → `answered`(답변 완료) → `closed`(종결).
 * 되돌아가는 전이는 없다 — 답변한 문의를 '접수' 로 되돌리면 그 사이의 응대 시간이 사라진다.
 */
export type ProgramInquiryStatus = 'received' | 'answering' | 'answered' | 'closed';

/** 유입 채널 — storefront 가 PG 를 끈 프로그램 페이지의 '문의하기' 버튼이다 */
export type ProgramInquiryChannel = 'storefront' | 'app' | 'phone' | 'email' | 'kakao';

/**
 * 문의 유형 — 후원형 펀딩에서 실제로 몰리는 질문의 갈래.
 * 리워드(무엇을 받나)·배송(언제 오나)·환불(못 받으면 어떻게 되나)이 세 축이고,
 * 결제는 PG 를 끈 지금 특히 자주 들어온다.
 */
export type ProgramInquiryTopic = 'reward' | 'delivery' | 'refund' | 'payment' | 'etc';

export interface ProgramInquiry {
  /** 문의번호를 겸한다 — 'PGQ-YYYYMMDD-NNN' (머리말) */
  readonly id: string;
  readonly programId: string;
  /** 비정규화 프로그램명 — 목록이 프로그램을 다시 조회하지 않게 한다 */
  readonly programName: string;
  readonly customerName: string;
  /** 연락처 — 회신 수단(이메일 또는 전화). 채널에 따라 형태가 다르다 */
  readonly customerContact: string;
  readonly channel: ProgramInquiryChannel;
  readonly topic: ProgramInquiryTopic;
  readonly subject: string;
  readonly message: string;
  readonly status: ProgramInquiryStatus;
  /** 접수 일시 ISO(UTC) */
  readonly createdAt: string;
  /** 최초 답변 일시 ISO(UTC) — 미답변이면 '' */
  readonly answeredAt: string;
  /** 답변 본문 — 미답변이면 '' */
  readonly answer: string;
}

export type ProgramInquiryInput = Omit<ProgramInquiry, 'id'>;

export const PROGRAM_INQUIRY_ANSWER_MAX = 1000;

/* ── 전이 규칙 (순수 함수) ────────────────────────────────────────────────────
 *
 * 규칙을 화면이 아니라 여기에 두는 이유: 버튼의 disabled 와 저장의 허용 여부가 서로 다른 판단을
 * 하면 '눌리는데 실패하는 버튼' 또는 '눌리지 않는데 서버는 허용하는 동작' 이 생긴다. */

export const PROGRAM_ANSWER_ON_CLOSED_ERROR = '종결된 문의는 답변을 수정할 수 없습니다.';
export const PROGRAM_CLOSE_UNANSWERED_ERROR = '답변하지 않은 문의는 종결할 수 없습니다.';
export const PROGRAM_EMPTY_ANSWER_ERROR = '답변 내용을 입력하세요.';
export const PROGRAM_BEGIN_ANSWERING_ERROR = '접수 상태의 문의만 답변 착수로 바꿀 수 있습니다.';

/** 아직 후원자가 답을 못 받은 상태인가 — 미답변 집계·경과 문구의 단일 정의 */
export function isProgramInquiryUnanswered(status: ProgramInquiryStatus): boolean {
  return status === 'received' || status === 'answering';
}

/** 답변을 쓰거나 고칠 수 있나 — 종결된 문의는 기록이라 손대지 않는다 */
export function canAnswerProgramInquiry(status: ProgramInquiryStatus): boolean {
  return status !== 'closed';
}

/** 종결할 수 있나 — 답변이 나간 뒤에만 닫는다 */
export function canCloseProgramInquiry(status: ProgramInquiryStatus): boolean {
  return status === 'answered';
}

/** 답변 착수로 바꿀 수 있나 — 접수 직후 한 번만 */
export function canBeginAnsweringProgramInquiry(status: ProgramInquiryStatus): boolean {
  return status === 'received';
}

/**
 * 답변을 얹는다 — 본문·답변 시각·상태가 **함께** 옮겨 간다(머리말).
 *
 * `answeredAt` 은 **최초 답변 시각**이라 재수정에서 바뀌지 않는다: 후원자에게 한 약속이 언제
 * 나갔는지는 나중에 고쳐 쓸 수 없는 사실이다. `at` 을 인자로 받는 이유는 테스트·스토리가 시계를
 * 고정할 수 있어야 하기 때문이다.
 */
export function applyProgramAnswer(
  inquiry: ProgramInquiry,
  answer: string,
  at: string,
): ProgramInquiry {
  if (!canAnswerProgramInquiry(inquiry.status)) throw new Error(PROGRAM_ANSWER_ON_CLOSED_ERROR);
  const body = answer.trim();
  if (body === '') throw new Error(PROGRAM_EMPTY_ANSWER_ERROR);
  return {
    ...inquiry,
    answer: body,
    answeredAt: inquiry.answeredAt === '' ? at : inquiry.answeredAt,
    status: 'answered',
  };
}

/** 종결 — 답변이 나간 문의만 닫는다 */
export function applyProgramClose(inquiry: ProgramInquiry): ProgramInquiry {
  if (!canCloseProgramInquiry(inquiry.status)) throw new Error(PROGRAM_CLOSE_UNANSWERED_ERROR);
  return { ...inquiry, status: 'closed' };
}

/** 답변 착수 — 담당자가 잡았다는 표시. 후원자에게는 아직 아무것도 나가지 않았다 */
export function applyProgramBeginAnswering(inquiry: ProgramInquiry): ProgramInquiry {
  if (!canBeginAnsweringProgramInquiry(inquiry.status)) {
    throw new Error(PROGRAM_BEGIN_ANSWERING_ERROR);
  }
  return { ...inquiry, status: 'answering' };
}

/** 저장소 쓰기용 입력으로 되돌린다 — 상세 화면이 저장 직전에 부른다 */
export function toProgramInquiryInput(inquiry: ProgramInquiry): ProgramInquiryInput {
  return {
    programId: inquiry.programId,
    programName: inquiry.programName,
    customerName: inquiry.customerName,
    customerContact: inquiry.customerContact,
    channel: inquiry.channel,
    topic: inquiry.topic,
    subject: inquiry.subject,
    message: inquiry.message,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
    answeredAt: inquiry.answeredAt,
    answer: inquiry.answer,
  };
}

/* ── 픽스처 (가상 인물·가상 연락처 — 실명 없음) ──────────────────────────────
 *
 * 프로그램명·id 는 프로그램 저장소(pages/programs/_shared/store.ts)의 것과 맞춰 두었다 — 같은
 * 프로그램을 두 화면에서 다른 이름으로 부르면 운영자가 같은 건인지 알 수 없다. */

let inquiries: ProgramInquiry[] = [
  {
    id: 'PGQ-20260717-001',
    programId: 'pgm-1',
    programName: '무선 스튜디오 모니터 헤드폰',
    customerName: '한도윤',
    customerContact: 'doyun.h@example.com',
    channel: 'storefront',
    topic: 'reward',
    subject: '2대 세트 리워드에 스탠드가 두 개 오나요',
    message:
      '2대 세트 리워드를 후원하려는데 구성 설명에 스탠드가 하나로 적혀 있습니다. 헤드폰만 두 대인가요?',
    status: 'received',
    createdAt: '2026-07-17T02:40:00Z',
    answeredAt: '',
    answer: '',
  },
  {
    id: 'PGQ-20260719-002',
    programId: 'pgm-2',
    programName: '접이식 원목 사이드테이블',
    customerName: '서예린',
    customerContact: '010-7745-2093',
    channel: 'app',
    topic: 'delivery',
    subject: '배송 예정일이 언제인지 궁금합니다',
    message: '펀딩 종료 후 몇 주 뒤에 받아볼 수 있을까요? 이사 일정과 맞춰야 해서 문의드립니다.',
    status: 'answering',
    createdAt: '2026-07-19T07:15:00Z',
    answeredAt: '',
    answer: '',
  },
  {
    id: 'PGQ-20260714-003',
    programId: 'pgm-4',
    programName: '휴대용 커피 드리퍼',
    customerName: '노지오',
    customerContact: 'jio.no@example.com',
    channel: 'email',
    topic: 'refund',
    subject: '목표 미달로 끝나면 후원금은 어떻게 되나요',
    message: '펀딩이 실패하면 결제한 금액은 자동으로 돌려받는 건가요? 절차를 알고 싶습니다.',
    status: 'answered',
    createdAt: '2026-07-14T01:20:00Z',
    answeredAt: '2026-07-15T05:10:00Z',
    answer:
      '목표 금액에 도달하지 못하면 결제는 진행되지 않으며, 이미 승인된 건은 전액 자동 취소됩니다. 취소 내역은 등록하신 이메일로 안내드립니다.',
  },
  {
    id: 'PGQ-20260708-004',
    programId: 'pgm-3',
    programName: '도시 산책 에세이집',
    customerName: '유하람',
    customerContact: '02-3391-7742',
    channel: 'phone',
    topic: 'payment',
    subject: '카드 결제가 되지 않아 후원을 못 했습니다',
    message: '후원하기 버튼이 문의하기로 바뀌어 있는데 결제는 어떻게 진행하나요?',
    status: 'closed',
    createdAt: '2026-07-08T05:05:00Z',
    answeredAt: '2026-07-08T08:30:00Z',
    answer:
      '현재 카드 결제를 잠시 중단하고 있어 계좌 후원으로 안내드렸습니다. 입금 확인 후 후원자 명단에 반영되었습니다.',
  },
  {
    id: 'PGQ-20260721-005',
    programId: 'pgm-5',
    programName: '마그네틱 충전 스탠드',
    customerName: '배시온',
    customerContact: '010-5528-4417',
    channel: 'kakao',
    topic: 'etc',
    subject: '오픈 알림을 받고 싶습니다',
    message: '오픈 예정이라고 되어 있는데 시작하면 알림을 받을 수 있나요?',
    status: 'received',
    createdAt: '2026-07-20T22:10:00Z',
    answeredAt: '',
    answer: '',
  },
];

let seq = inquiries.length;

/** 접수일 기준 번호를 만든다 — 후원자가 부르는 번호와 URL 이 같은 값이어야 한다(머리말) */
function nextInquiryId(createdAt: string): string {
  seq += 1;
  // 읽을 수 없는 시각이면 번호를 지어내지 않고 오늘(KST)로 붙인다 — 'NaN' 번호를 만들지 않는다
  const day = seoulDayOf(createdAt) ?? seoulDayOf(new Date().toISOString()) ?? '';
  return `PGQ-${day.replaceAll('-', '')}-${String(seq).padStart(3, '0')}`;
}

/* ── 저장소 API ───────────────────────────────────────────────────────────── */

export function listProgramInquiries(): readonly ProgramInquiry[] {
  return inquiries;
}

export function getProgramInquiry(id: string): ProgramInquiry {
  const found = inquiries.find((inquiry) => inquiry.id === id);
  if (found === undefined) throw new Error('문의를 찾을 수 없습니다');
  return found;
}

/** 후원자 채널이 만든다 — 관리자 화면에는 이 문을 여는 버튼이 없다(머리말) */
export function addProgramInquiry(input: ProgramInquiryInput): void {
  inquiries = [...inquiries, { id: nextInquiryId(input.createdAt), ...input }];
}

export function updateProgramInquiry(id: string, input: ProgramInquiryInput): void {
  inquiries = inquiries.map((inquiry) =>
    inquiry.id === id ? { ...inquiry, ...input, id: inquiry.id } : inquiry,
  );
}

export function removeProgramInquiry(id: string): void {
  inquiries = inquiries.filter((inquiry) => inquiry.id !== id);
}

/**
 * 답변 저장 — 본문과 상태가 한 번에 옮겨 간다(applyProgramAnswer 가 정본).
 * 상세 화면은 어댑터 update 를 지나가지만 같은 함수를 통과한다.
 */
export function answerInquiry(
  id: string,
  answer: string,
  at: string = new Date().toISOString(),
): void {
  const next = applyProgramAnswer(getProgramInquiry(id), answer, at);
  updateProgramInquiry(id, toProgramInquiryInput(next));
}

/** 종결 — 답변이 나간 문의만 닫는다 */
export function closeInquiry(id: string): void {
  const next = applyProgramClose(getProgramInquiry(id));
  updateProgramInquiry(id, toProgramInquiryInput(next));
}

/** 답변 착수 — 접수 → 답변 중 */
export function beginAnsweringInquiry(id: string): void {
  const next = applyProgramBeginAnswering(getProgramInquiry(id));
  updateProgramInquiry(id, toProgramInquiryInput(next));
}
