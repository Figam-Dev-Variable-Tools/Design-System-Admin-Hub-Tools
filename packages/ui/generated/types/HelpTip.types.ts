// AUTO-GENERATED from contracts/HelpTip.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type HelpTipState = 'default' | 'hover' | 'focus-visible' | 'open' | 'closed';

/**
 * ⓘ 도움말 — 라벨 옆에 붙는 disclosure. 출처: apps/admin/src/shared/ui/HelpTip.tsx (소비 3곳: 폼 라벨의 부가 설명). hover 전용 툴팁은 키보드·터치에서 열리지 않으므로 버튼을 눌러 여닫는 disclosure 로 만든다 — aria-expanded 로 열림 상태를, aria-controls 로 설명 문단을 잇는다. 열림 상태는 컴포넌트 내부(useState)가 소유한다 — 외부 제어 이벤트를 두지 않는다.

[패널은 언마운트하지 않는다] 닫혔을 때 요소를 지우면 aria-controls 가 가리키는 대상이 사라진다 — hidden 속성으로 감추기만 한다.
 */
export interface HelpTipProps {
  /**
   * 스크린 리더용 트리거 이름 — 아이콘만 있으므로 aria-label 로 무엇에 대한 도움말인지 밝힌다 ('그룹 유형 설명' 등)
   */
  label: string;
  /**
   * 패널 본문 — 열렸을 때 아이콘 아래로 뜨는 설명 문단(<p>)의 내용
   */
  children: ReactNode;
}
