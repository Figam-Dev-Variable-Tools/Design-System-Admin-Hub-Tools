// API Key 목록 표 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [키 열이 보여주는 것] `sk_test_••••0001` — 이것이 우리가 가진 전부다(가린 것이 아니다 · _shared/secret.ts).
// [마지막 사용] '한 번도 안 씀' 을 눈에 띄게 남긴다 — 폐기 후보를 찾는 유일한 단서다.
// [폐기 버튼] 삭제 권한이 없으면 렌더하지 않는다 (EXC-03). 이미 폐기된 키에도 없다(할 일이 없다).
import type { CSSProperties } from 'react';

import { formatRelativeOrDate } from '../../../../shared/format';
import { Button, StatusBadge, tableStyle, tdStyle, thStyle } from '../../../../shared/ui';
import { formatDateOnly } from '../../_shared/diff';
import { maskSecret } from '../../_shared/secret';
import { scopeLabel } from '../types';
import type { ApiKey } from '../types';

/** 키 값 셀 — 자릿수 정렬(tabular-nums)로 last4 를 눈으로 대조하기 쉽게 한다 */
const keyCellStyle: CSSProperties = {
  ...tdStyle,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
};

const mutedCellStyle: CSSProperties = {
  ...tdStyle,
  color: 'var(--tds-color-text-muted)',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const neverUsedStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-warning-text)',
};

const scopeListStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

interface ApiKeyTableProps {
  readonly keys: readonly ApiKey[];
  /** 폐기 진행 중인 키 id — 그 행의 버튼만 잠근다 */
  readonly revokingId: string | null;
  readonly canRemove: boolean;
  readonly onRevoke: (key: ApiKey) => void;
}

export function ApiKeyTable({ keys, revokingId, canRemove, onRevoke }: ApiKeyTableProps) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle} scope="col">
            이름
          </th>
          <th style={thStyle} scope="col">
            키
          </th>
          <th style={thStyle} scope="col">
            스코프
          </th>
          <th style={thStyle} scope="col">
            상태
          </th>
          <th style={thStyle} scope="col">
            마지막 사용
          </th>
          <th style={thStyle} scope="col">
            생성
          </th>
          {canRemove && (
            <th style={thStyle} scope="col">
              <span>관리</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {keys.map((key) => {
          const revoked = key.status === 'revoked';
          return (
            <tr key={key.id}>
              <td style={nameCellStyle}>{key.name}</td>

              <td style={keyCellStyle}>{maskSecret(key.preview)}</td>

              <td style={scopeListStyle}>
                {key.scopes.map((scope) => scopeLabel(scope)).join(' · ')}
              </td>

              <td style={tdStyle}>
                <StatusBadge
                  tone={revoked ? 'neutral' : 'success'}
                  label={revoked ? '폐기됨' : '활성'}
                />
              </td>

              <td style={mutedCellStyle}>
                {key.lastUsedAt === null ? (
                  <span style={neverUsedStyle}>한 번도 사용되지 않음</span>
                ) : (
                  formatRelativeOrDate(key.lastUsedAt)
                )}
              </td>

              <td style={mutedCellStyle}>
                {formatDateOnly(key.createdAt)} · {key.createdBy}
              </td>

              {canRemove && (
                <td style={actionCellStyle}>
                  {/* 이미 폐기된 키에는 할 일이 없다 — 비활성 버튼 대신 아무것도 두지 않는다 */}
                  {!revoked && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={revokingId !== null}
                      aria-busy={revokingId === key.id}
                      onClick={() => {
                        onRevoke(key);
                      }}
                    >
                      폐기
                    </Button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
