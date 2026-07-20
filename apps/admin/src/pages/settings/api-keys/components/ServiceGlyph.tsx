// 서비스 식별 글리프 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ 이 화면은 마켓스토어다 — 목록은 **알아볼 수 있어야** 한다 ────────────────────┐
// │ 스토어 진열대의 요점은 훑어서 고르는 것이다. 그래서 **브랜드가 있고 공식 자산을    │
// │ 확보한 것은 진짜 마크**를 그린다. 마크의 원본은 이 폴더가 아니라                  │
// │ shared/ui/brand-marks.tsx 에 있다 — 두 화면이 같은 자산을 쓰고, 사본이 갈라지지   │
// │ 않게 하기 위해서다(그 파일 머리말에 근거).                                       │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 확인하지 못한 로고는 **지어내지 않는다** ─────────────────────────────────────┐
// │ 지금 이 화면의 AI 프로바이더 13종은 **전부 머리글자 배지**다. OpenAI·Claude·      │
// │ Gemini·Grok 의 공식 마크를 1차 출처에서 확인하지 못했기 때문이다                  │
// │ (openai.com/brand·x.ai/legal/brand-guidelines 는 403, anthropic.com 은 404).    │
// │ 넘겨받은 Grok·OpenAI SVG 두 장은 **path 데이터가 같았다** — 두 마크는 기하학적으로 │
// │ 양립 불가라(6회 회전대칭 닫힌 매듭 vs 대칭 없는 열린 슬래시) 최소 하나는 잘못된    │
// │ 라벨이고, 어느 쪽인지 알 수 없다.                                               │
// │                                                                              │
// │ 그래서 그 자리는 **짧은 표기 배지**로 남는다. 비슷하게 그린 가짜 로고보다 정직하고 │
// │ (상표 문제도 없다), 빈 회색 사각형보다 많은 것을 말한다. 색은 전부 토큰이고,       │
// │ 공식 자산이 도착하면 brand-marks.tsx 에 마크를 더하고 카탈로그의 brand 를          │
// │ 채우기만 하면 이 자리가 마크로 바뀐다 — **이 파일은 손대지 않는다.**              │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 표기는 **호출부가 정한다** — 여기서 이름을 자르지 않는다 ─────────────────────┐
// │ 한때 `name` 을 받아 첫 글자를 잘랐다. 커머스 3종(사·플·F)에서는 맞았지만 AI      │
// │ 13종에서는 **8종으로 뭉갰다**: G×3(Gemini·Grok·Groq) · A×3(Anthropic·Azure·    │
// │ Amazon) · O×2(OpenAI·OpenRouter). 기본 탭에 똑같은 G 배지 셋이 나란히 놓였다.   │
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

/** 마크든 배지든 같은 정사각 변을 쓴다 — 브랜드 유무로 행 높이가 흔들리지 않는다 */
const GLYPH_SIZE = 'calc(var(--tds-space-6) * 1.5)';

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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

interface ServiceGlyphProps {
  /**
   * 마크가 없을 때 배지에 그릴 **짧은 표기**. 호출부(카탈로그)가 정해서 넘긴다.
   *
   * [이름에서 여기서 따지 않는다] 예전에는 `name` 을 받아 첫 글자를 잘랐는데, 그러면 이 컴포넌트가
   * **자기가 모르는 목록의 유일성**을 책임지게 된다 — 실제로 AI 프로바이더 13종이 8종으로 뭉갰다.
   * 유일성은 목록을 아는 쪽(../integrations.ts)만 보장할 수 있으므로 그쪽이 정한 값을 받는다.
   */
  readonly glyph: string;
  /**
   * 이 서비스의 브랜드 마크. **null 은 '아직 안 만든 것' 이 아니라 '확인하지 못했거나 없는 것'** 이고,
   * 그때는 짧은 표기 배지가 그려진다 (파일 머리말).
   */
  readonly brand: BrandMarkId | null;
}

export function ServiceGlyph({ glyph, brand }: ServiceGlyphProps) {
  if (brand !== null) return <BrandMark brand={brand} size={GLYPH_SIZE} />;

  return (
    <span style={initialBadgeStyle} aria-hidden="true">
      {glyph}
    </span>
  );
}
