// 답변 렌더 — AgentAnswer 한 종류당 한 가지 그림
//
// [문구를 여기서 짓지 않는다] 답변의 내용은 전부 answer.ts 가 값으로 만들어 준다. 화면은 배치만
// 한다 — 그래야 '무엇을 말했는가' 가 테스트 가능한 한 곳에 남는다.
//
// [통지를 표보다 먼저 그린다] 요청과 답이 다른 지점(기간을 걸 수 없었다 등)은 결과를 보기 전에
// 읽혀야 한다. 표 아래 각주로 내리면 관리자는 표를 먼저 믿고 나서 각주를 본다.
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

import { Alert, Empty, visuallyHiddenStyle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { ROW_LIMIT } from '../_shared/execute';
import type { AgentAnswer } from '../_shared/answer';
import { cssVar } from '@tds/ui';

const blockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const summaryStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: cssVar('typography.body.md.font-family'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const mutedStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  border: `thin solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const thStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderBottom: `thin solid ${cssVar('color.border.default')}`,
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderTop: `thin solid ${cssVar('color.border.subtle')}`,
  color: cssVar('color.text.default'),
  whiteSpace: 'nowrap',
};

export function AnswerView({ answer }: { readonly answer: AgentAnswer }) {
  if (answer.kind === 'guidance') {
    return (
      <div style={blockStyle}>
        <p style={summaryStyle}>{answer.headline}</p>
        <p style={mutedStyle}>{answer.detail}</p>
      </div>
    );
  }

  if (answer.kind === 'not-wired') {
    return (
      <div style={blockStyle}>
        <Alert tone="warning">
          {`'${answer.domainLabel}' 은 아직 이 화면에 연결되지 않았어요. 데이터 연동 후 조회할 수 있어요.`}
        </Alert>
      </div>
    );
  }

  if (answer.kind === 'error') {
    return (
      <div style={blockStyle}>
        <Alert tone="danger">{answer.message}</Alert>
      </div>
    );
  }

  const { outcome, notices } = answer;
  const shown = outcome.rows.length;

  return (
    <div style={blockStyle}>
      {notices.map((notice) => (
        <Alert key={notice.code} tone="warning">
          {notice.message}
        </Alert>
      ))}

      <p style={summaryStyle}>
        {outcome.total === 0
          ? `${outcome.domainLabel}에서 조건에 맞는 대상이 없어요.`
          : `${outcome.domainLabel} ${formatNumber(outcome.total)}건을 찾았어요.`}
      </p>
      <p style={mutedStyle}>{`조건 — ${outcome.conditionSummary}`}</p>

      {outcome.total === 0 ? (
        // 조건을 걸어 0건이 된 상태다 — '아직 없음'이 아니라 '필터 결과 없음'으로 말해야 한다
        <Empty label={outcome.domainLabel} hasActiveFilters />
      ) : (
        <>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <caption style={visuallyHiddenStyle}>
                {`${outcome.domainLabel} 조회 결과 — ${outcome.conditionSummary}`}
              </caption>
              <thead>
                <tr>
                  {outcome.columns.map((column) => (
                    <th key={column} scope="col" style={thStyle}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outcome.rows.map((row) => (
                  <tr key={row.id}>
                    {row.cells.map((cell, index) => (
                      <td key={outcome.columns[index] ?? String(index)} style={tdStyle}>
                        {index === 0 && row.href !== null ? (
                          <Link to={row.href}>{cell}</Link>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {outcome.total > shown ? (
            <p style={mutedStyle}>
              {`전체 ${formatNumber(outcome.total)}건 중 ${formatNumber(ROW_LIMIT)}건만 표시했어요. `}
              <Link to={outcome.listUrl}>목록 화면에서 전체 보기</Link>
            </p>
          ) : (
            <p style={mutedStyle}>
              <Link to={outcome.listUrl}>목록 화면에서 보기</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
