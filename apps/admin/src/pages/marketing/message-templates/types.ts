// 메시지 템플릿 — 도메인 모델 (라우트: /marketing/templates/**)
//
// [기존 '발송 템플릿'(marketing/templates)과 왜 별개인가]
// 그쪽은 **카카오 알림톡의 사전 심사**를 축으로 만들어졌다 — 상태가 draft/inspecting/approved/rejected 고,
// 그 상태의 주인은 우리가 아니라 카카오다. 여기 이메일·문자 템플릿에는 심사 주체가 없다. 대신
// **운영자가 켜고 끄는** 발행 상태(초안 → 발행 → 사용중 ↔ 미사용)를 갖는다. 같은 '템플릿'이라는
// 낱말을 쓰지만 생명주기가 다른 물건이라 한 모델에 우겨넣지 않는다.
// (알림톡은 카카오 유형 조사 결과가 나오면 그쪽에서 따로 다룬다.)
//
// [갱신] 알림톡·브랜드 메시지가 이 모델로 들어왔다 — 다만 **심사 상태는 발행 상태와 별개 필드**로
// 둔다(content 안의 approvalStatus). 위 문단이 말한 '생명주기가 다르다' 는 여전히 참이라 한 필드에
// 합치지 않았다: 발행은 우리가 켜고 끄는 것이고 심사는 카카오가 판정하는 것이다. 'Active 인데 반려'
// 도 정상 상태다. 근거는 kakao.ts 의 AlimtalkApprovalStatus 머리말.

import type { AlimtalkTemplateContent, BrandMessageTemplateContent } from './kakao';

/* ── 발행 상태 ────────────────────────────────────────────────────────────────
 *
 * draft    — 작성 중. 아직 어디서도 쓰이지 않는다. ('발행' 가능)
 * active   — 발행됐고 켜져 있다. 발송 화면이 이 템플릿을 고를 수 있다.
 * inactive — 발행됐지만 꺼져 있다. 과거 발송 이력은 남지만 새로 고를 수 없다.
 *
 * [왜 inactive 를 두고 삭제하지 않나] 삭제는 이력을 끊는다. 시즌이 지난 템플릿을 지우면 '이 발송이
 * 무슨 문구였나' 를 되짚을 수 없다. 끄는 것과 없애는 것은 다른 행위라 둘 다 둔다. */
export type TemplateStatus = 'draft' | 'active' | 'inactive';

/**
 * 배지·필터에 보이는 상태 이름.
 *
 * [어휘를 어디서 가져왔나] 새로 짓지 않았다. `active`/`inactive` 를 가르는 것은 상세의 토글이고,
 * 그 토글의 접근성 이름이 이미 이 축을 **'발송 사용 여부'** 라 부른다(MessageTemplateDetailPage).
 * 그래서 켜짐/꺼짐을 '사용중'/'미사용' 이라 적는다. `draft` 는 편집기 헤더의 '초안 저장' 과 같은
 * 낱말을 쓴다(copy.ts ACTION_SAVE_DRAFT) — 저장 버튼과 그 결과로 생긴 상태가 다른 이름이면
 * 운영자는 둘을 잇지 못한다.
 *
 * **값(`'draft'|'active'|'inactive'`)은 라벨이 아니다** — 저장·비교·필터 쿼리에 쓰이는 식별자이므로
 * 여기서 글자를 바꿔도 그쪽은 따라 바뀌지 않고, 바뀌어서도 안 된다.
 */
export const TEMPLATE_STATUS_LABEL: Readonly<Record<TemplateStatus, string>> = {
  draft: '초안',
  active: '사용중',
  inactive: '미사용',
};

/** 발행된(= draft 를 벗어난) 템플릿인가 — 사용 여부 토글을 노출할지 가르는 기준 */
export function isPublished(status: TemplateStatus): boolean {
  return status !== 'draft';
}

/* ── 템플릿 종류 ──────────────────────────────────────────────────────────── */

