// 서비스 식별 글리프 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ 이 화면은 마켓스토어다 — 목록은 **알아볼 수 있어야** 한다 ────────────────────┐
// │ 스토어 진열대의 요점은 훑어서 고르는 것이다. 그래서 **브랜드가 있고 공식 자산을    │
// │ 확보한 것은 진짜 마크**를 그린다. 인라인 마크의 원본은 이 폴더가 아니라           │
// │ shared/ui/brand-marks.tsx 에 있다 — 두 화면이 같은 자산을 쓰고, 사본이 갈라지지   │
// │ 않게 하기 위해서다(그 파일 머리말에 근거).                                       │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 갈래는 셋이다 — 인라인 마크 / 로고 이미지 / 머리글자 배지 ─────────────────────┐
// │ ① **인라인 마크**(brand) — 벡터를 확보한 것. 어떤 크기에서도 또렷하고 네트워크    │
// │    요청이 없다. 그래서 **가능하면 언제나 이쪽**이고, 아래 분기도 이것을 먼저 본다. │
// │ ② **로고 이미지**(logoSrc) — 공식 **SVG 를 1차 출처에서 확보하지 못했고** 넘겨받은 │
// │    자산이 PNG 인 경우. 오늘은 Azure OpenAI · Amazon Bedrock · CJ대한통운 셋이다.  │
// │    벡터가 없다고 비슷하게 그린 벡터로 대체하지 않았다 — 그것이 요점이다.          │
// │    (자산은 앱 안에 둔다: apps/admin/public/brand/. 외부 CDN 을 가리키면 런타임    │
// │     의존이 하나 늘고, 그쪽이 죽는 날 우리 목록에 깨진 이미지가 뜬다.)             │
// │ ③ **머리글자 배지**(glyph) — 둘 다 없을 때. 빈 회색 사각형보다 많은 것을 말한다.  │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 확인하지 못한 로고는 **지어내지 않는다** — 그리고 이번에 무엇이 달라졌나 ────────┐
// │ [기록으로 남기는 지난 사고] 예전에 넘겨받은 Grok·OpenAI SVG 두 장은 **path 데이터가 │
// │ 같았다.** 두 마크는 기하학적으로 양립 불가라(6회 회전대칭 닫힌 매듭 vs 대칭 없는   │
// │ 열린 슬래시) 최소 하나는 잘못된 라벨이었고, 어느 쪽인지 알 수 없었다. 그래서 그때는 │
// │ AI 프로바이더 전부를 머리글자 배지로 남겼다.                                     │
// │                                                                              │
// │ [이번에 달라진 것] OpenAI · Anthropic Claude · Google Gemini · Grok 의 마크를     │
// │ 다시 넘겨받았고, 이번에는 **붙이기 전에 쟀다**: 네 path 의 해시가 서로 다르고,     │
// │ 각 path 의 좌표 경계가 자기 viewBox 안에 들어맞는 것을 확인했다. 지난번 사고는     │
// │ '같은 path 를 다른 이름으로 넣었다' 였으므로, 그 검사가 그 사고를 정확히 막는다.   │
// │                                                                              │
// │ [그래도 이 파일은 손대지 않는다] 마크가 들어갈 곳은 여기가 아니라                 │
// │ shared/ui/brand-marks.tsx 이고, 카탈로그의 `brand` 를 채우면 이 자리가 자동으로   │
// │ 마크로 바뀐다 — 갈래를 늘리는 일이 아니라 **데이터를 채우는 일**이다.             │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 표기는 **호출부가 정한다** — 여기서 이름을 자르지 않는다 ─────────────────────┐
// │ 한때 `name` 을 받아 첫 글자를 잘랐다. 커머스 3종(사·플·F)에서는 맞았지만 AI      │
// │ 13종에서는 **8종으로 뭉갰다**: G×3(Gemini·Grok·Groq) · A×3(Anthropic·Azure·    │
// │ Amazon) · O×2(OpenAI·OpenRouter). 기본 탭에 똑같은 G 배지 셋이 나란히 놓였다.   │
// │ (목록은 그 뒤 6종으로 줄었지만 첫 글자는 여전히 A×3 · G×2 로 겹친다.)           │
// │                                                                              │
// │ 원인은 규칙이 아니라 **책임의 위치**였다: 유일성은 목록 전체를 봐야 판정할 수     │
// │ 있는데 이 컴포넌트는 한 항목만 안다. 그래서 표기를 카탈로그가 정해 넘기고         │
// │ (`glyph`), 유일성은 그쪽 테스트가 고정한다.                                     │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// 장식이므로 aria-hidden — 이름은 옆의 텍스트가 전한다(둘 다 읽히면 스크린리더가 이름을 두 번 읽는다).
import type { CSSProperties } from 'react';

import { BrandMark } from '../../../../shared/ui';
import type { BrandMarkId } from '../../../../shared/ui';
import { cssVar } from '@tds/ui';

/** 마크든 이미지든 배지든 같은 정사각 변을 쓴다 — 브랜드 유무로 행 높이가 흔들리지 않는다 */
const GLYPH_SIZE = `calc(${cssVar('space.6')} * 1.5)`;

const initialBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  // 정사각 배지 — space 토큰의 배수로 크기를 만든다(px 리터럴 금지)
  width: GLYPH_SIZE,
  height: GLYPH_SIZE,
  borderRadius: cssVar('radius.md'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/**
 * 로고 이미지 — 인라인 마크와 **같은 정사각 상자**에 비율을 유지한 채 담는다.
 *
 * ┌ 왜 판을 깔지 않는가 (픽셀을 실제로 재고 내린 결론) ────────────────────────┐
 * │ 세 자산의 픽셀을 실측했다(알파>32 인 픽셀의 상대 휘도 = 0.2126R+0.7152G+     │
 * │ 0.0722B, 0~255):                                                          │
 * │   · azure-openai.png  300×300 · 알파>32 48,089px · 평균 117                 │
 * │       어두운(L<48) 0.0% · 밝은(L>208) 0.0% · p05/p50/p95 = 69/101/171        │
 * │   · amazon-bedrock.png 640×640 · 알파>32 80,860px · 평균 144                │
 * │       어두운 0.0% · 밝은 0.0% · p05/p50/p95 = 99/137/205                    │
 * │   · cj-logistics.png  280×280 · 알파>32 78,400px(= **전면 불투명**) · 평균 45 │
 * │       어두운 88.1% · 밝은 1.5% · p05/p50/p95 = 32/32/106                    │
 * │                                                                          │
 * │ 앞의 둘은 **투명 배경의 중간 톤**이라 어느 배경에서도 묻히지 않는다.           │
 * │ CJ 는 성격이 다르다: 알파 0 인 픽셀이 **한 개도 없고**(78,400/78,400)          │
 * │ 87.8% 가 단일 색 #231F20 이다 — 즉 이 자산은 **브랜드가 이미 자기 판을 들고**  │
 * │ 있다. 우리가 깔아 줄 판이 애초에 없다. 그 판 위의 로고는 흰 글자와 CJ 3색      │
 * │ (#EF3F42 · #0080C6 · #F9A12D)이라 판 안에서 충분히 갈린다.                   │
 * │                                                                          │
 * │ 이 앱의 표면은 흰색이다(color.surface.default = #FFFFFF, 토큰에 다크 팔레트가  │
 * │ 없다) — L=32 의 타일은 그 위에서 최대 대비로 보인다. 다크 팔레트가 생기는 날    │
 * │ 이 타일만 배경과 가까워지므로, **그때 다시 재야 한다**(위 숫자가 그 기준선이다).│
 * │                                                                          │
 * │ 어느 쪽이든 판을 지어내지 않는다. 브랜드가 규정하지 않은 컨테이너를 우리가      │
 * │ 만드는 것이 되기 때문이다. (brand-marks.tsx 의 AppleMark 가 검은 판을 두른     │
 * │  것은 Apple 가이드가 흑·백 마크를 **둘 다 규정**하기 때문이다.)               │
 * │                                                                          │
 * │ 결과적으로 브랜드 색에는 손대지 않는다 — '브랜드 색은 토큰이 아니다' 규약과     │
 * │ 충돌할 일이 애초에 없다. 우리가 정하는 것은 **치수뿐**이고 그건 토큰이다.       │
 * │                                                                          │
 * │ [해상도] 상자는 space.6 × 1.5 = 36px 이다. 셋 다 원본이 280px 이상이라        │
 * │ 3배 DPR(108px)에서도 확대가 일어나지 않는다 — 늘려 쓰는 자산이 없다.          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const logoImageStyle: CSSProperties = {
  display: 'block',
  flexShrink: 0,
  width: GLYPH_SIZE,
  height: GLYPH_SIZE,
  // 원본 종횡비가 1:1 이 아닐 수 있다 — 잘라내지 않고 상자 안에 맞춘다
  objectFit: 'contain',
};

interface ServiceGlyphProps {
  /**
   * 마크도 로고 이미지도 없을 때 배지에 그릴 **짧은 표기**. 호출부(카탈로그)가 정해서 넘긴다.
   *
   * [이름에서 여기서 따지 않는다] 예전에는 `name` 을 받아 첫 글자를 잘랐는데, 그러면 이 컴포넌트가
   * **자기가 모르는 목록의 유일성**을 책임지게 된다 — 실제로 AI 프로바이더 13종이 8종으로 뭉갰다.
   * 유일성은 목록을 아는 쪽(../integrations.ts)만 보장할 수 있으므로 그쪽이 정한 값을 받는다.
   */
  readonly glyph: string;
  /**
   * 이 서비스의 **인라인** 브랜드 마크. **null 은 '아직 안 만든 것' 이 아니라 '벡터를 확보하지
   * 못했거나 브랜드가 없는 것'** 이고, 그때는 아래 `logoSrc` 또는 표기 배지로 내려간다.
   */
  readonly brand: BrandMarkId | null;
  /**
   * 이 서비스의 **로고 이미지** 경로(앱 내 절대 경로). 벡터가 없을 때만 쓴다.
   *
   * `brand` 와 동시에 채워지지 않는다(카탈로그가 그렇게 규정한다) — 그래도 아래 분기는
   * `brand` 를 먼저 본다: 둘 다 들어온 날에도 **더 나은 쪽**이 그려져야 한다.
   */
  readonly logoSrc: string | null;
}

export function ServiceGlyph({ glyph, brand, logoSrc }: ServiceGlyphProps) {
  if (brand !== null) return <BrandMark brand={brand} size={GLYPH_SIZE} />;

  // 장식이다 — `alt=""` + aria-hidden 으로 접근성 트리에서 빼고, 이름은 옆 텍스트가 전한다.
  // (alt 를 채우면 스크린리더가 서비스 이름을 두 번 읽는다.)
  if (logoSrc !== null)
    return <img src={logoSrc} alt="" aria-hidden="true" style={logoImageStyle} />;

  return (
    <span style={initialBadgeStyle} aria-hidden="true">
      {glyph}
    </span>
  );
}
