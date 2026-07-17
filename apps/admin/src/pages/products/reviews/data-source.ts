// 리뷰 데이터 소스 어댑터
//
// [백엔드 연동 지점] 카테고리 결합이 없어 프레임워크 createCrudAdapter 에 시드를 넣는다.
// 상세 조회는 어댑터의 fetchOne 을 화면이 useQuery 로 부른다. 실제 연동 시 // TODO(backend) 로 교체.
import { createCrudAdapter } from '../../../shared/crud';
import { sortReviews } from './types';
import type { Review, ReviewInput } from './types';

const REVIEW_SEED: readonly Review[] = [
  {
    id: 'rv-1',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    author: '민**',
    rating: 5,
    content: '가볍고 따뜻해서 매일 입고 있어요. 사이즈도 딱 맞습니다.',
    imageUrls: ['https://cdn.example.com/reviews/rv1-1.jpg'],
    createdAt: '2026-07-10',
    visible: true,
    reported: false,
    reportReason: '',
    reply: '소중한 후기 감사합니다. 따뜻하게 입어 주세요!',
  },
  {
    id: 'rv-2',
    productId: 'prd-2',
    productName: '노바 베이직 코튼 티셔츠',
    author: '지**',
    rating: 4,
    content: '무난하게 입기 좋아요. 다만 배송이 조금 늦었네요.',
    imageUrls: [],
    createdAt: '2026-07-08',
    visible: true,
    reported: false,
    reportReason: '',
    reply: '',
  },
  {
    id: 'rv-3',
    productId: 'prd-3',
    productName: '테라 스니커즈 데일리',
    author: '현**',
    rating: 2,
    content: '생각보다 볼이 좁아요. 반 사이즈 크게 주문하세요.',
    imageUrls: [],
    createdAt: '2026-07-05',
    visible: true,
    reported: true,
    reportReason: '다른 상품과 비교하는 부적절한 내용 신고',
    reply: '',
  },
  {
    id: 'rv-4',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    author: '수**',
    rating: 1,
    content: '광고성 링크가 포함된 후기입니다.',
    imageUrls: [],
    createdAt: '2026-07-03',
    visible: false,
    reported: true,
    reportReason: '스팸/광고',
    reply: '',
  },
];

let seq = REVIEW_SEED.length;

// TODO(backend): GET /api/reviews · GET/PUT/DELETE /api/reviews/:id (관리자 답변·노출 토글·삭제)
export const reviewAdapter = createCrudAdapter<Review, ReviewInput>({
  scope: 'reviews',
  seed: REVIEW_SEED,
  build: (input) => {
    seq += 1;
    return { id: `rv-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortReviews,
});