/**
 * 종류 — 편집기와 미리보기가 통째로 갈린다.
 *   email        — 블록 빌더(제목·발신 프로필 + 블록 스택), 캔버스 미리보기
 *   text         — 단일 본문 + 이미지 1장, 휴대폰 미리보기. 길이·이미지로 SMS/LMS/MMS 가 자동 결정된다.
 *   alimtalk     — 카카오톡 알림톡. 카카오 사전 심사를 받는다. 메시지 유형 × 강조 유형의 두 축.
 *   brandmessage — 카카오톡 브랜드 메시지(구 친구톡). 심사가 없고 광고가 가능하다.
 *
 * [왜 `brandmessage` 인데 라벨은 '구 친구톡' 인가] 친구톡은 2025-12-31 종료됐고 2026-01-01 부터
 * 브랜드 메시지로 자동 대체된다 — 근거와 전문은 kakao.ts 머리말에 있다. **이름을 맞추려고 어느
 * 한쪽을 고치기 전에 그 머리말을 읽어라.**
 */
export type TemplateKind = 'email' | 'text' | 'alimtalk' | 'brandmessage';

/*
 * [왜 한국어인가] 이 표는 목록 배지·필터·검색이 함께 쓴다. 예전에는 email/text 만 영문이었는데,
 * 카카오 두 종이 한국어로 들어오면서 **한 표 안에 두 언어가 섞였다** — 목록에서 'Email' 옆에
 * '카카오 알림톡' 이 서는 모습이 된다. 어느 기준으로도 옳지 않아 한국어로 통일한다.
 * 카카오 채널명은 고유명사라 그대로 둔다(대행사명 SureM·NHN 과 같은 결 — copy.ts 머리말).
 */
export const TEMPLATE_KIND_LABEL: Readonly<Record<TemplateKind, string>> = {
  email: '이메일',
  text: '문자',
  alimtalk: '카카오 알림톡',
  brandmessage: '브랜드 메시지 (구 친구톡)',
};

/* ── 발신 프로필 ──────────────────────────────────────────────────────────────
 *
 * 누구 이름으로 나가는가. 문자는 발신번호(사전 등록된 번호만), 이메일은 발신 주소를 고른다.
 * 둘 다 '아무 값이나 적는' 자리가 아니라 **등록된 것 중에서 고르는** 자리다 — 문자는 발신번호
 * 사전등록제(전기통신사업법)라 미등록 번호로는 발송 자체가 불가하고, 이메일은 SPF/DKIM 이
 * 걸린 주소만 스팸함을 피한다. 그래서 입력이 아니라 select 다. */
export interface SenderProfile {
  readonly id: string;
  readonly name: string;
  /** 이 프로필로 쓸 수 있는 발신번호들 (문자용) */
  readonly phoneNumbers: readonly string[];
  /** 이 프로필로 쓸 수 있는 발신 주소들 (이메일용) */
  readonly emails: readonly string[];
}

/* ── 문자 템플릿 ─────────────────────────────────────────────────────────────── */

/** 문자 발송 대행사 — 상세 화면의 '문자 발송사'. 계약된 회선이 어디인지 보여 준다 */
export type TextMessageVendor = 'SureM' | 'NHN' | 'Solapi';

export interface TextTemplateContent {
  readonly kind: 'text';
  /**
   * 제목 — **LMS·MMS 만 갖는다.** SMS 에는 제목 필드가 아예 없다.
   *
   * [왜 선택 필드인데 등급을 바꾸는가] 제목을 한 글자라도 적으면 그 문자는 본문이 90byte 안이어도
   * LMS 로 승격된다(솔라피 문자 가이드 — _shared/messaging classifySms 머리말에 원문). 그래서 이 칸은
   * '있으면 좋은 것' 이 아니라 **단가를 바꾸는 입력**이다. 비워 두는 것이 곧 SMS 를 고르는 일이라
   * 미리보기가 그 사실을 드러낸다(PhoneFrame promotionReasonOf).
   */
  readonly subject: string;
  readonly body: string;
  /** 첨부 이미지 파일명 — 있으면 MMS 로 나간다. 1장만 허용한다 */
  readonly imageFileName: string;
  readonly vendor: TextMessageVendor;
  readonly senderPhone: string;
}

/** 문자 본문 상한 — LMS/MMS 기준. SMS(90byte)를 넘으면 자동 승격되므로 여기가 실질 상한이다 */
export const TEXT_BODY_MAX = 2000;

