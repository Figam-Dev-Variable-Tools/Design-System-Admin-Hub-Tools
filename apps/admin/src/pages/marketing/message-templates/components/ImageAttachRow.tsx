// 첨부 이미지 한 줄 — [파일명] [고른 파일명 / 이미지를 업로드하세요] [이미지 선택]
//
// [왜 ImageUploadField 를 쓰지 않는가] @tds/ui 의 그 필드는 **드롭존 + 미리보기 썸네일**이다.
// 여기서 필요한 것은 목업이 그린 한 줄짜리 파일명 표시줄이고, 실제 미리보기는 오른쪽 휴대폰 목업이
// 이미 담당한다 — 드롭존을 쓰면 같은 이미지가 카드 안과 휴대폰 안에 두 번 나온다. 또 이 화면이
// 저장하는 값은 **파일명(문자열)** 이다(TextTemplateContent.imageFileName): 데이터 URL 을 돌려주는
// 필드와는 값의 모양 자체가 다르다.
//
// [규칙은 화면이 아니라 validation.ts 가 안다] JPG·500KB·1000px 는 안내 문구와 검증이 같은 상수를
// 봐야 하므로 판정은 전부 거기서 가져온다.
import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

import { Button, errorTextStyle, visuallyHiddenStyle } from '../../../../shared/ui';
import { IMAGE_PLACEHOLDER, LABEL_CHOOSE_IMAGE, LABEL_FILE_NAME } from '../copy';
import { imageEdgeError, pickedImageError } from '../validation';
import { TEXT_IMAGE_MAX_EDGE } from '../types';
import { cssVar } from '@tds/ui';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  // 좁아지면 '이미지 선택' 버튼이 아래로 내려간다 — 파일명을 한 글자까지 깎아 내리지 않는다
  flexWrap: 'wrap',
  minWidth: 0,
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const legendStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 'none',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRightStyle: 'solid',
  borderRightWidth: cssVar('border-width.thin'),
  borderRightColor: cssVar('color.border.default'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  whiteSpace: 'nowrap',
};

function nameStyle(hasFile: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    // basis 0 으로 둔다 — auto 면 파일명 길이가 그대로 기준 폭이 되어 버튼을 다음 줄로 밀어낸다
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    color: hasFile ? cssVar('color.text.default') : cssVar('color.text.muted'),
    fontSize: cssVar('typography.label.md.font-size'),
    lineHeight: cssVar('typography.label.md.line-height'),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
}

const actionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 'none',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
};

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

/**
 * 고른 파일의 픽셀 크기를 잰다 — 브라우저가 이미지를 실제로 디코드해야 알 수 있다.
 *
 * 디코드에 실패하면(손상된 파일·지원하지 않는 인코딩) 크기를 알 수 없다. 그때는 **막는다** —
 * '알 수 없으니 통과' 로 두면 규격을 넘는 이미지가 그대로 저장되고 발송 단계에서 반송된다.
 * 만든 object URL 은 성공/실패 어느 쪽이든 되돌린다(누수 방지).
 */
async function edgeErrorOf(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    });
    if (size === null) return '이미지를 읽지 못했어요. 다른 파일을 선택해 주세요.';
    return imageEdgeError(size.width, size.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface ImageAttachRowProps {
  readonly fileName: string;
  readonly disabled: boolean;
  readonly onChange: (fileName: string) => void;
}

export function ImageAttachRow({ fileName, disabled, onChange }: ImageAttachRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFile = fileName.trim() !== '';

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 고를 수 있게 input 을 비운다 — 비우지 않으면 change 가 두 번째부터 안 뜬다
    event.target.value = '';
    if (file === undefined) return;

    const immediate = pickedImageError(file);
    if (immediate !== null) {
      setError(immediate);
      return;
    }

    void edgeErrorOf(file).then((edge) => {
      if (edge !== null) {
        setError(edge);
        return;
      }
      setError(null);
      // TODO(backend): POST /api/uploads 로 파일을 보내고 **응답이 준 파일명**을 값으로 삼는다.
      //   지금은 고른 파일의 이름만 저장한다 — 실제 바이트는 아직 어디에도 올라가지 않는다.
      onChange(file.name);
    });
  };

  return (
    <div style={wrapStyle}>
      <div style={rowStyle}>
        <span style={legendStyle}>{LABEL_FILE_NAME}</span>
        <span style={nameStyle(hasFile)}>{hasFile ? fileName : IMAGE_PLACEHOLDER}</span>
        <span style={actionStyle}>
          {/* 붙인 뒤에는 떼어낼 길이 있어야 한다 — 한 장만 허용하므로 '바꾸기' 는 다시 고르면 된다 */}
          {hasFile && (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setError(null);
                onChange('');
              }}
            >
              첨부 해제
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {LABEL_CHOOSE_IMAGE}
          </Button>
        </span>
      </div>

      {/* 진짜 파일 입력 — 시각적으로만 숨긴다(display:none 은 일부 AT 에서 라벨을 잃는다) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg"
        style={visuallyHiddenStyle}
        tabIndex={-1}
        aria-hidden="true"
        onChange={pick}
      />

      {error !== null && (
        <p style={errorTextStyle} role="alert">
          {error}
        </p>
      )}
      <span style={visuallyHiddenStyle}>
        {`JPG · 500KB 이하 · ${String(TEXT_IMAGE_MAX_EDGE)}px 이하의 이미지 1장만 첨부할 수 있어요.`}
      </span>
    </div>
  );
}
