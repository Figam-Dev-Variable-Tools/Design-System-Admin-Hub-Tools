// 카카오톡 채널 템플릿 — 도메인 모델 · 순수 규칙 (알림톡 · 브랜드 메시지)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 코드는 brandmessage 인데 화면은 '브랜드 메시지 (구 친구톡)' 이라고 적는가]
//
// **친구톡은 2025-12-31 자로 종료됐다.** 2026-01-01 부터 친구톡으로 보낸 발송은 카카오가 전부
// 브랜드 메시지(Brand Message)로 자동 대체한다 — 지금(2026-07)은 친구톡이 사라진 지 반년이 넘었다.
// 그래서 모델의 이름은 살아 있는 제품인 `brandmessage` 이고, 화면 라벨만 '(구 친구톡)' 을 달아 둔다:
// 운영자는 아직 '친구톡' 이라는 낱말로 이 기능을 찾고, 라벨이 그 낱말을 갖고 있지 않으면 화면에
// 있는 기능을 못 찾은 채 '친구톡이 없어졌다' 고 문의를 넣는다.
//
// **이 주석을 지우지 마라.** 코드(`brandmessage`)와 라벨('구 친구톡')이 어긋나 보이는 것은 실수가
// 아니라 위 사실의 결과다. 근거가 사라지면 다음 사람이 둘 중 하나를 '고쳐서' 맞춘다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [두 채널은 근본이 다르다 — 한 모델로 합치지 않는다]
//
//                    알림톡                          브랜드 메시지
//   사전 템플릿 심사   필수(등록→검수중→승인/반려)      불필요
//   광고성            불가(부가정보 영역만 예외)        가능
//   발송 시간          제한 없음                       08:00~20:50
//   본문 상한          1,000자(버튼명 글자수 합산)       유형별 76~1,300자
//   치환변수           최대 40개, 변수만으로 구성 금지    —
//
// 심사가 있는 쪽에만 승인 상태·발송 이력 잠금이 있고, 광고가 가능한 쪽에만 발송 시간대와
// (광고)·수신거부 요건이 있다. 공통 필드(본문·버튼·치환변수)만 아래에서 공유한다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [카카오는 **글자 수**로 센다 — 바이트가 아니다]
//
// SMS/LMS 는 EUC-KR 바이트로 등급이 갈린다(`byteLengthOf`). 카카오는 그 축을 쓰지 않는다 —
// 상한도 카운터도 전부 글자 수다. 그래서 이 파일은 `byteLengthOf` 를 **부르지 않는다**. 같은
// 이유로 `TEXT_BODY_MAX`(2000, LMS 상수)도 재사용하지 않는다: 상수를 돌려 쓰면 문자 상한을 고친
// 순간 카카오 상한이 조용히 따라 움직인다.
// ─────────────────────────────────────────────────────────────────────────────
import { countVariables, isVariableOnlyBody, TEMPLATE_VARIABLE_MAX } from '../_shared/messaging';

/* ── 발신 카카오 채널 ──────────────────────────────────────────────────────────
 *
 * [왜 발신 프로필(운영진 그룹)에 매달지 않는가] 발신번호·발신 이메일은 우리 조직의 것이라 그룹에
 * 딸려 있다. 카카오 채널은 다르다 — **카카오 비즈니스에 등록하고 발송대행사에 연결한 계정**이고,
 * 그 등록은 우리 관리자 그룹 구조와 아무 관계가 없다. 그룹에 매달면 그룹을 하나 만들 때마다
 * 카카오 채널을 다시 고르게 되고, 실제로는 회사 전체가 같은 채널 한둘을 공유한다. */
export interface KakaoChannel {
  readonly id: string;
  /** 수신자가 대화방 상단에서 보는 이름 */
  readonly name: string;
  /** 카카오 채널 검색용 아이디(@ 로 시작한다) */
  readonly searchId: string;
}

/* ── 치환변수 ──────────────────────────────────────────────────────────────────
 *
 * 문법은 `#{변수}` 로 SMS·이메일과 같다(_shared/messaging). 카카오가 더 요구하는 것이 하나 있다:
 * **심사에 낼 때 변수마다 예시값을 함께 제출해야 한다.** 심사자는 `#{주문번호}` 만 보고는 그 자리에
 * 광고 문구가 들어올지 주문번호가 들어올지 알 수 없기 때문이다. 그래서 본문과 별개로 템플릿이
 * 변수→예시값 표를 든다. */
export type VariableSampleMap = Readonly<Record<string, string>>;

const VARIABLE_RE = /#\{[^}]+\}/g;

/** 본문에 쓰인 서로 다른 변수 토큰들 — 등장 순서를 지킨다(예시값 입력 순서가 본문 순서와 같아진다) */
export function variableTokensOf(text: string): readonly string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const match of text.matchAll(VARIABLE_RE)) {
    if (seen.has(match[0])) continue;
    seen.add(match[0]);
    tokens.push(match[0]);
  }
  return tokens;
}

/** 예시값이 아직 비어 있는 변수들 — 심사 제출을 막는 근거가 된다 */
export function missingVariableSamples(
  text: string,
  samples: VariableSampleMap,
): readonly string[] {
  return variableTokensOf(text).filter((token) => (samples[token] ?? '').trim() === '');
}

/* ── 글자 수 ───────────────────────────────────────────────────────────────────
 *
 * `[...text].length` 로 센다 — `text.length` 는 UTF-16 코드 단위라 이모지 하나를 2로 센다.
 * 카카오가 세는 것은 사람이 보는 글자다. */
export function kakaoCharCount(text: string): number {
  return [...text].length;
}

/* ── 버튼 ──────────────────────────────────────────────────────────────────────
 *
 * [왜 버튼이 일급 모델인가] 종전 모델에는 버튼이 아예 없었다. 그런데 알림톡에서 버튼은 장식이
 * 아니다 — **버튼명 글자 수가 본문 1,000자에 합산되고**, 버튼 유형에 따라 쓸 수 있는 메시지 유형이
 * 갈리며(AC), 버튼명에는 치환변수를 쓸 수 없다. 문자열 배열로 두면 이 규칙을 어디에도 걸 수 없다. */
export type KakaoButtonType = 'WL' | 'AL' | 'DS' | 'BK' | 'MD' | 'AC';

export const KAKAO_BUTTON_TYPE_LABEL: Readonly<Record<KakaoButtonType, string>> = {
  WL: '웹링크',
  AL: '앱링크',
  DS: '배송조회',
  BK: '봇전환',
  MD: '상담톡전환',
  AC: '채널추가',
};

/** 링크 주소를 갖는 유형 — 나머지는 카카오가 동작을 정하므로 우리가 줄 주소가 없다 */
export function usesLink(type: KakaoButtonType): boolean {
  return type === 'WL' || type === 'AL';
}

export interface KakaoButton {
  readonly id: string;
  readonly type: KakaoButtonType;
  readonly name: string;
  /** WL·AL 만 쓴다 (usesLink) */
  readonly linkMobile: string;
  readonly linkPc: string;
}

/** 버튼 개수 상한 — 알림톡·브랜드 메시지 공통 */
export const KAKAO_BUTTON_MAX = 5;

/** 버튼명 상한은 채널마다 다르다 — 알림톡 14자 · 브랜드 메시지 8자 */
export const ALIMTALK_BUTTON_NAME_MAX = 14;
export const BRAND_MESSAGE_BUTTON_NAME_MAX = 8;

/**
 * 채널추가(AC) 버튼의 이름은 **카카오가 고정**한다 — 우리가 정하는 글자가 아니다.
 * 편집기는 이 값을 읽기 전용으로 보여 준다(고칠 수 있게 두면 심사에서 반려된다).
 */
export const AC_BUTTON_NAME = '채널 추가';

