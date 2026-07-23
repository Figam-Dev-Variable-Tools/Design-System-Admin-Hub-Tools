// 화면 문구 — 편집기와 상세가 같은 한 벌을 여기서 든다
//
// ─────────────────────────────────────────────────────────────────────────────
// [한 벌이다 — 예전에 두 벌이던 이유와 그것이 사라진 경위]
//
// 이 앱의 UI 문구는 한글이다. 예외는 없다.
//
// 한동안 이 파일은 두 벌을 들고 있었다. **편집기**는 디자인이 영문 목업으로 넘겨준 화면이라
// 목업의 글자를 그대로 옮겼고(콜아웃, 자리표시자, 카드 라벨, 헤더 액션, 카운터까지), **상세**는
// 목업이 없어 한글이었다. 그래서 `CopyVariant` 로 화면마다 라벨 한 벌을 골라 받았다.
//
// 목업에서 가져올 것은 **레이아웃과 구성**이지 글자가 아니었다. 관리자 화면 전체가 한글인데
// 편집기만 영문이면, 운영자는 매일 쓰는 화면 하나에서만 언어를 갈아탄다. 그래서 문구를 한글로
// 옮겼고 — 두 벌이 같은 글자가 되면서 `CopyVariant` 도 함께 사라졌다. 갈래를 남겨 두면 같은
// 낱말이 두 군데 적혀 한쪽만 고쳐지는 자리가 된다.
//
// 이 갈림의 바깥에 남는 것 둘:
//   · 상태 배지가 읽는 `TemplateStatus` 값 — 라벨은 한국어지만 값 자체는 식별자다
//     (정본은 types.ts 의 TEMPLATE_STATUS_LABEL).
//   · 고유명사 — 대행사명(SureM·NHN·Solapi), 규격 이름(SMS·LMS·MMS), 확장자(JPG).
//
// [두 화면이 공유하는 카드는 어떻게 하나] 발신 프로필 카드와 미리보기 카드는 편집기와 상세가
// **같은 컴포넌트**를 쓴다(각 컴포넌트 머리말 참고). 상세용 카드를 따로 포크하면 항목이 하나 늘 때
// 한쪽만 늘어난다 — 그래서 포크하지 않는다. 이제는 글자까지 한 벌이라 고를 것도 없다.
//
// [왜 한 파일인가] 편집기와 상세, 그리고 테스트가 같은 문구를 본다. 세 곳에 복붙하면 한 곳만
// 고쳐진 채 나머지가 남는다.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ALIMTALK_IMAGE_HEIGHT,
  ALIMTALK_IMAGE_MAX_BYTES,
  ALIMTALK_IMAGE_MIN_HEIGHT,
  ALIMTALK_IMAGE_MIN_WIDTH,
  ALIMTALK_IMAGE_RATIO_LABEL,
  ALIMTALK_IMAGE_WIDTH,
} from './kakao';
import { TEXT_BODY_MAX, TEXT_IMAGE_FORMAT, TEXT_IMAGE_MAX_EDGE } from './types';
import type { TemplateKind } from './types';

/** 본문 입력 위 콜아웃 — 길이 등급·이미지 승격·변수 여유분 */
export const BODY_CALLOUT_LINES: readonly string[] = [
  `SMS : 90자 이내 / LMS, MMS : ${String(TEXT_BODY_MAX)}자 이내`,
  '이미지를 첨부하면 MMS로 발송돼요.',
  '치환변수 자리에 들어갈 내용에 따라 실제 발송 글자 수가 달라지므로, 템플릿을 작성할 때 20~30자 정도 여유를 두세요.',
];

/** 첨부 이미지 콜아웃 — 장수·확장자·용량·픽셀 */
export const IMAGE_CALLOUT_LINES: readonly string[] = [
  '이미지는 한 장만 등록할 수 있어요.',
  `첨부할 수 있는 이미지 형식은 ${TEXT_IMAGE_FORMAT} 예요.`,
  '500KB 이하 이미지만 첨부할 수 있어요.',
  `크기는 ${String(TEXT_IMAGE_MAX_EDGE)}×${String(TEXT_IMAGE_MAX_EDGE)}px 이하여야 해요.`,
];

/* ── 편집기 라벨 ─────────────────────────────────────────────────────────────── */

export const TITLE_PLACEHOLDER = '템플릿명을 입력하세요';
export const BODY_PLACEHOLDER = '메시지 내용을 입력하세요.';
/** 본문이 비어 검증에 걸린 뒤 — 자리표시자 자체가 요구로 바뀐다 */
export const BODY_PLACEHOLDER_INVALID = '메시지 내용을 입력해 주세요.';
// 이메일 편집기의 같은 칸(EmailCanvas)이 '발신 프로필을 선택하세요' 라 적는다 — 한 기능 안에서
// 같은 칸이 다른 말투를 쓰지 않도록 그쪽에 맞춘다.
export const SENDER_PROFILE_PLACEHOLDER = '발신 프로필을 선택하세요';
export const PHONE_PLACEHOLDER = '0123456789';
export const IMAGE_PLACEHOLDER = '이미지를 업로드하세요';