/* 첨부 이미지 제약 — 화면의 안내 문구와 검증이 같은 값을 봐야 한다(문구만 고치고 검증이 남는 사고 방지) */
export const TEXT_IMAGE_MAX_BYTES = 500 * 1024;
export const TEXT_IMAGE_MAX_EDGE = 1000;
export const TEXT_IMAGE_FORMAT = 'JPG';

/* ── 이메일 템플릿 ───────────────────────────────────────────────────────────── */

/**
 * 블록 — 이메일 본문의 구성 단위. 종류마다 편집 속성이 다르므로 판별 유니온으로 둔다.
 *
 * [왜 유니온인가] 'type + 모든 속성이 optional 인 하나의 객체' 로 두면 BUTTON 에 없는 Level 을
 * 읽는 코드가 타입 검사를 통과한다. 블록이 7종이고 각자 폼이 다르므로, 어떤 속성이 어떤 블록의
 * 것인지를 타입이 강제해야 INSPECT 패널이 틀린 필드를 그리지 않는다.
 */
/**
 * 컬럼 **안에** 들어갈 수 있는 블록 — 컨테이너(columns)만 빠져 있다.
 *
 * [왜 유니온을 둘로 쪼갰나 — 중첩을 타입으로 막는다] 컬럼이 아무 블록이나 담을 수 있으면
 * 컬럼 안에 컬럼을 넣을 수 있고, 그러면 깊이에 상한이 없어진다. 무한 중첩은 (1) 캔버스의 선택
 * 겹침을 풀 수 없게 만들고 (2) 메일 HTML 에서 표를 몇 겹이나 중첩시켜 Outlook 을 무너뜨린다.
 * 실제 빌더들(Beefree·Unlayer)도 행 안에 행을 넣지 못한다. 런타임 검사로 막으면 '넣었는데
 * 나중에 거부당하는' 일이 생기므로 **애초에 담을 수 없는 타입**으로 표현한다.
 */
export type EmailLeafBlock =
  | HeadingBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | LogoBlock
  | AvatarBlock
  | DividerBlock
  | SpacerBlock
  | SocialBlock
  | MenuBlock
  | VideoBlock
  | ListBlock
  | FooterBlock;

export type EmailBlock = EmailLeafBlock | ColumnsBlock;

export type EmailBlockKind = EmailBlock['blockKind'];
export type EmailLeafBlockKind = EmailLeafBlock['blockKind'];

/** 모든 블록이 공유하는 것 — 식별자와 상하좌우 여백 */
interface BlockBase {
  readonly id: string;
  readonly padding: BlockPadding;
}

