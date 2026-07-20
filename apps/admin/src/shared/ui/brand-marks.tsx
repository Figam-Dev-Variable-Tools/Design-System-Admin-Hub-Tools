// 타사 브랜드 마크 — **앱 전역 단일 원본** (shared/ui 소유)
//
// ┌ 이 파일이 pages/ 가 아니라 shared/ui 에 있는 이유 ───────────────────────────┐
// │ 같은 브랜드 마크가 지금 두 화면에서 필요하다:                                  │
// │   · /settings/oauth      — 소셜 로그인 제공자 (구글·카카오·네이버·…)            │
// │   · /settings/api-keys   — 연동 마켓스토어 목록 (같은 서비스가 다시 나온다)      │
// │ 브랜드 자산을 화면마다 복제하면 **갈라진다** — 한쪽만 공식 SVG 로 교체되고        │
// │ 다른 쪽은 옛 근사치로 남는 날이 오고, 그때 두 화면의 같은 서비스가 다르게 보인다.  │
// │ 그래서 마크는 도메인이 아니라 **자산**으로 취급해 여기 한 벌만 둔다.              │
// │                                                                            │
// │ TODO(정리): pages/settings/oauth/components/provider-marks.tsx 는 지금 같은    │
// │   마크의 **사본**이다(그 파일은 다른 작업자가 편집 중이라 이번에 옮기지 않았다).   │
// │   그 화면이 이 모듈을 import 하도록 바꾸고 사본을 지우면 원본이 하나로 준다.       │
// └────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 파일의 색은 **토큰이 아니다. 토큰으로 바꾸지 마라.** ──────────────────────┐
// │ 여기 있는 것은 디자인 시스템 아이콘이 아니라 **타사 브랜드 마크**다.             │
// │ Google 의 4색 G, 카카오 노랑(#FEE500), 네이버 초록(#03C75A), Facebook 파랑,     │
// │ Apple 블랙, LINE 그린은 각 사의 **브랜드 가이드가 고정한 값**이다 — 우리 팔레트의 │
// │ 일부가 아니고, 다크모드에서 뒤집혀서도 안 되며, 대비를 맞추려고 조정해서도 안 된다. │
// │ (조정하는 순간 브랜드 사용 규정을 어기는 자산이 된다.)                          │
// │                                                                            │
// │ 그래서 이 마크들은 **DS 의 `Icon` 아톰에 들어가지 않는다** — Icon 은 currentColor │
// │ 로 그리는 우리 글리프의 집합이고, 브랜드 마크는 그 계약을 지킬 수 없다.           │
// │ 같은 이유로 `var(--tds-*)` 를 쓰지 않는다: 토큰은 테마를 따라 변하고,             │
// │ 브랜드 색은 변하면 안 된다.                                                    │
// │                                                                            │
// │ 아래 팔레트 블록에만 `no-restricted-syntax`(hex 금지)를 끈다. 규칙을 약화시키는  │
// │ 것이 아니라 **규칙이 지키려는 것(테마 색이 토큰 밖으로 새는 일)과 무관한 값**임을  │
// │ 명시하는 것이다. 범위는 팔레트 상수 선언까지이며 그 바깥에서는 다시 켜진다.        │
// └────────────────────────────────────────────────────────────────────────────┘
//
// [치수는 토큰이다] 마크의 크기는 hex 와 달리 우리 것이다 — 호출부가 space 토큰으로 준다.
// 각 마크는 자기 고유의 viewBox 로 그려지고 `width/height: 100%` 로 부모 칸을 채우므로
// 어떤 크기에서도 벡터 그대로 또렷하게 렌더된다.
//
// [접근성] 모든 마크는 `aria-hidden` 이다 — 이름은 **옆의 텍스트**가 전한다.
// 마크에 title/label 을 달면 스크린리더가 서비스 이름을 두 번 읽는다.
//
// [없는 로고를 지어내지 않는다] 브랜드가 없는 항목(도메인·SSL·PG·본인인증처럼 '분류'이지
// '회사'가 아닌 것)에는 마크가 없다. 비슷하게 그린 가짜 로고는 상표 문제이자 '이게 진짜
// 로고' 라는 거짓 정보다 — 그런 항목은 호출부가 브랜드를 null 로 넘겨 자기 대체 표현을 쓴다.

