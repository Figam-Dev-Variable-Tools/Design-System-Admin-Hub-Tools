// RichTextFieldEditor — RichTextField 의 에디터 본체 (Tiptap · 지연 로드되는 청크)
//
// 이 파일만 Tiptap(ProseMirror)을 import 한다. RichTextField 가 React.lazy 로 부르므로
// 이 모듈에 딸린 무게 전부가 별도 청크로 떨어진다 — 상품 폼에 들어가야 비로소 내려받는다.
//
// [헤드리스라서 토큰이 지켜진다] Tiptap 은 기본 CSS 를 들고 오지 않는다(headless). 그래서
// 라이브러리 스타일을 토큰으로 '덮을' 일이 없다 — 처음부터 우리 CSS 뿐이다. 하드코딩 hex/px 0건.
//
// [aria-pressed 가 진실이다] 툴바 버튼의 '켜짐' 을 색으로만 칠하면 AT 에는 닿지 않는다.
// editor.isActive() 를 aria-pressed 로 낸다 — 시각 강조는 그 상태의 표현일 뿐이다.
//
// [이 파일은 sanitize 를 모른다 — 일부러 그렇다]
// value 는 **이미 sanitize 된 HTML** 로 들어오고, onChange 로 낸 HTML 은 껍데기(RichTextField)가
// sanitize 해서 내보낸다. 여기서 sanitizeRichText 를 import 하면 껍데기 ↔ 에디터 순환 의존이
// 생긴다(껍데기가 이 파일을 lazy import 하므로). 보안 경계를 계약 표면인 껍데기 한 곳에 모으는
// 편이 옳기도 하다 — 에디터는 편집만 안다.
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Image } from '@tiptap/extension-image';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { imageFileError } from '../ImageUploadField';

/** 툴바가 낼 수 있는 제목 단계 — 본문(h1)은 문서 제목이라 에디터가 내지 않는다 */
const HEADING_LEVELS = [2, 3] as const;

/** 에디터 이미지 용량 상한(MB) — ImageUploadField 기본값과 맞춘다 */
const IMAGE_MAX_SIZE_MB = 5;

export interface RichTextFieldEditorProps {
  readonly id: string;
  /** **이미 sanitize 된** HTML — 껍데기(RichTextField)가 거른 값만 들어온다 */
  readonly value: string;
  readonly rows: number;
  readonly invalid: boolean;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly describedBy?: string | undefined;
  /**
   * <label> 의 id — contenteditable 은 `<label for>` 가 닿지 않는 ARIA 위젯이라
   * 이것을 aria-labelledby 로 직접 물어야 접근성 이름이 생긴다 (FormField.labelIdOf).
   */
  readonly labelledBy?: string | undefined;
  readonly placeholder?: string | undefined;
  /** 편집 결과 HTML — **sanitize 전**이다. 껍데기가 걸러서 계약의 onChange 로 내보낸다 */
  readonly onChange?: ((payload: string) => void) | undefined;
}

interface ToolbarButtonProps {
  readonly label: string;
  readonly pressed?: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly children: string;
}