export interface BlockPadding {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

export type BlockAlign = 'left' | 'center' | 'right';
export type FontWeight = 'regular' | 'medium' | 'bold';
export type HeadingLevel = 'h1' | 'h2' | 'h3';
export type ButtonWidth = 'full' | 'auto';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonShape = 'rectangle' | 'rounded' | 'pill';
export type MediaShape = 'circle' | 'square' | 'rounded';

export interface HeadingBlock extends BlockBase {
  readonly blockKind: 'heading';
  readonly content: string;
  readonly level: HeadingLevel;
  readonly textColor: string;
  readonly backgroundColor: string;
  readonly fontFamily: string;
  readonly fontWeight: FontWeight;
  readonly align: BlockAlign;
}

export interface TextBlock extends BlockBase {
  readonly blockKind: 'text';
  readonly content: string;
  /** 본문을 마크다운으로 해석할지 — 끄면 입력 그대로(평문) 그린다 */
  readonly markdown: boolean;
  readonly textColor: string;
  readonly backgroundColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly align: BlockAlign;
}

export interface ButtonBlock extends BlockBase {
  readonly blockKind: 'button';
  readonly content: string;
  readonly url: string;
  readonly width: ButtonWidth;
  readonly size: ButtonSize;
  readonly shape: ButtonShape;
  readonly textColor: string;
  readonly buttonColor: string;
  readonly backgroundColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly align: BlockAlign;
}

export interface ImageBlock extends BlockBase {
  readonly blockKind: 'image';
  readonly fileName: string;
  /**
   * 대체 텍스트.
   *
   * [왜 선택이 아니라 필수 필드인가] Outlook 은 기본값으로 외부 이미지를 **차단**한다 — alt 가
   * 없으면 수신자에게는 빈 상자만 남는다. 스크린리더 사용자만의 문제가 아니라 '그림이 안 보이는
   * 모든 수신자' 의 문제라서, 접근성이 아니라 **전달력**의 문제로 취급한다. 비면
   * isBlockIncomplete 가 참이 되어 캔버스가 경고한다(장식용 이미지는 아래 decorative 로 표시한다).
   */
  readonly alt: string;
  /** 장식용인가 — 참이면 alt="" 로 나가고(스크린리더가 건너뛴다) alt 를 비워도 미완성이 아니다 */
  readonly decorative: boolean;
  readonly clickThroughUrl: string;
  readonly width: number;
  /** 비우면 원본 비율 유지 — 화면에는 'Auto' 로 보인다 */
  readonly height: number | null;
  readonly verticalAlign: 'top' | 'middle' | 'bottom';
  readonly horizontalAlign: BlockAlign;
  readonly backgroundColor: string;
}

/** 이미지 최대 폭 — 초과 시 입력 아래에 빨간 'Max 800 px' 를 띄운다(메일 클라이언트 본문 폭 한계) */
export const IMAGE_MAX_WIDTH = 800;

export interface LogoBlock extends BlockBase {
  readonly blockKind: 'logo';
  readonly fileName: string;
  readonly size: number;
  readonly shape: MediaShape;
  readonly align: BlockAlign;
}

export interface AvatarBlock extends BlockBase {
  readonly blockKind: 'avatar';
  readonly fileName: string;
  readonly size: number;
  readonly shape: MediaShape;
  readonly align: BlockAlign;
}

export interface DividerBlock extends BlockBase {
  readonly blockKind: 'divider';
  readonly color: string;
  readonly height: number;
  readonly backgroundColor: string;
}

/* ── 여백 ────────────────────────────────────────────────────────────────────
 *
 * [divider 와 무엇이 다른가] divider 는 '선을 긋는다', spacer 는 '아무것도 없는 높이를 만든다'.
 * 지금까지는 여백을 주려면 divider 의 색을 배경색과 같게 맞추는 편법을 써야 했다 — 그것은
 * 나중에 배경색을 바꾸면 유령 선이 드러나는 시한폭탄이다. */
export interface SpacerBlock extends BlockBase {
  readonly blockKind: 'spacer';
  readonly height: number;
  readonly backgroundColor: string;
}

export const SPACER_HEIGHT_MAX = 160;

/* ── 소셜 링크 ────────────────────────────────────────────────────────────── */

/**
 * 지원하는 채널. 임의 문자열이 아니라 닫힌 목록인 이유는 **라벨과 순서를 우리가 책임지기**
 * 위해서다 — 운영자가 'FB' 라고 적으면 수신자가 무엇인지 모른다.
 */
export type SocialPlatform =
  'instagram' | 'facebook' | 'x' | 'youtube' | 'linkedin' | 'kakao' | 'naver';

export const SOCIAL_PLATFORM_LABEL: Readonly<Record<SocialPlatform, string>> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  kakao: '카카오톡 채널',
  naver: '네이버 블로그',
};

export interface SocialLink {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly url: string;
}

export interface SocialBlock extends BlockBase {
  readonly blockKind: 'social';
  readonly links: readonly SocialLink[];
  readonly align: BlockAlign;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly backgroundColor: string;
}

/* ── 메뉴(내비게이션) ─────────────────────────────────────────────────────── */

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

export interface MenuBlock extends BlockBase {
  readonly blockKind: 'menu';
  readonly items: readonly MenuItem[];
  /** 항목 사이에 끼우는 글자 — 시각 구분자다. 스크린리더에는 aria-hidden 으로 감춘다 */
  readonly separator: string;
  readonly align: BlockAlign;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: FontWeight;
  readonly backgroundColor: string;
}

/* ── 비디오 (썸네일 + 링크) ───────────────────────────────────────────────────
 *
 * [왜 '비디오' 가 아니라 '썸네일' 인가] 메일 클라이언트는 <video> 를 재생하지 않는다(거의 전부
 * 태그를 걷어낸다). 실제 제품들이 넣는 것도 재생기가 아니라 **재생 버튼이 얹힌 이미지 + 링크**다.
 * 캔버스가 재생기처럼 보이면 운영자가 '메일에서 재생된다' 고 착각하므로 이름부터 썸네일로 둔다. */
