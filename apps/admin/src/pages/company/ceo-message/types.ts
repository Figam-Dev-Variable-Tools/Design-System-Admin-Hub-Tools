// CEO 인사말 화면 전용 타입

/** CEO 인사말 — 단일 문서(회사당 1건) */
export interface CeoMessage {
  readonly title: string;
  readonly body: string;
  /** 대표/CEO 사진 URL (선택) */
  readonly photoUrl: string;
}

export const TITLE_MAX_LENGTH = 120;
export const BODY_MAX_LENGTH = 5000;
