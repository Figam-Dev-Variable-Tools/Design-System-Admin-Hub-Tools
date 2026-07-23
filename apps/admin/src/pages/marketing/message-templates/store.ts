// 메시지 템플릿 픽스처 · 저장소 API
//
// [왜 marketing/_shared/store.ts 가 아니라 여기인가]
// 그 파일은 **발송 템플릿(알림톡 심사 모델)** 과 세그먼트·발신번호를 담는 곳이고, SMS·이메일·뉴스레터
// 발송 화면이 함께 읽는다. 메시지 템플릿(types.ts)은 그 어느 화면도 아직 읽지 않는 **별개 생명주기의
// 물건**이라(types.ts 머리말) 같은 배열 옆에 얹으면 '템플릿' 이라는 낱말만 같은 두 모델이 한 파일에서
// 섞인다. 이 폴더의 편집기·목록·상세와 이메일 편집기(email/)만 이 저장소를 읽으므로 잎 모듈로 여기 둔다.
//
// [백엔드 없음] mutable 배열을 아래 쓰기 함수가 갱신한다 — 실제 네트워크 0건.
// 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import {
  findAdminGroup,
  listSenderCapableAdminGroups,
} from '../../../shared/fixtures/admin-groups';
import { createBlock, DEFAULT_CANVAS } from './email/blocks';
import {
  AC_BUTTON_NAME,
  ALIMTALK_EMPTY_TYPE_FIELDS,
  BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
} from './kakao';
import type { KakaoChannel } from './kakao';
import type {
  EmailBlock,
  MessageTemplate,
  SenderProfile,
  TemplateKind,
  TemplateStatus,
} from './types';

/* ── 발신 프로필 ───────────────────────────────────────────────────────────────
 *
 * [정본이 여기 없다] 예전에는 이 파일이 발신 프로필 배열을 직접 들고 있었다. 그런데 같은 실체가
 * 관리자 관리 화면에서는 '운영진 그룹' 이라는 이름으로 **따로** 하드코딩돼 있었다 — 한쪽에서 만든
 * 것이 다른 쪽에 나타나지 않았다. 둘을 하나로 합쳤고, 정본은 두 화면 중 누구의 것도 아닌
 * `shared/fixtures/admin-groups.ts` 다(그 파일 머리말이 근거를 갖는다).
 *
 * [왜 전부가 아니라 usableAsSender 만인가] 합쳐진 목록에는 조회·권한 필터 전용 그룹도 있다.
 * 그런 그룹까지 여기 뜨면 **고르면 발신번호 후보가 0개라 저장도 못 하는 항목**이 드롭다운을
 * 채운다. 목록은 하나, 발신 자격은 플래그로 가른다.
 *
 * `AdminGroup` 은 SenderProfile 의 필드(id·name·phoneNumbers·emails)를 전부 가지므로 구조적으로
 * 이 타입을 만족한다 — 변환 함수도 `as` 도 필요하지 않다. */
export function listSenderProfiles(): readonly SenderProfile[] {
  return listSenderCapableAdminGroups();
}

/**
 * 발신 프로필 1건 — 없으면 null.
 *
 * 그룹이 삭제됐거나(삭제 가드가 막지만 경합은 있다) 발신 자격이 꺼진 경우를 **둘 다** null 로
 * 본다. 자격이 꺼진 그룹을 돌려주면 셀렉트에 없는 값이 상세에만 이름으로 뜬다.
 */
export function findSenderProfile(id: string): SenderProfile | null {
  const group = findAdminGroup(id);
  return group !== null && group.usableAsSender ? group : null;
}

/** 목록·상세가 보여 줄 프로필 이름 — 못 찾으면 대시(값이 비었다는 사실을 그대로 보인다) */
export function senderProfileName(id: string): string {
  return findSenderProfile(id)?.name ?? '—';
}

