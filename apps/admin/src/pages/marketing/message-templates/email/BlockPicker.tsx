// 블록 종류 고르기 — + 를 눌렀을 때 뜨는 격자
//
// [목록이 두 벌인 이유] 최상위에서는 모든 종류를 넣을 수 있지만 **컬럼 안**에서는 컨테이너와
// 법적 푸터를 뺀 목록만 내준다(blocks.ts 의 COLUMN_CHILD_KIND_ORDER). 넣게 해 놓고 나중에
// 거부하는 것보다, 처음부터 보여 주지 않는 편이 정직하다.
import { Button, Icon, Modal } from '../../../../shared/ui';
import { BLOCK_KIND_LABEL, BLOCK_KIND_ORDER, COLUMN_CHILD_KIND_ORDER } from './blocks';
import { EMAIL_BLOCK_GROUPS } from './groups';
import type { EmailBlockGroupId } from './groups';
import type { EmailBlockKind } from '../types';
import {
  blockGroupDescriptionStyle,
  blockGroupItemStyle,
  blockGroupLabelStyle,
  blockGroupListStyle,
  blockPickerItemStyle,
  blockPickerStyle,
  pickerSectionStyle,
  pickerSectionTitleStyle,
} from './styles';
import type { ReactNode } from 'react';

/** 종류마다의 글리프 — Record 라서 블록이 늘면 여기서 타입 에러가 난다 */
const GLYPH: Readonly<Record<EmailBlockKind, ReactNode>> = {
  columns: <Icon name="columns" />,
  heading: <Icon name="heading" />,
  text: <Icon name="text" />,
  button: <Icon name="button" />,
  image: <Icon name="image" />,
  video: <Icon name="video" />,
  list: <Icon name="list" />,
  menu: <Icon name="menu" />,
  social: <Icon name="social" />,
  logo: <Icon name="logo" />,
  avatar: <Icon name="avatar" />,
  divider: <Icon name="divider" />,
  spacer: <Icon name="spacer" />,
  footer: <Icon name="footer" />,
};

interface BlockPickerProps {
  readonly open: boolean;
  /** 컬럼 안에 넣는 중인가 — 참이면 컨테이너·푸터를 뺀 목록을 그린다 */
  readonly insideColumn?: boolean;
  /** 이미 법적 푸터가 있는가 — 참이면 푸터를 목록에서 뺀다(한 통에 하나) */
  readonly footerPresent?: boolean;
  readonly onPick: (kind: EmailBlockKind) => void;
  /**
   * 묶음(구성)을 골랐을 때 — 블록 여러 장이 한 번에 들어간다.
   *
   * [왜 onPick 과 나눴나] 넣는 것이 '한 장' 이냐 '여러 장' 이냐가 다르고, 그 차이는 되돌리기 한
   * 단위·선택할 블록 결정까지 갈린다. 같은 콜백에 문자열 두 종류를 흘리면 호출부가 매번 '이건
   * 종류인가 묶음인가' 를 되물어야 한다.
   */
  readonly onPickGroup: (id: EmailBlockGroupId) => void;
  readonly onClose: () => void;
}

export function BlockPicker({
  open,
  insideColumn,
  footerPresent,
  onPick,
  onPickGroup,
  onClose,
}: BlockPickerProps) {
  if (!open) return null;

  const base: readonly EmailBlockKind[] =
    insideColumn === true ? COLUMN_CHILD_KIND_ORDER : BLOCK_KIND_ORDER;
  const kinds = footerPresent === true ? base.filter((kind) => kind !== 'footer') : base;

  return (
    <Modal
      title="블록 추가"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
      }
    >
      <h3 style={pickerSectionTitleStyle}>블록 종류</h3>
      <div style={blockPickerStyle}>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            style={blockPickerItemStyle}
            onClick={() => {
              onPick(kind);
            }}
          >
            {GLYPH[kind]}
            {BLOCK_KIND_LABEL[kind]}
          </button>
        ))}
      </div>

      {/* [왜 칸 안에서는 구성을 내주지 않나] 묶음은 전부 **다단 행**으로 시작한다. 칸 안에는
          컨테이너를 넣을 수 없으므로(types.ts EmailLeafBlock) 여기서 고르면 넣을 수 없는 것을
          고르게 된다 — 넣게 해 놓고 거부하는 것보다 보여 주지 않는 편이 정직하다. */}
      {insideColumn !== true && (
        <div style={pickerSectionStyle}>
          <h3 style={pickerSectionTitleStyle}>구성 — 여러 블록을 한 번에</h3>
          <div style={blockGroupListStyle}>
            {EMAIL_BLOCK_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                style={blockGroupItemStyle}
                onClick={() => {
                  onPickGroup(group.id);
                }}
              >
                <span style={blockGroupLabelStyle}>{group.label}</span>
                <span style={blockGroupDescriptionStyle}>{group.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
