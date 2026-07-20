// '새 템플릿' 종류 고르기
//
// [왜 목록에서 먼저 묻는가] 이메일과 문자는 편집기가 통째로 다르다(블록 빌더 vs 단일 본문). 편집기에
// 들어간 뒤 종류를 바꾸게 두면 이미 쓴 내용을 버려야 한다 — 되돌릴 것이 가장 많아진 시점에 묻는 셈이다.
// 아직 아무것도 쓰지 않은 지금 묻는 것이 가장 싸다.
import type { CSSProperties } from 'react';

import { Button, Modal } from '../../../../shared/ui';
import { TEMPLATE_KIND_LABEL } from '../types';
import type { TemplateKind } from '../types';
import { cssVar } from '@tds/ui';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

function choiceStyle(): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: cssVar('space.1'),
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.4'),
    paddingBottom: cssVar('space.4'),
    paddingLeft: cssVar('space.4'),
    paddingRight: cssVar('space.4'),
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: cssVar('color.border.default'),
    borderRadius: cssVar('radius.md'),
    background: cssVar('color.surface.default'),
    color: cssVar('color.text.default'),
    textAlign: 'left',
    cursor: 'pointer',
  };
}

const choiceTitleStyle: CSSProperties = {
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const choiceNoteStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const CHOICES: readonly { kind: TemplateKind; note: string }[] = [
  {
    kind: 'text',
    note: '단일 본문 + 이미지 1장. 길이와 이미지에 따라 SMS·LMS·MMS 가 자동으로 결정됩니다.',
  },
  {
    kind: 'email',
    note: '제목과 블록(제목·본문·버튼·이미지)으로 본문을 조립합니다.',
  },
  {
    kind: 'alimtalk',
    note: '정보성 메시지. 카카오 사전 심사(영업일 2일)를 받아야 발송할 수 있고 광고는 넣을 수 없습니다. 본문은 버튼명을 합쳐 1,000자까지.',
  },
  {
    /*
     * 화면에 '친구톡' 이라는 낱말이 남아 있는 이유 — 운영자는 아직 그 이름으로 이 기능을 찾는다.
     * 친구톡은 2025-12-31 종료됐고 지금 발송되는 것은 전부 브랜드 메시지다(kakao.ts 머리말).
     * 이 설명은 '친구톡을 찾으러 온 사람' 에게 그 사실을 알려 주는 자리이기도 하다.
     */
    kind: 'brandmessage',
    note: '광고성 메시지를 보낼 수 있습니다. 사전 심사가 없는 대신 08:00~20:50 에만 발송됩니다. (친구톡은 2025-12-31 종료되어 브랜드 메시지로 대체되었습니다.)',
  },
];

interface NewTemplateKindDialogProps {
  readonly onPick: (kind: TemplateKind) => void;
  readonly onCancel: () => void;
}

export function NewTemplateKindDialog({ onPick, onCancel }: NewTemplateKindDialogProps) {
  return (
    <Modal
      title="새 템플릿 만들기"
      onClose={onCancel}
      footer={
        <Button variant="secondary" size="md" onClick={onCancel}>
          취소
        </Button>
      }
    >
      <div style={listStyle}>
        {CHOICES.map((choice) => (
          <button
            key={choice.kind}
            type="button"
            className="tds-ui-focusable"
            style={choiceStyle()}
            onClick={() => onPick(choice.kind)}
          >
            <span style={choiceTitleStyle}>{TEMPLATE_KIND_LABEL[choice.kind]}</span>
            <span style={choiceNoteStyle}>{choice.note}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