/* ── 발신 카카오 채널 ──────────────────────────────────────────────────────────
 *
 * [왜 발신 프로필(운영진 그룹) 안이 아닌가] 발신번호·발신 이메일은 우리 조직의 자산이라 그룹에
 * 딸려 있다. 카카오 채널은 **카카오 비즈니스에 등록하고 발송대행사에 연결한 계정**이고 우리 그룹
 * 구조와 아무 관계가 없다 — 회사 전체가 채널 한둘을 공유한다. 그룹에 매달면 그룹을 만들 때마다
 * 같은 채널을 다시 고르게 되고, 그룹을 지우면 채널이 사라진 것처럼 보인다.
 * (kakao.ts 의 KakaoChannel 머리말과 같은 근거.)
 *
 * TODO(backend): GET /api/marketing/kakao-channels — 대행사에 연결된 채널만 내려온다.
 */
const kakaoChannels: readonly KakaoChannel[] = [
  { id: 'kc-main', name: '스페이스플래닝', searchId: '@spaceplanning' },
  { id: 'kc-support', name: '스페이스플래닝 고객센터', searchId: '@spaceplanning-cs' },
];

export function listKakaoChannels(): readonly KakaoChannel[] {
  return kakaoChannels;
}

/** 미리보기·상세가 보여 줄 채널명 — 못 찾으면 대시(senderProfileName 과 같은 결) */
export function kakaoChannelName(id: string): string {
  return kakaoChannels.find((channel) => channel.id === id)?.name ?? '—';
}

/* ── 이메일 캔버스·블록 기본값 ─────────────────────────────────────────────────
 *
 * [왜 여기서 만들지 않고 편집기 것을 쓰는가] 캔버스 색·폰트와 블록의 초기 속성은 이메일 편집기
 * (email/blocks.ts)가 소유한다. 저장소가 자기 기본값을 따로 들면 '새로 만든 템플릿' 과 '픽스처'
 * 와 '편집기가 블록을 추가할 때' 세 벌의 기본값이 생기고, 편집기에서 기본값을 바꿔도 픽스처만
 * 옛 값으로 남는다.
 *
 * [왜 토큰 CSS 변수를 쓰지 않는가 — 여기만은 진짜 색이어야 한다]
 * 이 값들은 **화면 스타일이 아니라 발송되는 메일의 데이터**다. 수신자는 Gmail·Outlook 에서 이 메일을
 * 열고, 그 안에는 우리 스타일시트가 없다 — `var(--tds-color-surface-default)` 는 아무것도 해석되지
 * 않아 색이 통째로 사라진다. 그래서 이 자리의 정본은 편집기가 들고 있는 실제 색상값이다. */
export const DEFAULT_EMAIL_CANVAS = DEFAULT_CANVAS;

/**
 * 픽스처 블록 한 개 — 편집기의 기본 블록에서 **내용만** 덮어쓴다(스타일 기본값은 편집기 것 그대로).
 *
 * kind 를 다시 확인하는 이유는 createBlock 이 판별 유니온을 돌려주기 때문이다 — divider 에는 content
 * 가 없으므로 `as` 로 우기는 대신 확인하고 덮는다(확인이 실패할 일은 없지만 타입이 그것을 안다).
 */
function contentBlock(kind: 'heading' | 'text', id: string, content: string): EmailBlock {
  const block = createBlock(kind, id);
  if (block.blockKind === 'heading' || block.blockKind === 'text') return { ...block, content };
  return block;
}

/* ── 템플릿 ────────────────────────────────────────────────────────────────────
 *
 * 픽스처는 **3개 상태 × 2개 종류를 모두** 덮는다. 상세 화면의 헤더 액션이 상태마다 통째로 갈리므로
 * (active=토글+삭제 / inactive=토글+삭제+수정 / draft=삭제+수정+발행) 한 상태라도 비면 그 분기를
 * 화면에서 한 번도 볼 수 없다. */
