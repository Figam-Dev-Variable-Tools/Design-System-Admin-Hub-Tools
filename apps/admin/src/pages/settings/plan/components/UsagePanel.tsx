// 이용현황 탭 — 무엇을 계약했고, 그래서 무엇이 열려 있는가
//
// [이 탭이 답하는 질문] 잠금을 만난 운영자가 여기로 온다. 답은 둘이다:
//   ① 지금 무슨 플랜인가            → 현재 플랜 카드
//   ② 그래서 무엇이 열리고 무엇이 잠겼나 → 포함 기능 표
//
// [숨김 모듈은 목록에도 없다] 판매하지 않는 모듈(absent)은 행 자체를 그리지 않는다. 살 수 없는 것을
// 표에 올리면 그것이 곧 티저이고, 운영자는 결제 페이지를 뒤지다 아무것도 찾지 못한다.
//
// [값의 형태 3종을 표가 드러낸다 — '종류' 열]
// 카탈로그(shared/entitlements/plan.ts MODULE_SPECS)의 값은 세 형태다:
//   switch(켬/끔) — 대부분. 티어에 없으면 잠긴다.
//   quota(한도)   — 상품 관리 하나. **잠기지 않는다**: 한도를 넘겨도 화면은 열리고 신규 등록만
//                   막힌다(quotaCreateBlock). '201/200' 은 다운그레이드 직후 정상인 상태다.
//   level(수준)   — 고급 통계 하나. 'none' 이면 잠금, 아니면 기본/고급 수준으로 열린다.
// 셋을 한 낱말('포함')로 뭉치면 '포함인데 왜 등록이 안 되죠?'(쿼터 소진)를 화면이 설명하지 못한다.
// 그래서 종류를 열로 세운다 — 어느 모듈이 어느 형태인지는 카탈로그가 정하고 화면은 읽기만 한다.
import type { CSSProperties } from 'react';