/* ── 알림톡 — 두 개의 축 ───────────────────────────────────────────────────────
 *
 * [왜 하나의 평평한 enum 이 아닌가] 알림톡 템플릿을 고를 때 정하는 것은 **둘**이고 서로 독립이다:
 *
 *   메시지 유형 — 말풍선에 어떤 '영역' 이 붙는가 (부가정보 영역 · 채널추가 안내)
 *   강조 유형   — 본문 머리를 어떻게 표현하는가 (없음 · 굵은 제목 · 이미지 · 아이템 리스트)
 *
 * 둘은 자유롭게 조합된다 — '채널추가형 + 이미지형' 도 '복합형 + 강조표기형' 도 있다. 이것을
 * `'basic' | 'emphasis' | 'channel-add' | 'image' | …` 하나의 enum 으로 눕히면 4×4 조합이 표현되지
 * 않고, 표현하려는 순간 16개짜리 enum 이 되어 규칙을 어디에도 못 건다(예: AC 버튼 가능 여부는
 * **메시지 유형만** 보는 규칙인데 눕힌 enum 에서는 강조 유형까지 섞여 들어온다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [강조 유형은 축 **안에서** 배타다 — 이것이 '직교' 의 정확한 뜻이다]
 *
 * 카카오 제작가이드는 이미지형·아이템리스트형에 대해 똑같은 문장을 적어 둔다:
 * "강조표기형과 동시에 사용할 수 없으며". 즉 강조 유형은 넷 중 **하나만** 고르는 것이지 겹쳐
 * 쓰는 것이 아니다 — 지금처럼 단일 enum 으로 둔 모델이 그 사실을 이미 표현하고 있다(불리언 네 개로
 * 두었다면 '이미지형이면서 강조표기형' 이라는 불가능한 상태를 만들 수 있었다).
 * 두 **축 사이**(메시지 유형 × 강조 유형)는 자유 조합이다.
 *
 * 근거: 카카오비즈니스 알림톡 제작가이드 §2-1(이미지형) · §2-3(아이템리스트형)
 *   https://kakaobusiness.gitbook.io/main/ad/infotalk/content-guide
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * 메시지 유형 — 말풍선에 붙는 영역이 갈린다.
 *
 * [**'광고추가형' 은 없다**] 네 번째 유형은 `채널추가형` 이다. 카카오 고객센터가 네 가지를 그대로
 * 열거한다 — "기본형, 부가정보형, 채널추가형, 복합형의 총 4가지 유형을 제공":
 *   https://cs.kakao.com/helps_html/1073202282?locale=ko
 * 대행사 문서·블로그가 '광고추가형' 이라는 낱말을 쓰는 일이 있지만 카카오의 유형 이름이 아니다.
 * 광고에 닿는 성질은 **부가정보형**(광고 링크를 넣을 수 있는 유일한 영역)과 **채널추가형**(광고성
 * 메시지 수신 동의를 유도하는 안내)으로 나뉘어 있다. 이 이름을 '고쳐서' 맞추지 마라.
 */
export type AlimtalkMessageType = 'basic' | 'extra-info' | 'channel-add' | 'complex';

export const ALIMTALK_MESSAGE_TYPE_LABEL: Readonly<Record<AlimtalkMessageType, string>> = {
  basic: '기본형',
  'extra-info': '부가정보형',
  'channel-add': '채널추가형',
  complex: '복합형',
};

/** 유형이 무엇을 위한 것인지 — 셀렉트 옆의 한 줄 설명(고르기 전에 뜻을 알아야 한다) */
export const ALIMTALK_MESSAGE_TYPE_HINT: Readonly<Record<AlimtalkMessageType, string>> = {
  basic: '반드시 전달되어야 하는 정보만 담아요.',
  'extra-info': '본문 아래에 고정 부가정보를 덧붙여요.',
  'channel-add': '본문 아래에 채널 추가 안내와 채널추가 버튼을 붙여요.',
  complex: '부가정보와 채널 추가 안내를 함께 붙여요.',
};

/** 이 유형이 부가정보 영역을 갖는가 — 부가정보형·복합형 */
export function hasExtraInfo(messageType: AlimtalkMessageType): boolean {
  return messageType === 'extra-info' || messageType === 'complex';
}

/** 이 유형이 채널 추가 안내를 갖는가 — 채널추가형·복합형 */
export function hasChannelAddGuide(messageType: AlimtalkMessageType): boolean {
  return messageType === 'channel-add' || messageType === 'complex';
}

/**
 * 부가정보 상한 — 500자.
 *
 * [규칙 세 가지가 한 덩어리다] 카카오 제작가이드 §1-2 는 부가정보에 대해 (1) 최대 500자,
 * (2) **치환변수 사용 불가**, (3) URL 은 사용 가능 을 함께 적는다. 변수 금지가 특히 중요한데,
 * 부가정보는 '고정적인 안내' 를 담는 자리라 발송마다 값이 달라지면 그 유형을 고른 뜻이 사라진다.
 *   https://kakaobusiness.gitbook.io/main/ad/infotalk/content-guide
 */
export const ALIMTALK_EXTRA_INFO_MAX = 500;

/**
 * 채널 추가 안내 문구 — **카카오가 정한 고정 문장이고 변형할 수 없다.**
 *
 * 제작가이드 §1-3 이 이 문장을 그대로 싣고 "변형 불가" 를 붙인다. 그래서 이 자리는 입력칸이
 * 아니라 읽기 전용 표시다 — 고칠 수 있게 두면 한 글자만 달라져도 심사에서 반려된다
 * (AC_BUTTON_NAME 을 읽기 전용으로 두는 것과 같은 결).
 */
export const ALIMTALK_CHANNEL_ADD_GUIDE =
  '카카오톡 채널을 추가하면 유용한 광고성 메시지를 카카오톡으로 받아 볼 수 있어요.';

/* [상한 80자는 상수로 두지 않았다] 제작가이드 §1-3 이 안내 영역을 80자로 제한하지만, 문구가
   위처럼 **고정**이라 넘을 방법이 없다(47자다). 검사할 것이 없는 수치를 상수로 남기면 아무도
   부르지 않는 죽은 값이 된다. 1,000자 합산에 들어가는 몫은 상한이 아니라 **문구 자체**의 길이로
   세면 된다 — alimtalkBillableLength 가 그렇게 한다. */

/** 강조 유형 — 본문 머리의 표현이 갈린다. 넷 중 **하나만** 고른다(위 머리말) */
export type AlimtalkEmphasisType = 'none' | 'title' | 'image' | 'item-list';

export const ALIMTALK_EMPHASIS_TYPE_LABEL: Readonly<Record<AlimtalkEmphasisType, string>> = {
  none: '선택 안 함',
  title: '강조표기형',
  image: '이미지형',
  'item-list': '아이템리스트형',
};

export const ALIMTALK_EMPHASIS_TYPE_HINT: Readonly<Record<AlimtalkEmphasisType, string>> = {
  none: '본문만 보내요.',
  title: '본문 위에 굵은 제목과 보조문구를 얹어요.',
  image: '본문 위에 800×400 이미지를 얹어요.',
  'item-list': '본문 위에 항목 2~10개의 표를 얹어요.',
};

/* ── 알림톡 — 강조표기형 ──────────────────────────────────────────────────────
 *
 * [23자인가 50자인가 — 두 수치는 서로 다른 것을 잰다]
 * 제작가이드 §2-2 가 주는 숫자는 **말줄임 기준**이다: 제목은 Android 2줄 23자·iOS 2줄 27자,
 * 보조문구는 Android 18자·iOS 21자에서 잘린다. 한편 콘텐츠 가이드 문서에는 타이틀 '최대 50자'
 * 라는 **입력 상한**이 따로 적혀 있다. 둘을 한 숫자로 합치면 둘 다 틀린 화면이 된다:
 *   50 으로만 막으면 → 30자 제목이 통과하고 안드로이드 수신자에게는 잘려서 도착한다.
 *   23 으로만 막으면 → 카카오가 받아 주는 문구를 우리 화면이 거부한다.
 * 그래서 **막는 것은 50, 경고하는 것은 23** 으로 나눈다.
 *
 * [미확인] 50자와 23/27자를 한 문서에서 함께 명시한 원문은 찾지 못했다 — 두 수치의 출처가 다르다.
 */

/** 강조 제목 입력 상한 — 이것을 넘으면 저장을 막는다 */
export const ALIMTALK_EMPHASIS_TITLE_MAX = 50;

/** 강조 제목 말줄임 기준(Android) — 넘으면 막지 않고 '잘려 보인다' 고 알린다 */
export const ALIMTALK_EMPHASIS_TITLE_TRUNCATE = 23;