let templates: readonly MessageTemplate[] = [
  {
    id: 'mt-text-active',
    name: '주문 완료 안내',
    status: 'active',
    senderProfileId: 'sp-brand',
    content: {
      kind: 'text',
      // 제목 없음 = SMS 로 나간다. 세 픽스처가 SMS·LMS·MMS 를 하나씩 덮는다(PhoneFrame 세 갈래)
      subject: '',
      body: '#{이름}님, 주문(#{주문번호})이 정상 접수되었습니다.\n배송 시작 시 다시 안내드리겠습니다.',
      imageFileName: '',
      vendor: 'SureM',
      senderPhone: '1588-1234',
    },
    createdBy: '홍성보',
    createdAt: '2026-05-02T09:12:00',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-02T14:30:00',
  },
  {
    id: 'mt-text-inactive',
    name: '봄맞이 쿠폰 안내(종료)',
    status: 'inactive',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'text',
      // 이미지가 붙어 MMS — 제목이 함께 나간다
      subject: '봄맞이 쿠폰 도착',
      body: '(광고) #{이름}님, 봄맞이 #{쿠폰명} 쿠폰이 도착했습니다. 무료수신거부 080-123-4567',
      imageFileName: 'spring-coupon.jpg',
      vendor: 'NHN',
      senderPhone: '02-577-1000',
    },
    createdBy: '김다연',
    createdAt: '2026-03-04T10:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-06-01T11:20:00',
  },
  {
    id: 'mt-text-draft',
    name: '여름 시즌 프리뷰(작성 중)',
    status: 'draft',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'text',
      // 본문은 90byte 안이지만 제목이 있어 LMS 로 승격된다 — 승격 사유가 길이가 아닌 유일한 픽스처
      subject: '여름 신상 예고',
      body: '(광고) #{이름}님, 여름 시즌 신상품이 곧 공개됩니다.',
      imageFileName: '',
      vendor: 'Solapi',
      senderPhone: '070-1234-5678',
    },
    createdBy: '김다연',
    createdAt: '2026-07-14T16:05:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-16T09:40:00',
  },
  {
    id: 'mt-email-active',
    name: '월간 뉴스레터 기본형',
    status: 'active',
    senderProfileId: 'sp-brand',
    content: {
      kind: 'email',
      senderEmail: 'news@spaceplanning.ai',
      subject: '[스페이스플래닝] #{이름}님을 위한 이달의 소식',
      // 프리헤더가 채워진 유일한 픽스처 — 인박스 프리뷰가 '제목 뒤 한 줄' 을 그리는 경로를 덮는다
      preheader: '이번 달 신상품과 회원 전용 혜택을 모았어요.',
      blocks: [
        contentBlock('heading', 'blk-heading', '이달의 소식'),
        contentBlock(
          'text',
          'blk-text',
          '안녕하세요 #{이름}님, 이번 달 새 소식과 혜택을 전해드립니다.',
        ),
      ],
      canvas: DEFAULT_EMAIL_CANVAS,
    },
    createdBy: '홍성보',
    createdAt: '2026-01-08T08:00:00',
    lastEditedBy: '이수진',
    lastEditedAt: '2026-07-05T13:10:00',
  },
  {
    id: 'mt-email-inactive',
    name: '설 연휴 배송 안내(작년)',
    status: 'inactive',
    senderProfileId: 'sp-support',
    content: {
      kind: 'email',
      senderEmail: 'support@spaceplanning.ai',
      subject: '설 연휴 배송 일정 안내',
      preheader: '',
      blocks: [],
      canvas: DEFAULT_EMAIL_CANVAS,
    },
    createdBy: '이수진',
    createdAt: '2026-01-20T09:00:00',
    lastEditedBy: '이수진',
    lastEditedAt: '2026-02-02T17:45:00',
  },
  {
    id: 'mt-email-draft',
    name: '휴면 회원 리마인드(초안)',
    status: 'draft',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'email',
      senderEmail: 'marketing@spaceplanning.ai',
      subject: '#{이름}님, 오랜만이에요',
      preheader: '',
      blocks: [],
      canvas: DEFAULT_EMAIL_CANVAS,
    },
    createdBy: '김다연',
    createdAt: '2026-07-17T11:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-17T11:00:00',
  },

  /* ── 카카오 알림톡 ────────────────────────────────────────────────────────
   *
   * 픽스처가 덮는 것은 **심사 축**이다(발행 축은 위 문자·이메일이 이미 3상태를 다 덮는다).
   * 승인·발송완료 / 반려 / 검수중 셋을 둔다 — 잠금 사유가 셋이고(kakao.ts alimtalkLockReasonOf)
   * 하나라도 비면 그 배너를 화면에서 한 번도 볼 수 없다. */
  {
    id: 'mt-alimtalk-sent',
    name: '배송 출발 안내(발송 이력 있음)',
    status: 'active',
    senderProfileId: 'sp-brand',
    content: {
      kind: 'alimtalk',
      // 유형이 쓰지 않는 칸의 기본값 — 아래 명시한 값이 덮는다(kakao.ts 머리말)
      ...ALIMTALK_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      messageType: 'basic',
      emphasisType: 'title',
      emphasisTitle: '배송이 시작되었어요',
      emphasisSubtitle: '주문 #{주문번호}',
      body: '#{이름}님, 주문하신 상품이 오늘 출발했습니다.\n운송장 번호는 마이페이지에서 확인하실 수 있습니다.',
      buttons: [
        {
          id: 'btn-track',
          type: 'DS',
          name: '배송조회',
          linkMobile: '',
          linkPc: '',
        },
      ],
      variableSamples: { '#{이름}': '홍길동', '#{주문번호}': '20260716-0001' },
      approvalStatus: 'approved',
      rejectReason: '',
      // 이미 나갔다 — 승인을 취소해도 다시는 고칠 수 없다(kakao.ts alimtalkLockReasonOf)
      hasBeenSent: true,
    },
    createdBy: '홍성보',
    createdAt: '2026-02-10T09:00:00',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-02-12T15:20:00',
  },
  {
    id: 'mt-alimtalk-rejected',
    name: '리뷰 작성 요청(반려)',
    status: 'active',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'alimtalk',
      // 유형이 쓰지 않는 칸의 기본값 — 아래 명시한 값이 덮는다(kakao.ts 머리말)
      ...ALIMTALK_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      messageType: 'basic',
      emphasisType: 'none',
      emphasisTitle: '',
      emphasisSubtitle: '',
      body: '#{이름}님, 구매하신 상품은 어떠셨나요? 리뷰를 남겨 주시면 #{적립금}원을 드립니다.',
      buttons: [
        {
          id: 'btn-review',
          type: 'WL',
          name: '리뷰 쓰러 가기',
          linkMobile: 'https://m.spaceplanning.ai/reviews',
          linkPc: 'https://spaceplanning.ai/reviews',
        },
      ],
      variableSamples: { '#{이름}': '홍길동', '#{적립금}': '3,000' },
      // 'Active 인데 반려' 는 정상 상태다 — 발행 축과 심사 축이 별개라는 것이 여기서 눈에 보인다
      approvalStatus: 'rejected',
      rejectReason:
        '적립금 지급 안내는 광고성 정보로 판단돼요. 부가정보 영역으로 옮기거나 문구를 수정해 주세요.',
      hasBeenSent: false,
    },
    createdBy: '김다연',
    createdAt: '2026-06-20T13:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-01T10:05:00',
  },
  {
    id: 'mt-alimtalk-inspecting',
    name: '비밀번호 변경 알림(검수중)',
    status: 'draft',
    senderProfileId: 'sp-support',
    content: {
      kind: 'alimtalk',
      // 유형이 쓰지 않는 칸의 기본값 — 아래 명시한 값이 덮는다(kakao.ts 머리말)
      ...ALIMTALK_EMPTY_TYPE_FIELDS,
      channelId: 'kc-support',
      messageType: 'basic',
      emphasisType: 'title',
      emphasisTitle: '비밀번호가 변경되었어요',
      // 제작가이드 §2-2 — 제목과 보조문구는 함께 등록되어야 한다(한쪽만은 불가)
      emphasisSubtitle: '보안 알림',
      body: '#{이름}님, 방금 비밀번호가 변경되었습니다.\n본인이 하지 않으셨다면 즉시 고객센터로 연락해 주세요.',
      buttons: [],
      variableSamples: { '#{이름}': '홍길동' },
      approvalStatus: 'inspecting',
      rejectReason: '',
      hasBeenSent: false,
    },
    createdBy: '이수진',
    createdAt: '2026-07-16T09:30:00',
    lastEditedBy: '이수진',
    lastEditedAt: '2026-07-16T09:30:00',
  },

  /* ── 카카오 브랜드 메시지 (구 친구톡) ─────────────────────────────────────
   *
   * 심사가 없으므로 승인 상태가 없다 — 대신 광고성이 켜질 수 있고(광고)·수신거부 요건이 붙는다.
   * 구현한 두 유형(기본 텍스트형 · 이미지형)을 한 건씩 둔다. */
  {
    id: 'mt-brand-text',
    name: '주말 특가 안내(텍스트)',
    status: 'active',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'brandmessage',
      ...BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      bodyType: 'text',
      body: '(광고) #{이름}님, 이번 주말 단 3일간 전 상품 20% 할인합니다.\n무료수신거부 080-123-4567',
      imageFileName: '',
      buttons: [
        // 채널추가 버튼은 **가장 위**여야 한다 — 두 번째 자리에 두면 반려된다(kakao.ts buttonsError)
        { id: 'btn-add', type: 'AC', name: AC_BUTTON_NAME, linkMobile: '', linkPc: '' },
        {
          id: 'btn-shop',
          type: 'WL',
          name: '보러가기',
          linkMobile: 'https://m.spaceplanning.ai/sale',
          linkPc: 'https://spaceplanning.ai/sale',
        },
      ],
      variableSamples: { '#{이름}': '홍길동' },
      isAd: true,
    },
    createdBy: '김다연',
    createdAt: '2026-07-10T10:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-15T16:40:00',
  },
  {
    id: 'mt-brand-image',
    name: '신상품 입고(이미지)',
    status: 'draft',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'brandmessage',
      ...BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      bodyType: 'image',
      body: '#{이름}님, 기다리시던 신상품이 입고되었습니다.',
      imageFileName: 'new-arrival.jpg',
      buttons: [],
      variableSamples: { '#{이름}': '홍길동' },
      isAd: false,
    },
    createdBy: '홍성보',
    createdAt: '2026-07-18T08:20:00',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-18T08:20:00',
  },

  /* ── 알림톡 — 나머지 강조 유형 · 메시지 유형 ─────────────────────────────
   *
   * 위 셋이 심사 축을 덮었다면 아래 둘은 **유형 축**을 덮는다. 이미지형·아이템리스트형과
   * 복합형(부가정보 + 채널추가)이 한 번도 안 나오면 그 미리보기 분기를 아무도 못 본다. */
  {
    id: 'mt-alimtalk-image',
    name: '입장권 발급 안내(이미지형)',
    status: 'active',
    senderProfileId: 'sp-brand',
    content: {
      kind: 'alimtalk',
      ...ALIMTALK_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      messageType: 'basic',
      emphasisType: 'image',
      emphasisImageFileName: 'ticket-header-800x400.jpg',
      body: '#{이름}님, 입장권이 발급되었습니다.\n입장 시 아래 QR 코드를 제시해 주세요.',
      buttons: [
        {
          id: 'btn-ticket',
          type: 'WL',
          name: '입장권 보기',
          linkMobile: 'https://m.spaceplanning.ai/ticket',
          linkPc: 'https://spaceplanning.ai/ticket',
        },
      ],
      variableSamples: { '#{이름}': '홍길동' },
      approvalStatus: 'approved',
      rejectReason: '',
      hasBeenSent: false,
    },
    createdBy: '이수진',
    createdAt: '2026-07-05T11:00:00',
    lastEditedBy: '이수진',
    lastEditedAt: '2026-07-05T11:00:00',
  },
  {
    id: 'mt-alimtalk-itemlist',
    name: '결제 완료 내역(아이템리스트 · 복합형)',
    status: 'active',
    senderProfileId: 'sp-brand',
    content: {
      kind: 'alimtalk',
      ...ALIMTALK_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      /* 복합형 = 부가정보 + 채널추가. 두 영역이 동시에 붙는 유일한 유형이라 여기서 한 번은
         보여야 한다(kakao.ts hasExtraInfo · hasChannelAddGuide). */
      messageType: 'complex',
      emphasisType: 'item-list',
      itemHeader: '결제 내역',
      itemHighlightTitle: '결제가 완료되었어요',
      itemHighlightDescription: '#{이름}님',
      items: [
        { id: 'it-1', name: '주문번호', description: '#{주문번호}' },
        { id: 'it-2', name: '결제금액', description: '#{적립금}원' },
        { id: 'it-3', name: '결제수단', description: '신용카드' },
      ],
      extraInfo: '결제 취소는 마이페이지 > 주문내역에서 가능하며, 영수증은 이메일로 발송돼요.',
      body: '주문해 주셔서 감사합니다. 배송이 시작되면 다시 안내드리겠습니다.',
      buttons: [
        // 채널추가 버튼이 맨 위 — 복합형이라 쓸 수 있다
        { id: 'btn-add-2', type: 'AC', name: AC_BUTTON_NAME, linkMobile: '', linkPc: '' },
        {
          id: 'btn-order',
          type: 'WL',
          name: '주문 상세',
          linkMobile: 'https://m.spaceplanning.ai/orders',
          linkPc: 'https://spaceplanning.ai/orders',
        },
      ],
      variableSamples: {
        '#{이름}': '홍길동',
        '#{주문번호}': '20260716-0001',
        '#{적립금}': '48,000',
      },
      approvalStatus: 'approved',
      rejectReason: '',
      hasBeenSent: false,
    },
    createdBy: '홍성보',
    createdAt: '2026-07-06T14:00:00',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-06T14:00:00',
  },

  /* ── 브랜드 메시지 — 나머지 세 유형 ───────────────────────────────────────
   *
   * 와이드 이미지형(76자) · 와이드 리스트형(항목 3~4) · 캐러셀 피드형(카드 2~6). 세 유형은
   * 미리보기 모양이 통째로 다르므로(KakaoFrame) 각자 한 건씩 있어야 그 분기를 볼 수 있다. */
  {
    id: 'mt-brand-wide',
    name: '여름 세일 배너(와이드 이미지)',
    status: 'active',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'brandmessage',
      ...BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      bodyType: 'wide-image',
      // 76자 상한이라 한 문장이 전부다 — 이 유형을 고르면 글이 아니라 그림이 말한다
      body: '(광고) 여름 시즌오프 최대 70%\n무료수신거부 080-123-4567',
      imageFileName: 'summer-sale-800x600.jpg',
      buttons: [
        {
          id: 'btn-wide',
          type: 'WL',
          name: '지금 보기',
          linkMobile: 'https://m.spaceplanning.ai/summer',
          linkPc: 'https://spaceplanning.ai/summer',
        },
      ],
      variableSamples: {},
      isAd: true,
    },
    createdBy: '김다연',
    createdAt: '2026-07-11T09:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-11T09:00:00',
  },
  {
    id: 'mt-brand-list',
    name: '이주의 추천 상품(와이드 리스트)',
    status: 'active',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'brandmessage',
      ...BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      bodyType: 'wide-list',
      // 이 유형에서 body 는 리스트 머리글이다(kakao.ts BRAND_MESSAGE_BODY_MAX 주석)
      body: '이주의 추천',
      imageFileName: '',
      listItems: [
        { id: 'li-1', title: '리넨 커튼 신상', imageFileName: 'list-1.jpg' },
        { id: 'li-2', title: '우드 사이드테이블', imageFileName: 'list-2.jpg' },
        { id: 'li-3', title: '조명 기획전', imageFileName: 'list-3.jpg' },
      ],
      buttons: [
        {
          id: 'btn-list',
          type: 'WL',
          name: '전체 보기',
          linkMobile: 'https://m.spaceplanning.ai/weekly',
          linkPc: 'https://spaceplanning.ai/weekly',
        },
      ],
      variableSamples: {},
      isAd: false,
    },
    createdBy: '김다연',
    createdAt: '2026-07-12T09:00:00',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-12T09:00:00',
  },
  {
    id: 'mt-brand-carousel',
    name: '가을 신상 라인업(캐러셀)',
    status: 'draft',
    senderProfileId: 'sp-marketing',
    content: {
      kind: 'brandmessage',
      ...BRAND_MESSAGE_EMPTY_TYPE_FIELDS,
      channelId: 'kc-main',
      bodyType: 'carousel',
      // 캐러셀은 카드마다 본문이 있다 — 여기 body 는 카드 위에 붙는 안내 한 줄이다
      body: '가을 신상이 도착했습니다.',
      imageFileName: '',
      cards: [
        {
          id: 'cc-1',
          header: '리빙',
          body: '패브릭 소파 커버 신상 3종. 지금 주문하면 다음 주 배송됩니다.',
          imageFileName: 'carousel-living.jpg',
          buttons: [
            {
              id: 'cc-1-b1',
              type: 'WL',
              name: '보러가기',
              linkMobile: 'https://m.spaceplanning.ai/living',
              linkPc: 'https://spaceplanning.ai/living',
            },
          ],
        },
        {
          id: 'cc-2',
          header: '주방',
          body: '스테인리스 조리도구 기획전. 2개 이상 구매 시 10% 추가 할인.',
          imageFileName: 'carousel-kitchen.jpg',
          buttons: [
            {
              id: 'cc-2-b1',
              type: 'WL',
              name: '보러가기',
              linkMobile: 'https://m.spaceplanning.ai/kitchen',
              linkPc: 'https://spaceplanning.ai/kitchen',
            },
          ],
        },
      ],
      buttons: [],
      variableSamples: {},
      isAd: false,
    },
    createdBy: '홍성보',
    createdAt: '2026-07-18T09:00:00',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-18T09:00:00',
  },
];