import {
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  hintStyle,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../../shared/ui';
import type { StatusTone } from '../../../../shared/ui';
import { planQuotaStatus } from '../../../../shared/entitlements/entitlement-store';
import {
  LEVEL_LABEL,
  MODULE_SPECS,
  PLAN_PORTAL_URL,
  PLAN_TIER_LABEL,
  formatPlanDate,
  entitlementStateOf,
  resolveEntitlement,
} from '../../../../shared/entitlements/plan';
import type { EntitlementKey, PlanState } from '../../../../shared/entitlements/plan';
import { panelStyle, rowHeaderStyle, stackStyle, tableScrollStyle } from '../styles';

const PANEL_DESCRIPTION =
  '지금 계약된 플랜과 그 플랜에 포함된 기능이에요. 플랜 변경·결제는 사내 홈페이지에서 진행해요.';

/** 값의 형태를 사람의 말로 — 낱말의 정본은 여기 한 벌이다 */
const KIND_LABEL: Readonly<Record<'switch' | 'quota' | 'level', string>> = {
  switch: '포함 여부',
  quota: '한도',
  level: '수준',
};

/** 종류 칸 — 두 글자짜리 낱말이 줄바꿈으로 갈리지 않게 한다 */
const kindCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

/** 사용량 칸 — '180/200' 의 자릿수가 행마다 흔들리지 않게 고정폭 숫자를 쓴다 */
const detailCellStyle: CSSProperties = { ...tdStyle, fontVariantNumeric: 'tabular-nums' };

interface ModuleRow {
  readonly key: EntitlementKey;
  readonly label: string;
  readonly description: string;
  readonly kind: string;
  readonly tone: StatusTone;
  readonly status: string;
  /** 쿼터 사용량·수준처럼 '얼마나' 를 말하는 값. 말할 것이 없으면 빈 문자열 */
  readonly detail: string;
}

/**
 * 값의 형태(switch·quota·level)를 사람의 말로 옮긴다.
 *
 * 쿼터는 **숫자로만** 말한다 — '201/200' 은 다운그레이드 직후 정상적으로 존재하는 상태이고,
 * 어느 항목이 초과분인지는 앱이 임의로 정하지 않는다(정하면 그 순간 앱이 데이터를 판결한다).
 */
function moduleDetail(plan: PlanState, key: EntitlementKey): string {
  const value = resolveEntitlement(plan, key);
  if (value === undefined) return '';

  if (value.kind === 'quota') {
    const status = planQuotaStatus(plan, key);
    return status === null ? '' : status.text;
  }
  if (value.kind === 'level') {
    return `${LEVEL_LABEL[value.level] ?? value.level} 수준`;
  }
  return '';
}

function toRows(plan: PlanState): readonly ModuleRow[] {
  const rows: ModuleRow[] = [];

  for (const spec of MODULE_SPECS) {
    const state = entitlementStateOf(plan, spec.key);
    // 판매하지 않는 모듈 — 목록에도 올리지 않는다(위 머리말)
    if (state.kind === 'absent') continue;

    rows.push({
      key: spec.key,
      label: spec.label,
      description: spec.description,
      kind: KIND_LABEL[spec.kind],
      tone: state.kind === 'granted' ? 'success' : 'neutral',
      status: state.kind === 'granted' ? '포함' : `${PLAN_TIER_LABEL[state.upgradeTo]} 플랜부터`,
      detail: state.kind === 'granted' ? moduleDetail(plan, spec.key) : '',
    });
  }

  return rows;
}

export function UsagePanel({ plan }: { readonly plan: PlanState }) {
  const rows = toRows(plan);

  return (
    <div style={panelStyle}>
      <Card aria-labelledby="plan-current">
        <CardTitle id="plan-current" action={<StatusBadge tone="info" label={plan.planLabel} />}>
          현재 플랜
        </CardTitle>
        <p style={hintStyle}>{PANEL_DESCRIPTION}</p>

        <dl style={dlStyle}>
          <dt style={dtStyle}>플랜 등급</dt>
          <dd style={ddStyle}>{PLAN_TIER_LABEL[plan.tier]}</dd>

          <dt style={dtStyle}>변경 적용 예정</dt>
          <dd style={ddStyle}>
            {plan.effectiveAt === null ? '없음' : formatPlanDate(new Date(plan.effectiveAt))}
          </dd>
        </dl>

        <p style={hintStyle}>
          플랜을 바꾸려면{' '}
          <a
            href={PLAN_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tds-ui-link tds-ui-focusable"
          >
            사내 홈페이지의 요금제 안내
          </a>
          에서 진행해 주세요. 이 화면에서는 바꿀 수 없어요.
        </p>
      </Card>

      <Card aria-labelledby="plan-modules">
        <CardTitle id="plan-modules">포함 기능</CardTitle>
        <div style={stackStyle}>
          <p style={hintStyle}>
            잠긴 기능은 메뉴에 남아 있고, 들어가면 어떤 플랜에서 열리는지 안내해요. 잠금은 이미 쌓인
            데이터를 지우지 않아요.
          </p>
          <p style={hintStyle}>
            <strong>한도</strong> 종은 잠기지 않아요 — 한도를 넘겨도 화면은 그대로 열리고 신규
            등록만 막혀요. 이미 등록한 것을 지우지 않으므로 한도를 넘긴 숫자가 그대로 보일 수
            있어요.
          </p>

          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <caption style={hintStyle}>
                플랜에 포함된 기능과 사용량 — 팔지 않는 모듈은 목록에 올리지 않아요.
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>
                    기능
                  </th>
                  <th scope="col" style={thStyle}>
                    종류
                  </th>
                  <th scope="col" style={thStyle}>
                    상태
                  </th>
                  <th scope="col" style={thStyle}>
                    사용량 · 수준
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" style={rowHeaderStyle}>
                      {row.label}
                      <span style={hintStyle}> — {row.description}</span>
                    </th>
                    <td style={kindCellStyle}>{row.kind}</td>
                    <td style={tdStyle}>
                      <StatusBadge tone={row.tone} label={row.status} />
                    </td>
                    <td style={detailCellStyle}>{row.detail === '' ? '—' : row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
