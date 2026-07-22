// 동의 항목 정의 — 필수/선택을 정하는 유일한 자리 (라우트: /users/consents)
//
// [이 카드가 강제하는 것] 선택 항목은 선택으로 남는다. 마케팅·선택 개인정보·제3자 제공은
// 토글이 아예 잠겨 있고, **왜 잠겼는지를 그 자리에서 말한다** — 잠긴 채 이유가 없으면 운영자는
// 고장으로 읽고 다른 경로를 찾는다.
//
// [같은 술어를 둘이 읽는다] 토글의 disabled 와 저장의 거절은 rules.ts 의 같은 함수를 본다
// (necessityChangeBlock · itemsSaveBlock). 판단이 두 벌이면 언젠가 버튼은 눌리는데 저장이 막힌다.
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, StatusBadge, ToggleSwitch } from '@tds/ui';

import { Alert, Button, Card, CardTitle, hintStyle } from '../../../../shared/ui';
import { itemsSaveBlock, necessityChangeBlock } from '../rules';
import { CONSENT_PURPOSE_LABEL, NECESSITY_LABEL, necessityTone } from '../types';
import type { ConsentItemDef, ConsentNecessity } from '../types';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: 0,
  paddingRight: 0,
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.subtle'),
};

const infoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const controlStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: cssVar('space.2'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const lockNoteStyle: CSSProperties = {
  ...hintStyle,
  maxWidth: `calc(${cssVar('space.10')} * 6)`,
  textAlign: 'right',
};

interface ConsentItemsCardProps {
  readonly items: readonly ConsentItemDef[];
  readonly canUpdate: boolean;
  readonly saving: boolean;
  readonly onSave: (items: readonly ConsentItemDef[]) => void;
}

/** 저장 전 초안 — 서버 값이 바뀌면(재조회) 초안도 그 위에서 다시 시작한다 */
function draftKeyOf(items: readonly ConsentItemDef[]): string {
  return items.map((item) => `${item.id}:${item.necessity}`).join('|');
}

export function ConsentItemsCard({ items, canUpdate, saving, onSave }: ConsentItemsCardProps) {
  const serverKey = draftKeyOf(items);
  const [draft, setDraft] = useState<readonly ConsentItemDef[]>(items);
  const [baseline, setBaseline] = useState(serverKey);
  const [rejected, setRejected] = useState<string | null>(null);

  // 재조회로 서버 값이 바뀌면 초안을 그 위에서 다시 시작한다 (렌더 중 동기화 — useEffect 불필요)
  if (baseline !== serverKey) {
    setBaseline(serverKey);
    setDraft(items);
    setRejected(null);
  }

  const dirty = draftKeyOf(draft) !== serverKey;

  const toggle = (item: ConsentItemDef, next: ConsentNecessity) => {
    const block = necessityChangeBlock(item, next);
    if (block !== null) {
      // 잠긴 토글은 애초에 눌리지 않지만, 거절의 책임은 화면이 아니라 규칙이 진다
      setRejected(block);
      return;
    }
    setRejected(null);
    setDraft((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, necessity: next } : entry)),
    );
  };

  const submit = () => {
    const block = itemsSaveBlock(draft);
    if (block !== null) {
      setRejected(block);
      return;
    }
    setRejected(null);
    onSave(draft);
  };

  return (
    <Card>
      <CardTitle>동의 항목</CardTitle>

      <p style={hintStyle}>
        각 항목은 가입 화면에서 <strong>구분해</strong> 안내하고 따로 동의를 받습니다. 선택 항목에
        동의하지 않아도 가입은 완료되어야 합니다.
      </p>

      {rejected !== null && <Alert tone="danger">{rejected}</Alert>}
      {!canUpdate && <Alert tone="info">조회 권한만 있어 동의 항목을 변경할 수 없습니다.</Alert>}

      <div style={listStyle}>
        {draft.map((item) => {
          const lockReason = necessityChangeBlock(item, 'required');
          const locked = lockReason !== null;

          return (
            <div key={item.id} style={rowStyle}>
              <div style={infoStyle}>
                <span style={titleRowStyle}>
                  <span style={labelStyle}>{item.label}</span>
                  <StatusBadge
                    tone={necessityTone(item.necessity)}
                    label={NECESSITY_LABEL[item.necessity]}
                  />
                  <StatusBadge tone="neutral" label={CONSENT_PURPOSE_LABEL[item.purpose]} />
                </span>
                <span style={hintStyle}>{item.description}</span>
                <span style={hintStyle}>
                  보관 기간 {item.retentionMonths}개월 ·{' '}
                  {item.termsTypeId === null
                    ? '연결된 약관 문서 없음'
                    : `약관 종류 ‘${item.termsTypeId}’ 의 시행 중 버전을 함께 기록`}
                </span>
              </div>

              <div style={controlStyle}>
                <ToggleSwitch
                  checked={item.necessity === 'required'}
                  label={`${item.label} 필수 여부`}
                  onLabel="필수"
                  offLabel="선택"
                  disabled={!canUpdate || saving || locked}
                  onChange={(next) => {
                    toggle(item, next ? 'required' : 'optional');
                  }}
                />
                {locked && <span style={lockNoteStyle}>{lockReason}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 — 눌러 보고 거절당하는 자리를 만들지 않는다 (EXC-03) */}
      {canUpdate && (
        <div style={actionsStyle}>
          <p style={hintStyle}>
            {saving
              ? '저장하는 중입니다…'
              : dirty
                ? '저장하지 않은 변경 사항이 있습니다.'
                : '변경 사항이 없습니다.'}
          </p>
          <Button variant="primary" size="md" disabled={!dirty || saving} onClick={submit}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </div>
      )}
    </Card>
  );
}