export interface VideoBlock extends BlockBase {
  readonly blockKind: 'video';
  readonly thumbnailFileName: string;
  readonly videoUrl: string;
  readonly alt: string;
  readonly width: number;
  readonly align: BlockAlign;
  readonly backgroundColor: string;
}

/* ── 목록 ────────────────────────────────────────────────────────────────── */

export interface ListItem {
  readonly id: string;
  readonly text: string;
}

export interface ListBlock extends BlockBase {
  readonly blockKind: 'list';
  readonly items: readonly ListItem[];
  /** 참이면 <ol>(번호), 거짓이면 <ul>(글머리표) */
  readonly ordered: boolean;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly align: BlockAlign;
  readonly backgroundColor: string;
}

/* ── 법적 푸터 ───────────────────────────────────────────────────────────────
 *
 * [왜 '지울 수 없는' 블록인가 — 정보통신망법 제50조]
 * 영리목적 광고성 정보를 전송할 때 전송자는 (1) 전송자의 명칭·연락처와 (2) **수신거부 또는 수신동의
 * 철회 방법**을 본문에 명시해야 하고, 수신거부에 드는 **비용이 수신자에게 부담되지 않는다는 사실**을
 * 함께 밝혀야 한다. 한국어를 읽지 못하는 수신자를 위해 한글·영문을 병기한다.
 * 그래서 이 블록은 '넣어도 되는 것' 이 아니라 '빠지면 안 되는 것' 이다 — 운영자가 실수로 지울 수
 * 있는 자리에 두지 않는다(EmailBuilder 가 삭제를 거부하고, 한 통에 하나만 존재한다).
 *
 * [확인 필요] 제목(subject) 머리의 `(광고)` 표기가 **이메일에서도** 별도 의무인지는 확정하지
 * 못했다. 본문 광고 시작 부분 표기 의무와 `(광 고)` 처럼 띄어쓰기·괄호를 변형한 표기가 금지라는
 * 점은 여러 자료가 일치하나, 제목 표기 의무에 대해서는 자료가 엇갈린다(대행사 안내는 의무라 하고,
 * KISA 요약본 기반 정리는 제목 표기를 필수로 들지 않는다). KISA '불법스팸 방지를 위한 정보통신망법
 * 안내서' 원문으로 확인하기 전까지 이 화면은 제목을 강제하지 않는다 — 확인되지 않은 규칙을 UI 로
 * 굳히면 틀린 쪽으로 굳는다.
 */
export interface FooterBlock extends BlockBase {
  readonly blockKind: 'footer';
  /** 전송자 명칭 — 법이 요구하는 '전송자의 명칭' */
  readonly companyName: string;
  readonly companyAddress: string;
  readonly contactEmail: string;
  /** 수신거부 링크 — 비면 미완성이다(법이 요구하는 '수신거부 방법') */
  readonly unsubscribeUrl: string;
  readonly textColor: string;
  readonly linkColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly align: BlockAlign;
  readonly backgroundColor: string;
}

/**
 * 수신거부 문구 — 한글·영문 병기이고 **무료임을 명시**한다.
 *
 * 상수로 고정하는 이유: 이 문구는 디자인이 아니라 법 요건이다. 운영자가 자유롭게 고칠 수 있으면
 * '수신거부' 만 남기고 '무료' 를 지우는 일이 반드시 생긴다.
 */
export const UNSUBSCRIBE_LABEL = '무료수신거부 / Unsubscribe (free of charge)';

/* ── 컬럼(다단) ──────────────────────────────────────────────────────────────
 *
 * [이 블록이 왜 필요한가] 지금까지 본문은 **한 줄로 쌓이는 스택**뿐이라 '왼쪽 그림 · 오른쪽 설명'
 * 같은 가장 흔한 편집이 불가능했다. 조사한 6개 제품(Mailchimp·Stripo·Beefree·Unlayer·Klaviyo·
 * Braze)이 전부 다단 행을 갖고 있고, 이것이 '디자인 자율성이 없다' 는 지적의 핵심이다.
 */
export type ColumnRatio = '1:1' | '2:1' | '1:2' | '1:1:1';

