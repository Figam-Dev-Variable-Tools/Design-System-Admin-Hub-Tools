// API Key 카드 본문 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [왜 페이지에서 떼어냈나] 페이지가 상태 머신(발급·노출·폐기 다이얼로그 3종)과 표시 분기(로딩·0건·표)를
// 한 함수에 들고 있으면 분기가 15를 넘는다(code-quality 축4). 표시 분기만 여기로 옮겨,
// 페이지에는 '무슨 일이 일어나는가'(뮤테이션·다이얼로그)만 남긴다.
//
// [STATE-01] 셋 중 하나만 그린다: 첫 로딩=스켈레톤 / 0건=Empty / 그 외=표.
// (조회 실패는 페이지가 더 위에서 가로채므로 여기 오지 않는다.)
import type { CSSProperties, ReactNode } from 'react';

import { Empty } from '@tds/ui';

import { Alert, Card, CardTitle } from '../../../../shared/ui';
import { ApiKeyTable } from './ApiKeyTable';
import type { ApiKey } from '../types';

const skeletonStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const countStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/** 스켈레톤 행 수 — 픽스처 규모에 맞춘다(로딩 모양이 실제 목록과 크게 다르지 않게) */
const SKELETON_ROWS = 3;

interface ApiKeysCardProps {
  /** 첫 로딩 중 — 스켈레톤만 그린다 */
  readonly loading: boolean;
  /** 아직 도착하지 않았으면 undefined */
  readonly keys: readonly ApiKey[] | undefined;
  readonly canRemove: boolean;
  /** 읽기 전용 안내를 보일지 — 발급·폐기 권한이 둘 다 없을 때 */
  readonly readOnlyNotice: string | null;
  /** 폐기 진행 중인 키 id */
  readonly revokingId: string | null;
  /** 우상단 발급 버튼 — 권한이 없으면 null */
  readonly issueButton: ReactNode;
  readonly onRevoke: (key: ApiKey) => void;
}

export function ApiKeysCard({
  loading,
  keys,
  canRemove,
  readOnlyNotice,
  revokingId,
  issueButton,
  onRevoke,
}: ApiKeysCardProps) {
  const isEmpty = keys !== undefined && keys.length === 0;

  return (
    <Card>
      <CardTitle action={issueButton}>API Key</CardTitle>

      {readOnlyNotice !== null && <Alert tone="info">{readOnlyNotice}</Alert>}

      {loading && (
        <div style={skeletonStackStyle} aria-busy="true">
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
          ))}
        </div>
      )}

      {/* [STATE-05] 진짜 비어있음 — 검색도 필터도 없는 화면이라 생성 CTA 하나만 준다 */}
      {!loading && isEmpty && <Empty label="API Key" createVerb="발급" action={issueButton} />}

      {!loading && !isEmpty && (
        <>
          <ApiKeyTable
            keys={keys ?? []}
            revokingId={revokingId}
            canRemove={canRemove}
            onRevoke={onRevoke}
          />
          <p style={countStyle}>전체 {keys?.length ?? 0}건</p>
        </>
      )}
    </Card>
  );
}
