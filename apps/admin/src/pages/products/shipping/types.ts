// 배송 정책 화면 전용 타입 · 옵션
//
// 배송은 목록형이 아니라 **정책 설정형**이다(권역·요금·묶음배송을 문서 1건으로 관리). 단일 문서형
// 프레임워크(createDocumentStore + DocumentFormShell)를 쓴다. 값 표현은 폼 문자열과 일치시켜(회사 정보
// 화면과 같은 결) reset(data) 를 단순화한다 — 실제 백엔드가 붙으면 숫자로 매핑한다(// TODO(backend)).
//
// [택배사는 이 화면 안의 두 번째 표다 — 별도 메뉴가 아니다]
// 택배사 목록은 행이 서넛인 참조 테이블이라 자기 메뉴 잎을 가질 무게가 아니다(카페24도 배송 설정
// 안에 둔다). 그래서 정책 문서 아래에 CRUD 섹션으로 붙는다. **모델과 규칙은 공통 층**
// (shared/domain/shipment.ts)의 것이다 — 배송 처리 화면이 같은 목록을 읽어야 하고, 두 화면이
// 서로를 import 하면 그 순간 페이지 간 결합이다.
import type { ShippingPolicyValues } from './validation';

/** 배송비 정책 — 무료/유료/조건부무료 */
export const SHIPPING_FEE_OPTIONS = [
  { id: 'free', label: '무료배송' },
  { id: 'paid', label: '유료배송' },
  { id: 'conditional', label: '조건부 무료배송' },
] as const;

/**
 * 화면 진입 시 기본값(픽스처) — 조건부 무료(5만원 이상 무료).
 *
 * [carrier → defaultCarrierId] 예전 이 문서는 택배사 **이름 문자열**을 들고 있었다. 자유 입력이라
 * '대한통운' 과 'CJ대한통운' 이 공존할 수 있었고, 그러면 추적 URL 을 만들 키가 없다(FS-043 미결 9번).
 * 이제는 등록된 택배사의 id 를 가리키며, 이 값은 송장 입력 다이얼로그의 **기본 선택**이 된다.
 */
export const DEFAULT_SHIPPING_POLICY: ShippingPolicyValues = {
  defaultCarrierId: 'car-1',
  feeType: 'conditional',
  baseFee: '3000',
  freeThreshold: '50000',
  jejuExtraFee: '3000',
  islandExtraFee: '5000',
  returnFee: '3000',
  bundleShipping: true,
} as const;

/** 추적 URL 템플릿 입력의 안내 — 화면과 검증이 같은 문장을 읽는다 */
export const TRACKING_TEMPLATE_HINT =
  '{{invoice}} 자리에 송장번호가 들어가요. 비워 두면 추적 링크를 만들지 않아요.';

/**
 * 삭제 버튼 옆에 서는 사용 현황 문구.
 *
 * null 은 '아직 못 셌다' 이지 0 이 아니다 — 0 으로 뭉개면 조회가 실패한 순간 삭제가 열린다
 * (shared/domain/shipment.ts 의 carrierDeleteBlock 이 같은 자리에서 fail-closed 로 막는다).
 */
export function carrierUsageLabel(usage: number | null): string {
  if (usage === null) return '사용 현황 확인 중';
  return usage === 0 ? '미사용' : `배송 ${String(usage)}건 사용 중`;
}
