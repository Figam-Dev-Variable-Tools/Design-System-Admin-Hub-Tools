// 치환 변수 고르기 — 도메인(한국어) 그룹 + 검색 + 삽입
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 한 벌인가] 이 UI 를 부르는 자리는 셋이다 — 이메일 빌더 툴바의 ✨ Variable, 문자/알림톡
// 편집기 툴바의 ✨ Variable, 그리고 SMS·이메일 발송 폼의 삽입 바. 각자 목록을 그리면 한 화면에만
// 도메인을 더한 날 나머지 둘이 뒤처진다. 그리는 것도 한 벌로 둔다.
//
// [왜 _shared 인가] 세 소비자가 모두 `pages/marketing` 안이다 — 같은 페이지라 결합이 아니다
// (SegmentPicker·VariableInsertBar 와 같은 자리·같은 근거).
//
// [왜 shared/ui 가 아닌가] 이 컴포넌트는 `shared/domain/template-variables` 를 읽는다. 공통 UI 층
// (`shared/ui/`)이 도메인 모듈을 import 하면 code-quality 축2(domain-leak, blocker)다 —
// "여기 있는 컴포넌트는 도메인 로직을 모른다"(shared/ui/README.md 규칙 4). 도메인을 아는 것은
// 도메인 쪽에 둔다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [고르는 층과 꽂히는 층이 다르다 — 이 화면의 핵심]
//
// 사람이 고르는 것은 **한국어 라벨**('견적 합계금액')이고, 본문에 꽂히는 것은 **영문 토큰**
// (`#{quote.totalAmount}`)이다. 둘을 한 층으로 합치면 둘 중 하나가 망가진다:
//   · 한국어 토큰(`#{합계금액}`)은 대행사·백엔드와 주고받을 때 인코딩·정규화(NFC/NFD)에서
//     조용히 어긋나고,
//   · 영문 라벨만 보여 주면 운영자가 `quote.totalAmount` 와 `contract.amount` 중 무엇이
//     '계약금액' 인지 화면에서 판단할 수 없다.
// 그래서 목록은 한국어로 읽히고, 클릭의 결과만 영문이다. 토큰을 회색으로 함께 보여 주는 것은
// 본문을 검수하는 사람이 반대 방향(토큰 → 무슨 값)으로도 읽어야 하기 때문이다.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { SearchField } from '../../../shared/ui';
// 꺾쇠 2종은 사이드바용 아이콘 모음의 것이다 — DS Icon 계약(11종)에는 chevron-down 이 없다
import { ChevronDownIcon, ChevronRightIcon } from '../../../shared/icons';
import {
  filterTemplateVariableGroups,
  templateVariableCatalog,
  templateVariableToken,
} from '../../../shared/domain/template-variables';
import { cssVar } from '@tds/ui';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  listStyle: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

/** 목록이 길어 스크롤이 필요하다 — 6개 도메인 · 항목 150여 개 */
const scrollStyle: CSSProperties = {
  ...listStyle,
  maxHeight: 'calc(var(--tds-space-10) * 6)',
  overflowY: 'auto',
};

const groupButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  width: '100%',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  background: 'transparent',
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  textAlign: 'left',
  cursor: 'pointer',
};

const leafButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  width: '100%',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.6'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  background: 'transparent',
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  textAlign: 'left',
  cursor: 'pointer',
};

/** 토큰·표본값은 보조 정보다 — 라벨보다 약하게 */
const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

const noticeStyle: CSSProperties = {
  ...mutedStyle,
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  marginTop: 0,
  marginBottom: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
};

interface TemplateVariablePickerProps {
  /** 잎을 눌렀을 때 — `#{quote.totalAmount}` 문자열이 넘어온다 */
  readonly onInsert: (token: string) => void;
  readonly disabled?: boolean;
  /**
   * 목록 위 한 줄 안내. 화면마다 미리보기가 하는 일이 달라서 문구를 밖에서 넣는다 —
   * 발송 폼의 미리보기는 표본값으로 치환하고, 메시지 템플릿 편집기의 미리보기는 토큰을
   * 그대로 보여 준다(components/VariableText.tsx 머리말). 한 문구로 뭉치면 둘 중 하나는
   * 화면이 하지 않는 일을 설명하게 된다.
   */
  readonly caption: string;
}

