// 이메일 블록 빌더 — [프리셋 레일][캔버스][속성 패널]
//
// [이 컴포넌트가 소유하지 않는 것] 서버 상태도, 라우팅도, 저장도 갖지 않는다. 값은 value 로 받고
// 바뀌면 onChange 로 돌려줄 뿐이다 — 이 화면을 어디에 얹을지(등록/수정/미리보기)는 셸이 정한다.
//
// [그럼 무엇을 소유하나] **편집 중에만 의미가 있는 것**만 갖는다: 어떤 블록이 선택됐는지, 어느 탭을
// 보고 있는지, 사이드가 접혔는지, 그리고 되돌리기 이력. 이것들을 부모로 올리면 빌더를 쓰는 모든
// 화면이 편집기의 내부 사정을 알아야 한다.
//
// [되돌리기의 경계] 값을 바꾸는 모든 경로는 commit() 을 지난다(useHistory). 선택·탭 전환처럼
// **값이 아닌 것**은 이력에 쌓지 않는다 — 되돌리기를 눌렀는데 커서만 움직이면 그것은 고장이다.
import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Card } from '../../../../shared/ui';
import { moveArrayItem, Tabs } from '@tds/ui';
import { activeCaretRange, insertAtCaret } from '../../_shared/caret';
import { BlockPicker } from './BlockPicker';
import {
  blockPositionOf,
  createBlock,
  createLeafBlock,
  findBlockById,
  insertBlockAfter,
  insertBlockInColumn,
  insertBlocksAfter,
  isColumnChildKind,
  moveBlock,
  removeBlock,
  replaceBlock,
  withColumnPadding,
} from './blocks';
import { findBlockGroup } from './groups';
import type { EmailBlockGroupId } from './groups';
import { PreflightPanel } from './PreflightPanel';
import { EmailCanvas } from './EmailCanvas';
import { EmailToolbar } from './EmailToolbar';
import type { DeviceMode, EditorTab } from './EmailToolbar';
import { InspectPanel, inspectHeadingOf } from './InspectPanel';
import { DEFAULT_PRESET_ID, findPreset } from './presets';
import type { PresetId } from './presets';
import { PresetRail } from './PresetRail';
import { StylePanel } from './StylePanel';
import { builderGridStyle, columnStyle, panelEmptyStyle, panelHeadingStyle } from './styles';
import { useHistory } from './useHistory';
import { hasLegalFooter } from '../types';
import type { EmailBlock, EmailBlockKind, EmailTemplateContent, SenderProfile } from '../types';

type PanelTab = 'style' | 'inspect' | 'preflight';

/** 새 블록이 들어갈 자리 (위 insertTarget 주석 참조) */
type InsertTarget =
  | { readonly kind: 'end' }
  | { readonly kind: 'after'; readonly blockId: string }
  | { readonly kind: 'column'; readonly columnId: string };

function isPanelTab(value: string): value is PanelTab {
  return value === 'style' || value === 'inspect' || value === 'preflight';
}

const PANEL_TABS = [
  { id: 'style', label: '스타일' },
  { id: 'inspect', label: '속성' },
  /* [왜 패널의 탭인가 — 저장 버튼 옆이 아니라] 점검은 '저장을 누른 뒤에 듣는 판정' 이 아니라
     편집하는 내내 곁에 있어야 하는 것이다. 저장 옆에 두면 다 만든 뒤에야 열어 보게 되고,
     그때는 고칠 것이 가장 많이 쌓여 있다. */
  { id: 'preflight', label: '점검' },
] as const;

interface EmailBuilderProps {
  readonly value: EmailTemplateContent;
  readonly onChange: (next: EmailTemplateContent) => void;
  readonly disabled?: boolean;
  /** 발신 프로필 목록 — 셸이 주입한다. 없으면 빈 목록으로 그린다 */
  readonly senderProfiles?: readonly SenderProfile[];
  readonly senderProfileId?: string;
  readonly onSenderProfileChange?: (id: string) => void;
}

