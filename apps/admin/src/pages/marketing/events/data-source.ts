// 이벤트 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 실연동 시 // TODO(backend) 로 본문만
// 바꾼다.
import { createCrudAdapter } from '../../../shared/crud';
import { sortEvents } from './types';
import type { MarketingEvent, MarketingEventInput } from './types';

const EVENT_SEED: readonly MarketingEvent[] = [
  {
    id: 'ev-1',
    title: '여름맞이 리뷰 이벤트',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    benefitType: 'points',
    benefitDetail: '리뷰 작성 시 3,000 적립금',
    bannerLinked: true,
    bannerLabel: '메인 상단 여름 배너',
    description: '구매 후기 작성 고객에게 적립금을 드리는 이벤트입니다.',
  },
  {
    id: 'ev-2',
    title: '가을 신상품 출시 사전알림',
    startAt: '2026-08-15',
    endAt: '2026-08-31',
    phase: 'upcoming',
    target: '뉴스레터 구독자',
    benefitType: 'coupon',
    benefitDetail: '사전알림 신청 시 10% 할인쿠폰',
    bannerLinked: false,
    bannerLabel: '',
    description: '가을 신상품 출시 전 사전알림 신청 이벤트.',
  },
  {
    id: 'ev-3',
    title: '봄맞이 감사제',
    startAt: '2026-03-01',
    endAt: '2026-03-31',
    phase: 'ended',
    target: '전체 회원',
    benefitType: 'coupon',
    benefitDetail: '5,000원 할인쿠폰',
    bannerLinked: true,
    bannerLabel: '봄 시즌 배너',
    description: '봄 시즌 감사 이벤트(종료).',
  },
];

let seq = EVENT_SEED.length;

// TODO(backend): GET/POST /api/marketing/events · GET/PUT/DELETE /api/marketing/events/:id
export const eventAdapter = createCrudAdapter<MarketingEvent, MarketingEventInput>({
  scope: 'marketing-events',
  seed: EVENT_SEED,
  build: (input) => {
    seq += 1;
    return { id: `ev-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortEvents,
});