/** 강조 보조문구 말줄임 기준(Android) — 같은 결로 경고만 한다 */
const ALIMTALK_EMPHASIS_SUBTITLE_TRUNCATE = 18;

/* ── 알림톡 — 이미지형 ────────────────────────────────────────────────────────
 *
 * 제작가이드 §2-1. 권장 800×400px · JPG/PNG · 최대 500KB 이고, **비율이 2:1 이 아니거나 가로
 * 500px·세로 250px 이하이면 업로드 자체가 거부된다.** 그래서 이 값들은 안내 문구가 아니라 검증
 * 기준이다 — 여기서 막지 않으면 운영자는 카카오 콘솔에 올리는 단계에서야 거부당한다.
 * 이미지 클릭 링크는 걸 수 없고, 템플릿당 한 장만 쓴다(발송마다 바뀌는 이미지가 아니다). */

export const ALIMTALK_IMAGE_WIDTH = 800;
export const ALIMTALK_IMAGE_HEIGHT = 400;
export const ALIMTALK_IMAGE_MIN_WIDTH = 500;
export const ALIMTALK_IMAGE_MIN_HEIGHT = 250;
export const ALIMTALK_IMAGE_MAX_BYTES = 500 * 1024;

/**
 * 가로:세로 = 2:1 고정.
 *
 * 숫자가 아니라 **문장**으로 두는 이유: 이 값을 쓰는 곳이 검증이 아니라 안내 문구뿐이다(업로드
 * 시점의 실제 비율 검사는 이미지를 디코드해야 하므로 파일 업로드가 붙는 회차의 일이다 —
 * validation.ts imageEdgeError 와 같은 결). `2` 라는 숫자만 두면 문구를 만들 때마다 ':1' 을 손으로
 * 붙이게 되고, 그 순간 규격과 화면이 갈라질 자리가 생긴다.
 */
export const ALIMTALK_IMAGE_RATIO_LABEL = '2:1';

/* ── 알림톡 — 아이템리스트형 ──────────────────────────────────────────────────
 *
 * 제작가이드 §2-3. 행은 **2개 이상 10개 이하**이고 각 행은 항목명(6자)·항목값(23자)을 **둘 다**
 * 갖는다. 헤더·하이라이트는 선택이다.
 *
 * [항목명이 6자인 것은 오타가 아니다] '주문번호'(4자)·'결제금액'(4자)처럼 표의 왼쪽 열에 들어가는
 * 짧은 이름을 위한 칸이라 그렇다. 이 상한을 넉넉히 잡아 두면 운영자가 문장을 적고, 수신 화면에서
 * 왼쪽 열이 통째로 말줄임된다.
 *
 * [항목명에는 변수를 쓸 수 없다] 표의 머리글이 발송마다 달라지면 심사가 본 표와 다른 표가 나간다. */

export const ALIMTALK_ITEM_LIST_MIN = 2;
export const ALIMTALK_ITEM_LIST_MAX = 10;
export const ALIMTALK_ITEM_NAME_MAX = 6;
export const ALIMTALK_ITEM_DESCRIPTION_MAX = 23;
/** 리스트 위 헤더 — 선택 */
export const ALIMTALK_ITEM_HEADER_MAX = 16;

/**
 * 아이템 하이라이트 상한 — **썸네일이 있으면 줄어든다.**
 *
 * 썸네일이 글자 자리를 실제로 빼앗기 때문이다(제작가이드 §2-3): 하이라이트 제목은 이미지 없이
 * 30자(2줄)·이미지와 함께 21자(2줄), 디스크립션은 19자(1줄)·13자(1줄). 상한이 상태에 따라
 * 달라지므로 상수 하나로 둘 수 없고 함수로 묻는다.
 */
export function alimtalkHighlightTitleMax(hasThumbnail: boolean): number {
  return hasThumbnail ? 21 : 30;
}

export function alimtalkHighlightDescriptionMax(hasThumbnail: boolean): number {
  return hasThumbnail ? 13 : 19;
}

/** 아이템리스트 한 행 — 항목명과 항목값은 둘 다 필수다(한쪽만 있는 행은 표가 되지 않는다) */
export interface AlimtalkItem {
  readonly id: string;
  /** 표의 왼쪽 열 — 6자, 치환변수 불가 */
  readonly name: string;
  /** 표의 오른쪽 열 — 23자, 치환변수 가능 */
  readonly description: string;
}

/**
 * 채널추가(AC) 버튼은 채널추가형·복합형에서만 쓸 수 있다 — 다른 유형에 넣으면 반려된다.
 * 근거는 제작가이드 §1-3(채널추가형이 AC 버튼 타입을 쓴다)이고, 곧 위 hasChannelAddGuide 와
 * 같은 조건이다 — **안내 문구가 붙는 유형에만 그 버튼이 있다**. 두 함수가 같은 답을 내는 것은
 * 우연이 아니라 규칙이 하나이기 때문이라, 여기서 조건을 다시 적지 않고 그 함수를 부른다.
 */
export function allowsChannelAddButton(messageType: AlimtalkMessageType): boolean {
  return hasChannelAddGuide(messageType);
}

/* ── 알림톡 — 심사 · 발송 이력 ────────────────────────────────────────────────
 *
 * 심사는 **발행 상태(draft/active/inactive)와 완전히 별개의 축**이다. 발행은 우리가 켜고 끄는
 * 것이고 심사는 카카오가 판정하는 것이라, 'Active 인데 반려' 도 'Draft 인데 승인' 도 정상 상태다.
 * 둘을 한 필드에 합치면 카카오가 반려한 순간 우리 발행 상태가 멋대로 바뀐다. */
export type AlimtalkApprovalStatus = 'draft' | 'inspecting' | 'approved' | 'rejected';

export const ALIMTALK_APPROVAL_LABEL: Readonly<Record<AlimtalkApprovalStatus, string>> = {
  draft: '미제출',
  inspecting: '검수중',
  approved: '승인',
  rejected: '반려',
};

/** 심사에 통과한 것만 실제로 발송된다 — 발행 상태('사용중')와 별개다 */
export function isAlimtalkSendable(status: AlimtalkApprovalStatus): boolean {
  return status === 'approved';
}

/**
 * 내용을 잠가야 하는가 — 그리고 **왜** 잠겼는가.
 *
 * [왜 세 갈래인가] 종전 `isTemplateContentLocked`(_shared/messaging)는 승인 상태만 봐서 boolean 을
 * 돌려줬다. 그것으로는 운영자에게 길을 알려 줄 수 없다:
 *
 *   sent      — **한 번이라도 발송된 알림톡은 영영 수정할 수 없다.** 승인을 취소해도 마찬가지다.
 *               이미 나간 메시지와 템플릿이 같은 문구라는 것이 수신자 문의·분쟁의 근거이기 때문이다.
 *               길은 하나뿐이다: 복제해서 **새 템플릿**으로 다시 심사.
 *   review    — 검수중. 심사 대상과 제출본이 어긋나면 안 된다. 심사가 끝나면 풀린다.
 *   approved  — 승인됐지만 아직 발송 전. 이건 **되돌릴 수 있다** — 승인을 취소하면 다시 편집할 수
 *               있다. 위 'sent' 와 겉모습이 같아 boolean 으로 합치면 이 길이 화면에서 사라진다.
 *
 * 잠기지 않는 것: 템플릿명(우리 내부 라벨이라 심사 대상이 아니다).
 */
export type AlimtalkLockReason = 'sent' | 'review' | 'approved';

export function alimtalkLockReasonOf(
  status: AlimtalkApprovalStatus,
  hasBeenSent: boolean,
): AlimtalkLockReason | null {
  // 발송 이력이 먼저다 — 발송된 뒤에 승인이 취소돼도 잠금은 풀리지 않는다
  if (hasBeenSent) return 'sent';
  if (status === 'inspecting') return 'review';
  if (status === 'approved') return 'approved';
  return null;
}

