// 이메일 템플릿 미리보기 카드 — 상세 화면 우측
//
// [편집기 전체를 잠가서 쓰지 않는 이유] 처음에는 EmailBuilder 를 `disabled` 로 그대로 놓았다. 그러면
// 상세의 좁은 우측 칸(space-10 × 6)에 프리셋 레일 9줄 + 툴바(undo/redo·Variable·디바이스 전환) +
// STYLE 패널의 색상 피커까지 **편집기 3단이 통째로** 들어간다. 고칠 수 없는 컨트롤을 잔뜩 늘어놓은
// 화면이 되고, 정작 봐야 할 본문은 그 사이에 끼어 찌그러진다.
//
// [그렇다고 렌더러를 새로 짜지도 않는다] 상세 전용 렌더러를 따로 만들면 편집기가 바뀔 때 두 곳이
// 어긋난다. 그래서 **같은 EmailCanvas 를 preview 모드로** 쓴다 — 캔버스는 tab='preview' 에서
// 이미 읽기 전용 From/Subject 줄과 블록만 그린다(편집 장치 없음). 렌더링의 정본은 한 곳으로 남고,
// 크롬만 빠진다.
import { Card, CardTitle } from '../../../../shared/ui';
import type { EmailTemplateContent, SenderProfile } from '../types';
import { EmailCanvas } from '../email/EmailCanvas';
// 이 카드는 상세 전용이다(편집기는 EmailBuilder 자체가 캔버스를 그린다) — 글자도 상세 벌만 쓴다.
import { PREVIEW_TITLE } from '../copy';
import { accentTitleStyle } from '../styles';

/** 읽기 전용 표면이라 편집 콜백은 전부 무시한다 — 캔버스가 요구하는 모양만 채운다 */
const noop = (): void => undefined;

interface EmailPreviewCardProps {
  readonly value: EmailTemplateContent;
  readonly senderProfiles: readonly SenderProfile[];
  readonly senderProfileId: string;
}

export function EmailPreviewCard({
  value,
  senderProfiles,
  senderProfileId,
}: EmailPreviewCardProps) {
  return (
    <Card>
      <CardTitle>
        <span style={accentTitleStyle}>{PREVIEW_TITLE}</span>
      </CardTitle>

      <EmailCanvas
        value={value}
        tab="preview"
        device="desktop"
        senderProfiles={senderProfiles}
        senderProfileId={senderProfileId}
        selectedBlockId={null}
        disabled
        onSelectBlock={noop}
        onRequestInsert={noop}
        onRequestInsertInColumn={noop}
        onRemoveBlock={noop}
        onMoveBlock={noop}
        /* 읽기 전용이라 이동 손잡이가 뜰 일이 없다 — null 은 '자리를 모른다' 이고,
           캔버스는 그때 손잡이를 그리지 않는다(선택된 블록도 없다). */
        blockPositionOf={() => null}
        onSenderProfileChange={noop}
        onSenderEmailChange={noop}
        onSubjectChange={noop}
        onPreheaderChange={noop}
      />
    </Card>
  );
}