// 마크 **바깥**의 치수·문구 색은 브랜드 자산이 아니라 우리 UI 라 토큰을 쓴다(머리말의 금지는 브랜드 색에 한한다).
import { cssVar } from '@tds/ui';

/* eslint-disable no-restricted-syntax -- 브랜드 색은 각 사 가이드가 고정한 값이라 토큰이 될 수 없다(파일 머리말) */
/** 각 사 브랜드 가이드가 규정한 색. **이 블록 밖에서 hex 를 쓰지 않는다.** */
const BRAND = {
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',
  kakaoYellow: '#FEE500',
  kakaoBrown: '#191600',
  naverGreen: '#03C75A',
  facebookBlue: '#1877F2',
  appleBlack: '#000000',
  lineGreen: '#06C755',
  white: '#FFFFFF',
} as const;
/* eslint-enable no-restricted-syntax */

/** 모든 마크가 공유하는 속성 — 부모 칸을 가득 채우고, 이름은 옆 텍스트가 전한다 */
const MARK_BASE = {
  width: '100%',
  height: '100%',
  'aria-hidden': true,
  focusable: false,
  role: 'presentation',
} as const;

/** Google 4색 G — 공식 마크. 네 조각의 색이 곧 마크의 정체성이라 단색화하지 않는다 */
function GoogleMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 48 48">
      <path
        fill={BRAND.googleBlue}
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill={BRAND.googleGreen}
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill={BRAND.googleYellow}
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill={BRAND.googleRed}
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** 카카오 — 노란 라운드 사각형 위의 말풍선(카카오 앱 아이콘 형태) */
function KakaoMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7.5" fill={BRAND.kakaoYellow} />
      <path
        fill={BRAND.kakaoBrown}
        d="M16 7.2c-5.08 0-9.2 3.28-9.2 7.32 0 2.6 1.72 4.88 4.31 6.17l-1.03 3.83c-.09.35.3.63.6.42l4.55-3.03c.25.02.5.03.77.03 5.08 0 9.2-3.28 9.2-7.32S21.08 7.2 16 7.2z"
      />
    </svg>
  );
}

/** 네이버 — 초록 라운드 사각형 위의 흰 N */
function NaverMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7.5" fill={BRAND.naverGreen} />
      <path fill={BRAND.white} d="M18.42 16.7 13.1 9H8.6v14h5.02v-7.7L18.94 23h4.46V9h-5.02z" />
    </svg>
  );
}

/**
 * Facebook — 파란 라운드 사각형 + 흰 f.
 *
 * 원본으로 도는 SVG 는 거대한 base64 PNG 를 `<pattern>` 으로 물고 있다 — 래스터라 확대하면
 * 뭉개지고 번들에 수백 KB 를 남긴다. 그래서 **순수 벡터로 대체**했다.
 */
function FacebookMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7.5" fill={BRAND.facebookBlue} />
      <path
        fill={BRAND.white}
        d="M20.05 17.62 20.6 14h-3.47v-2.35c0-.99.49-1.96 2.04-1.96h1.58V6.6s-1.43-.24-2.8-.24c-2.86 0-4.73 1.73-4.73 4.87V14H10v3.62h3.22V27h3.91v-9.38z"
      />
    </svg>
  );
}

/**
 * Apple — 검은 라운드 사각형 위의 흰 애플 글리프.
 *
 * 배경 없는 검은 글리프로 두면 **다크 테마에서 보이지 않는다** — 색을 토큰으로 바꿀 수는 없으므로
 * (브랜드 규정) 마크가 자기 배경을 들고 다니게 한다. Apple 가이드는 검정/흰색 마크를 둘 다
 * 규정하므로 '검은 판 + 흰 글리프' 는 규정 안이다.
 */
function AppleMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7.5" fill={BRAND.appleBlack} />
      <path
        fill={BRAND.white}
        d="M21.79 17.2c-.02-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.95-1.54-.16-3 .9-3.78.9-.78 0-1.99-.88-3.26-.86-1.68.02-3.22.98-4.09 2.48-1.74 3.03-.44 7.52 1.25 9.98.83 1.2 1.82 2.55 3.11 2.51 1.25-.05 1.72-.81 3.23-.81 1.5 0 1.93.81 3.25.78 1.34-.02 2.19-1.22 3.01-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.02-2.61-1-2.63-3.97zM19.32 9.66c.69-.84 1.16-2.01 1.03-3.18-1 .04-2.2.67-2.92 1.5-.63.74-1.19 1.93-1.04 3.07 1.12.08 2.25-.57 2.93-1.39z"
      />
    </svg>
  );
}