export const ALIMTALK_LOCK_MESSAGE: Readonly<Record<AlimtalkLockReason, string>> = {
  sent: '한 번이라도 발송된 알림톡 템플릿은 수정할 수 없어요. 복제해 새 템플릿으로 심사를 받으세요.',
  review: '검수 중에는 내용을 수정할 수 없어요. 심사 결과를 받은 뒤에 수정하세요.',
  approved: '승인된 템플릿이에요. 수정하려면 먼저 승인을 취소하세요(발송 전에만 가능해요).',
};

/* ── 알림톡 — 본문 ─────────────────────────────────────────────────────────────
 *
 * [상한 1,000자에 합산되는 것이 본문만이 아니다]
 * 솔라피 알림톡 API 문서가 이 규칙을 가장 또렷하게 적는다 — "본문 이외에도 강조 표기 문구,
 * 아이템 리스트, 부가 정보 등을 **모두 합하여 변수 치환 후** 1,000자를 넘을 수 없습니다"
 *   https://solapi.com/developers/api/messages-ata
 * NHN Cloud 콘솔 가이드도 버튼명과 URL 이 함께 셈에 든다고 적는다("변수 및 URL, 띄어쓰기,
 * 버튼명 모두 포함하여 1,000자")
 *   https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/alimtalk-console-guide/
 *
 * 그래서 카운터는 본문만 세지 않는다. 본문만 세면 999자 본문 + 부가정보 500자가 화면에서 통과했다가
 * 카카오에서 반려된다 — **카운터가 세는 값과 심사가 세는 값이 같아야 한다.**
 *
 * [변수 치환 후로 센다는 점은 우리가 지킬 수 없다] 발송 시점의 실제 값은 이 화면에 없다. 그래서
 * 카카오의 셈과 우리 셈은 변수 길이만큼 어긋날 수 있고, 그 여유분은 편집기 콜아웃이 안내한다
 * (문자 편집기가 '20~30자 여유를 두라' 고 적는 것과 같은 이유). */

/** 기본 상한 — 기본형·강조표기형·이미지형 */
export const ALIMTALK_BODY_MAX = 1000;

/**
 * 아이템리스트형의 상한 — 700자.
 *
 * [출처가 하나뿐이다 — 미확인에 가깝다] NHN Cloud 알림톡 개요가 "기본 및 이미지 1,000자 /
 * 아이템리스트 700자" 라고 적는다:
 *   https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/alimtalk-overview/
 * 카카오 자신의 제작가이드에는 이 수치가 없다. **더 빡빡한 쪽**을 택한 이유는 방향이 안전하기
 * 때문이다: 700 이 틀렸다면 우리 화면이 보낼 수 있는 문구를 막을 뿐이지만, 1,000 으로 두었다가
 * 700 이 맞으면 통과시킨 템플릿이 카카오에서 반려된다.
 */
export const ALIMTALK_ITEM_LIST_BODY_MAX = 700;

/** 이 강조 유형에서 쓸 수 있는 총 글자 수 */
export function alimtalkBodyMaxOf(emphasisType: AlimtalkEmphasisType): number {
  return emphasisType === 'item-list' ? ALIMTALK_ITEM_LIST_BODY_MAX : ALIMTALK_BODY_MAX;
}

/**
 * 1,000자 셈에 들어가는 모든 조각.
 *
 * [왜 인자를 하나로 묶었나] 조각이 여섯이라 위치 인자로 늘어놓으면 부르는 쪽에서 순서가 뒤바뀌어도
 * 타입이 잡아 주지 못한다(전부 string 이다). 이름으로 받으면 그 사고가 없다.
 */
export interface AlimtalkLengthParts {
  readonly body: string;
  readonly emphasisType: AlimtalkEmphasisType;
  readonly emphasisTitle: string;
  readonly emphasisSubtitle: string;
  readonly itemHeader: string;
  readonly itemHighlightTitle: string;
  readonly itemHighlightDescription: string;
  readonly items: readonly AlimtalkItem[];
  readonly messageType: AlimtalkMessageType;
  readonly extraInfo: string;
  readonly buttons: readonly KakaoButton[];
}

/**
 * 심사가 세는 그 숫자.
 *
 * **유형이 쓰지 않는 조각은 세지 않는다.** 강조 유형을 이미지형으로 되돌렸는데 예전 강조 제목이
 * 값으로 남아 있을 수 있고(편집기는 값을 지우지 않고 표시만 가른다), 그것까지 세면 화면에 보이지도
 * 않는 글자 때문에 카운터가 넘친다 — 운영자는 무엇을 지워야 하는지 알 수 없다.
 */
export function alimtalkBillableLength(parts: AlimtalkLengthParts): number {
  let total = kakaoCharCount(parts.body);

  if (parts.emphasisType === 'title') {
    total += kakaoCharCount(parts.emphasisTitle) + kakaoCharCount(parts.emphasisSubtitle);
  }

  if (parts.emphasisType === 'item-list') {
    total +=
      kakaoCharCount(parts.itemHeader) +
      kakaoCharCount(parts.itemHighlightTitle) +
      kakaoCharCount(parts.itemHighlightDescription);
    for (const item of parts.items) {
      total += kakaoCharCount(item.name) + kakaoCharCount(item.description);
    }
  }

  if (hasExtraInfo(parts.messageType)) total += kakaoCharCount(parts.extraInfo);
  // 채널 추가 안내는 문구가 고정이라 값이 아니라 **유형**이 있으면 그만큼이 잡힌다
  if (hasChannelAddGuide(parts.messageType)) {
    total += kakaoCharCount(ALIMTALK_CHANNEL_ADD_GUIDE);
  }

  for (const button of parts.buttons) total += kakaoCharCount(button.name);
  return total;
}

/**
 * 치환변수가 놓일 수 있는 **모든** 글자 — 예시값을 물어볼 대상이다.
 *
 * [왜 본문만으로는 안 되나] 강조표기형의 제목, 아이템리스트의 헤더·하이라이트·항목값도 심사에
 * 함께 제출되고 거기에도 변수를 쓸 수 있다. 본문만 훑으면 `주문 #{주문번호}` 를 항목값에 적은
 * 템플릿이 **예시값 없이** 제출되고 그대로 반려된다 — 화면에는 그 변수의 입력칸이 아예 생기지
 * 않으므로 운영자는 빠뜨린 줄도 모른다.
 *
 * [무엇이 빠져 있나 — 변수를 **쓸 수 없는** 자리들]
 *   · 버튼명 — buttonError 가 막는다
 *   · 강조 보조문구 — 제작가이드 §2-2 가 변수 불가로 못박는다
 *   · 아이템 항목명 · 부가정보 — 각각 itemsError · extraInfoError 가 막는다
 * 쓸 수 없는 자리를 여기 넣으면 '예시값을 입력하라' 는 요구가 뜨는데, 정작 그 변수는 애초에
 * 지워야 할 것이다 — 서로 반대되는 두 오류가 같은 글자를 두고 다툰다.
 */
export function alimtalkVariableBearingText(parts: AlimtalkLengthParts): string {
  const pieces: string[] = [parts.body];

  if (parts.emphasisType === 'title') pieces.push(parts.emphasisTitle);
  if (parts.emphasisType === 'item-list') {
    pieces.push(parts.itemHeader, parts.itemHighlightTitle, parts.itemHighlightDescription);
    for (const item of parts.items) pieces.push(item.description);
  }
  return pieces.join('\n');
}

