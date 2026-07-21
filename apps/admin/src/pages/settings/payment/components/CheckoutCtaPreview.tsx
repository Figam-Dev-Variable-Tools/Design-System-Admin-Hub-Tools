// 구매 CTA 미리보기 — 지금 설정이 고객 화면에서 어떤 버튼이 되는지 (결제 설정 화면 전용)
//
// [왜 미리보기인가] 이 화면에서 정하는 값의 결과는 **이 화면 밖에서만** 눈에 띈다 — 상품 카드와
// 프로그램 상세의 버튼이다. 스위치 옆에 결과를 함께 그리면 '끄면 무엇이 어떻게 바뀌는가' 를
// 저장 전에 확인할 수 있다(../site 의 OG 카드 미리보기와 같은 결).
//
// [두 도메인을 나란히 둔다] 상품과 프로그램은 켜져 있을 때 서로 다른 말을 하고(구매하기·후원하기)
// 꺼지면 같은 말로 수렴한다(문의하기). 한쪽만 그리면 그 수렴이 보이지 않는다.
//
// [버튼처럼 보이지만 버튼이 아니다] 누를 것이 없는 자리에 진짜 버튼을 두면 운영자는 눌러 보고
// 아무 일도 일어나지 않는 것을 확인하게 된다. 그래서 DS 버튼의 **시각 토큰만** 빌려 <span> 으로
// 그린다(../../../shared/ui 의 buttonStyle).
import type { CSSProperties } from 'react';

import { cssVar, typography } from '@tds/ui';

import { buttonStyle } from '../../../../shared/ui';
import { checkoutCta } from '../../../../shared/commerce/payment-settings';
import type { CommerceDomain, PaymentSettings } from '../../../../shared/commerce/payment-settings';

/** 미리보기에 세우는 두 자리 — 이름은 가상 예시다(픽스처의 실제 상품을 끌어오지 않는다) */
const STAGES: readonly {
  readonly domain: CommerceDomain;
  readonly title: string;
  readonly sample: string;
}[] = [
  { domain: 'product', title: '상품 상세', sample: '루미엔 경량 패딩 점퍼' },
  { domain: 'program', title: '프로그램 상세', sample: '도시숲 조성 프로젝트' },
];

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.3'),
};

const stageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  minWidth: 0,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const stageTitleStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const sampleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
  overflowWrap: 'anywhere',
};

const guideStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  overflowWrap: 'anywhere',
};

interface CheckoutCtaPreviewProps {
  /** 지금 폼에 들어 있는 값 — 저장 전 입력에도 결과가 따라온다 */
  readonly settings: PaymentSettings;
}

export function CheckoutCtaPreview({ settings }: CheckoutCtaPreviewProps) {
  return (
    <div style={gridStyle}>
      {STAGES.map((stage) => {
        // 라벨을 여기서 고르지 않는다 — 상품 폼·프로그램 상세와 **같은 함수**가 정한다
        const cta = checkoutCta(settings, stage.domain);

        return (
          <div key={stage.domain} style={stageStyle}>
            <span style={stageTitleStyle}>{stage.title}</span>
            <p style={sampleStyle}>{stage.sample}</p>

            {/* 장식이 아니라 정보다 — 스크린리더에도 '이 자리에 이 버튼이 보인다' 로 읽혀야 한다 */}
            <span style={buttonStyle(cta.kind === 'purchase' ? 'primary' : 'secondary')}>
              {cta.label}
            </span>

            {cta.kind === 'inquiry' && settings.inquiryGuide.trim() !== '' && (
              <p style={guideStyle}>{settings.inquiryGuide}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