export function TemplateVariablePicker({
  onInsert,
  disabled = false,
  caption,
}: TemplateVariablePickerProps) {
  const [query, setQuery] = useState('');
  // 검색 중에는 걸린 그룹을 전부 펼쳐 둔다 — 접힌 채로 결과를 숨기면 '없다' 로 오해한다
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  const catalog = templateVariableCatalog();

  // 배선 전(null)에는 빈 목록이 아니라 **모른다**고 말한다. 빈 목록으로 그리면 운영자는
  // '변수가 하나도 없는 기능' 이라고 읽고 다시 열지 않는다 (template-variables.ts 머리말).
  if (catalog === null) {
    return (
      <div style={wrapStyle}>
        <p style={noticeStyle}>변수 목록을 불러오지 못했습니다. 화면을 새로 고쳐 주세요.</p>
      </div>
    );
  }

  const groups = filterTemplateVariableGroups(catalog, query);
  const searching = query.trim() !== '';

  return (
    <div style={wrapStyle}>
      <span style={mutedStyle}>{caption}</span>

      <SearchField
        label="변수 검색"
        placeholder="이름·토큰·도메인으로 검색"
        value={query}
        onChange={setQuery}
      />

      {groups.length === 0 && <p style={noticeStyle}>검색 결과가 없습니다.</p>}

      <ul style={scrollStyle}>
        {groups.map((group) => {
          const open = searching || expanded.includes(group.label);
          return (
            <li key={group.label}>
              <button
                type="button"
                style={groupButtonStyle}
                aria-expanded={open}
                /* 접근 가능한 이름을 글자에서 파생시키지 않고 못 박는다 — 버튼 안에는 도메인
                   이름과 항목 수가 함께 있어 이름이 '회원 25' 처럼 읽히고, 그러면 잎의 이름
                   ('회원 이름 삽입 …')과 앞부분이 겹쳐 무엇을 가리키는지 모호해진다. */
                aria-label={`${group.label} 변수 그룹 ${String(group.variables.length)}개`}
                /* 펼치기도 포커스를 뺏지 않는다 — 그룹을 열어 본 뒤 항목을 고르는 흐름에서
                   중간에 한 번이라도 포커스가 옮겨 가면 커서 자리가 사라진다. */
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  setExpanded((prev) =>
                    prev.includes(group.label)
                      ? prev.filter((label) => label !== group.label)
                      : [...prev, group.label],
                  );
                }}
              >
                {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                {group.label}
                <span style={mutedStyle}>{group.variables.length}</span>
              </button>

              {open && (
                <ul style={listStyle}>
                  {group.variables.map((variable) => (
                    <li key={variable.key}>
                      <button
                        type="button"
                        className="tds-ui-focusable"
                        style={leafButtonStyle}
                        disabled={disabled}
                        /* 접근 가능한 이름은 한국어 라벨 + 무엇이 꽂히는지. 토큰만 읽어 주면
                           스크린리더 사용자는 이 항목이 무슨 값인지 알 수 없다. */
                        aria-label={`${group.label} ${variable.label} 삽입 — 예시 ${variable.sample}`}
                        /* 본문의 커서를 지키려고 포커스 이동을 막는다 — EmailToolbar 의 변수
                           버튼과 같은 이유(_shared/caret.ts activeCaretRange 머리말). 여기까지
                           막아야 '버튼을 눌렀더니 자리를 잊었다' 가 생기지 않는다. */
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          onInsert(templateVariableToken(variable.key));
                        }}
                      >
                        <span>{variable.label}</span>
                        <span style={mutedStyle}>{variable.key}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
