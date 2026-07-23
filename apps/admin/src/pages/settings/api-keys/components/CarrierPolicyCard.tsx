// 배송 정책 연결 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**)
//
// ┌ 이 카드가 답하는 질문 하나 ────────────────────────────────────────────────┐
// │ '이 연동의 택배사가 **배송 정책에 등록돼 있는가**'                            │
// │                                                                          │
// │ 자격증명이 저장돼 있다는 것과 그 택배사로 물건이 나간다는 것은 **다른 사실**이다. │
// │ 송장을 붙일 택배사 목록은 배송 정책(/products/shipping)이 갖고, 이 화면은      │
// │ 그것을 정의하지 않는다 — 정의하면 같은 택배사를 두 곳이 각자 알게 되고,         │
// │ 한쪽에서 지운 뒤에도 다른 쪽이 멀쩡해 보인다.                                 │
// │                                                                          │
// │ 그래서 **묻는다.** 판정도 조회도 이 파일이 하지 않는다: 공통 층의 조회기        │
// │ (shared/domain/carrier-integration.ts)가 답을 만들고 여기서는 그리기만 한다.   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [모르는 것을 '없다' 로 그리지 않는다] 조회기가 안 꽂혔거나 목록을 못 읽으면 link 가 null 이다.
// 그때 '등록돼 있지 않습니다' 라고 쓰면 운영자는 **하지 않아도 될 일**(택배사 등록)을 하러 간다 —
// 이미 등록돼 있는데 우리가 못 읽었을 수도 있다. 그래서 세 번째 문장을 따로 갖는다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { cssVar } from '@tds/ui';

import { Alert, Card, CardTitle, StatusBadge } from '../../../../shared/ui';
import type { CarrierPolicyLink } from '../../../../shared/domain/carrier-integration';

/** 배송 정책 화면 — 여기서 택배사를 등록하고 끈다. 앱 안 주소라 문자열 하나면 된다 */
const SHIPPING_POLICY_PATH = '/products/shipping';

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  minWidth: `calc(${cssVar('space.7')} * 2)`,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const valueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/** 운영자가 배송 정책에 그대로 옮겨 적어야 하는 값 — 눈으로 골라낼 수 있게 등폭으로 */
const codeStyle: CSSProperties = {
  ...valueStyle,
  fontFamily: cssVar('typography.code.md.font-family'),
};

const hintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

interface CarrierPolicyCardProps {
  /** 이 연동이 가리키는 택배사 코드 — 카탈로그가 정한 **우리 연결 키** */
  readonly carrierCode: string;
  /** 배송 정책이 준 답 — **null 은 '모른다'** 이지 '등록 안 됨' 이 아니다 */
  readonly link: CarrierPolicyLink | null;
}

export function CarrierPolicyCard({ carrierCode, link }: CarrierPolicyCardProps) {
  return (
    <Card>
      <CardTitle>배송 정책 연결</CardTitle>

      <div style={stackStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>택배사 코드</span>
          <span style={codeStyle}>{carrierCode}</span>
          <span style={hintStyle}>
            배송 정책의 택배사 코드가 이 값과 같아야 같은 택배사로 봐요.
          </span>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>등록 상태</span>

          {link === null ? (
            <>
              <StatusBadge tone="neutral" label="확인하지 못함" />
              <span style={hintStyle}>
                배송 정책의 택배사 목록을 읽지 못했어요. 등록돼 있을 수도 있어요.
              </span>
            </>
          ) : link.state === 'missing' ? (
            <>
              <StatusBadge tone="warning" label="등록되지 않음" />
              <span style={hintStyle}>이 코드를 쓰는 택배사가 배송 정책에 없어요.</span>
            </>
          ) : link.state === 'inactive' ? (
            <>
              <StatusBadge tone="warning" label="사용 꺼짐" />
              <span style={valueStyle}>{link.carrier?.name}</span>
              <span style={hintStyle}>등록돼 있지만 새 송장의 선택지에서 빠져 있어요.</span>
            </>
          ) : (
            <>
              <StatusBadge tone="success" label="사용 중" />
              <span style={valueStyle}>{link.carrier?.name}</span>
              <span style={hintStyle}>배송 정책에 등록돼 있고 송장에서 고를 수 있어요.</span>
            </>
          )}
        </div>

        {/* 어긋난 두 경우에만 할 일을 말한다 — 맞을 때 안내를 띄우면 잡음이 된다.
            '모른다' 일 때도 띄우지 않는다: 할 일이 있는지조차 아직 모르기 때문이다. */}
        {link !== null && link.state !== 'active' && (
          <Alert tone="warning">
            <strong>자격증명이 저장돼 있어도 이 택배사로는 배송이 나가지 않아요.</strong> 송장을
            붙일 택배사 목록은 배송 정책이 가져요 —{' '}
            <Link to={SHIPPING_POLICY_PATH} className="tds-ui-link tds-ui-focusable">
              배송 정책
            </Link>
            에서 택배사 코드를 <span style={codeStyle}>{carrierCode}</span> 로 맞춰 등록하고 사용
            여부를 켜 주세요.
          </Alert>
        )}
      </div>
    </Card>
  );
}
