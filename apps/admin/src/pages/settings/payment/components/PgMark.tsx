// PG 사 마크 (결제 설정 화면 전용 — apps/admin/src/pages/settings/payment/**)
//
// ┌ 갈래는 셋이다 — 연동 마켓스토어와 **같은 구조**다 ─────────────────────────┐
// │ ① **인라인 벡터**(brand) — 공식 SVG 를 확보한 것. 어떤 크기에서도 또렷하고    │
// │    네트워크 요청이 없어 가능하면 언제나 이쪽이다.                            │
// │ ② **로고 이미지**(logoSrc) — 벡터를 못 구했고 실물 래스터만 있는 경우.        │
// │    지금 PG 다섯이 전부 여기다. 벡터가 없다고 **비슷하게 그린 벡터로 대체하지  │
// │    않는다** — 그것이 요점이다(shared/ui/brand-marks.tsx 머리말).             │
// │ ③ **머리글자 배지** — 둘 다 없을 때. 빈 회색 사각형보다 많은 것을 말한다.     │
// │                                                                          │
// │ 이 세 갈래는 pages/settings/api-keys/components/ServiceGlyph.tsx 가 세운     │
// │ 구조다. 두 화면이 로고를 다른 방식으로 그리면 같은 회사가 화면마다 다르게      │
// │ 보이므로, 갈래를 새로 발명하지 않고 그대로 따른다.                            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 왜 이미지에 **테두리**를 두르는가 (실측 결과) ─────────────────────────────┐
// │ 다섯 자산의 픽셀을 실제로 쟀다(알파>32 인 픽셀의 휘도 분포):                  │
// │   · toss-payments.png  64×64   투명 61% · 평균휘도 106 · 어두움 0%  · 밝음 0% │
// │   · nhn-kcp.png        280×280 불투명   · 평균휘도 103 · 어두움 0%  · 밝음 9% │
// │   · kg-inicis.png      280×280 불투명   · 평균휘도  54 · 어두움 91% · 밝음 2% │
// │   · nicepay.jpg        447×447 불투명   · 평균휘도  73 · 어두움 88% · 밝음 4% │
// │   · portone.jpg        196×197 불투명   · 평균휘도  24 · 어두움 83% · 밝음 0% │
// │                                                                          │
// │ 연동 마켓스토어의 두 자산(평균 111·144, 어두운 픽셀 0~2%)과 **결론이 다르다**: │
// │ 뒤 셋은 **어두운 불투명 판**이라 다크 테마 표면 위에서 자기 경계를 잃는다      │
// │ (안쪽 자면은 밝아서 읽히지만, 판이 어디서 끝나는지가 사라진다).                │
// │                                                                          │
// │ 그렇다고 흰 판을 깔지 않는다 — 이미 불투명이라 판은 보이지도 않고, 브랜드가    │
// │ 규정하지 않은 컨테이너를 지어내는 것이 된다. 대신 **우리 토큰 테두리 한 겹**만 │
// │ 두른다: 경계를 되돌려 주면서 브랜드 색에는 손대지 않는다(우리가 정하는 것은    │
// │ 치수와 테두리뿐이고 그건 토큰이다). 투명 배경인 toss 에도 해가 없다.          │
// └──────────────────────────────────────────────────────────────────────────┘
import type { CSSProperties } from 'react';

import { cssVar } from '@tds/ui';

import { BrandMark } from '../../../../shared/ui';
import { pgLabel, pgMeta } from '../../../../shared/commerce/pg-catalog';
import type { PgTargetId } from '../../../../shared/commerce/pg-catalog';

interface PgMarkProps {
  readonly target: PgTargetId;
  /**
   * 마크가 차지할 정사각 변. **space 토큰 표현식만 넘긴다**(예: `var(--tds-space-7)`).
   * 색과 달리 치수는 우리 것이라 토큰을 쓴다.
   */
  readonly size?: string;
}

const boxStyle = (size: string): CSSProperties => ({
  display: 'inline-flex',
  flexShrink: 0,
  width: size,
  height: size,
});

/** 래스터 자산 — 비율을 유지한 채 정사각 상자에 담고, 경계를 잃지 않게 테두리 한 겹 */
const imageStyle = (size: string): CSSProperties => ({
  display: 'block',
  flexShrink: 0,
  width: size,
  height: size,
  // 원본 종횡비가 1:1 이 아닐 수 있다 — 잘라내지 않고 상자 안에 맞춘다
  objectFit: 'contain',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.subtle'),
  borderRadius: cssVar('radius.md'),
});

/** 벡터도 이미지도 없을 때 — 회사 이름의 첫 글자 */
const badgeStyle = (size: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: size,
  height: size,
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
});

/** 마크 한 칸 — 정사각 상자에 자산을 담는다. 이름은 **옆의 텍스트**가 전한다(aria-hidden) */
export function PgMark({ target, size = cssVar('space.7') }: PgMarkProps) {
  const { brand, logoSrc } = pgMeta(target);

  if (brand !== null) {
    return (
      <span aria-hidden="true" style={boxStyle(size)}>
        <BrandMark brand={brand} size={size} />
      </span>
    );
  }

  // 장식이다 — `alt=""` + aria-hidden 으로 접근성 트리에서 빼고, 이름은 옆 텍스트가 전한다.
  // (alt 를 채우면 스크린리더가 회사 이름을 두 번 읽는다.)
  if (logoSrc !== null) {
    return <img src={logoSrc} alt="" aria-hidden="true" style={imageStyle(size)} />;
  }

  return (
    <span aria-hidden="true" style={badgeStyle(size)}>
      {pgLabel(target).slice(0, 1)}
    </span>
  );
}
