// 발송 전 점검 패널 — 오른쪽 [스타일][속성][점검] 중 세 번째
//
// [왜 저장 시점의 오류 메시지만으로 부족한가] zod 가 내는 오류는 '저장을 눌렀을 때' 한 줄로 뜬다.
// 그때 운영자가 알 수 있는 것은 '무언가 잘못됐다' 뿐이고, 그것이 **어느 블록**인지는 캔버스를
// 처음부터 훑어야 안다. 이 패널은 같은 판정(preflight.ts)을 편집 **중에** 계속 보여 주고,
// 지적을 누르면 그 블록을 골라 준다 — 고칠 것과 고칠 자리를 한 번에 잇는다.
//
// [판정을 여기서 하지 않는다] 규칙은 preflight.ts 하나다. 이 파일은 그 결과를 그리기만 한다 —
// 화면이 규칙을 조금이라도 알기 시작하면 저장이 막히는 이유와 화면이 말하는 이유가 갈라진다.
import type { CSSProperties } from 'react';

import { cssVar } from '@tds/ui';
import { Button, StatusBadge } from '../../../../shared/ui';
import { emailPreflight } from './preflight';
import {
  preflightItemStyle,
  preflightListStyle,
  preflightMessageStyle,
  preflightOkStyle,
} from './styles';
import type { EmailTemplateContent } from '../types';

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

interface PreflightPanelProps {
  readonly value: EmailTemplateContent;
  /** 지적이 가리키는 블록을 캔버스에서 고른다. 가리킬 블록이 없는 지적에는 버튼을 내지 않는다 */
  readonly onSelectBlock: (id: string) => void;
}

export function PreflightPanel({ value, onSelectBlock }: PreflightPanelProps) {
  const issues = emailPreflight(value);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return (
    <div>
      <div style={summaryRowStyle}>
        {/* 배지가 색뿐 아니라 **글자로도** 심각도를 말한다 — 색만으로 구분하지 않는다 */}
        <StatusBadge
          tone={errors.length > 0 ? 'danger' : 'success'}
          label={errors.length > 0 ? `발송 불가 ${String(errors.length)}건` : '발송 가능'}
        />
        {warnings.length > 0 && (
          <StatusBadge tone="warning" label={`주의 ${String(warnings.length)}건`} />
        )}
      </div>

      {issues.length === 0 ? (
        <p style={preflightOkStyle}>
          제목·발신 주소·프리헤더·버튼 링크·이미지 대체 텍스트·수신거부 안내를 모두 확인했습니다.
        </p>
      ) : (
        <ul style={preflightListStyle}>
          {issues.map((issue) => {
            /* 콜백 안에서는 `issue.blockId !== null` 좁힘이 유지되지 않는다(속성 좁힘은 함수
               경계를 넘지 못한다) — 지역 상수로 꺼내면 타입이 그대로 따라온다. `!` 는 쓰지 않는다. */
            const { blockId } = issue;
            const blocking = issue.severity === 'error';
            return (
              <li key={`${issue.rule}-${blockId ?? 'content'}`}>
                <div style={preflightItemStyle(blocking)}>
                  <StatusBadge
                    tone={blocking ? 'danger' : 'warning'}
                    label={blocking ? '오류' : '주의'}
                  />
                  <span style={preflightMessageStyle}>{issue.message}</span>
                  {blockId !== null && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onSelectBlock(blockId);
                      }}
                    >
                      해당 블록으로
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
