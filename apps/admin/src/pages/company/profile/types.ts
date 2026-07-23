// 회사 정보 화면 전용 타입

/** 회사 기본 정보 — 단일 문서(회사당 1건) */
export interface CompanyProfile {
  readonly companyName: string;
  /** 사업자등록번호 — 'XXX-XX-XXXXX' */
  readonly businessNumber: string;
  /**
   * 우편번호 서비스로 고른 주소 한 줄 — 도로명 또는 지번(사용자가 고른 표기).
   *
   * ⚠ **층·호수는 여기 없다** — addressDetail 로 갈라졌다(예전에는 한 칸에 다 적었다).
   * 그래서 이 값 하나만 읽어 '회사 주소' 로 쓰던 자리는 절반만 보게 된다:
   *   TODO(consumer): apps/admin/src/wiring.ts 의 toSupplier 가 `address: profile.address` 로
   *   견적서 공급자 정보를 만든다 — 두 칸을 합쳐 넘겨야 견적서 주소가 예전과 같아진다.
   */
  readonly address: string;
  /** 건물명·층·호수 등 (선택) */
  readonly addressDetail: string;
  /** 대표자명 */
  readonly ceoName: string;
  /** 대표 연락처 */
  readonly contact: string;
  /** 로고 이미지 URL (선택) */
  readonly logoUrl: string;
}

export const COMPANY_NAME_MAX_LENGTH = 100;
export const ADDRESS_MAX_LENGTH = 200;
/** 오시는 길의 상세주소와 같은 값 — 두 화면이 같은 칸을 다른 길이로 받으면 운영자가 두 번 배운다 */
export const ADDRESS_DETAIL_MAX_LENGTH = 100;
export const NAME_MAX_LENGTH = 50;
export const CONTACT_MAX_LENGTH = 40;
