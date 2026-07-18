// AUTO-GENERATED from contracts/ImageThumb.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Media · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type ImageThumbState = 'default' | 'error';

/**
 * 목록 썸네일 — 작은 이미지. 출처: apps/admin/src/shared/ui/ImageThumb.tsx (소비 3곳: 로고 목록·인증서 목록·리뷰 미리보기). src 가 비었거나(trim 후 빈 문자열) 로드에 실패하면 빈칸/깨진 이미지 대신 이미지 아이콘 placeholder 를 한 곳에서 보장한다. 도메인을 모른다 — 무슨 이미지인지 알지 못하고 src(URL 문자열)와 접근성 이름(alt)만 받는다.

[로드 실패 복구] src 가 바뀌면 실패 플래그를 초기화한다 — 이전 URL 의 실패가 새 URL 로 새지 않는다.
 */
export interface ImageThumbProps {
  /**
   * 이미지 URL. 앞뒤 공백을 제거한 뒤 빈 문자열이면 placeholder 를 렌더한다. 로드에 실패해도(onError) placeholder 로 폴백한다
   */
  src: string;
  /**
   * 접근성 이름 — 실제 이미지의 alt 이자 placeholder(role=img)의 aria-label 이다. 두 경로 모두 같은 이름으로 읽힌다
   */
  alt: string;
}
