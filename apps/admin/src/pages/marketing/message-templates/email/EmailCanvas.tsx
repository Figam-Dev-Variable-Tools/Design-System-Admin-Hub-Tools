// 가운데 캔버스 — 발신 설정 카드 + 블록 스택
//
// [편집/미리보기의 차이는 '무엇을 감추는가' 다] 미리보기는 발신 카드를 두 줄로 접고, 블록의 선택
// 윤곽과 + 손잡이를 감춘다. 블록 자체의 렌더는 두 모드가 **완전히 같다** — 미리보기가 다른 코드로
// 그리면 '편집에서 보던 것' 과 '보낼 것' 이 갈라진다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, FormField, SelectField, TextField } from '@tds/ui';
import { Button } from '../../../../shared/ui';
import { BlockView } from './BlockView';
import { BLOCK_KIND_LABEL } from './blocks';
import type { EmailBlock, EmailTemplateContent, SenderProfile } from '../types';
import {
  blockInsertHandleStyle,
  blockOutlineStyle,
  blockRemoveHandleStyle,
  blockSelectOverlayStyle,
  blockStackStyle,
  columnAddButtonStyle,
  emptyColumnStyle,
  canvasScrollStyle,
  CANVAS_WIDTH_DESKTOP,
  CANVAS_WIDTH_MOBILE,
  emptyStackStyle,
  roundAddButtonStyle,
  senderCardStyle,
  senderReadonlyLabelStyle,
  senderReadonlyRowStyle,
  senderReadonlySubjectStyle,
  senderReadonlyValueStyle,
} from './styles';
import type { DeviceMode, EditorTab } from './EmailToolbar';

/** 미리보기의 발신 줄 — 발신 프로필을 아직 고르지 않았을 때 자리를 지키는 예시 */
const DEFAULT_FROM_LABEL = '기본 발신 프로필 (abc@gmail.com)';

const plusGlyphStyle: CSSProperties = {
  fontSize: 'var(--tds-typography-title-md-font-size)',
  lineHeight: 1,
};

interface EmailCanvasProps {
  readonly value: EmailTemplateContent;
  readonly tab: EditorTab;
  readonly device: DeviceMode;
  readonly senderProfiles: readonly SenderProfile[];
  readonly senderProfileId: string;
  readonly selectedBlockId: string | null;
  readonly disabled?: boolean;
  readonly onSelectBlock: (id: string) => void;
  readonly onRequestInsert: (afterId: string | null) => void;
  /** 빈 칸의 + — 그 칸 안에 넣는다 */
  readonly onRequestInsertInColumn: (columnId: string) => void;
  readonly onRemoveBlock: (id: string) => void;
  readonly onSenderProfileChange: (id: string) => void;
  readonly onSenderEmailChange: (email: string) => void;
  readonly onSubjectChange: (subject: string) => void;
}

