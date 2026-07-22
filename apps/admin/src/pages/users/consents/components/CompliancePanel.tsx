// 재동의 대상 · 파기 대상 (라우트: /users/consents)
//
// [두 숫자 다 저장하지 않는다] 이력 + 항목 정의 + 시행 중 약관 버전에서 매번 계산한다. 저장하면
// 이력과 갈라지고, 갈라진 날 어느 쪽이 사실인지 아무도 모른다(rules.ts 머리말).
//
// [모르는 것을 0으로 그리지 않는다] 약관 조회기가 배선되지 않으면 '재동의 대상 0명' 이 아니라
// **판정할 수 없다는 사실**을 말한다. 0명이라고 적으면 운영자는 개정 공지를 보내지 않는다 —
// 배선 사고가 법적 사고로 번지는 경로다.
//
// [파기 버튼이 없는 이유] 실제 삭제는 원장·백업까지 함께 다뤄야 하는 서버의 일이다
// (TODO(backend)). 여기서 정확히 할 수 있는 일은 '무엇이 기한을 넘겼는지 세어 보여 주는 것' 이고,
// 할 수 없는 일을 버튼으로 만들지 않는다.
import type { CSSProperties } from 'react';

import { cssVar, StatusBadge } from '@tds/ui';

import { formatNumber } from '../../../../shared/format';
import {
  Alert,
  Card,
  CardTitle,
  hintStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../../shared/ui';
import { activeTermsVersions } from '../../../../shared/domain/terms-version';
import { purgeTargets, reconsentTargets } from '../rules';
import type { ConsentEvent, ConsentItemDef } from '../types';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const scrollStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const groupHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: cssVar('space.4'),
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

interface CompliancePanelProps {
  readonly items: readonly ConsentItemDef[];
  readonly events: readonly ConsentEvent[];
  /** 'YYYY-MM-DD' — '오늘' 을 주입받는다(테스트가 오늘을 고정할 수 있어야 한다) */
  readonly today: string;
}

export function CompliancePanel({ items, events, today }: CompliancePanelProps) {
  const report = reconsentTargets(events, items, activeTermsVersions());
  const purge = purgeTargets(events, items, today);

  return (
    <div style={columnStyle}>
      <Card>
        <CardTitle>재동의 대상</CardTitle>
        <p style={hintStyle}>
          지금 시행 중인 약관 버전과 <strong>다른 버전</strong>에 동의한 채로 남아 있는
          이용자입니다. 철회한 이용자는 대상에 넣지 않습니다 — 개정을 이유로 다시 권유하는 것은 철회
          의사를 무시하는 재권유입니다.
        </p>

        {report === null ? (
          <Alert tone="warning">
            시행 중인 약관 버전을 확인할 수 없어 재동의 대상을 <strong>판정하지 못했습니다</strong>.
            대상이 없다는 뜻이 아닙니다 — 약관 관리 연동을 확인해 주세요.
          </Alert>
        ) : (
          <>
            {report.unresolvedItems.length > 0 && (
              <Alert tone="warning">
                시행 중인 버전을 찾지 못한 항목이 있어 그 항목은 판정에서 빠졌습니다:{' '}
                {report.unresolvedItems.join(' · ')}
              </Alert>
            )}

            {report.groups.length === 0 ? (
              <p style={hintStyle}>모든 동의가 시행 중인 버전 기준입니다.</p>
            ) : (
              report.groups.map((group) => (
                <div key={group.item.id}>
                  <p style={groupHeadStyle}>
                    {group.item.label}
                    <StatusBadge tone="info" label={`시행 ${group.version}`} />
                    <StatusBadge
                      tone="warning"
                      label={`${formatNumber(group.subjects.length)}명`}
                    />
                  </p>
                  <div style={scrollStyle}>
                    <table style={tableStyle}>
                      <caption style={hintStyle}>
                        {group.item.label} — {group.effectiveDate} 시행 {group.version} 기준 재동의
                        대상
                      </caption>
                      <thead>
                        <tr>
                          <th style={thStyle} scope="col">
                            대상
                          </th>
                          <th style={thStyle} scope="col">
                            동의한 버전
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.subjects.map((subject) => (
                          <tr key={`${subject.subjectId}-${subject.itemId}`}>
                            <td style={tdStyle}>{subject.subjectLabel}</td>
                            <td style={tdStyle}>{subject.termsVersion ?? '기록 없음'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </Card>

      <Card>
        <CardTitle>보관 기간 경과 (파기 대상)</CardTitle>
        <p style={hintStyle}>
          철회한 뒤 항목별 보관 기간이 지난 이력입니다. 이 화면은 <strong>세어 보여 줄 뿐</strong>
          &nbsp;지우지 않습니다 — 실제 파기는 백업까지 함께 다뤄야 하는 서버의 일입니다.
        </p>

        {purge.length === 0 ? (
          <p style={hintStyle}>보관 기간이 지난 이력이 없습니다.</p>
        ) : (
          <div style={scrollStyle}>
            <table style={tableStyle}>
              <caption style={hintStyle}>
                파기 대상 {formatNumber(purge.length)}건 (기준일 {today})
              </caption>
              <thead>
                <tr>
                  <th style={thStyle} scope="col">
                    대상
                  </th>
                  <th style={thStyle} scope="col">
                    항목
                  </th>
                  <th style={thStyle} scope="col">
                    철회일
                  </th>
                  <th style={thStyle} scope="col">
                    파기 가능일
                  </th>
                  <th style={thStyle} scope="col">
                    함께 사라지는 이력
                  </th>
                </tr>
              </thead>
              <tbody>
                {purge.map((target) => (
                  <tr key={`${target.subjectId}-${target.item.id}`}>
                    <td style={tdStyle}>{target.subjectLabel}</td>
                    <td style={tdStyle}>{target.item.label}</td>
                    <td style={tdStyle}>{target.withdrawnOn}</td>
                    <td style={tdStyle}>{target.purgeableFrom}</td>
                    <td style={tdStyle}>{formatNumber(target.eventCount)}줄</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
