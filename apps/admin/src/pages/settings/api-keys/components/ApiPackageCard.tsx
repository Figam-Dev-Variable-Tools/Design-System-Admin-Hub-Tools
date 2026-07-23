// 계약으로 열리는 API 묶음 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**)
//
// ┌ 왜 목록을 보여 주는가 ────────────────────────────────────────────────────┐
// │ 운영자가 계약할 때 고르는 단위가 **API 하나가 아니라 묶음**이기 때문이다.      │
// │ '이 연동을 켜면 무엇을 할 수 있게 되는가' 는 자격증명 칸만 봐서는 알 수 없다 —  │
// │ 키 한 칸 뒤에 예약 접수도, 주소 정제도, 취소도 함께 들어 있다.                 │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 부를 수 있는 것처럼 보이게 하지 않는다 — 이 파일의 가장 중요한 규율 ─────────┐
// │ 그래서 이 카드에는 **버튼도, API 별 상태 배지도, 마지막 호출 시각도 없다.**    │
// │ 그런 것을 붙이는 순간 목록은 '동작하는 것들' 로 읽히는데, 이 앱에는 이 API 를   │
// │ 부르는 코드가 **한 줄도 없다**(백엔드가 없다). 누르면 아무 일도 없거나 —       │
// │ 더 나쁘게 — 성공을 지어내게 된다.                                           │
// │                                                                          │
// │ 목록은 **읽는 것**이고, 그 사실을 카드가 스스로 말한다(아래 Alert).           │
// │ 같은 규율이 옆 카드에도 있다: 부를 곳이 없는 '연결 검증' 버튼을 그리지 않는다.  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [문구를 다듬지 않는다] 운영자가 포털에서 확인해 넘긴 표기 그대로 그린다((공통)/(일반) 포함).
// 우리가 '상품 추적' 을 '배송 추적' 으로 고쳐 적으면 운영자는 포털에서 같은 이름을 찾지 못한다.
import type { CSSProperties } from 'react';

import { cssVar } from '@tds/ui';

import { Alert, Card, CardTitle } from '../../../../shared/ui';
import type { IntegrationApiPackage } from '../integrations';

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const packageNameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/** 순서 없는 목록 — 순서가 뜻을 갖지 않는다(번호를 붙이면 '단계' 로 읽힌다) */
const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingLeft: cssVar('space.5'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

interface ApiPackageCardProps {
  readonly apiPackage: IntegrationApiPackage;
}

export function ApiPackageCard({ apiPackage }: ApiPackageCardProps) {
  return (
    <Card>
      <CardTitle>계약하면 열리는 API</CardTitle>

      <div style={stackStyle}>
        <span style={packageNameStyle}>
          {apiPackage.name} · {apiPackage.operations.length}종
        </span>

        <ul style={listStyle}>
          {apiPackage.operations.map((operation) => (
            <li key={operation}>{operation}</li>
          ))}
        </ul>

        <Alert tone="info">
          <strong>이 화면은 아직 이 중 어느 것도 부르지 않아요.</strong> 위 목록은 계약으로 함께
          열리는 API 를 알려 주는 것이고, 실제 호출은 서버가 붙은 뒤에 생겨요 — 그래서 API마다
          버튼이나 상태를 두지 않았어요.
        </Alert>
      </div>
    </Card>
  );
}
