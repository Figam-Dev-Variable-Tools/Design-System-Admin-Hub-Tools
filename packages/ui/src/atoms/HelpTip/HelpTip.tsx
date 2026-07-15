// HelpTip — ⓘ 도움말 disclosure (atom · contracts/HelpTip.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/HelpTip.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// hover 전용 툴팁은 키보드·터치에서 열리지 않는다 — 버튼을 눌러 여닫는 disclosure 로 만든다.
// aria-expanded 로 열림 상태를, aria-controls 로 설명 문단(<p id>)을 잇는다 (계약 a11y).
// 열림 상태는 컴포넌트 내부(useState)가 소유한다 — 외부 제어 이벤트를 두지 않는다.
// 닫혔을 때 언마운트하지 않고 hidden 으로 감춘다 — aria-controls 대상이 사라지지 않게.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { useId, useState } from 'react';

import type { HelpTipProps } from '../../../generated/types/HelpTip.types';
import './HelpTip.css';

/** 안내(ⓘ) 글리프 — 아이콘 자산 패키지에 의존하지 않는 인라인 SVG. currentColor + 1.25em 기준(px 리터럴 0건) */
function InfoGlyph() {
  return (
    <svg
      className="tds-helptip__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M12 11v5" />
    </svg>
  );
}

export function HelpTip({ label, children }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span className="tds-helptip">
      <button
        type="button"
        className="tds-helptip__trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <InfoGlyph />
      </button>

      {/* 열렸을 때만 렌더하면 aria-controls 대상이 사라진다 — hidden 으로 감춘다 */}
      <p id={panelId} hidden={!open} className="tds-helptip__panel">
        {children}
      </p>
    </span>
  );
}