export const LABEL_CONTENT_INPUT = '내용 입력';
/**
 * 제목 칸의 라벨 — 목업에 없던 칸이라 글자를 새로 정했다.
 *
 * 괄호 안이 라벨의 절반을 차지하는 것은 이 칸이 **단가를 바꾸기 때문**이다. 제목을 한 글자라도
 * 적으면 90 byte 이하여도 LMS 로 나간다 — 아래 콜아웃이 그 이유를 마저 적는다.
 */
export const LABEL_SUBJECT = '제목 (LMS/MMS 전용)';
export const SUBJECT_PLACEHOLDER = '제목을 입력하세요';

/** 제목 칸 콜아웃 — 이 칸이 단가를 바꾼다는 사실을 입력 옆에서 말한다 */
export const SUBJECT_CALLOUT_LINES: readonly string[] = [
  'SMS 에는 제목 칸이 없어요.',
  // 단위는 'byte' 로 적는다 — 바로 옆 카운터가 '0 / 40 byte', 등급 힌트가 '90 byte 를 넘으면'
  // 이라 적으므로, 여기서만 '바이트' 라고 쓰면 한 화면에 두 표기가 선다.
  '제목을 입력하면 90 byte 이하여도 LMS 로 발송돼요.',
];
export const LABEL_ATTACH_IMAGE = '이미지 첨부';
export const LABEL_FILE_NAME = '파일명';
export const LABEL_CHOOSE_IMAGE = '이미지 선택';
export const LABEL_VARIABLE = '치환변수';
export const CHANNEL_CHIP_LABEL = 'SMS/LMS/MMS';

/**
 * 헤더 액션.
 *
 * '초안 저장'·'발행' 은 이 도메인이 이미 쓰던 낱말이다(status.ts·validation.ts 머리말이 버튼을
 * 그 이름으로 부른다). 콘텐츠 쪽의 '게시'/'임시저장' 과 굳이 맞추지 않는 것은, 그쪽은 공개 여부를
 * 뜻하고 여기서는 **발송 가능 상태**를 뜻하기 때문이다.
 */
export const ACTION_CANCEL = '취소';
export const ACTION_SAVE_DRAFT = '초안 저장';
export const ACTION_PUBLISH = '발행';
export const ACTION_SAVE_CHANGE = '저장';

/* ── 공유 카드의 라벨 ─────────────────────────────────────────────────────────
 *
 * 발신 프로필 카드·미리보기 카드는 편집기와 상세가 같은 컴포넌트를 쓴다(머리말).
 *
 * [예전에 왜 `variant` 를 받았나] 편집기가 영문이던 시절에는 이 표가 화면별로 두 줄이었고
 * 컴포넌트가 어느 줄을 읽을지 골랐다. 두 화면이 같은 한글을 쓰게 되면서 두 줄이 같은 글자가 됐고,
 * 고를 것이 없어진 표를 남겨 두면 같은 낱말을 두 군데 적어 두는 셈이라 한 줄로 합쳤다. */

export interface SenderCardCopy {
  readonly title: string;
  readonly profileLabel: string;
  /** 문자 템플릿의 둘째 칸 — 발신번호 */
  readonly phoneLabel: string;
  /** 이메일 템플릿의 둘째 칸 — 발신 주소 */
  readonly emailLabel: string;
}

export const SENDER_CARD_COPY: SenderCardCopy = {
  title: '발신 프로필',
  profileLabel: '발신 프로필',
  phoneLabel: '발신번호',
  emailLabel: '발신 이메일',
};

/** 미리보기 카드 제목 */
export const PREVIEW_TITLE = '미리보기';

/* ── 상세 뷰 (한글) ─────────────────────────────────────────────────────────── */

/** 중앙 카드 제목 */
export const DETAIL_STATUS_HISTORY = '상태 이력';

/** 라벨/값 표 */
export const DETAIL_LABEL_STATUS = '템플릿 상태';
export const DETAIL_LABEL_TYPE = '템플릿 종류';
export const DETAIL_LABEL_TEXT_TYPE = '문자 발송사';
export const DETAIL_LABEL_SENDER = '발신 프로필';
export const DETAIL_LABEL_CREATED_BY = '등록자';
export const DETAIL_LABEL_CREATED_AT = '등록일시';
export const DETAIL_LABEL_EDITED_BY = '최종 수정자';
export const DETAIL_LABEL_EDITED_AT = '최종 수정일시';

/**
 * 상세가 부르는 종류 이름.
 *
 * [왜 TEMPLATE_KIND_LABEL 과 따로 두는가] 둘은 이제 거의 같은 글자지만 `alimtalk` 한 줄이 다르다 —
 * 목록·칩·편집기는 다른 종류와 나란히 서므로 '카카오 알림톡' 이라 부르고, 상세는 이미 카카오
 * 화면임이 분명해 '알림톡' 으로 짧게 부른다. 이 한 줄을 위해 표가 둘이다.
 */