/** 툴바 버튼 — pressed 를 aria-pressed 로 낸다(색은 그 상태의 표현일 뿐) */
function ToolbarButton({ label, pressed, disabled, onClick, children }: ToolbarButtonProps) {
  const className =
    pressed === true
      ? 'tds-richtext__tool tds-richtext__tool--active tds-ui-focusable'
      : 'tds-richtext__tool tds-ui-focusable';
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      // mousedown 기본동작을 막아 클릭 순간 에디터 선택이 풀리지 않게 한다 —
      // 막지 않으면 '드래그로 고른 글자'가 굵게 버튼을 누르는 사이 사라진다.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichTextFieldEditor({
  id,
  value,
  rows,
  invalid,
  required,
  disabled,
  describedBy,
  labelledBy,
  placeholder,
  onChange,
}: RichTextFieldEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  /** 껍데기와 마지막으로 주고받은 HTML — value 되돌림 판정의 기준(getHTML 호출을 피한다) */
  const lastSeenRef = useRef<string>(value);
  const linkInputId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  /** 만든 object URL — ImageUploadField 와 같은 규약으로 언마운트 시 revoke 한다(누수 방지) */
  const createdUrlsRef = useRef<Set<string>>(new Set());

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        // 링크는 사용자가 툴바로만 넣는다 — 붙여넣은 텍스트가 자동으로 링크가 되면
        // 사용자가 넣지 않은 href 가 문서에 생긴다.
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    // 껍데기가 sanitize 한 값이다 — 여기서 다시 거르지 않는다(경계는 한 곳)
    content: value,
    editorProps: {
      attributes: {
        id,
        class: 'tds-richtext__content',
        role: 'textbox',
        'aria-multiline': 'true',
        // `<label for>` 는 이 div 에 닿지 않는다 — 이름은 aria-labelledby 로만 생긴다.
        ...(labelledBy !== undefined ? { 'aria-labelledby': labelledBy } : {}),
        ...(required ? { 'aria-required': 'true' } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
        ...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {}),
        ...(placeholder !== undefined && placeholder !== ''
          ? { 'data-placeholder': placeholder }
          : {}),
      },
    },
    onUpdate: ({ editor: instance }) => {
      // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
      // (editable:false 로도 막히지만 이중 차단한다 — 껍데기에도 같은 가드가 있다)
      if (disabled) return;
      const html = instance.getHTML();
      lastSeenRef.current = html;
      onChange?.(html);
    },
  });

  // 바깥에서 value 가 갈아끼워진 경우(폼 리셋·다른 항목 로드·sanitize 가 붙여넣기를 고친 경우)만
  // 되돌린다 — 타이핑 중 매번 setContent 하면 커서가 맨 앞으로 튄다.
  //
  // 비교 기준을 editor.getHTML() 이 아니라 **마지막으로 오간 값의 ref** 로 잡는다. getHTML() 은
  // 뷰가 붙기 전(마운트 직후 이 effect 시점)에 부르면 prosemirror 가 schema 를 못 찾고 터진다 —
  // 그 순간의 내용은 어차피 useEditor 의 content 로 이미 넣은 값이라 물어볼 필요가 없다.
  useEffect(() => {
    if (editor === null) return;
    if (value === lastSeenRef.current) return;
    lastSeenRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // 만든 object URL 은 언마운트 시 revoke 한다 — 외부 URL 은 건드리지 않는다
  useEffect(() => {
    const created = createdUrlsRef.current;
    return () => {
      for (const url of created) URL.revokeObjectURL(url);
      created.clear();
    };
  }, []);

  if (editor === null) return null;

  const wrapperClass = invalid
    ? 'tds-richtext__shell tds-richtext__shell--invalid'
    : 'tds-richtext__shell';

  const applyLink = () => {
    const href = linkDraft.trim();
    setLinkOpen(false);
    setLinkDraft('');
    if (href === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  // TODO(backend): POST /api/uploads — 파일을 보내고 **응답 URL**을 여기에 삽입해야 한다.
  // 지금 넣는 것은 URL.createObjectURL 이 만든 미리보기 핸들이다(ImageUploadField 와 같은 심).
  // 저장된 자산이 아니라 새로고침·언마운트면 죽는다. 가짜 업로드 성공을 지어내지 않는다 —
  // 그건 문제를 숨길 뿐이다. 이 한계는 계약 description 에도 적혀 있다.
  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 뜨도록 값을 비운다
    event.target.value = '';
    if (file === undefined) return;
    const fileError = imageFileError(file, IMAGE_MAX_SIZE_MB);
    if (fileError !== null) {
      setImageError(fileError);
      return;
    }
    setImageError(null);
    const url = URL.createObjectURL(file);
    createdUrlsRef.current.add(url);
    editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  };

  return (
    <div className={wrapperClass}>
      <div className="tds-richtext__toolbar" role="toolbar" aria-label="본문 서식">
        <ToolbarButton
          label="굵게"
          pressed={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="기울임"
          pressed={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        {HEADING_LEVELS.map((level) => (
          <ToolbarButton
            key={level}
            label={`제목 ${String(level)}`}
            pressed={editor.isActive('heading', { level })}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            {`H${String(level)}`}
          </ToolbarButton>
        ))}
        <ToolbarButton
          label="글머리 목록"
          pressed={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label="번호 목록"
          pressed={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          label="링크"
          pressed={editor.isActive('link')}
          disabled={disabled}
          onClick={() => {
            const current: unknown = editor.getAttributes('link')['href'];
            setLinkDraft(typeof current === 'string' ? current : '');
            setLinkOpen((open) => !open);
          }}
        >
          링크
        </ToolbarButton>
        <ToolbarButton
          label="이미지"
          disabled={disabled}
          onClick={() => imageInputRef.current?.click()}
        >
          이미지
        </ToolbarButton>
      </div>

      {linkOpen ? (
        // window.prompt 를 쓰지 않는다 — 포커스를 뺏고 스타일을 못 입히며 스크린리더 경험이 나쁘다.
        <div className="tds-richtext__linkbar">
          <label className="tds-richtext__linklabel" htmlFor={linkInputId}>
            링크 주소
          </label>
          <input
            id={linkInputId}
            type="url"
            className="tds-richtext__linkinput tds-ui-focusable"
            value={linkDraft}
            placeholder="https://example.com"
            disabled={disabled}
            onChange={(event) => {
              setLinkDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              }
              if (event.key === 'Escape') setLinkOpen(false);
            }}
          />
          <button
            type="button"
            className="tds-richtext__linkapply tds-ui-focusable"
            disabled={disabled}
            onClick={applyLink}
          >
            적용
          </button>
        </div>
      ) : null}

      <EditorContent editor={editor} className="tds-richtext__editor" data-rows={rows} />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="tds-richtext__file"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onPickImage}
      />
      {imageError !== null ? (
        <p className="tds-richtext__imageerror" role="alert">
          {imageError}
        </p>
      ) : null}
    </div>
  );
}

/** 테스트/스토리가 에디터 인스턴스 타입을 참조할 때 쓴다 */
export type RichTextEditorInstance = Editor;
