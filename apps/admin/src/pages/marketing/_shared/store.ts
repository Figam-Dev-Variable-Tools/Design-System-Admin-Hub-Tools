// 마케팅 픽스처 · 저장소 API
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건. 각 화면 data-source.ts 의
// // TODO(backend) 주석이 연동 지점이다. 정본이 서버로 옮겨가면 이 배열이 서버 상태로 바뀐다.
//
// [왜 한 곳인가] 세그먼트·발신번호/발신자를 SMS·이메일·뉴스레터 세 발송 화면이 함께 읽는다. 여러
// 화면이 같은 상태를 참조하므로 픽스처와 저장소 API 를 이 잎 모듈 한 곳에 모은다
// (고객센터 _shared/store 와 같은 결). 템플릿은 여기 없다 — 아래 [삭제됨] 문단이 그 이유다.
import type { Segment, SenderEmail, SenderNumber } from './messaging';

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

/* ── 발송 템플릿 ───────────────────────────────────────────────────────────────
 *
 * [삭제됨] templates 배열 + listTemplates/getTemplate/addTemplate/updateTemplate/removeTemplate/
 * listSendableTemplates — 알림톡 심사 모델의 '발송 템플릿' 저장소였다.
 *
 * 그 모델을 쓰던 화면(pages/marketing/templates/**)이 라우트에서 떨어져 나간 뒤로 아무도 이 배열에
 * 쓰지 않았는데, 뉴스레터 폼만 여기서 읽고 있었다 — 운영자가 템플릿 화면에서 만든 것이 뉴스레터의
 * '템플릿 불러오기' 에 영영 뜨지 않은 이유가 그것이다(같은 낱말, 다른 목록). 뉴스레터를
 * message-templates/store 의 selectableTemplates 로 옮기면서 마지막 소비자가 사라졌다.
 *
 * 템플릿의 정본은 이제 `message-templates/store.ts` 하나뿐이다. */