/* ── 브랜드 메시지 — 본문 유형 ────────────────────────────────────────────────
 *
 * 심사가 없는 대신 **유형이 상한을 정한다**. 유형을 바꾸면 상한이 함께 바뀌므로 상한을 상수 하나로
 * 둘 수 없다(알림톡과 여기가 갈리는 지점이다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [숫자가 문서마다 다르다 — 두 개의 다른 '표면' 이기 때문이다]
 *
 * 브랜드 메시지 규격을 찾으면 본문 상한이 400자라는 문서와 1,300자라는 문서가 함께 나온다.
 * 둘 다 맞다 — **서로 다른 제품 표면**을 설명하기 때문이다:
 *
 *   채널 관리자센터 / 카카오모먼트 (마케터가 웹 화면에서 직접 만드는 경우) → 기본 텍스트형 400자
 *     https://kakaobusiness.gitbook.io/main/channel/run/message
 *   발송대행사 API (우리처럼 API 로 쏘는 경우)                              → 텍스트·이미지형 1,300자
 *     https://guide.ncloud-docs.com/docs/sens-bmoverview
 *     https://www.bizppurio.com/service/intro/kakao
 *
 * **이 앱은 API 표면이다.** 템플릿 모델이 발송 대행사(SureM·NHN·Solapi — types.ts TextMessageVendor)를
 * 들고 있고 실제 발송도 그 회선으로 나간다. 그래서 아래 값은 API 표면의 것을 쓴다. 두 벤더(NHN
 * Cloud·비즈뿌리오)의 문서가 서로 독립적으로 같은 수치를 적는다는 점이 이 선택의 근거다.
 *
 * **표면을 섞지 마라.** 400 과 1,300 중 '작은 쪽이 안전하다' 며 낮추면, API 로는 보낼 수 있는 문구를
 * 우리 화면만 거부한다. 반대로 관리자센터용 화면을 만들게 되면 이 표를 통째로 갈아야 한다.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * 우리가 다루는 유형.
 *
 * [카카오가 지원하는 유형은 여덟이고 여기 다섯이 있다] 공식 목록에는 위 다섯 외에 **커머스형 ·
 * 캐러셀 커머스형 · 프리미엄 동영상형**이 더 있다(https://kakaobusiness.gitbook.io/main/ad/brandmessage).
 * 셋을 넣지 않은 이유는 '아직 안 만들어서' 가 아니라 **우리에게 그 재료가 없어서**다:
 *   · 커머스형 · 캐러셀 커머스형 — 상품명·가격·상품 이미지를 상품 카탈로그에서 끌어와야 한다.
 *   · 프리미엄 동영상형 — 영상 출처가 **카카오TV VOD/Live 로 제한**된다. 우리 영상은 거기 없다.
 * 재료가 생기기 전에 유니온에 넣으면 고를 수는 있는데 채울 수 없는 칸이 생긴다.
 */
export type BrandMessageBodyType = 'text' | 'image' | 'wide-image' | 'wide-list' | 'carousel';

export const BRAND_MESSAGE_TYPE_LABEL: Readonly<Record<BrandMessageBodyType, string>> = {
  text: '기본 텍스트형',
  image: '이미지형',
  'wide-image': '와이드 이미지형',
  'wide-list': '와이드 리스트형',
  carousel: '캐러셀 피드형',
};

/** 유형이 무엇을 위한 것인지 — 셀렉트 아래 한 줄(자수만으로는 모양을 알 수 없다) */
export const BRAND_MESSAGE_TYPE_HINT: Readonly<Record<BrandMessageBodyType, string>> = {
  text: '글자만 보내요. 가장 길게 쓸 수 있어요.',
  image: '본문 위에 이미지 한 장을 얹어요.',
  'wide-image': '말풍선을 가득 채우는 이미지 — 글자는 76자까지예요.',
  'wide-list': '항목 3~4개를 세로 목록으로 보여 줘요.',
  carousel: '카드 2~6장을 가로로 넘겨 보여 줘요.',
};

/**
 * 유형별 본문 상한 (API 표면 — 위 머리말).
 *
 * 텍스트형과 이미지형이 같은 1,300자인 것은 오타가 아니다 — 두 벤더 문서가 그렇게 적는다. 이미지가
 * 붙는다고 글자가 줄어드는 것은 **와이드형부터**다(이미지가 말풍선을 통째로 차지한다).
 * 캐러셀은 '카드 한 장당' 180자다(전체 합이 아니다).
 */
export const BRAND_MESSAGE_BODY_MAX: Readonly<Record<BrandMessageBodyType, number>> = {
  text: 1300,
  image: 1300,
  'wide-image': 76,
  /* [미확인] 와이드 리스트형의 **본문** 상한을 명시한 문서를 찾지 못했다. 확인된 것은 리스트
     항목의 제목이 20자라는 것뿐이라, 이 유형에서 body 는 리스트 머리글로 쓰고 같은 20자를 건다.
     종전 값 100 은 출처를 찾을 수 없어 남기지 않았다. */
  'wide-list': 20,
  carousel: 180,
};

/* [삭제됨] BRAND_MESSAGE_TYPE_IMPLEMENTED — 유형별 '구현했는가' 플래그.
   다섯 유형이 **전부 구현되어** 모든 값이 true 가 됐고, 그 순간 이 표는 아무것도 가르지 않는
   죽은 값이 된다. 알림톡 쪽의 ALIMTALK_*_TYPE_IMPLEMENTED 도 같은 이유로 사라졌다.
   유형을 하나 더 늘리면서 잠가 둘 일이 생기면 그때 다시 만든다 — 지금 남겨 두면 '전부 true 인
   표를 매번 읽는' 코드만 남는다. */

/**
 * 이 유형이 **말풍선 본체에** 이미지를 요구하는가.
 *
 * 와이드 리스트형·캐러셀형은 여기서 false 다 — 이미지가 없어서가 아니라 이미지가 **항목·카드마다**
 * 딸려 있기 때문이다(imageFileName 한 칸으로 표현되지 않는다). 그 유형의 이미지 요구는
 * wideListError · carouselError 가 항목 단위로 본다.
 */
export function requiresImage(type: BrandMessageBodyType): boolean {
  return type === 'image' || type === 'wide-image';
}

/* [usesCards 를 두지 않는다] '카드/항목 배열을 갖는가' 를 한 함수로 물으면 편집기·검증·미리보기가
   모두 그 참/거짓만 보고 갈라지는데, **와이드 리스트형과 캐러셀형은 배열의 모양이 서로 다르다**
   (항목은 제목+이미지, 카드는 헤더+본문+이미지+버튼). 한 불리언으로 묶으면 그 다음 줄에서 결국
   유형을 다시 물어야 하고, 두 번 묻는 조건 중 하나만 고쳐지는 자리가 생긴다. 세 곳 모두
   `bodyType === 'wide-list'` / `=== 'carousel'` 로 **한 번만** 가른다. */

/* ── 브랜드 메시지 — 와이드 리스트형 ───────────────────────────────────────────
 *
 * 항목 **3~4개**. 각 항목은 제목(20자)과 이미지를 갖는다.
 *   https://kakaobusiness.gitbook.io/main/channel/run/message
 *
 * [왜 3개 미만을 막나] 리스트가 2개면 카카오가 리스트로 그리지 않는다 — 유형을 고른 뜻이 사라진다.
 * [미확인] 한 대행사(Sendon) 문서는 최대 5개를 적지만 카카오 공식은 3~4 라 그쪽을 따른다. */
export const BRAND_LIST_ITEM_MIN = 3;
export const BRAND_LIST_ITEM_MAX = 4;
export const BRAND_LIST_ITEM_TITLE_MAX = 20;

export interface BrandListItem {
  readonly id: string;
  readonly title: string;
  readonly imageFileName: string;
}

/* ── 브랜드 메시지 — 캐러셀 피드형 ─────────────────────────────────────────────
 *
 * 카드 **2~6장**. 카드마다 헤더(20자)·본문(180자)·이미지·버튼 1~2개.
 *   https://kakaobusiness.gitbook.io/main/channel/run/message
 *
 * [미확인] 카드 수는 문서마다 갈린다 — Kakao i Connect 는 '인트로 있으면 1~5, 없으면 2~6', 카카오
 * 관리자센터는 커머스형에 대해 2~7 을 적는다. 인트로 카드를 쓰지 않는 피드형 기준인 2~6 을 택했다.
 * [미확인] 카드 끝의 '더보기' 카드가 있는지는 어느 문서에서도 확인하지 못했다 — 그리지 않는다. */
export const BRAND_CAROUSEL_CARD_MIN = 2;
export const BRAND_CAROUSEL_CARD_MAX = 6;
export const BRAND_CAROUSEL_HEADER_MAX = 20;
/** 카드 한 장의 버튼 — 최소 1개, 최대 2개 */
const BRAND_CAROUSEL_CARD_BUTTON_MIN = 1;
const BRAND_CAROUSEL_CARD_BUTTON_MAX = 2;