/** 새로 만들 때 쓰는 입력 — id·이력은 저장소가 붙인다(화면이 만든 시각을 믿지 않는다) */
export type MessageTemplateDraft = Pick<
  MessageTemplate,
  'name' | 'status' | 'senderProfileId' | 'content'
>;

let templateSeq = templates.length;

/**
 * 픽스처의 '지금 로그인한 운영자'.
 * TODO(backend): 서버가 인증 주체로 채운다 — 화면이 보낸 이름을 그대로 믿지 않는다.
 */
const CURRENT_EDITOR = '홍성보';

function nowIso(): string {
  return new Date().toISOString();
}

export function listMessageTemplates(): readonly MessageTemplate[] {
  return templates;
}

/**
 * 이 발신 프로필을 쓰고 있는 템플릿 이름들 — 운영진 그룹 삭제 가드가 읽는다
 * (`pages/admins/data-source.ts`).
 *
 * [왜 여기인가] 템플릿 배열의 정본은 이 파일이다. 삭제 가드가 그 배열을 직접 훑으려 들면
 * 저장소 내부(mutable 참조)가 밖으로 새어 나간다 — 질문 하나를 함수 하나로 답한다.
 * 상태(초안/미사용)를 가리지 않는다: 꺼 둔 템플릿도 발신 프로필을 가리키고 있고, 그룹이
 * 사라지면 그 템플릿은 다시 켤 수 없는 상태가 된다.
 */