export const DETAIL_KIND_LABEL: Readonly<Record<TemplateKind, string>> = {
  email: '이메일',
  text: '문자',
  alimtalk: '알림톡',
  // 코드는 brandmessage, 라벨은 '구 친구톡' — 친구톡은 2025-12-31 종료됐다(kakao.ts 머리말).
  // 운영자는 아직 '친구톡' 으로 이 기능을 찾으므로 그 낱말을 라벨에서 지우지 않는다.
  brandmessage: '브랜드 메시지 (구 친구톡)',
};

/** 제목 위 눈썹 — `이메일 템플릿` / `문자 템플릿` */
export function detailKindEyebrowOf(kind: TemplateKind): string {
  return `${DETAIL_KIND_LABEL[kind]} 템플릿`;
}

/** 본문 카운터 — `(748 / 2000자)` */
export function characterCounterOf(length: number): string {
  return `(${String(length)} / ${String(TEXT_BODY_MAX)}자)`;
}

/* ── 카카오 편집기 (알림톡 · 브랜드 메시지) ────────────────────────────────────
 *
 * 이 구역은 처음부터 한글이었다 — 카카오 편집기에는 영문 목업이 없었기 때문이다. 문자 편집기의
 * 문구가 한글로 넘어오면서 이제 위 구역과 같은 결이 됐고, 새 문구는 여기 어휘를 먼저 따른다
 * (예: '치환변수' 는 문자 편집기의 LABEL_VARIABLE 도 같은 낱말을 쓴다).
 */

export const KAKAO_LABEL_CHANNEL = '발신 카카오 채널';
export const KAKAO_CHANNEL_PLACEHOLDER = '카카오 채널 선택';
export const KAKAO_LABEL_BODY = '본문';
export const KAKAO_LABEL_BUTTONS = '버튼';
export const KAKAO_LABEL_VARIABLE_SAMPLES = '치환변수 예시값';

export const ALIMTALK_LABEL_MESSAGE_TYPE = '메시지 유형';
export const ALIMTALK_LABEL_EMPHASIS_TYPE = '강조 유형';
export const ALIMTALK_LABEL_EMPHASIS_TITLE = '강조 제목';
export const ALIMTALK_LABEL_EMPHASIS_SUBTITLE = '강조 보조문구';
export const ALIMTALK_LABEL_APPROVAL = '심사 상태';

export const BRAND_MESSAGE_LABEL_BODY_TYPE = '메시지 유형';
export const BRAND_MESSAGE_LABEL_AD = '광고성 메시지';

// [삭제됨] KAKAO_TYPE_NOT_IMPLEMENTED — 유형 이름 옆의 '(준비 중)' 꼬리표.
//   알림톡 네 유형 × 네 강조 유형과 브랜드 메시지 다섯 유형이 **모두 구현되어** 마지막 소비자가
//   사라졌다. 자리를 대신하는 것은 꼬리표가 아니라 설명이다 — ALIMTALK_*_TYPE_HINT ·
//   BRAND_MESSAGE_TYPE_HINT(kakao.ts)가 고른 유형의 뜻을 셀렉트 아래에 적는다.

/**
 * 알림톡 이미지형 콜아웃 — 이 규격은 안내가 아니라 **업로드 조건**이다.
 *
 * 비율이 2:1 이 아니거나 500×250px 이하이면 카카오가 파일을 아예 받지 않는다(제작가이드 §2-1).
 * 수치의 정본은 kakao.ts 의 ALIMTALK_IMAGE_* 이고 여기서는 그것을 읽어 문장으로 만든다 —
 * 문구만 고치고 검증이 남는 사고를 막는 자리다(BODY_CALLOUT_LINES 와 같은 결).
 */
export const ALIMTALK_IMAGE_CALLOUT_LINES: readonly string[] = [
  `권장 크기 ${String(ALIMTALK_IMAGE_WIDTH)}×${String(ALIMTALK_IMAGE_HEIGHT)}px (가로:세로 = ${ALIMTALK_IMAGE_RATIO_LABEL} 고정)`,
  `${String(ALIMTALK_IMAGE_MIN_WIDTH)}×${String(ALIMTALK_IMAGE_MIN_HEIGHT)}px 이하이거나 비율이 다르면 업로드할 수 없어요.`,
  `JPG · PNG · 최대 ${String(ALIMTALK_IMAGE_MAX_BYTES / 1024)}KB`,
  '이미지에는 링크를 걸 수 없고, 템플릿당 한 장만 쓸 수 있어요.',
];

/** 상세 뷰의 카카오 전용 줄 */
export const DETAIL_LABEL_KAKAO_CHANNEL = '발신 카카오 채널';
export const DETAIL_LABEL_KAKAO_TYPE = '메시지 유형';
export const DETAIL_LABEL_APPROVAL = '심사 상태';
export const DETAIL_LABEL_REJECT_REASON = '반려 사유';
export const DETAIL_LABEL_SENT = '발송 이력';
export const DETAIL_LABEL_AD = '광고성';
export const DETAIL_LABEL_SEND_WINDOW = '발송 가능 시간';
