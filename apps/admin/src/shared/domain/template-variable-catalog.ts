// 치환 변수 카탈로그 — **정본은 이 파일 하나다**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 한 곳인가] 발송 템플릿은 이메일·문자·알림톡·브랜드 메시지 네 편집기가 쓰고, 삽입 UI 도
// 두 벌(이메일 툴바의 ✨ Variable, 문자/발송 폼의 VariableInsertBar)이다. 도메인 화면이 각자
// 자기 변수 목록을 들면 여섯 벌이 되고, 그중 하나에만 필드를 더한 날 나머지 다섯이 조용히
// 뒤처진다. 목록이 하나면 그 어긋남이 구조적으로 생기지 않는다.
//
// [왜 pages/ 가 아니라 shared/domain 인가] 이 목록은 6개 도메인의 값을 다루므로 **누구의
// 소유도 아니다**. pages/members 에 두면 pages/marketing 이 그것을 import 해야 하고, 그
// 순간 축1(page-coupling, blocker)이다. 방향을 뒤집는 방법은 template-variables.ts 머리말에.
//
// ─────────────────────────────────────────────────────────────────────────────
// [지어내지 않았다 — 모든 항목에 근거가 있다]
//
// 각 항목의 `source` 는 그 필드가 **실제로 존재하는 파일**이다. label 은 그 화면이 실제로 쓰는
// 한국어 낱말이고(폼 라벨·표 머리글), sample 은 그 도메인의 **픽스처에 들어 있는 값**이다.
// 표본값을 지어내면 길이 감각이 틀어져서 '치환 후 예상 길이' 가 거짓말을 한다 — 실제 데이터의
// 길이여야 그 숫자가 쓸모 있다.
//
// 새 항목을 더할 때도 같다: 화면·타입·픽스처를 먼저 확인하고, 근거 경로를 함께 적는다.
// `template-variables.test.ts` 가 키 표기·표본값 존재·중복을 전수 검사한다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [제외한 것 — 왜 빠졌는지 남긴다]
//
// 다시 넣자는 제안이 반복되지 않도록 이유를 적어 둔다. 크게 세 갈래다.
//
// (가) 자격증명 — 치환 변수가 되어서는 안 되는 것
//   · 비밀번호(`members/validation.ts` passwordChangeSchema 의 password/confirm) — 애초에
//     저장되지 않는 임시 폼 값이다. `MemberInfoCard.tsx` 는 실값 대신 '••••••••' 를 그리고
//     "실제 값은 절대 내려오지 않는다" 는 주석을 달아 뒀다. 목록에 올리는 것 자체가 사고다.
//   · 카드번호·인증 토큰·API 키 — 6개 도메인 타입 전수를 훑었고 **존재하지 않는다**. 없는
//     것을 '제외했다' 고 적는 이유는, 훑지 않은 것과 훑고 없음을 확인한 것이 다르기 때문이다.
//   · 일회용 인증코드 — 도메인 필드가 아니라 발송 시점의 일회용 값이다. 카탈로그에 올리면
//     아무 템플릿에서나 꺼내 쓸 수 있게 되어 마케팅 메일에도 꽂힌다. 인증 메일은 카탈로그가
//     아니라 그 메일 전용 파라미터로 다뤄야 한다.
//   · 멱등키(`members/data-source.ts` addPointHistory 의 idempotencyKey) — 요청 중복 방지용
//     불투명 UUID. 사람이 읽을 값이 아니다.
//
// (나) 내부 정보 — 수신자가 보면 안 되는 것. 자격증명은 아니지만 나가면 사고다.
//   · 관리자 메모류: `Member.memo`(관리자 메모) · `Account.note` · `Contract.note` ·
//     `Project.note` · `ReturnRequest.adminNote`('착용 흔적으로 교환 반려 안내함.') ·
//     `Review.reportReason`('스팸/광고') · `InquiryEvent`/`TicketEvent` 의 kind==='note'(내부메모).
//   · 내부 평가·영업 정보: `Account.creditGrade`·`creditLimit`(여신 심사) ·
//     `Project.probability`·`expectedRevenue`·`lostReason`(수주 확률·예상 매출·실주 사유) ·
//     이것들은 화면에 라벨이 붙어 있어서 '입력받는 값' 으로 보이지만, 받는 쪽이 고객이 아니다.
//   · `MemberDetail.lastLoginIp`(최종 로그인 IP) — 보안 텔레메트리. 고객 메시지에 있을 이유가 없다.
//
// (다) 치환에 적합하지 않은 모양
//   · 불투명 id(`M-00001`·`acc-1`·`prd-1` 등) — 사람이 읽는 번호가 아니다. 반면
//     견적번호·문의번호·접수번호·문의번호(CS)는 **사람이 읽는 업무 번호**라 포함한다.
//   · 배열·첨부(`imageUrls`·`Contract.attachments`(계약서 스캔, 서명 이미지 가능)·`timeline`).
//   · 고객 자유 서술(`Ticket.body`·`Inquiry.body`) — 무엇이든 들어올 수 있는 칸이라 발송 본문에
//     그대로 흘리면 길이도 내용도 통제되지 않는다.
//   · 원본 연락처(`Ticket.contact`·`Inquiry.contact`) — 발송 **대상**으로 쓸 값이지 본문에
//     인쇄할 값이 아니다. 회원 도메인의 `member.phone` 은 회원 자신에게 보내는 확인 문구에
//     쓰이므로 남긴다.
//
// 주의: `ReturnRequest.customer`·`Review.author` 는 이미 마스킹된 값이다('김**'·'민**' — 타입
// 주석 "마스킹된 이름(실명 아님)"). 실명이 필요하면 회원 도메인에서 가져와야 한다.
// ─────────────────────────────────────────────────────────────────────────────
import type { TemplateVariableCatalog } from './template-variables';