/** 비율 → 각 칸의 가중치. 칸 **개수**도 이 표가 정한다(2단이냐 3단이냐가 비율에 딸려 온다) */
export const COLUMN_RATIO_WEIGHTS: Readonly<Record<ColumnRatio, readonly number[]>> = {
  '1:1': [1, 1],
  '2:1': [2, 1],
  '1:2': [1, 2],
  '1:1:1': [1, 1, 1],
};

export interface EmailColumn {
  readonly id: string;
  readonly blocks: readonly EmailLeafBlock[];
}

export interface ColumnsBlock extends BlockBase {
  readonly blockKind: 'columns';
  readonly ratio: ColumnRatio;
  /**
   * 좁은 화면에서 칸을 세로로 쌓을지.
   *
   * [왜 미디어 쿼리로 하지 않는가] Gmail 앱에 제3자 계정을 연결한 경우(GANGA)처럼 `<style>` 자체를
   * 걷어내는 클라이언트가 있어 미디어 쿼리를 신뢰할 수 없다. 그래서 쌓임은 **폭 계산만으로** 만든다:
   * 쌓을 때는 `width:100%; max-width:Npx`(부모가 좁아지면 자연히 한 칸씩 내려온다), 쌓지 않을 때는
   * `width:P%`(어느 폭에서도 나란히 남는다). 미디어 쿼리가 없으므로 어디서나 같게 동작한다.
   */
  readonly stackOnMobile: boolean;
  readonly columns: readonly EmailColumn[];
  /** 칸 사이 간격(px) — 각 칸의 안쪽 여백으로 나가므로 표 자체의 폭은 변하지 않는다 */
  readonly gap: number;
  readonly verticalAlign: 'top' | 'middle' | 'bottom';
  readonly backgroundColor: string;
}

/** 컬럼 사이 간격의 상한 — 600px 본문에서 이보다 벌리면 3단의 각 칸이 글자 폭을 잃는다 */
export const COLUMN_GAP_MAX = 48;

/**
 * 이미지·로고·아바타는 파일이 없으면 그릴 것이 없다.
 * 캔버스는 그 블록 자리에 'This component has incomplete settings.' 를 띄운다 — 빈 칸으로 두면
 * 운영자가 **비어 있다는 사실을 모른 채 Publish** 한다.
 */
export function isBlockIncomplete(block: EmailBlock): boolean {
  switch (block.blockKind) {
    case 'logo':
    case 'avatar':
      return block.fileName.trim() === '';
    case 'image':
      // 그림이 없으면 당연히 미완성이고, 그림이 있어도 alt 가 없으면 미완성이다 —
      // 이미지를 차단하는 클라이언트에서 빈 상자로 도착하기 때문이다(장식용은 예외).
      return block.fileName.trim() === '' || (!block.decorative && block.alt.trim() === '');
    case 'button':
      return block.url.trim() === '' || block.content.trim() === '';
    case 'heading':
    case 'text':
      return block.content.trim() === '';
    case 'video':
      // 썸네일이 없어도 링크만 있으면 글자 링크로 나갈 수 있다 — 정작 없으면 안 되는 것은 주소다
      return block.videoUrl.trim() === '' || block.alt.trim() === '';
    case 'social':
      // 주소가 빈 링크가 하나라도 있으면 수신자를 아무 데도 데려가지 못한다
      return block.links.length === 0 || block.links.some((link) => link.url.trim() === '');
    case 'menu':
      return (
        block.items.length === 0 ||
        block.items.some((item) => item.label.trim() === '' || item.url.trim() === '')
      );
    case 'list':
      return block.items.length === 0 || block.items.every((item) => item.text.trim() === '');
    case 'footer':
      // 법이 요구하는 두 가지 — 전송자 명칭과 수신거부 방법 (위 FooterBlock 머리말)
      return block.companyName.trim() === '' || block.unsubscribeUrl.trim() === '';
    case 'columns':
      // 칸이 전부 비어 있으면 그릴 것이 없다. 한 칸이라도 차 있으면 의도적인 여백일 수 있다
      return block.columns.every((column) => column.blocks.length === 0);
    case 'divider':
    case 'spacer':
      return false;
  }
}

/**
 * 이 본문이 법적 푸터를 갖고 있는가.
 *
 * 컬럼 안까지 뒤지지 않는다 — 푸터는 본문 맨 아래 전체 폭에 놓이는 것이지 한 칸 안에 숨는 것이
 * 아니다(블록 피커도 컬럼 안에서는 푸터를 내주지 않는다).
 */
