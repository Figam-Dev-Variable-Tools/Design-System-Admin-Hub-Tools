// 통계 화면의 공통 껍데기
//
// 6개 화면이 **똑같은 순서**로 읽힌다: 설명 → 조회 조건 → (고지) → KPI → 본문(추이·분해).
// 화면마다 순서를 바꾸면 운영자가 매번 눈으로 다시 찾는다 (IA-04 의 통계판).
//
// [제목을 여기서 그리지 않는다 — IA-02] 화면 제목은 AppHeader 가 nav-config 의 잎 라벨에서
// 낸다('방문자 통계'). 여기서 h1 을 또 그리면 같은 제목이 두 번 뜨고 제목의 원천이 둘로 갈린다.
// 그래서 이 셸은 h1 을 갖지 않고, 안쪽 구획만 h2 로 나눈다.
//
// [권한 — EXC-03] read 가 없으면 애초에 사이드바에 뜨지 않지만, URL 직접 입력으로 들어올 수
// 있다. 그래서 셸이 read 를 직접 확인하고 403 화면을 낸다. 내보내기 버튼은 export 권한이
// 없으면 **그리지 않는다**(비활성이 아니라 부재 — 없는 권한을 손잡이로 보여주지 않는다).
import type { CSSProperties, ReactNode } from 'react';
import { Alert, Button } from '../../../shared/ui';
import { usePermissions } from '../../../shared/permissions/PermissionProvider';
import { navPageResourceId } from '../../../shared/permissions/resources';

import { StatsFilterBar } from './StatsFilterBar';
import { periodErrorOf } from './period';
import type { SegmentOption } from './types';
import type { CsvExportState } from './useCsvExport';
import type { StatsParamsApi } from './useStatsParams';
import { cssVar } from '@tds/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const forbiddenStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: cssVar('space.3'),
  paddingBlock: 'calc(var(--tds-space-6) * 2)',
  textAlign: 'center',
};

const forbiddenTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

interface StatsPageShellProps {
  /** 이 화면이 대시보드와 무엇이 다른지 한 줄 — 운영자가 어디에 왔는지 안다 */
  readonly description: string;
  /** 이 화면의 라우트 — 권한 리소스 id 를 여기서 만든다 */
  readonly route: string;
  readonly params: StatsParamsApi;
  readonly segments: readonly SegmentOption[];
  readonly segmentLabel: string;
  readonly searchLabel?: string | undefined;
  /** 조회 실패 문구 — 빈 문자열이면 성공이다 (STATE-02) */
  readonly error: string;
  readonly onRetry: () => void;
  readonly exportState: CsvExportState;
  readonly onExport: () => void;
  readonly exportCount: number;
  /** 화면 고유의 지속 안내 (예: 매출 통계의 부가세 고지) */
  readonly notice?: ReactNode;
  readonly children: ReactNode;
}

export function StatsPageShell({
  description,
  route,
  params,
  segments,
  segmentLabel,
  searchLabel,
  error,
  onRetry,
  exportState,
  onExport,
  exportCount,
  notice,
  children,
}: StatsPageShellProps) {
  const { can } = usePermissions();
  const resourceId = navPageResourceId(route);

  // 조회 권한 없이 딥링크로 들어온 경우 — 화면을 그리기 전에 막는다
  if (!can(resourceId, 'read')) {
    return (
      <div style={forbiddenStyle}>
        <h2 style={forbiddenTitleStyle}>접근 권한이 없습니다</h2>
        <p style={descriptionStyle}>
          이 통계를 볼 수 있는 권한이 없습니다. 필요하면 최상위 관리자에게 요청해 주세요.
        </p>
      </div>
    );
  }

  const periodError = periodErrorOf(params.period);

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>{description}</p>

      <StatsFilterBar
        params={params}
        segments={segments}
        segmentLabel={segmentLabel}
        searchLabel={searchLabel}
        exportState={exportState}
        onExport={onExport}
        canExport={can(resourceId, 'export')}
        exportCount={exportCount}
      />

      {notice}

      {/* 종료일 < 시작일 — 조용한 '결과 없음' 대신 무엇이 잘못됐는지 말한다 (COMP-11).
          [문구는 여기서 다시 쓰지 않는다] 메시지는 이미 DateRangeField 가 **틀린 입력 옆에**
          role=alert + aria-invalid 로 달고 있다. 같은 문장을 배너로 한 번 더 띄우면 화면에
          같은 말이 두 번 뜨고, 스크린리더는 두 번 읽으며, 고칠 곳(입력칸)에서는 오히려 멀어진다.
          여기서 하는 일은 **본문을 그리지 않는 것**뿐이다 — 말이 안 되는 범위로 조회하지 않는다. */}
      {periodError !== '' ? null : error !== '' ? (
        // 조회 실패 — 인라인 danger Alert + 다시 시도. 토스트로 처리하지 않는다 (STATE-02):
        // 토스트는 사라지고 나면 빈 화면만 남아 할 일을 잃는다.
        <Alert tone="danger">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: cssVar('space.3'),
              flexWrap: 'wrap',
            }}
          >
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        </Alert>
      ) : (
        children
      )}
    </div>
  );
}
