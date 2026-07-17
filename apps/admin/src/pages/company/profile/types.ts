// 회사 정보 화면 전용 타입

/** 회사 기본 정보 — 단일 문서(회사당 1건) */
export interface CompanyProfile {
  readonly companyName: string;
  /** 사업자등록번호 — 'XXX-XX-XXXXX' */
  readonly businessNumber: string;
  readonly address: string;
  /** 대표자명 */
  readonly ceoName: string;
  /** 대표 연락처 */
  readonly contact: string;
  /** 로고 이미지 URL (선택) */
  readonly logoUrl: string;
}

export const COMPANY_NAME_MAX_LENGTH = 100;
export const ADDRESS_MAX_LENGTH = 200;
export const NAME_MAX_LENGTH = 50;
export const CONTACT_MAX_LENGTH = 40;
