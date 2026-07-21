// 거래처 상세의 역방향 조회 카드 — 계약·견적·프로젝트·상담 네 구획이 이 한 벌을 공유한다.
//
// [왜 CrudReadListShell 이 아닌가] 저 껍데기는 **화면 하나가 통째로 목록일 때**의 것이다
// (툴바·빈 상태 복구 액션·행 클릭 목적지·URL 조회 상태). 여기는 상세 화면 안의 네 구획이라
// 필터도 검색도 없고, 비었을 때 권할 것도 '검색을 지우세요' 가 아니라 '아직 없습니다' 뿐이다.
// 그래서 표 골격만 DS Table 에서 가져오고 카드·상태 분기만 이 파일이 갖는다.
//
// [세 상태를 뭉개지 않는다] 못 불러왔다(에러 + 다시 시도) / 아직 못 읽었다(스켈레톤) /
// 정말 없다(안내 문구)는 서로 다른 사실이다. 셋을 '없습니다' 하나로 합치면 조회가 실패한
// 거래처가 '거래 이력 없는 거래처' 로 보인다.
import type { ReactNode } from 'react';
import { cssVar, Table } from '@tds/ui';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  hintStyle,
} from '../../../../shared/ui';

/** 한 열 — DS Table 의 columns 를 도메인 렌더 함수와 짝지어 둔다 */
export interface RelatedColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly render: (item: T) => ReactNode;
  /** 수치 열 — 우측 정렬 + tabular-nums */
  readonly numeric?: boolean;
  readonly nowrap?: boolean;
}

interface RelatedRecordsCardProps<T extends { readonly id: string }> {
  readonly title: string;
  /** 캡션에 쓰이는 이름 — '이 거래처의 {entityLabel} 목록' */
  readonly entityLabel: string;
  readonly columns: readonly RelatedColumn<T>[];
  readonly items: readonly T[];
  /** **최초 로드만** true — 재조회 중 true 면 이미 그린 행이 스켈레톤으로 덮인다 (STATE-01) */
  readonly loading: boolean;
  readonly error: Error | null;
  readonly onRetry: () => void;
  /** 정말 비었을 때의 문구 — 도메인마다 다르다('체결된 계약이 없습니다') */
  readonly emptyText: string;
}

export function RelatedRecordsCard<T extends { readonly id: string }>({
  title,
  entityLabel,
  columns,
  items,
  loading,
  error,
  onRetry,
  emptyText,
}: RelatedRecordsCardProps<T>) {
  if (error !== null) {
    return (
      <Card>
        <CardTitle>{title}</CardTitle>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>{`${entityLabel} 이력을 불러오지 못했습니다.`}</span>
            <Button variant="secondary" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <Table
        caption={`이 거래처의 ${entityLabel} 목록 — 각 행의 링크로 해당 화면으로 이동합니다.`}
        columns={columns.map((column) => ({
          id: column.id,
          header: column.header,
          ...(column.numeric === true && { align: 'end' as const }),
          ...(column.nowrap === true && { nowrap: true }),
        }))}
        rows={items.map((item) => ({
          id: item.id,
          cells: columns.map((column) => column.render(item)),
        }))}
        loading={loading}
        skeletonRows={2}
        empty={<p style={{ ...hintStyle, paddingTop: cssVar('space.3') }}>{emptyText}</p>}
      />
    </Card>
  );
}