export function hasLegalFooter(blocks: readonly EmailBlock[]): boolean {
  return blocks.some((block) => block.blockKind === 'footer');
}

/** 캔버스 전역 스타일 — 오른쪽 STYLE 탭이 편집한다 */
export interface EmailCanvasStyle {
  readonly backdropColor: string;
  readonly canvasColor: string;
  readonly canvasBorderColor: string;
  readonly canvasBorderRadius: number;
  readonly fontFamily: string;
  readonly textColor: string;
}

/* ── 프리헤더 ────────────────────────────────────────────────────────────────
 *
 * [무엇인가] 수신함 목록에서 **제목 바로 뒤에 이어 붙는 한 줄**이다. 메일 클라이언트는 본문의
 * 맨 앞 글자를 가져다 그 자리에 쓰는데, 우리 본문의 맨 앞은 대개 로고 밴드라 `[로고: logo.png]`
 * 같은 것이 수신함에 뜬다. 그것이 제목 다음으로 열람 여부를 가르는 자리라서, 클라이언트가
 * 주워 가게 두지 않고 **운영자가 정하게** 한다.
 *
 * [어떻게 나가나] 본문 맨 앞의 **감춰진 한 줄**로 실려 나간다(render-html.ts preheaderHtml).
 * 화면에는 보이지 않고 수신함 목록에만 보인다 — 이것이 업계 공통 구현이다.
 *
 * [왜 선택 필드가 아니라 빈 문자열인가] optional 로 두면 '아직 안 정했다' 와 '일부러 비웠다' 가
 * 같은 값이 되고, 그 구분이 없으므로 굳이 둘로 나누지 않는다. 비면 발송 전 점검이 경고한다
 * (막지는 않는다 — 프리헤더 없이 나가는 메일이 잘못된 메일은 아니다).
 */
export const PREHEADER_MAX = 120;

/**
 * 수신함에서 제목이 잘리기 시작하는 대략의 글자 수.
 *
 * [왜 '대략' 인가] 실제 경계는 클라이언트·기기·글꼴이 정한다(모바일 Gmail 이 가장 좁다).
 * 정확한 값을 흉내 내면 거짓 정밀이 되므로, 점검은 '이 근처부터 잘린다' 는 경고만 낸다.
 */
export const SUBJECT_TRUNCATE_HINT = 40;

export interface EmailTemplateContent {
  readonly kind: 'email';
  readonly senderEmail: string;
  readonly subject: string;
  /** 수신함에서 제목 뒤에 붙는 한 줄 (위 [프리헤더] 머리말) */
  readonly preheader: string;
  readonly blocks: readonly EmailBlock[];
  readonly canvas: EmailCanvasStyle;
}

/* ── 템플릿 ─────────────────────────────────────────────────────────────────── */

/**
 * 본문 — 종류마다 통째로 다른 모양이다. `kind` 로 좁힌다(exhaustive switch).
 *
 * 카카오 두 종류의 모양·규칙은 kakao.ts 가 소유한다 — 이 파일에 펼쳐 놓으면 심사 상태·버튼 규칙·
 * 발송 시간대까지 여기로 흘러들어 이메일 블록 모델 옆에 앉는다. 서로 아무 관계가 없는 것들이다.
 */
export type TemplateContent =
  | TextTemplateContent
  | EmailTemplateContent
  | AlimtalkTemplateContent
  | BrandMessageTemplateContent;

export interface MessageTemplate {
  readonly id: string;
  /** 화면의 'content name' — 목록에서 이 템플릿을 찾는 이름 */
  readonly name: string;
  readonly status: TemplateStatus;
  readonly senderProfileId: string;
  readonly content: TemplateContent;
  /* 상세 화면의 이력 — 누가 언제 만들고 마지막으로 고쳤는가 */
  readonly createdBy: string;
  readonly createdAt: string;
  readonly lastEditedBy: string;
  readonly lastEditedAt: string;
}

export const TEMPLATE_NAME_MAX = 60;

/** 템플릿의 종류 — content 가 갖고 있으므로 여기서 꺼내 쓴다(두 곳에 적어 두고 어긋나지 않게) */
export function templateKindOf(template: MessageTemplate): TemplateKind {
  return template.content.kind;
}