export function EmailBuilder({
  value,
  onChange,
  disabled,
  senderProfiles,
  senderProfileId,
  onSenderProfileChange,
}: EmailBuilderProps): ReactNode {
  const locked = disabled === true;

  /* ── 편집기 지역 상태 ─────────────────────────────────────────────────── */
  const [tab, setTab] = useState<EditorTab>('edit');
  const [panelTab, setPanelTab] = useState<PanelTab>('style');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [presetId, setPresetId] = useState<PresetId>(DEFAULT_PRESET_ID);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  /**
   * + 를 누른 자리.
   *
   * [왜 문자열 하나가 아니라 판별 유니온인가] 넣을 수 있는 자리가 세 가지가 됐다: 맨 뒤,
   * 어떤 블록 뒤, 그리고 **어떤 칸 안**. 'null 이면 맨 뒤' 규약에 칸을 끼워 넣으면 같은 문자열이
   * 블록 id 일 수도 칸 id 일 수도 있게 된다 — 어느 쪽인지 모르는 값은 반드시 틀린 곳에 넣는다.
   */
  const [insertTarget, setInsertTarget] = useState<InsertTarget>({ kind: 'end' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const history = useHistory(value, onChange);
  const { commit } = history;

  /**
   * 블록 id 발급기 — 전역 카운터를 두지 않는다(테스트가 서로의 카운터를 물려받지 않게).
   * 컴포넌트 인스턴스마다 0 에서 시작한다.
   */
  const seqRef = useRef(0);
  const nextId = useCallback(() => {
    seqRef.current += 1;
    return `block-${seqRef.current}`;
  }, []);

  // 선택된 블록은 최상위에 있을 수도, 어느 칸 안에 있을 수도 있다 — id 로 깊이까지 찾는다
  const selectedBlock: EmailBlock | undefined =
    selectedBlockId === null ? undefined : findBlockById(value.blocks, selectedBlockId);

  /* ── 값 변경 (전부 이력에 쌓인다) ─────────────────────────────────────── */

  const applyPreset = (id: PresetId) => {
    setPresetId(id);
    const preset = findPreset(id);
    if (preset === undefined) return;
    const blocks = preset.build(nextId);
    setSelectedBlockId(null);
    commit({
      ...value,
      blocks,
      // 프리셋이 제목을 제안한다 — 이미 적어 둔 제목이 있으면 덮지 않는다
      subject: value.subject === '' ? preset.subject : value.subject,
    });
  };

  const insertBlock = (kind: EmailBlockKind) => {
    const id = nextId();

    // 칸 안에는 컨테이너를 넣을 수 없다 — 피커가 이미 목록에서 뺐지만, 자리에 맞는 팩토리를
    // 고르는 판단을 여기서도 타입으로 한 번 더 받는다(피커만 믿으면 타입이 좁혀지지 않는다)
    if (insertTarget.kind === 'column') {
      if (!isColumnChildKind(kind)) return;
      // 칸 안은 폭이 좁다 — 최상위 기본 여백(32px)을 그대로 쓰면 글자가 설 자리가 없다
      const child = withColumnPadding(createLeafBlock(kind, id));
      commit({
        ...value,
        blocks: insertBlockInColumn(value.blocks, insertTarget.columnId, child),
      });
      setSelectedBlockId(child.id);
      setPanelTab('inspect');
      setPickerOpen(false);
      return;
    }

    const block = createBlock(kind, id);
    const afterId = insertTarget.kind === 'after' ? insertTarget.blockId : null;
    commit({ ...value, blocks: insertBlockAfter(value.blocks, afterId, block) });
    // 새로 넣은 블록을 곧바로 고른다 — 넣자마자 속성을 만지는 것이 자연스러운 흐름이다
    setSelectedBlockId(block.id);
    setPanelTab('inspect');
    setPickerOpen(false);
  };

  /**
   * 블록 묶음 — 다단 행 한 장(과 그 안의 블록들)이 지금 자리에 들어온다.
   *
   * [왜 첫 블록을 고르지 않나] 단일 블록을 넣을 때는 곧바로 속성을 만지는 것이 자연스럽지만,
   * 묶음은 **여러 장이 한꺼번에** 들어와서 어느 하나를 골라 주면 나머지가 안 보이는 것처럼 된다.
   * 갓 들어온 배치를 통째로 보게 두고, 고를 블록은 운영자가 정하게 한다.
   */
  const insertGroup = (id: EmailBlockGroupId) => {
    const group = findBlockGroup(id);
    if (group === undefined) return;
    const blocks = group.build(nextId);
    const afterId = insertTarget.kind === 'after' ? insertTarget.blockId : null;
    commit({ ...value, blocks: insertBlocksAfter(value.blocks, afterId, blocks) });
    setSelectedBlockId(null);
    setPickerOpen(false);
  };

  const updateBlock = (next: EmailBlock) => {
    commit({ ...value, blocks: replaceBlock(value.blocks, next) });
  };

  /**
   * 한 칸 위/아래로.
   *
   * [왜 자리 바꾸기를 직접 적지 않나] 정본은 DS 의 moveArrayItem 이다 — 목록 표 재정렬이 이미
   * 같은 함수를 쓰고 있어서, 여기서 splice 를 다시 적으면 경계(첫 줄·끝 줄) 처리가 화면마다
   * 달라진다. 블록 트리를 훑는 부분만 우리 것이다(blocks.ts moveBlock).
   */
  const moveSelectedBlock = (id: string, delta: number) => {
    commit({ ...value, blocks: moveBlock(value.blocks, id, delta, moveArrayItem) });
  };

  const deleteBlock = (id: string) => {
    // 법적 푸터는 지우지 않는다 — 캔버스가 이미 버튼을 감추지만, 삭제의 최종 판단은 여기다
    // (정보통신망법 제50조: 수신거부 방법 명시 의무. types.ts 의 FooterBlock 머리말 참조)
    const target = findBlockById(value.blocks, id);
    if (target?.blockKind === 'footer') return;

    commit({ ...value, blocks: removeBlock(value.blocks, id) });
    // 사라진 블록을 계속 가리키고 있으면 INSPECT 가 빈 화면을 그린다 — 선택을 놓는다
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  /**
   * 변수 삽입 — 선택된 블록의 본문 **커서 자리**에 `#{namespace.field}` 를 끼워 넣는다.
   *
   * [끝에 붙이지 않는다] 변수는 대개 문장 가운데에 들어간다('#{member.name} 님, …'). 끝에
   * 붙이면 운영자가 매번 잘라내어 옮겨야 한다 — 근거와 자리 읽는 법은 `_shared/caret.ts` 머리말.
   * 포커스가 본문 밖이면 range 가 null 이 되고 끝에 붙는다(안전한 퇴화).
   *
   * [어디까지 꽂히나 — '사람이 읽는 글자' 가 있는 곳 전부]
   * 처음에는 제목·본문·버튼·목록·푸터 다섯 곳뿐이었다. 그런데 이미지의 **대체 텍스트**와 비디오의
   * 설명, 메뉴 항목의 이름도 수신자가 읽는 글자다 — '#{member.name}님의 지난 주문' 같은 대체
   * 텍스트가 실제로 필요하고, 그 자리에서만 변수 버튼이 아무 반응이 없으면 운영자는 기능이 고장난
   * 줄 안다. 반대로 **주소·파일명**에는 꽂지 않는다: 토큰만 적힌 주소는 렌더러가 통째로 버려서
   * (render-html safeUrl) 눌러도 아무 데도 가지 않는 링크가 된다.
   *
   * 꽂을 글자가 없는 블록(로고·아바타·구분선·여백·소셜·다단)에서는 아무 일도 하지 않는다.
   */
  const insertVariable = (token: string) => {
    if (selectedBlock === undefined) return;
    const range = activeCaretRange();
    switch (selectedBlock.blockKind) {
      case 'heading':
      case 'text':
      case 'button':
        updateBlock({
          ...selectedBlock,
          content: insertAtCaret(selectedBlock.content, token, range),
        });
        return;
      case 'list': {
        // 목록은 본문이 여러 개다 — 마지막 항목에 넣는다(방금 적던 자리일 가능성이 가장 높다)
        const lastIndex = selectedBlock.items.length - 1;
        const last = selectedBlock.items[lastIndex];
        if (last === undefined) return;
        updateBlock({
          ...selectedBlock,
          items: selectedBlock.items.map((item, index) =>
            index === lastIndex ? { ...item, text: insertAtCaret(last.text, token, range) } : item,
          ),
        });
        return;
      }
      case 'footer':
        // 전송자 명칭에 꽂는다 — 브랜드명이 수신자별로 달라지는 운영이 실제로 있다
        updateBlock({
          ...selectedBlock,
          companyName: insertAtCaret(selectedBlock.companyName, token, range),
        });
        return;
      case 'image':
      case 'video':
        // 대체 텍스트도 수신자가 읽는 글자다 — 이미지를 차단하는 클라이언트에서는 **이것만** 읽힌다
        updateBlock({ ...selectedBlock, alt: insertAtCaret(selectedBlock.alt, token, range) });
        return;
      case 'menu': {
        // 목록과 같은 이유로 마지막 항목의 **이름**에 넣는다(주소가 아니다)
        const lastIndex = selectedBlock.items.length - 1;
        const last = selectedBlock.items[lastIndex];
        if (last === undefined) return;
        updateBlock({
          ...selectedBlock,
          items: selectedBlock.items.map((item, index) =>
            index === lastIndex
              ? { ...item, label: insertAtCaret(last.label, token, range) }
              : item,
          ),
        });
        return;
      }
      // 아래는 꽂을 글자가 없다 — 파일명·주소는 치환 토큰을 받을 자리가 아니다
      case 'logo':
      case 'avatar':
      case 'divider':
      case 'spacer':
      case 'social':
      case 'columns':
        return;
    }
  };

  return (
    <div style={builderGridStyle(leftOpen, rightOpen)}>
      {/* ── 왼쪽: 프리셋 ─────────────────────────────────────────────── */}
      {leftOpen && (
        <div style={columnStyle}>
          <PresetRail value={presetId} disabled={locked} onSelect={applyPreset} />
        </div>
      )}

      {/* ── 가운데: 툴바 + 캔버스 ────────────────────────────────────── */}
      <div style={columnStyle}>
        <EmailToolbar
          tab={tab}
          device={device}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          disabled={locked}
          onTabChange={setTab}
          onDeviceChange={setDevice}
          onToggleLeft={() => {
            setLeftOpen((open) => !open);
          }}
          onToggleRight={() => {
            setRightOpen((open) => !open);
          }}
          onUndo={history.undo}
          onRedo={history.redo}
          onInsertVariable={insertVariable}
        />

        <EmailCanvas
          value={value}
          tab={tab}
          device={device}
          senderProfiles={senderProfiles ?? []}
          senderProfileId={senderProfileId ?? ''}
          selectedBlockId={selectedBlockId}
          disabled={locked}
          onSelectBlock={(id) => {
            setSelectedBlockId(id);
            setPanelTab('inspect');
          }}
          onRequestInsert={(afterId) => {
            setInsertTarget(
              afterId === null ? { kind: 'end' } : { kind: 'after', blockId: afterId },
            );
            setPickerOpen(true);
          }}
          onRequestInsertInColumn={(columnId) => {
            setInsertTarget({ kind: 'column', columnId });
            setPickerOpen(true);
          }}
          onRemoveBlock={deleteBlock}
          onMoveBlock={moveSelectedBlock}
          blockPositionOf={(id) => blockPositionOf(value.blocks, id)}
          onSenderProfileChange={(id) => {
            onSenderProfileChange?.(id);
          }}
          onSenderEmailChange={(senderEmail) => {
            commit({ ...value, senderEmail });
          }}
          onSubjectChange={(subject) => {
            commit({ ...value, subject });
          }}
          onPreheaderChange={(preheader) => {
            commit({ ...value, preheader });
          }}
        />
      </div>

      {/* ── 오른쪽: STYLE / INSPECT ──────────────────────────────────── */}
      {rightOpen && (
        <div style={columnStyle}>
          <Card>
            <Tabs
              value={panelTab}
              items={PANEL_TABS}
              ariaLabel="속성"
              onChange={(next) => {
                if (isPanelTab(next)) setPanelTab(next);
              }}
            />

            {panelTab === 'style' && (
              <StylePanel
                value={value.canvas}
                blankPreset={presetId === 'blank'}
                disabled={locked}
                onChange={(canvas) => {
                  commit({ ...value, canvas });
                }}
              />
            )}

            {panelTab === 'preflight' && (
              <PreflightPanel
                value={value}
                onSelectBlock={(id) => {
                  setSelectedBlockId(id);
                  setPanelTab('inspect');
                }}
              />
            )}

            {panelTab === 'inspect' &&
              (selectedBlock === undefined ? (
                <p style={panelEmptyStyle}>블록을 선택하면 설정을 편집할 수 있습니다.</p>
              ) : (
                <>
                  <h3 style={panelHeadingStyle}>{inspectHeadingOf(selectedBlock)}</h3>
                  <InspectPanel block={selectedBlock} disabled={locked} onChange={updateBlock} />
                </>
              ))}
          </Card>
        </div>
      )}

      <BlockPicker
        open={pickerOpen}
        insideColumn={insertTarget.kind === 'column'}
        footerPresent={hasLegalFooter(value.blocks)}
        onPick={insertBlock}
        onPickGroup={insertGroup}
        onClose={() => {
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