export function templateNamesBySenderProfile(id: string): readonly string[] {
  return templates
    .filter((template) => template.senderProfileId === id)
    .map((template) => template.name);
}

/**
 * 발송 화면이 고를 수 있는 템플릿 — **켜져 있는(Active)** 것만, 그리고 그 화면의 종류만.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 Active 만인가 — 이것이 발행 상태를 둔 이유 그 자체다]
 *   · draft    아직 작성 중이다. 발송 화면에 뜨면 '쓰다 만 문구' 가 고객에게 나간다.
 *   · inactive 발행됐다가 **운영자가 끈 것**이다. 시즌이 끝난 문구를 남겨 둔 것은 과거 발송 이력을
 *              읽기 위해서지 다시 쓰기 위해서가 아니다 — 여기 뜨면 끄는 행위가 아무 의미도 없어진다.
 * (types.ts TemplateStatus 머리말)
 *
 * [왜 화면이 아니라 여기인가] SMS 발송과 이메일 발송이 같은 규칙을 본다. 각 화면이
 * `status === 'active'` 를 따로 세면 한쪽만 고쳐진 채 나머지가 남는다 — 그리고 그 실수는
 * '꺼 둔 템플릿이 발송된다' 는 형태로 나타나 화면을 봐서는 알 수 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function selectableTemplates(kind: TemplateKind): readonly MessageTemplate[] {
  return templates.filter(
    (template) => template.status === 'active' && template.content.kind === kind,
  );
}

/**
 * 드롭다운이 필요로 하는 최소한 — 식별자와 보여 줄 이름.
 *
 * [왜 MessageTemplate 을 그대로 넘기지 않는가] 발송 화면의 선택 카드는 템플릿의 **모양을 알 필요가
 * 없다**. 도메인 타입을 넘기면 그 카드가 블록·발행상태·심사이력까지 아는 것이 되고, 모델이 바뀔
 * 때마다 관계없는 카드가 함께 흔들린다. MessageTemplate 은 구조적으로 이 타입을 만족하므로
 * 호출부는 그대로 넘기면 된다.
 */