/**
 * LINE — 브랜드 그린 라운드 사각형 + 흰 말풍선에 얹은 LINE 자면.
 *
 * 공식 SVG 가 아니라 **벡터 재구성**이다. 자면은 근사치이므로 공식 자산이 들어오면 이 함수
 * 하나만 교체한다 — 그러라고 마크들을 이 모듈에 몰아 두었다.
 */
function LineMark() {
  return (
    <svg {...MARK_BASE} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7.5" fill={BRAND.lineGreen} />
      <path
        fill={BRAND.white}
        d="M16 6.4c-5.62 0-10.2 3.71-10.2 8.28 0 4.09 3.63 7.52 8.53 8.17.33.07.78.22.9.5.1.26.07.66.03.92l-.15.87c-.04.26-.2 1.01.89.55 1.09-.46 5.88-3.46 8.02-5.93 1.48-1.62 2.18-3.27 2.18-5.08 0-4.57-4.58-8.28-10.2-8.28zm-4.03 10.98H9.94a.54.54 0 0 1-.54-.53v-4.06a.54.54 0 0 1 1.08 0v3.52h1.49a.54.54 0 0 1 0 1.07zm2.12-.53a.54.54 0 0 1-1.08 0v-4.06a.54.54 0 0 1 1.08 0v4.06zm4.89 0a.54.54 0 0 1-.97.32l-2.08-2.83v2.51a.54.54 0 0 1-1.08 0v-4.06a.54.54 0 0 1 .97-.32l2.08 2.83v-2.51a.54.54 0 0 1 1.08 0v4.06zm3.28-2.57a.54.54 0 0 1 0 1.07h-1.49v.96h1.49a.54.54 0 0 1 0 1.07h-2.03a.54.54 0 0 1-.54-.53v-4.06a.54.54 0 0 1 .54-.54h2.03a.54.54 0 0 1 0 1.08h-1.49v.95h1.49z"
      />
    </svg>
  );
}

/**
 * 마크를 가진 브랜드 전체 — **이 목록에 없으면 마크가 없는 것**이다.
 *
 * 호출부는 이 유니온으로 자기 도메인(제공자 id · 연동 id)을 매핑한다. 매핑을 여기 두지 않는
 * 이유: shared/ui 는 도메인을 모른다 — '구글 로그인' 이라는 연동이 있는지, OAuth 제공자가
 * 몇인지는 각 화면의 사실이고, 자산 모듈이 알 일이 아니다.
 */
export const BRAND_MARK_IDS = ['google', 'kakao', 'naver', 'facebook', 'apple', 'line'] as const;

export type BrandMarkId = (typeof BRAND_MARK_IDS)[number];

const BRAND_MARKS: Record<BrandMarkId, () => React.JSX.Element> = {
  google: GoogleMark,
  kakao: KakaoMark,
  naver: NaverMark,
  facebook: FacebookMark,
  apple: AppleMark,
  line: LineMark,
};

/** 문자열(라우트 파라미터·설정 값)을 `as` 없이 좁힌다 */
export function isBrandMarkId(value: string): value is BrandMarkId {
  return BRAND_MARK_IDS.some((id) => id === value);
}

interface BrandMarkProps {
  readonly brand: BrandMarkId;
  /**
   * 마크가 차지할 정사각 변. **space 토큰 표현식만 넘긴다**(예: `var(--tds-space-7)`).
   * 색과 달리 치수는 우리 것이라 토큰을 쓴다.
   */
  readonly size?: string;
}

/** 마크 한 칸 — 정사각 상자에 벡터를 꽉 채운다(어떤 크기에서도 또렷하다) */
export function BrandMark({ brand, size = cssVar('space.7') }: BrandMarkProps) {
  const Mark = BRAND_MARKS[brand];

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        width: size,
        height: size,
      }}
    >
      <Mark />
    </span>
  );
}
