// 카드 3 — 현재 등급 분포 (읽기 전용, A40 소유)
//
// 지금 화면에 입력된 정책으로 회원이 어떻게 나뉘는지 보여준다. **저장 전 미리보기**다 —
// 정책(승급 조건·강등 허용)을 고치면 계산이 즉시 다시 돈다(distribution.ts, 순수 함수).
//
// 계산 근거는 shared/fixtures/members 의 회원 데이터다(import 만 — 수정하지 않는다).
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Alert,
  Card,
  CardTitle,
  hintStyle,
  numericCellStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { directionParticle, formatNumber, formatSignedNumber } from '../../../shared/format';
import { TIER_LABEL } from '../../../shared/domain/member';
import type { Distribution } from '../distribution';
import { TIER_ORDER } from '../types';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const tierCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const numericHeadStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right',
};

const summaryStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyleType: 'none',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const strongStyle: CSSProperties = {
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  fontVariantNumeric: 'tabular-nums',
};

/** 변화량 문구 — 부호를 문자로 함께 전달한다(색만으로 의미를 나르지 않는다) */
function deltaText(delta: number): string {
  return delta === 0 ? '변화 없음' : `${formatSignedNumber(delta)}명`;
}

function movementSentences(distribution: Distribution): readonly string[] {
  const sentences: string[] = [];

  for (const tier of TIER_ORDER) {
    const promoted = distribution.promotedInto[tier];
    if (promoted > 0) {
      sentences.push(
        `저장하면 ${formatNumber(promoted)}명이 ${TIER_LABEL[tier]}${directionParticle(TIER_LABEL[tier])} 승급됩니다.`,
      );
    }
  }

  for (const tier of TIER_ORDER) {
    const demoted = distribution.demotedInto[tier];
    if (demoted > 0) {
      sentences.push(
        `저장하면 ${formatNumber(demoted)}명이 ${TIER_LABEL[tier]}${directionParticle(TIER_LABEL[tier])} 강등됩니다.`,
      );
    }
  }

  if (sentences.length === 0) {
    sentences.push('저장해도 등급이 바뀌는 회원은 없습니다.');
  }
  return sentences;
}

interface TierDistributionCardProps {
  /** null = 정책 값이 올바르지 않아 계산할 수 없다 (모델이 에러를 들고 있는 상태) */
  readonly distribution: Distribution | null;
  readonly allowDemotion: boolean;
}

export function TierDistributionCard({ distribution, allowDemotion }: TierDistributionCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;

  return (
    <Card aria-labelledby={titleId}>
      <CardTitle id={titleId}>현재 등급 분포</CardTitle>

      <div style={bodyStyle}>
        <Alert tone="info">
          아직 저장되지 않은 <strong>미리보기</strong>입니다. 아래 숫자는 지금 입력한 정책을
          적용했을 때의 예상값이며, 저장하기 전에는 회원 등급이 바뀌지 않습니다.
        </Alert>

        {distribution === null ? (
          <p style={hintStyle}>
            승급 조건 또는 할인율 값이 올바르지 않아 미리보기를 계산할 수 없습니다. 위 표의 입력값을
            확인해 주세요.
          </p>
        ) : (
          <>
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <caption style={visuallyHiddenStyle}>
                  {`전체 회원 ${formatNumber(distribution.total)}명의 등급 분포 — 현재 인원과 이 정책을 저장했을 때의 예상 인원, 그리고 변화량`}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={thStyle}>
                      등급
                    </th>
                    <th scope="col" style={numericHeadStyle}>
                      현재
                    </th>
                    <th scope="col" style={numericHeadStyle}>
                      저장 후 (예상)
                    </th>
                    <th scope="col" style={numericHeadStyle}>
                      변화
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.rows.map((row) => (
                    <tr key={row.tier}>
                      <th scope="row" style={tierCellStyle}>
                        {TIER_LABEL[row.tier]}
                      </th>
                      <td style={numericCellStyle}>{`${formatNumber(row.current)}명`}</td>
                      <td style={numericCellStyle}>{`${formatNumber(row.projected)}명`}</td>
                      <td style={numericCellStyle}>{deltaText(row.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 정책을 고치면 이 문구가 즉시 다시 계산된다 — role 없이 status 로 읽히게 aria-live 를 준다 */}
            <ul style={summaryStyle} aria-live="polite">
              {movementSentences(distribution).map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
              <li>
                <span style={strongStyle}>{`승급 ${formatNumber(distribution.promoted)}명`}</span>
                {' · '}
                <span style={strongStyle}>{`강등 ${formatNumber(distribution.demoted)}명`}</span>
                {` / 전체 ${formatNumber(distribution.total)}명`}
              </li>
            </ul>

            <p style={hintStyle}>
              {allowDemotion
                ? '강등 허용이 켜져 있어, 조건에 미달하는 회원은 등급이 내려간 것으로 계산했습니다.'
                : '강등 허용이 꺼져 있어, 조건에 미달해도 현재 등급을 유지하는 것으로 계산했습니다.'}
              {
                ' 집계 기간은 백엔드 집계에 반영되는 값이라, 이 미리보기는 회원의 누적 구매금액 총액을 그대로 사용합니다.'
              }
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