/** 와이드 이미지형의 버튼 개수 — 가로 배치라 2개까지다(buttonNameMaxOf 머리말과 같은 근거) */
export const BRAND_WIDE_IMAGE_BUTTON_MAX = 2;

export interface BrandCarouselCard {
  readonly id: string;
  readonly header: string;
  readonly body: string;
  readonly imageFileName: string;
  readonly buttons: readonly KakaoButton[];
}

/* ── 브랜드 메시지 — 발송 가능 시간대 (08:00 ~ 20:50) ──────────────────────────
 *
 * [왜 야간 광고 제한(21:00~08:00)과 다른 숫자인가] 정보통신망법은 21시부터를 야간으로 보지만
 * 카카오는 **20:50 까지만** 브랜드 메시지를 받는다 — 21시 직전에 밀어 넣은 발송이 21시를 넘겨
 * 도달하는 것을 막으려는 대행사·플랫폼 쪽 안전 여유다. 법정 기준을 그대로 쓰면 20:55 예약이
 * 화면에서는 통과하고 발송에서 거부된다. */
export const BRAND_MESSAGE_SEND_START_MINUTE = 8 * 60;
export const BRAND_MESSAGE_SEND_END_MINUTE = 20 * 60 + 50;

export const BRAND_MESSAGE_SEND_WINDOW_LABEL = '08:00 ~ 20:50';

/** 하루 중 몇 분째인가로 판정한다 — 시(hour)만으로는 20:50 이라는 경계를 표현할 수 없다 */
export function isBrandMessageSendableAt(hour: number, minute: number): boolean {
  const at = hour * 60 + minute;
  return at >= BRAND_MESSAGE_SEND_START_MINUTE && at <= BRAND_MESSAGE_SEND_END_MINUTE;
}

/* ── 본문 내용 (판별 유니온) ──────────────────────────────────────────────────── */

/**
 * 알림톡 본문.
 *
 * [왜 유형별로 쪼갠 유니온이 아닌가] 이메일 블록은 판별 유니온인데 여기는 평평한 객체다 — 축이
 * **둘**이기 때문이다. 유니온으로 쪼개려면 `messageType × emphasisType` 의 16 가지 조합마다 타입을
 * 하나씩 만들어야 하고, 그러면 '유형을 바꿔도 입력한 값이 남아 있다' 는 편집기의 기본 동작이
 * 표현되지 않는다(유형을 되돌리면 값이 돌아와야 한다). 대신 **어느 필드가 지금 살아 있는가**를
 * 위의 hasExtraInfo · hasChannelAddGuide · emphasisType 이 판정하고, 화면과 검증과 글자 수 셈이
 * 모두 그 판정을 부른다 — 값은 남기고 **의미만** 유형이 정한다.
 */
export interface AlimtalkTemplateContent {
  readonly kind: 'alimtalk';
  readonly channelId: string;
  readonly messageType: AlimtalkMessageType;
  readonly emphasisType: AlimtalkEmphasisType;
  /** 강조표기형의 굵은 제목 — emphasisType 이 'title' 일 때만 쓴다 */
  readonly emphasisTitle: string;
  /** 강조표기형의 보조 문구 — 제목 위에 작게 붙는다. **치환변수를 쓸 수 없다**(제작가이드 §2-2) */
  readonly emphasisSubtitle: string;
  /** 이미지형의 이미지 — 800×400 · 2:1 · 500KB (ALIMTALK_IMAGE_* 머리말) */
  readonly emphasisImageFileName: string;
  /** 아이템리스트형의 헤더 — 선택, 16자 */
  readonly itemHeader: string;
  /** 아이템 하이라이트 — 선택. 썸네일이 있으면 상한이 줄어든다 */
  readonly itemHighlightTitle: string;
  readonly itemHighlightDescription: string;
  readonly itemHighlightThumbnailFileName: string;
  /** 아이템리스트 행 — 2~10개 */
  readonly items: readonly AlimtalkItem[];
  /** 부가정보 — 부가정보형·복합형에서만. 500자, 치환변수 불가 */
  readonly extraInfo: string;
  readonly body: string;
  readonly buttons: readonly KakaoButton[];
  readonly variableSamples: VariableSampleMap;
  readonly approvalStatus: AlimtalkApprovalStatus;
  /** 반려 사유 — approvalStatus 가 'rejected' 일 때 카카오가 준 글자 */
  readonly rejectReason: string;
  /**
   * 이 템플릿으로 실제 발송이 한 번이라도 나갔는가.
   * TODO(backend): 발송 이력 집계가 정본이다 — 화면이 켜고 끄는 값이 아니다.
   */
  readonly hasBeenSent: boolean;
}

export interface BrandMessageTemplateContent {
  readonly kind: 'brandmessage';
  readonly channelId: string;
  readonly bodyType: BrandMessageBodyType;
  readonly body: string;
  /** 이미지형·와이드 이미지형에서 쓴다 (requiresImage) */
  readonly imageFileName: string;
  /** 와이드 리스트형의 항목 3~4개 */
  readonly listItems: readonly BrandListItem[];
  /** 캐러셀 피드형의 카드 2~6장 */
  readonly cards: readonly BrandCarouselCard[];
  /** 말풍선 바닥의 버튼 — 카드형에서는 카드마다 따로 든다(cards[].buttons) */
  readonly buttons: readonly KakaoButton[];
  readonly variableSamples: VariableSampleMap;
  /** 광고성 메시지인가 — 켜면 (광고) 표기와 무료수신거부 문구가 본문 요건이 된다 */
  readonly isAd: boolean;
}

/**
 * 유형이 쓰지 않는 칸의 기본값.
 *
 * [왜 상수로 두는가] 이 칸들은 픽스처·빈 폼·'종류가 다른 템플릿을 열었을 때의 복구' 세 곳에서
 * 똑같이 채워진다. 세 곳에 손으로 적으면 필드를 하나 늘릴 때마다 세 곳을 고쳐야 하고, 실제로는
 * 한 곳이 빠져서 그 화면만 컴파일이 깨진다. 한 벌로 두면 **타입이 빠진 곳을 찾아 준다**.
 */
export const ALIMTALK_EMPTY_TYPE_FIELDS = {
  emphasisTitle: '',
  emphasisSubtitle: '',
  emphasisImageFileName: '',
  itemHeader: '',
  itemHighlightTitle: '',
  itemHighlightDescription: '',
  itemHighlightThumbnailFileName: '',
  items: [] as readonly AlimtalkItem[],
  extraInfo: '',
} as const;

export const BRAND_MESSAGE_EMPTY_TYPE_FIELDS = {
  listItems: [] as readonly BrandListItem[],
  cards: [] as readonly BrandCarouselCard[],
} as const;

/** 두 카카오 채널이 공유하는 것만 보는 자리 — 버튼 규칙·변수 규칙이 여기에 걸린다 */
export type KakaoTemplateContent = AlimtalkTemplateContent | BrandMessageTemplateContent;

/* [삭제됨] KakaoKind — `KakaoTemplateContent['kind']` 별칭.
   버튼 규칙이 채널 하나로 갈리던 시절의 타입이다. 상한이 **유형까지 봐야** 정해지면서
   (KakaoButtonContext) 마지막 소비자가 사라졌다. */

/**
 * 버튼 규칙이 걸리는 자리 — 채널 하나로는 답이 안 나온다.
 *
 * [왜 객체인가] 버튼명 상한은 **브랜드 메시지 안에서도 유형마다 다르다**(아래 buttonNameMaxOf).
 * 인자를 늘려 가면 `(button, kind, messageType, bodyType)` 처럼 되고, 전부 문자열 유니온이라
 * 순서가 뒤바뀌어도 타입이 잡아 주지 못한다. 이름으로 받으면 그 사고가 없다.
 */
export type KakaoButtonContext =
  | { readonly kind: 'alimtalk'; readonly messageType: AlimtalkMessageType }
  | { readonly kind: 'brandmessage'; readonly bodyType: BrandMessageBodyType }
  /** 캐러셀 카드 안의 버튼 — 카드는 자기만의 개수·이름 규칙을 갖는다 */
  | { readonly kind: 'carousel-card' };