export interface TemplateOption {
  readonly id: string;
  readonly name: string;
}

export function getMessageTemplate(id: string): MessageTemplate {
  const found = templates.find((template) => template.id === id);
  if (found === undefined) throw new Error('메시지 템플릿을 찾을 수 없어요');
  return found;
}

export function addMessageTemplate(draft: MessageTemplateDraft): void {
  templateSeq += 1;
  const stamp = nowIso();
  templates = [
    ...templates,
    {
      id: `mt-${String(templateSeq)}`,
      name: draft.name.trim(),
      status: draft.status,
      senderProfileId: draft.senderProfileId,
      content: draft.content,
      createdBy: CURRENT_EDITOR,
      createdAt: stamp,
      lastEditedBy: CURRENT_EDITOR,
      lastEditedAt: stamp,
    },
  ];
}

export function updateMessageTemplate(id: string, draft: MessageTemplateDraft): void {
  templates = templates.map((template) =>
    template.id === id
      ? {
          ...template,
          name: draft.name.trim(),
          status: draft.status,
          senderProfileId: draft.senderProfileId,
          content: draft.content,
          // 생성 이력은 건드리지 않는다 — 누가 처음 만들었는지는 편집으로 바뀌지 않는다
          lastEditedBy: CURRENT_EDITOR,
          lastEditedAt: nowIso(),
        }
      : template,
  );
}

export function removeMessageTemplate(id: string): void {
  templates = templates.filter((template) => template.id !== id);
}

/**
 * 상태만 바꾼다 (발행 · 사용 여부 토글).
 *
 * [왜 update 로 하지 않나] 상세 화면에는 편집 폼이 없다 — 토글을 켜려고 본문 전체를 다시 보내면
 * 그 사이 다른 관리자가 고친 본문을 **내가 화면에서 들고 있던 옛 값으로 덮어쓴다**. 바꾸는 것이
 * 상태 하나뿐이면 보내는 것도 상태 하나여야 한다.
 * TODO(backend): PATCH /api/marketing/message-templates/:id/status
 */
export function setMessageTemplateStatus(id: string, status: TemplateStatus): void {
  templates = templates.map((template) =>
    template.id === id
      ? { ...template, status, lastEditedBy: CURRENT_EDITOR, lastEditedAt: nowIso() }
      : template,
  );
}