const P = 'apps/admin/src/pages';

export const TEMPLATE_VARIABLE_CATALOG: TemplateVariableCatalog = [
  /* ── 회원 ──────────────────────────────────────────────────────────────────
   *
   * 모델의 정본은 `shared/domain/member.ts` 다 — `pages/members/types.ts` 는 재export 뿐이다.
   * 표본값은 픽스처 0번 회원(M-00001, 닉네임 명재우)의 값이다. */
  {
    label: '회원',
    variables: [
      // shared/domain/member.ts · MemberInfoCard.tsx — 회원 정보 카드
      {
        key: 'member.name',
        label: '이름',
        sample: '명재우',
        source: 'apps/admin/src/shared/domain/member.ts',
      },
      {
        key: 'member.nickname',
        label: '닉네임',
        sample: '명재우',
        source: 'apps/admin/src/shared/fixtures/members.ts',
      },
      {
        key: 'member.account',
        label: '계정',
        sample: '1000@naver.com',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.phone',
        label: '연락처',
        sample: '010-0000-0000',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.tier',
        label: '회원 유형',
        sample: 'VVIP',
        source: 'apps/admin/src/shared/domain/member.ts',
      },
      {
        key: 'member.country',
        label: '국가',
        sample: '대한민국',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.address',
        label: '주소',
        sample: '서울특별시 강남구 테헤란로 123',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.addressDetail',
        label: '상세주소',
        sample: '1층 1호',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.birthday',
        label: '생년월일',
        sample: '1980-01-01',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.referralCode',
        label: '추천인 코드',
        sample: 'RF00001',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.referrer',
        label: '추천인',
        sample: '이병우',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      {
        key: 'member.socialLogin',
        label: '소셜 로그인',
        sample: '없음',
        source: `${P}/members/components/MemberInfoCard.tsx`,
      },
      // ActivityCard.tsx · data-source.ts CSV 머리글 — 활동 정보
      {
        key: 'member.joinedAt',
        label: '가입일',
        sample: '2026-07-14',
        source: `${P}/members/components/ActivityCard.tsx`,
      },
      {
        key: 'member.lastLoginAt',
        label: '최종 로그인 일시',
        sample: '2026-07-14 00:00',
        source: `${P}/members/components/ActivityCard.tsx`,
      },
      {
        key: 'member.loginCount',
        label: '로그인 횟수',
        sample: '3',
        source: `${P}/members/components/ActivityCard.tsx`,
      },
      {
        key: 'member.points',
        label: '적립금',
        sample: '10,000',
        source: `${P}/members/components/PointsCard.tsx`,
      },
      {
        key: 'member.totalPurchase',
        label: '누적 구매금액',
        sample: '150,000',
        source: `${P}/members/data-source.ts`,
      },
      {
        key: 'member.group',
        label: '회원 그룹',
        sample: '무료 배송 결제 그룹',
        source: `${P}/members/data-source.ts`,
      },
      // CouponsCard.tsx — 보유 쿠폰(회원이 실제로 들고 있는 것. 상품 도메인의 쿠폰 '정의' 와 다르다)
      {
        key: 'memberCoupon.name',
        label: '보유 쿠폰명',
        sample: '신규 가입 감사 쿠폰',
        source: `${P}/members/components/CouponsCard.tsx`,
      },
      {
        key: 'memberCoupon.benefit',
        label: '보유 쿠폰 혜택',
        sample: '10% 할인',
        source: `${P}/members/components/CouponsCard.tsx`,
      },
      {
        key: 'memberCoupon.expiresAt',
        label: '보유 쿠폰 만료일',
        sample: '2026-08-31',
        source: `${P}/members/components/CouponsCard.tsx`,
      },
      // PointsCard.tsx — 적립금 증감 내역
      {
        key: 'memberPoint.reason',
        label: '적립금 증감 사유',
        sample: '구매 확정 적립',
        source: `${P}/members/components/PointsCard.tsx`,
      },
      {
        key: 'memberPoint.amount',
        label: '적립금 증감액',
        sample: '6,000',
        source: `${P}/members/components/PointsCard.tsx`,
      },
      {
        key: 'memberPoint.date',
        label: '적립금 증감 일자',
        sample: '2026-06-28',
        source: `${P}/members/components/PointsCard.tsx`,
      },
      {
        key: 'memberPoint.orderNo',
        label: '적립 주문번호',
        sample: '2026062800',
        source: 'apps/admin/src/shared/domain/member.ts',
      },
    ],
  },

  /* ── 영업 ──────────────────────────────────────────────────────────────────
   *
   * 거래처·견적·계약·문의·프로젝트 다섯 화면. B2B 문서(견적서·계약서) 발송 문구가
   * 가장 많이 쓰는 묶음이다. */
  {
    label: '영업',
    variables: [
      // sales/accounts — 거래처
      {
        key: 'account.name',
        label: '상호(거래처명)',
        sample: '(주)한빛소프트웨어',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.bizNo',
        label: '사업자등록번호',
        sample: '124-81-00998',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.ceoName',
        label: '대표자명',
        sample: '김한빛',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.bizType',
        label: '업태',
        sample: '서비스',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.bizItem',
        label: '종목',
        sample: '소프트웨어 개발',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.address',
        label: '사업장 주소',
        sample: '서울특별시 강남구 테헤란로 123, 8층',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.phone',
        label: '대표 전화',
        sample: '02-1234-5678',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'account.taxType',
        label: '과세유형',
        sample: '일반과세',
        source: `${P}/sales/accounts/types.ts`,
      },
      {
        key: 'account.tradeType',
        label: '거래유형',
        sample: '매출처',
        source: `${P}/sales/accounts/types.ts`,
      },
      {
        key: 'account.paymentTerm',
        label: '결제조건',
        sample: 'Net-30',
        source: `${P}/sales/accounts/types.ts`,
      },
      {
        key: 'account.lastTradeAt',
        label: '최근 거래일',
        sample: '2026-07-10',
        source: `${P}/sales/accounts/AccountFormPage.tsx`,
      },
      {
        key: 'accountContact.name',
        label: '거래처 담당자명',
        sample: '이영업',
        source: `${P}/sales/accounts/data-source.ts`,
      },
      {
        key: 'accountContact.department',
        label: '거래처 담당 부서',
        sample: '구매팀',
        source: `${P}/sales/accounts/components/AccountContactsField.tsx`,
      },
      {
        key: 'accountContact.position',
        label: '거래처 담당 직급',
        sample: '팀장',
        source: `${P}/sales/accounts/components/AccountContactsField.tsx`,
      },
      {
        key: 'accountContact.phone',
        label: '거래처 담당 연락처',
        sample: '010-1111-2222',
        source: `${P}/sales/accounts/components/AccountContactsField.tsx`,
      },
      {
        key: 'accountContact.email',
        label: '거래처 담당 이메일',
        sample: 'lee@hanbit.example',
        source: `${P}/sales/accounts/components/AccountContactsField.tsx`,
      },

      // sales/quotes — 견적. 금액 3종은 저장 필드가 아니라 computeTotals 파생값이다(types.ts:148)
      {
        key: 'quote.quoteNo',
        label: '견적번호',
        sample: 'Q-20260710-001',
        source: `${P}/sales/quotes/QuoteFormPage.tsx`,
      },
      {
        key: 'quote.accountName',
        label: '견적 공급받는자',
        sample: '(주)한빛소프트웨어',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quote.accountBizNo',
        label: '견적 사업자등록번호',
        sample: '124-81-00998',
        source: `${P}/sales/quotes/QuoteFormPage.tsx`,
      },
      {
        key: 'quote.accountCeo',
        label: '견적 대표자',
        sample: '김한빛',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quote.contactName',
        label: '견적 담당자',
        sample: '김담당',
        source: `${P}/sales/quotes/QuoteFormPage.tsx`,
      },
      {
        key: 'quote.issueDate',
        label: '견적일',
        sample: '2026-07-10',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quote.validUntil',
        label: '견적 유효기간',
        sample: '2026-08-09',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quote.taxMode',
        label: '견적 과세유형',
        sample: '과세(10%)',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'quote.status',
        label: '견적 상태',
        sample: '발송',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'quote.note',
        label: '견적 비고',
        sample: '유효기간 내 발주 시 구축비 10% 할인 가능.',
        source: `${P}/sales/quotes/QuoteFormPage.tsx`,
      },
      {
        key: 'quote.inquiryNo',
        label: '견적 연결 문의번호',
        sample: 'INQ-20260714-001',
        source: `${P}/sales/quotes/QuoteFormPage.tsx`,
      },
      {
        key: 'quote.supplyAmount',
        label: '공급가액',
        sample: '30,000,000',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'quote.vatAmount',
        label: '부가세',
        sample: '3,000,000',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'quote.totalAmount',
        label: '견적 합계금액',
        sample: '33,000,000',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'quoteItem.name',
        label: '견적 품목',
        sample: 'ERP 라이선스(연간)',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quoteItem.spec',
        label: '견적 품목 규격',
        sample: '100석',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quoteItem.quantity',
        label: '견적 품목 수량',
        sample: '1',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      {
        key: 'quoteItem.unitPrice',
        label: '견적 품목 단가',
        sample: '24,000,000',
        source: `${P}/sales/quotes/components/QuotePreview.tsx`,
      },
      // 공급자(자사) — 견적서·계약서 머리에 늘 같이 찍히는 값이라 상수로 고정돼 있다(quotes/types.ts:66)
      {
        key: 'supplier.name',
        label: '공급자 상호',
        sample: 'TDS 주식회사',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'supplier.bizNo',
        label: '공급자 사업자등록번호',
        sample: '211-88-11223',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'supplier.ceoName',
        label: '공급자 대표자',
        sample: '홍대표',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'supplier.address',
        label: '공급자 주소',
        sample: '서울특별시 강남구 테헤란로 501, 12층',
        source: `${P}/sales/quotes/types.ts`,
      },
      {
        key: 'supplier.phone',
        label: '공급자 전화',
        sample: '02-6000-1000',
        source: `${P}/sales/quotes/types.ts`,
      },

      // sales/contracts — 계약. 계약번호 필드는 없다(불투명 id 뿐) — 그래서 목록에도 없다
      {
        key: 'contract.title',
        label: '계약명',
        sample: '2026년 SaaS 연간 이용계약',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.accountName',
        label: '계약 거래처',
        sample: '(주)한빛소프트웨어',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.contractType',
        label: '계약유형',
        sample: '라이선스',
        source: `${P}/sales/contracts/types.ts`,
      },
      {
        key: 'contract.amount',
        label: '계약금액',
        sample: '36,000,000',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.vatIncluded',
        label: '부가세 포함 여부',
        sample: '부가세 별도',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.startAt',
        label: '계약 시작일',
        sample: '2026-01-01',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.endAt',
        label: '계약 종료일',
        sample: '2026-12-31',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.autoRenew',
        label: '자동갱신 여부',
        sample: '자동갱신',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.renewNoticeDays',
        label: '갱신 통지기한(일)',
        sample: '30',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.status',
        label: '계약 상태',
        sample: '진행중',
        source: `${P}/sales/contracts/types.ts`,
      },
      {
        key: 'contract.signStatus',
        label: '전자서명 상태',
        sample: '서명완료',
        source: `${P}/sales/contracts/types.ts`,
      },
      {
        key: 'contract.ownerName',
        label: '계약 담당자',
        sample: '김영업',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },
      {
        key: 'contract.terms',
        label: '주요 조항 요약',
        sample: '연간 라이선스 12개월, 계정 100석 기준.',
        source: `${P}/sales/contracts/ContractFormPage.tsx`,
      },

      // sales/inquiries — 문의(영업). 고객센터 티켓과 다른 물건이라 namespace 를 나눈다
      {
        key: 'inquiry.inquiryNo',
        label: '영업문의 번호',
        sample: 'INQ-20260714-001',
        source: `${P}/sales/inquiries/InquiryDetailPage.tsx`,
      },
      {
        key: 'inquiry.title',
        label: '영업문의 제목',
        sample: 'ERP 도입 견적 요청',
        source: `${P}/sales/inquiries/InquiryListPage.tsx`,
      },
      {
        key: 'inquiry.customerName',
        label: '영업문의 고객',
        sample: '김담당',
        source: `${P}/sales/inquiries/InquiryDetailPage.tsx`,
      },
      {
        key: 'inquiry.company',
        label: '영업문의 거래처',
        sample: '(주)한빛소프트웨어',
        source: `${P}/sales/inquiries/InquiryDetailPage.tsx`,
      },
      {
        key: 'inquiry.receivedAt',
        label: '영업문의 접수일시',
        sample: '2026-07-14 09:20',
        source: `${P}/sales/inquiries/InquiryDetailPage.tsx`,
      },
      {
        key: 'inquiry.assignee',
        label: '영업문의 담당자',
        sample: '이영업',
        source: `${P}/sales/inquiries/InquiryDetailPage.tsx`,
      },
      {
        key: 'inquiry.status',
        label: '영업문의 처리 상태',
        sample: '처리중',
        source: `${P}/sales/inquiries/types.ts`,
      },
      {
        key: 'inquiry.type',
        label: '영업문의 유형',
        sample: '견적요청',
        source: `${P}/sales/inquiries/types.ts`,
      },
      {
        key: 'inquiry.channel',
        label: '영업문의 채널',
        sample: '웹',
        source: `${P}/sales/inquiries/types.ts`,
      },
      {
        key: 'inquiry.priority',
        label: '영업문의 우선순위',
        sample: '높음',
        source: `${P}/sales/inquiries/types.ts`,
      },

      // sales/projects — 프로젝트(영업 기회). 확률·예상매출·실주사유는 내부 정보라 뺐다(머리말 (나))
      {
        key: 'project.name',
        label: '프로젝트명',
        sample: '한빛소프트 ERP 구축',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.accountName',
        label: '프로젝트 거래처',
        sample: '(주)한빛소프트웨어',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.ownerName',
        label: '프로젝트 담당자',
        sample: '이영업',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.startAt',
        label: '프로젝트 시작일',
        sample: '2026-07-01',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.endAt',
        label: '프로젝트 종료일',
        sample: '2026-10-31',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.progress',
        label: '프로젝트 진척률(%)',
        sample: '40',
        source: `${P}/sales/projects/ProjectFormPage.tsx`,
      },
      {
        key: 'project.stage',
        label: '프로젝트 단계',
        sample: '협상',
        source: `${P}/sales/projects/types.ts`,
      },
    ],
  },

  /* ── 콘텐츠 ────────────────────────────────────────────────────────────────
   *
   * 공지·FAQ·배너·팝업·개인정보 처리방침. '새 공지 알림' 같은 안내 발송이 이 묶음을 쓴다. */
  {
    label: '콘텐츠',
    variables: [
      {
        key: 'notice.title',
        label: '공지 제목',
        sample: '[서비스 이용 안내] 001호',
        source: `${P}/content/notices/NoticeFormPage.tsx`,
      },
      {
        key: 'notice.body',
        label: '공지 본문',
        sample: '서비스 이용 안내 관련 상세 내용이에요.',
        source: `${P}/content/notices/NoticeFormPage.tsx`,
      },
      {
        key: 'notice.category',
        label: '공지 분류',
        sample: '공지',
        source: `${P}/content/notices/types.ts`,
      },
      {
        key: 'notice.status',
        label: '공지 상태',
        sample: '게시',
        source: `${P}/content/notices/types.ts`,
      },
      {
        key: 'notice.author',
        label: '공지 작성자',
        sample: '콘텐츠 운영팀',
        source: `${P}/content/notices/NoticeDetailPage.tsx`,
      },
      {
        key: 'notice.publishedAt',
        label: '공지 게시일',
        sample: '2026-01-01 09:00',
        source: `${P}/content/notices/NoticeDetailPage.tsx`,
      },
      {
        key: 'notice.views',
        label: '공지 조회수',
        sample: '37',
        source: `${P}/content/notices/NoticeDetailPage.tsx`,
      },

      {
        key: 'faq.question',
        label: 'FAQ 질문',
        sample: '비밀번호를 잊어버렸어요',
        source: `${P}/content/faq/FaqFormPage.tsx`,
      },
      {
        key: 'faq.answer',
        label: 'FAQ 답변',
        sample: '고객센터 운영 시간(평일 09:00~18:00)에 1:1 문의를 남겨 주세요.',
        source: `${P}/content/faq/FaqFormPage.tsx`,
      },
      {
        key: 'faq.categoryLabel',
        label: 'FAQ 카테고리',
        sample: '계정',
        source: `${P}/content/faq/FaqFormPage.tsx`,
      },

      {
        key: 'banner.title',
        label: '배너 제목',
        sample: '봄 시즌 기획전',
        source: `${P}/content/banners/BannerFormPage.tsx`,
      },
      {
        key: 'banner.linkUrl',
        label: '배너 링크 URL',
        sample: 'https://example.com/promo/002',
        source: `${P}/content/banners/BannerFormPage.tsx`,
      },
      {
        key: 'banner.placement',
        label: '배너 노출 위치',
        sample: '메인',
        source: `${P}/content/banners/types.ts`,
      },
      {
        key: 'banner.startAt',
        label: '배너 노출 시작일',
        sample: '2026-01-01',
        source: `${P}/content/banners/BannerFormPage.tsx`,
      },
      {
        key: 'banner.endAt',
        label: '배너 노출 종료일',
        sample: '2026-01-28',
        source: `${P}/content/banners/BannerFormPage.tsx`,
      },

      {
        key: 'popup.title',
        label: '팝업 제목',
        sample: '신규 가입 혜택',
        source: `${P}/content/popups/PopupFormPage.tsx`,
      },
      {
        key: 'popup.linkUrl',
        label: '팝업 링크 URL',
        sample: 'https://example.com/event/002',
        source: `${P}/content/popups/PopupFormPage.tsx`,
      },
      {
        key: 'popup.position',
        label: '팝업 노출 위치',
        sample: '메인 홈',
        source: `${P}/content/popups/types.ts`,
      },
      {
        key: 'popup.startAt',
        label: '팝업 노출 시작일',
        sample: '2026-01-01',
        source: `${P}/content/popups/PopupFormPage.tsx`,
      },
      {
        key: 'popup.endAt',
        label: '팝업 노출 종료일',
        sample: '2026-01-28',
        source: `${P}/content/popups/PopupFormPage.tsx`,
      },

      // 처리방침 개정 고지는 법정 사전 통지 대상이라 발송 문구가 실제로 이 셋을 쓴다
      {
        key: 'privacy.version',
        label: '개인정보 처리방침 버전',
        sample: 'v2.0',
        source: `${P}/content/privacy/components/VersionForm.tsx`,
      },
      {
        key: 'privacy.effectiveDate',
        label: '개인정보 처리방침 시행일',
        sample: '2025-03-01',
        source: `${P}/content/privacy/components/VersionForm.tsx`,
      },
      {
        key: 'privacy.status',
        label: '개인정보 처리방침 상태',
        sample: '시행중',
        source: `${P}/content/privacy/types.ts`,
      },
    ],
  },

  /* ── 상품 ──────────────────────────────────────────────────────────────────
   *
   * 상품 모델의 정본은 `products/_shared/store.ts` 다 — `items/types.ts` 는 뷰 헬퍼만 갖는다.
   * 쿠폰은 발송 문구가 가장 많이 쓰는 엔티티라 파생 라벨(discountLabel)까지 항목으로 둔다. */
  {
    label: '상품',
    variables: [
      {
        key: 'product.name',
        label: '상품명',
        sample: '루미엔 경량 패딩 점퍼',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'product.code',
        label: '상품코드(SKU)',
        sample: 'LMN-PAD-001',
        source: `${P}/products/items/ProductFormPage.tsx`,
      },
      {
        key: 'product.brand',
        label: '브랜드',
        sample: '루미엔',
        source: `${P}/products/items/ProductFormPage.tsx`,
      },
      {
        key: 'product.categoryLabel',
        label: '상품 카테고리',
        sample: '아우터',
        source: `${P}/products/items/ProductFormPage.tsx`,
      },
      {
        key: 'product.price',
        label: '판매가',
        sample: '129,000',
        source: `${P}/products/items/components/ProductPricingCards.tsx`,
      },
      {
        key: 'product.finalPrice',
        label: '할인 적용가',
        sample: '103,200',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'product.discountValue',
        label: '할인값',
        sample: '20',
        source: `${P}/products/items/components/ProductPricingCards.tsx`,
      },
      {
        key: 'product.saleStatus',
        label: '판매상태',
        sample: '판매중',
        source: `${P}/products/items/ProductFormPage.tsx`,
      },
      {
        key: 'product.coverImageUrl',
        label: '상품 대표 이미지',
        sample: 'https://cdn.example.com/products/lumien-padding-cover.jpg',
        source: `${P}/products/items/ProductFormPage.tsx`,
      },
      {
        key: 'product.shippingFee',
        label: '상품 배송비',
        sample: '3,000',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'product.freeShippingThreshold',
        label: '상품 무료배송 기준',
        sample: '50,000',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'product.pointsRate',
        label: '상품 적립률(%)',
        sample: '2',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'productVariant.sku',
        label: '옵션 SKU',
        sample: 'LMN-PAD-001-블랙-M',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'productVariant.stock',
        label: '옵션 재고',
        sample: '8',
        source: `${P}/products/_shared/store.ts`,
      },
      {
        key: 'productVariant.addPrice',
        label: '옵션 추가금액',
        sample: '3,000',
        source: `${P}/products/_shared/store.ts`,
      },

      {
        key: 'coupon.name',
        label: '쿠폰명',
        sample: '신규 가입 15% 할인',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.code',
        label: '쿠폰 코드',
        sample: 'WELCOME15',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.discountLabel',
        label: '쿠폰 할인 표기',
        sample: '15% 할인',
        source: `${P}/products/coupons/types.ts`,
      },
      {
        key: 'coupon.discountValue',
        label: '쿠폰 할인값',
        sample: '15',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.maxDiscount',
        label: '쿠폰 최대 할인',
        sample: '20,000',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.minOrderAmount',
        label: '쿠폰 최소 주문 금액',
        sample: '30,000',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.issueType',
        label: '쿠폰 발급 유형',
        sample: '정률 할인(%)',
        source: `${P}/products/coupons/types.ts`,
      },
      {
        key: 'coupon.target',
        label: '쿠폰 발급 대상',
        sample: '전체 회원',
        source: `${P}/products/coupons/types.ts`,
      },
      {
        key: 'coupon.startAt',
        label: '쿠폰 사용 시작일',
        sample: '2026-07-01',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.endAt',
        label: '쿠폰 사용 종료일',
        sample: '2026-09-30',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },
      {
        key: 'coupon.totalQuantity',
        label: '쿠폰 발급 수량',
        sample: '1,000',
        source: `${P}/products/coupons/CouponFormPage.tsx`,
      },

      // 교환/반품 — 처리 안내 문구가 쓰는 값. adminNote(처리 메모)는 내부 정보라 뺐다
      {
        key: 'returnRequest.orderNo',
        label: '교환·반품 접수번호',
        sample: 'ORD-20260712-0031',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.kind',
        label: '교환·반품 구분',
        sample: '교환',
        source: `${P}/orders/claims/types.ts`,
      },
      {
        key: 'returnRequest.productName',
        label: '교환·반품 상품',
        sample: '루미엔 경량 패딩 점퍼',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.optionLabel',
        label: '교환·반품 주문 옵션',
        sample: '블랙 / M',
        source: `${P}/orders/claims/types.ts`,
      },
      {
        key: 'returnRequest.exchangeOptionLabel',
        label: '재발송 옵션',
        sample: '32',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.customer',
        label: '교환·반품 신청자',
        sample: '김**',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.quantity',
        label: '교환·반품 수량',
        sample: '1',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.reason',
        label: '교환·반품 사유',
        sample: '사이즈 교환',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.reasonDetail',
        label: '교환·반품 상세 사유',
        sample: 'M 사이즈가 작아 L 로 교환 요청해요.',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.refundAmount',
        label: '환불 예정액',
        sample: '79,000',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.requestedAt',
        label: '교환·반품 접수일',
        sample: '2026-07-12',
        source: `${P}/orders/claims/ClaimDetailPage.tsx`,
      },
      {
        key: 'returnRequest.status',
        label: '교환·반품 처리 상태',
        sample: '수거중',
        source: `${P}/orders/claims/types.ts`,
      },

      // 리뷰 — 답변 알림 문구가 쓴다. reportReason(신고 사유)은 내부 모더레이션이라 뺐다
      {
        key: 'review.productName',
        label: '리뷰 상품',
        sample: '루미엔 경량 패딩 점퍼',
        source: `${P}/products/reviews/ReviewDetailPage.tsx`,
      },
      {
        key: 'review.author',
        label: '리뷰 작성자',
        sample: '민**',
        source: `${P}/products/reviews/ReviewDetailPage.tsx`,
      },
      {
        key: 'review.rating',
        label: '리뷰 별점',
        sample: '5',
        source: `${P}/products/reviews/ReviewDetailPage.tsx`,
      },
      {
        key: 'review.content',
        label: '리뷰 내용',
        sample: '가볍고 따뜻해서 매일 입고 있어요.',
        source: `${P}/products/reviews/types.ts`,
      },
      {
        key: 'review.createdAt',
        label: '리뷰 작성일',
        sample: '2026-07-10',
        source: `${P}/products/reviews/ReviewDetailPage.tsx`,
      },
      {
        key: 'review.reply',
        label: '리뷰 관리자 답변',
        sample: '소중한 후기 감사해요.',
        source: `${P}/products/reviews/ReviewDetailPage.tsx`,
      },

      // 정책 문서 2종 — 단일 문서라 발송 문구가 '현재 정책' 을 인용할 때 쓴다
      {
        key: 'shippingPolicy.carrier',
        label: '택배사',
        sample: '가상택배',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'shippingPolicy.baseFee',
        label: '기본 배송비',
        sample: '3,000',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'shippingPolicy.freeThreshold',
        label: '무료배송 기준',
        sample: '50,000',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'shippingPolicy.jejuExtraFee',
        label: '제주 추가배송비',
        sample: '3,000',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'shippingPolicy.islandExtraFee',
        label: '도서산간 추가배송비',
        sample: '5,000',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'shippingPolicy.returnFee',
        label: '반품 배송비',
        sample: '3,000',
        source: `${P}/products/shipping/ShippingPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.earnRate',
        label: '기본 적립률(%)',
        sample: '1',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.signupBonus',
        label: '회원가입 적립금',
        sample: '3,000',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.minUseAmount',
        label: '최소 사용 포인트',
        sample: '5,000',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.useUnit',
        label: '포인트 사용 단위',
        sample: '100',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.maxUseRate',
        label: '1회 사용 한도(%)',
        sample: '50',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
      {
        key: 'pointsPolicy.expireMonths',
        label: '포인트 유효기간(개월)',
        sample: '12',
        source: `${P}/products/points/PointsPolicyPage.tsx`,
      },
    ],
  },

  /* ── 포트폴리오 ────────────────────────────────────────────────────────────
   *
   * 모델의 정본은 `portfolio/_shared/store.ts`(항목·카테고리) 와 `case-studies/types.ts` 다. */
  {
    label: '포트폴리오',
    variables: [
      {
        key: 'portfolio.title',
        label: '포트폴리오 제목',
        sample: '한빛 리버뷰 펜트하우스 리모델링',
        source: `${P}/portfolio/items/PortfolioFormPage.tsx`,
      },
      {
        key: 'portfolio.categoryLabel',
        label: '포트폴리오 분류',
        sample: '주거 공간',
        source: `${P}/portfolio/_shared/store.ts`,
      },
      {
        key: 'portfolio.client',
        label: '포트폴리오 고객사',
        sample: '한빛개발',
        source: `${P}/portfolio/items/PortfolioFormPage.tsx`,
      },
      {
        key: 'portfolio.summary',
        label: '포트폴리오 소개',
        sample: '한강 조망 펜트하우스의 생활 동선을 재구성했어요.',
        source: `${P}/portfolio/items/validation.ts`,
      },
      {
        key: 'portfolio.date',
        label: '포트폴리오 일자',
        sample: '2024-05-20',
        source: `${P}/portfolio/items/PortfolioFormPage.tsx`,
      },
      {
        key: 'portfolio.coverImageUrl',
        label: '포트폴리오 대표 이미지',
        sample: 'https://cdn.example.com/portfolio/riverview-cover.jpg',
        source: `${P}/portfolio/items/validation.ts`,
      },

      {
        key: 'caseStudy.title',
        label: '성공사례 제목',
        sample: '스마트팩토리 전환으로 불량률 절반 감축',
        source: `${P}/portfolio/case-studies/CaseStudyFormPage.tsx`,
      },
      {
        key: 'caseStudy.industry',
        label: '성공사례 업종',
        sample: '제조',
        source: `${P}/portfolio/case-studies/types.ts`,
      },
      {
        key: 'caseStudy.client',
        label: '성공사례 고객사',
        sample: '다온정밀',
        source: `${P}/portfolio/case-studies/validation.ts`,
      },
      {
        key: 'caseStudy.challenge',
        label: '성공사례 과제',
        sample: '수작업 검사로 불량 유출이 잦고 라인 정지가 반복됐어요.',
        source: `${P}/portfolio/case-studies/data-source.ts`,
      },
      {
        key: 'caseStudy.solution',
        label: '성공사례 해결',
        sample: '비전 검사와 실시간 대시보드를 도입해 공정을 표준화했어요.',
        source: `${P}/portfolio/case-studies/data-source.ts`,
      },
      {
        key: 'caseStudy.result',
        label: '성공사례 성과',
        sample: '6개월 만에 불량률을 52% 낮췄어요.',
        source: `${P}/portfolio/case-studies/data-source.ts`,
      },
      {
        key: 'caseStudy.date',
        label: '성공사례 일자',
        sample: '2024-04-30',
        source: `${P}/portfolio/case-studies/CaseStudyFormPage.tsx`,
      },
      {
        key: 'caseStudy.coverImageUrl',
        label: '성공사례 대표 이미지',
        sample: 'https://cdn.example.com/case/daon-cover.jpg',
        source: `${P}/portfolio/case-studies/validation.ts`,
      },
    ],
  },

  /* ── 고객센터 ──────────────────────────────────────────────────────────────
   *
   * 1:1 문의(티켓)·자료실·고객노출 FAQ. 티켓의 body·contact·내부메모는 뺐다(머리말 (나)(다)).
   *
   * [기존 `{{고객명}}`·`{{문의번호}}`·`{{담당자}}` 는 어떻게 되나] `support/_shared/domain.ts`
   * 의 applyTemplate 이 쓰는 그 세 개는 **답변 템플릿 전용**의 별개 문법이고 이 카탈로그와
   * 문법(`{{}}` vs `#{}`)도 소비자도 다르다. 여기서 손대지 않는다 — 같은 이름의 다른 물건을
   * 한꺼번에 바꾸면 고객센터 답변 화면이 조용히 깨진다. 통합은 별도 작업이다. */
  {
    label: '고객센터',
    variables: [
      {
        key: 'ticket.ticketNo',
        label: '문의번호',
        sample: 'CS-20260714-001',
        source: `${P}/support/tickets/components/TicketWorkspace.tsx`,
      },
      {
        key: 'ticket.title',
        label: '문의 제목',
        sample: '결제가 두 번 청구되었어요',
        source: `${P}/support/tickets/TicketListPage.tsx`,
      },
      {
        key: 'ticket.categoryLabel',
        label: '문의 유형',
        sample: '주문/결제',
        source: `${P}/support/_shared/store.ts`,
      },
      {
        key: 'ticket.channel',
        label: '문의 채널',
        sample: '카카오톡',
        source: `${P}/support/_shared/domain.ts`,
      },
      {
        key: 'ticket.priority',
        label: '문의 우선순위',
        sample: '긴급',
        source: `${P}/support/_shared/domain.ts`,
      },
      {
        key: 'ticket.status',
        label: '문의 처리 상태',
        sample: '처리중',
        source: `${P}/support/_shared/domain.ts`,
      },
      {
        key: 'ticket.assignee',
        label: '문의 담당자',
        sample: '김상담',
        source: `${P}/support/tickets/components/TicketWorkspace.tsx`,
      },
      {
        key: 'ticket.customerName',
        label: '문의 고객명',
        sample: '박고객',
        source: `${P}/support/tickets/components/TicketWorkspace.tsx`,
      },
      {
        key: 'ticket.receivedAt',
        label: '문의 접수일시',
        sample: '2026-07-14 09:12',
        source: `${P}/support/tickets/components/TicketWorkspace.tsx`,
      },
      {
        key: 'ticket.slaDueAt',
        label: '첫 응답 기한',
        sample: '2026-07-14 17:12',
        source: `${P}/support/_shared/domain.ts`,
      },

      {
        key: 'download.title',
        label: '자료 제목',
        sample: '2026 상반기 제품 카탈로그',
        source: `${P}/support/downloads/DownloadFormPage.tsx`,
      },
      {
        key: 'download.categoryLabel',
        label: '자료 카테고리',
        sample: '카탈로그',
        source: `${P}/support/downloads/DownloadListPage.tsx`,
      },
      {
        key: 'download.version',
        label: '자료 버전',
        sample: 'v2.1',
        source: `${P}/support/downloads/DownloadListPage.tsx`,
      },
      {
        key: 'download.fileName',
        label: '자료 첨부 파일',
        sample: 'catalog-2026-h1.pdf',
        source: `${P}/support/downloads/validation.ts`,
      },
      {
        key: 'download.fileSize',
        label: '자료 파일 크기',
        sample: '4.6 MB',
        source: `${P}/support/downloads/types.ts`,
      },
      {
        key: 'download.downloadCount',
        label: '자료 다운로드수',
        sample: '1,284',
        source: `${P}/support/downloads/DownloadListPage.tsx`,
      },

      {
        key: 'supportFaq.question',
        label: '고객센터 FAQ 질문',
        sample: '주문을 취소하고 싶어요',
        source: `${P}/support/faq/components/CustomerFaqTable.tsx`,
      },
      {
        key: 'supportFaq.categoryLabel',
        label: '고객센터 FAQ 카테고리',
        sample: '주문/결제',
        source: `${P}/support/faq/data-source.ts`,
      },
    ],
  },
];