/**
 * 버튼명 상한.
 *
 * [세 값이 다른 이유는 버튼이 놓이는 **모양**이 달라서다]
 *   알림톡 14자          — 세로로 쌓이는 버튼
 *   브랜드 텍스트/이미지형 14자 — 같은 세로 배치
 *   브랜드 와이드 이미지형 8자  — **가로로 나란히** 놓여 한 칸이 절반이다
 * 근거: NHN Cloud SENS 브랜드메시지 개요 · 비즈뿌리오 규격
 *   https://guide.ncloud-docs.com/docs/sens-bmoverview
 *
 * [주의 — 친구톡에서 줄었다] 친구톡 시절 버튼명은 28자였다. 브랜드 메시지로 승계되며 14자로
 * 줄었으므로 **친구톡 문구를 그대로 옮긴 템플릿은 여기서 걸린다** — 그것이 이 검증의 요점이다.
 *   https://blog.bizgo.io/inside/kakao-friendtalk-vs-brand-message-comparison-specs/
 */
export function buttonNameMaxOf(context: KakaoButtonContext): number {
  if (context.kind === 'alimtalk') return ALIMTALK_BUTTON_NAME_MAX;
  if (context.kind === 'carousel-card') return BRAND_MESSAGE_BUTTON_NAME_MAX;
  return context.bodyType === 'wide-image'
    ? BRAND_MESSAGE_BUTTON_NAME_MAX
    : ALIMTALK_BUTTON_NAME_MAX;
}

/**
 * 버튼 **개수** 상한 — 이것도 모양이 정한다.
 *   와이드 이미지형 2개 · 캐러셀 카드 2개 · 그 밖에 5개
 * 근거는 위 buttonNameMaxOf 와 같은 문서다.
 */
export function buttonCountMaxOf(context: KakaoButtonContext): number {
  if (context.kind === 'carousel-card') return BRAND_CAROUSEL_CARD_BUTTON_MAX;
  if (context.kind === 'brandmessage' && context.bodyType === 'wide-image') {
    return BRAND_WIDE_IMAGE_BUTTON_MAX;
  }
  return KAKAO_BUTTON_MAX;
}

/* ── 순수 검증 규칙 ────────────────────────────────────────────────────────────
 *
 * 화면(카운터·인라인 오류)과 zod 스키마가 **같은 함수**를 본다. 문구만 고치고 검증이 남는 사고를
 * 막으려면 판정이 한 벌이어야 한다(validation.ts 머리말과 같은 결). */

/**
 * 버튼 한 개의 문제 — 첫 번째 위반만 돌려준다.
 *
 * [왜 치환변수를 막는가] 버튼명은 카카오가 심사 시점에 확정하는 글자다. `#{쿠폰명}` 을 넣으면
 * 발송 때마다 버튼 라벨이 달라지는데, 심사는 그 중 무엇도 본 적이 없다 — 그래서 반려 사유다.
 */
export function buttonError(button: KakaoButton, context: KakaoButtonContext): string | null {
  if (button.type === 'AC') {
    if (context.kind === 'alimtalk' && !allowsChannelAddButton(context.messageType)) {
      return '채널추가 버튼은 채널추가형·복합형에서만 쓸 수 있어요.';
    }
    // 이름이 고정이므로 길이·변수 검사를 할 것이 없다 — 다만 값이 어긋났다면 그것이 문제다
    return button.name === AC_BUTTON_NAME
      ? null
      : `채널추가 버튼의 이름은 '${AC_BUTTON_NAME}' 로 고정이에요.`;
  }

  const name = button.name.trim();
  if (name === '') return '버튼명을 입력하세요.';
  if (countVariables(button.name) > 0) return '버튼명에는 치환변수를 쓸 수 없어요.';

  const max = buttonNameMaxOf(context);
  if (kakaoCharCount(name) > max) return `버튼명은 ${String(max)}자를 넘을 수 없어요.`;

  if (usesLink(button.type) && button.linkMobile.trim() === '') {
    return '모바일 링크를 입력하세요.';
  }
  return null;
}

/**
 * 버튼 목록 전체의 문제 — 개수부터 보고, 그다음 각 버튼을 순서대로 본다.
 *
 * [채널추가 버튼은 맨 위여야 한다] 대행사 가이드들이 공통으로 적는 규칙이다. 순서는 발송 페이로드에
 * 그대로 실리므로 두 번째 자리에 둔 AC 버튼은 그대로 반려된다 — 화면에서 순서를 바꿀 수 있는 이상
 * 여기서 막지 않으면 저장까지 통과한다.
 */
export function buttonsError(
  buttons: readonly KakaoButton[],
  context: KakaoButtonContext,
): string | null {
  const countMax = buttonCountMaxOf(context);
  if (buttons.length > countMax) {
    return `버튼은 최대 ${String(countMax)}개까지 넣을 수 있어요.`;
  }

  const acIndex = buttons.findIndex((button) => button.type === 'AC');
  if (acIndex > 0) return '채널추가 버튼은 가장 위에 있어야 해요.';

  for (const button of buttons) {
    const error = buttonError(button, context);
    if (error !== null) return error;
  }
  return null;
}

/**
 * 알림톡 본문의 문제 — 첫 번째 위반만.
 *
 * 순서에 뜻이 있다: 비었으면 나머지 규칙을 물을 것이 없고, '변수만으로 이뤄졌다' 는 길이보다
 * 먼저 알려야 한다(길이를 고쳐도 그 본문은 여전히 반려된다).
 */
export function alimtalkBodyError(parts: AlimtalkLengthParts): string | null {
  const body = parts.body;
  if (body.trim() === '') return '본문을 입력하세요.';
  if (isVariableOnlyBody(body)) return '본문을 치환변수만으로 구성할 수 없어요.';

  const variables = countVariables(alimtalkVariableBearingText(parts));
  if (variables > TEMPLATE_VARIABLE_MAX) {
    return `치환변수는 최대 ${String(TEMPLATE_VARIABLE_MAX)}개까지 쓸 수 있어요.`;
  }

  const max = alimtalkBodyMaxOf(parts.emphasisType);
  const length = alimtalkBillableLength(parts);
  if (length > max) {
    /* 왜 넘었는지를 함께 말한다 — 본문만 세던 운영자에게 '버튼명·강조·부가정보도 센다' 는 사실이
       여기서 처음 보인다(kakao.ts 본문 머리말). */
    return `본문은 강조·부가정보·버튼명을 모두 합쳐 ${String(max)}자를 넘을 수 없어요(현재 ${String(length)}자).`;
  }
  return null;
}

/** 강조표기형 — 제목과 보조문구는 **둘 다** 있어야 하고 보조문구에는 변수를 쓸 수 없다 */
export function emphasisTitleError(title: string, subtitle: string): string | null {
  const hasTitle = title.trim() !== '';
  const hasSubtitle = subtitle.trim() !== '';

  /* [왜 '둘 다' 인가] 제작가이드 §2-2 가 "Title과 Subtitle은 함께 등록되어야 하며, 각각 단독으로
     사용할 수 없음" 이라고 못박는다. 한쪽만 채운 템플릿은 화면에서는 멀쩡해 보이고 심사에서 걸린다. */
  if (!hasTitle && !hasSubtitle) return '강조표기형은 강조 제목과 보조문구를 입력해야 해요.';
  if (!hasTitle) return '강조 제목을 입력하세요 — 보조문구만으로는 등록할 수 없어요.';
  if (!hasSubtitle) return '강조 보조문구를 입력하세요 — 제목만으로는 등록할 수 없어요.';

  if (kakaoCharCount(title) > ALIMTALK_EMPHASIS_TITLE_MAX) {
    return `강조 제목은 ${String(ALIMTALK_EMPHASIS_TITLE_MAX)}자를 넘을 수 없어요.`;
  }
  if (countVariables(subtitle) > 0) {
    return '강조 보조문구에는 치환변수를 쓸 수 없어요.';
  }
  return null;
}

/**
 * 강조표기형의 **경고** — 막지는 않고 '잘려 보인다' 고만 알린다.
 *
 * 말줄임 기준(23자·18자)은 입력 상한이 아니라 안드로이드 수신 화면의 표시 한계다. 막아 버리면
 * 카카오가 받아 주는 문구를 우리 화면이 거부하게 된다(위 강조표기형 머리말).
 */