export function EmailCanvas({
  value,
  tab,
  device,
  senderProfiles,
  senderProfileId,
  selectedBlockId,
  disabled,
  onSelectBlock,
  onRequestInsert,
  onRequestInsertInColumn,
  onRemoveBlock,
  onSenderProfileChange,
  onSenderEmailChange,
  onSubjectChange,
}: EmailCanvasProps) {
  const fieldId = useId();
  const locked = disabled === true;
  const editing = tab === 'edit';

  const profile = senderProfiles.find((item) => item.id === senderProfileId);
  const emails = profile?.emails ?? [];

  /**
   * 블록 하나를 '고를 수 있게' 그린다.
   *
   * 시각 표현(div) 과 클릭을 받는 투명 버튼이 **형제**다 — 버튼 안에 버튼이 생기지 않게 하기
   * 위해서다(styles.ts 의 blockSelectOverlayStyle 머리말에 이유를 적어 두었다).
   * 컬럼이면 칸 안의 블록을 같은 함수로 한 겹 더 그린다(깊이는 최대 2다).
   */
  function renderSelectable(block: EmailBlock, nested: boolean) {
    const active = block.id === selectedBlockId;
    const isColumns = block.blockKind === 'columns';
    // 법적 푸터는 지울 수 없다 — 지우기 버튼 자체를 내지 않는다(정보통신망법 제50조, types.ts)
    const deletable = block.blockKind !== 'footer';

    return (
      <div key={block.id} style={{ position: 'relative' }}>
        <div style={blockOutlineStyle(active, nested)}>
          <BlockView
            block={block}
            canvasFontFamily={value.canvas.fontFamily}
            canvasTextColor={value.canvas.textColor}
            {...(isColumns
              ? {
                  renderChild: (child) => renderSelectable(child, true),
                  // 빈 칸의 + — 칸 **안에** 그려야 3단일 때 자리표시도 3개가 나란히 선다
                  renderEmptyColumn: (columnId: string, columnIndex: number) => {
                    const columnLabel = `${String(columnIndex + 1)}번째`;
                    return (
                      <div key={columnId} style={emptyColumnStyle}>
                        <button
                          type="button"
                          style={columnAddButtonStyle}
                          aria-label={`${columnLabel} 칸에 블록 추가`}
                          disabled={locked}
                          onClick={() => {
                            onRequestInsertInColumn(columnId);
                          }}
                        >
                          <span style={plusGlyphStyle} aria-hidden="true">
                            +
                          </span>
                        </button>
                      </div>
                    );
                  },
                }
              : {})}
          />
        </div>

        <button
          type="button"
          style={blockSelectOverlayStyle(nested)}
          aria-pressed={active}
          aria-label={`${BLOCK_KIND_LABEL[block.blockKind]} 블록 선택`}
          disabled={locked}
          onClick={() => {
            onSelectBlock(block.id);
          }}
        />

        {active && (
          <>
            {deletable && (
              /* 지우기 — 선택된 블록의 오른쪽 위 모서리에 뜬다 */
              <div style={blockRemoveHandleStyle}>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={locked}
                  onClick={() => {
                    onRemoveBlock(block.id);
                  }}
                >
                  삭제
                </Button>
              </div>
            )}

            <div style={blockInsertHandleStyle}>
              <button
                type="button"
                style={roundAddButtonStyle()}
                aria-label={`${BLOCK_KIND_LABEL[block.blockKind]} 블록 뒤에 추가`}
                disabled={locked}
                onClick={() => {
                  onRequestInsert(block.id);
                }}
              >
                <span style={plusGlyphStyle} aria-hidden="true">
                  +
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  /** 캔버스 바깥 배경은 **데이터**(운영자가 STYLE 에서 고른 backdrop)다 */
  const scrollStyle: CSSProperties = {
    ...canvasScrollStyle,
    background: value.canvas.backdropColor,
  };

  /** 캔버스 자체 — 폭은 기기 전환이, 색·테두리·라운드·폰트는 데이터가 정한다 */
  const sheetStyle: CSSProperties = {
    ...blockStackStyle,
    maxWidth: device === 'mobile' ? CANVAS_WIDTH_MOBILE : CANVAS_WIDTH_DESKTOP,
    background: value.canvas.canvasColor,
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: value.canvas.canvasBorderColor,
    borderRadius: value.canvas.canvasBorderRadius,
    color: value.canvas.textColor,
    fontFamily: value.canvas.fontFamily,
  };

  return (
    <div style={scrollStyle}>
      {/* ── 발신 설정 ─────────────────────────────────────────────────── */}
      <div
        style={{
          ...senderCardStyle,
          maxWidth: device === 'mobile' ? CANVAS_WIDTH_MOBILE : CANVAS_WIDTH_DESKTOP,
        }}
      >
        {editing ? (
          <>
            <FormField htmlFor={`${fieldId}-profile`} label="발신 프로필" required>
              <SelectField
                id={`${fieldId}-profile`}
                value={senderProfileId}
                disabled={locked}
                onChange={(event) => {
                  onSenderProfileChange(event.target.value);
                }}
              >
                <option value="">발신 프로필을 선택하세요</option>
                {senderProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField htmlFor={`${fieldId}-from`} label="발신 주소" required>
              <SelectField
                id={`${fieldId}-from`}
                value={value.senderEmail}
                disabled={locked}
                onChange={(event) => {
                  onSenderEmailChange(event.target.value);
                }}
              >
                <option value="">발신 주소를 선택하세요</option>
                {emails.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <TextField
              id={`${fieldId}-subject`}
              label="제목"
              required
              placeholder="제목을 입력하세요"
              value={value.subject}
              disabled={locked}
              onChange={(event) => {
                onSubjectChange(event.target.value);
              }}
            />
          </>
        ) : (
          <>
            <div style={senderReadonlyRowStyle}>
              <span style={senderReadonlyLabelStyle}>발신</span>
              <span style={senderReadonlyValueStyle}>
                {profile === undefined
                  ? DEFAULT_FROM_LABEL
                  : `${profile.name} (${value.senderEmail})`}
              </span>
            </div>
            <div style={senderReadonlyRowStyle}>
              <span style={senderReadonlyLabelStyle}>제목</span>
              <span style={senderReadonlySubjectStyle}>{value.subject}</span>
            </div>
          </>
        )}
      </div>

      {/* ── 블록 스택 ─────────────────────────────────────────────────── */}
      <div style={sheetStyle}>
        {value.blocks.length === 0 ? (
          <div style={emptyStackStyle}>
            {editing && (
              <button
                type="button"
                style={roundAddButtonStyle(true)}
                aria-label="블록 추가"
                disabled={locked}
                onClick={() => {
                  onRequestInsert(null);
                }}
              >
                <span style={plusGlyphStyle} aria-hidden="true">
                  +
                </span>
              </button>
            )}
          </div>
        ) : (
          value.blocks.map((block: EmailBlock) => {
            if (!editing) {
              return (
                <div key={block.id}>
                  <BlockView
                    block={block}
                    canvasFontFamily={value.canvas.fontFamily}
                    canvasTextColor={value.canvas.textColor}
                  />
                </div>
              );
            }
            return renderSelectable(block, false);
          })
        )}
      </div>
    </div>
  );
}