export function emphasisTruncationWarning(title: string, subtitle: string): string | null {
  const titleOver = kakaoCharCount(title) > ALIMTALK_EMPHASIS_TITLE_TRUNCATE;
  const subtitleOver = kakaoCharCount(subtitle) > ALIMTALK_EMPHASIS_SUBTITLE_TRUNCATE;
  if (!titleOver && !subtitleOver) return null;

  const where =
    titleOver && subtitleOver ? '제목과 보조문구가' : titleOver ? '제목이' : '보조문구가';
  return `${where} 안드로이드에서 말줄임될 수 있어요(제목 ${String(ALIMTALK_EMPHASIS_TITLE_TRUNCATE)}자 · 보조문구 ${String(ALIMTALK_EMPHASIS_SUBTITLE_TRUNCATE)}자 기준).`;
}

/** 아이템리스트형 — 행 개수와 각 행의 두 칸 */
export function itemsError(items: readonly AlimtalkItem[]): string | null {
  if (items.length < ALIMTALK_ITEM_LIST_MIN) {
    return `아이템은 최소 ${String(ALIMTALK_ITEM_LIST_MIN)}개가 필요해요.`;
  }
  if (items.length > ALIMTALK_ITEM_LIST_MAX) {
    return `아이템은 최대 ${String(ALIMTALK_ITEM_LIST_MAX)}개까지 넣을 수 있어요.`;
  }

  for (const [index, item] of items.entries()) {
    const at = `아이템 ${String(index + 1)}`;
    if (item.name.trim() === '') return `${at}: 항목명을 입력하세요.`;
    if (item.description.trim() === '') return `${at}: 항목값을 입력하세요.`;
    if (kakaoCharCount(item.name) > ALIMTALK_ITEM_NAME_MAX) {
      return `${at}: 항목명은 ${String(ALIMTALK_ITEM_NAME_MAX)}자를 넘을 수 없어요.`;
    }
    if (kakaoCharCount(item.description) > ALIMTALK_ITEM_DESCRIPTION_MAX) {
      return `${at}: 항목값은 ${String(ALIMTALK_ITEM_DESCRIPTION_MAX)}자를 넘을 수 없어요.`;
    }
    // 표의 머리글이 발송마다 달라지면 심사가 본 표와 다른 표가 나간다
    if (countVariables(item.name) > 0) return `${at}: 항목명에는 치환변수를 쓸 수 없어요.`;
  }
  return null;
}

/** 아이템리스트형의 선택 필드 — 비어 있는 것은 오류가 아니고, 채웠다면 상한을 지켜야 한다 */
export function itemHeaderError(
  header: string,
  highlightTitle: string,
  highlightDescription: string,
  hasThumbnail: boolean,
): string | null {
  if (kakaoCharCount(header) > ALIMTALK_ITEM_HEADER_MAX) {
    return `헤더는 ${String(ALIMTALK_ITEM_HEADER_MAX)}자를 넘을 수 없어요.`;
  }
  const titleMax = alimtalkHighlightTitleMax(hasThumbnail);
  if (kakaoCharCount(highlightTitle) > titleMax) {
    return `아이템 하이라이트 제목은 ${String(titleMax)}자를 넘을 수 없어요${hasThumbnail ? '(썸네일이 있으면 더 짧아요).' : '.'}`;
  }
  const descriptionMax = alimtalkHighlightDescriptionMax(hasThumbnail);
  if (kakaoCharCount(highlightDescription) > descriptionMax) {
    return `아이템 하이라이트 설명은 ${String(descriptionMax)}자를 넘을 수 없어요${hasThumbnail ? '(썸네일이 있으면 더 짧아요).' : '.'}`;
  }
  return null;
}

/** 부가정보 — 500자, 치환변수 불가(제작가이드 §1-2) */
export function extraInfoError(extraInfo: string): string | null {
  if (extraInfo.trim() === '') return '부가정보를 입력하세요.';
  if (kakaoCharCount(extraInfo) > ALIMTALK_EXTRA_INFO_MAX) {
    return `부가정보는 ${String(ALIMTALK_EXTRA_INFO_MAX)}자를 넘을 수 없어요.`;
  }
  if (countVariables(extraInfo) > 0) {
    // 부가정보는 '고정적인 안내' 를 담는 자리라 발송마다 값이 달라지면 유형을 고른 뜻이 사라진다
    return '부가정보에는 치환변수를 쓸 수 없어요.';
  }
  return null;
}

/** 브랜드 메시지 본문의 문제 — 상한이 유형에서 온다는 것만 알림톡과 다르다 */
export function brandMessageBodyError(body: string, type: BrandMessageBodyType): string | null {
  if (body.trim() === '') return '본문을 입력하세요.';

  const max = BRAND_MESSAGE_BODY_MAX[type];
  const length = kakaoCharCount(body);
  if (length > max) {
    return `${BRAND_MESSAGE_TYPE_LABEL[type]} 본문은 ${String(max)}자를 넘을 수 없어요(현재 ${String(length)}자).`;
  }
  return null;
}

/** 와이드 리스트형의 항목 — 3~4개, 각 항목에 제목과 이미지 */
export function listItemsError(items: readonly BrandListItem[]): string | null {
  if (items.length < BRAND_LIST_ITEM_MIN) {
    return `리스트 항목은 최소 ${String(BRAND_LIST_ITEM_MIN)}개가 필요해요.`;
  }
  if (items.length > BRAND_LIST_ITEM_MAX) {
    return `리스트 항목은 최대 ${String(BRAND_LIST_ITEM_MAX)}개까지 넣을 수 있어요.`;
  }
  for (const [index, item] of items.entries()) {
    const at = `항목 ${String(index + 1)}`;
    if (item.title.trim() === '') return `${at}: 제목을 입력하세요.`;
    if (kakaoCharCount(item.title) > BRAND_LIST_ITEM_TITLE_MAX) {
      return `${at}: 제목은 ${String(BRAND_LIST_ITEM_TITLE_MAX)}자를 넘을 수 없어요.`;
    }
    if (item.imageFileName.trim() === '') return `${at}: 이미지를 첨부하세요.`;
  }
  return null;
}

/** 캐러셀 카드 — 2~6장, 카드마다 본문·이미지·버튼 1~2개 */
export function cardsError(cards: readonly BrandCarouselCard[]): string | null {
  if (cards.length < BRAND_CAROUSEL_CARD_MIN) {
    return `카드는 최소 ${String(BRAND_CAROUSEL_CARD_MIN)}장이 필요해요.`;
  }
  if (cards.length > BRAND_CAROUSEL_CARD_MAX) {
    return `카드는 최대 ${String(BRAND_CAROUSEL_CARD_MAX)}장까지 넣을 수 있어요.`;
  }

  for (const [index, card] of cards.entries()) {
    const at = `카드 ${String(index + 1)}`;
    if (kakaoCharCount(card.header) > BRAND_CAROUSEL_HEADER_MAX) {
      return `${at}: 헤더는 ${String(BRAND_CAROUSEL_HEADER_MAX)}자를 넘을 수 없어요.`;
    }
    if (card.body.trim() === '') return `${at}: 본문을 입력하세요.`;
    if (kakaoCharCount(card.body) > BRAND_MESSAGE_BODY_MAX.carousel) {
      return `${at}: 본문은 ${String(BRAND_MESSAGE_BODY_MAX.carousel)}자를 넘을 수 없어요.`;
    }
    if (card.imageFileName.trim() === '') return `${at}: 이미지를 첨부하세요.`;
    /* 카드에 버튼이 하나도 없으면 그 카드는 눌러도 아무 데도 가지 않는다 — 캐러셀을 고른 뜻이
       카드를 눌러 이동시키는 것이라 최소 1개를 요구한다 */
    if (card.buttons.length < BRAND_CAROUSEL_CARD_BUTTON_MIN) {
      return `${at}: 버튼을 최소 ${String(BRAND_CAROUSEL_CARD_BUTTON_MIN)}개 넣으세요.`;
    }
    const error = buttonsError(card.buttons, { kind: 'carousel-card' });
    if (error !== null) return `${at}: ${error}`;
  }
  return null;
}
