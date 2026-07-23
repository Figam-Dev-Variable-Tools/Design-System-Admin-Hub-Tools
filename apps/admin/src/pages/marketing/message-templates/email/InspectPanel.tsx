// 오른쪽 INSPECT 탭 — 선택된 블록 하나의 속성
//
// [필드 목록은 블록 종류가 정한다] blockKind 로 전수 분기하며 default 를 두지 않는다 — 8번째
// 블록이 생기면 여기서 타입 에러가 난다(그 블록의 폼을 안 만들고 지나갈 수 없다).
//
// [왜 종류별 컴포넌트로 쪼갰나] 한 함수 안에서 if 로 필드를 켜고 끄면, 유니온이 좁혀지지 않아
// `block.level` 같은 접근이 전부 옵셔널 체이닝이 된다 — 타입이 주는 보호가 사라진다. 종류별
// 컴포넌트는 각자 좁혀진 타입 하나만 받으므로 필드 접근이 안전하다.
import { useId } from 'react';
import type { ReactNode } from 'react';

import {
  ColorField,
  SegmentedControl,
  SelectField,
  Slider,
  TextareaField,
  TextField,
  ToggleSwitch,
} from '@tds/ui';
import { Button, Icon } from '../../../../shared/ui';
import {
  applyColumnRatio,
  BLOCK_CONTENT_MAX,
  BLOCK_KIND_LABEL,
  DIVIDER_HEIGHT_MAX,
  FONT_FAMILIES,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LIST_ITEM_MAX,
  MEDIA_SIZE_MAX,
  MEDIA_SIZE_MIN,
  MENU_ITEM_MAX,
  SOCIAL_LINK_MAX,
} from './blocks';
import { FieldBox } from './controls/FieldBox';
import { IconToggleGroup } from './controls/IconToggleGroup';
import type { IconToggleOption } from './controls/IconToggleGroup';
import { PaddingField, PX_UNIT } from './controls/PaddingField';
import { panelFieldListStyle, panelPairStyle } from './styles';
import {
  COLUMN_GAP_MAX,
  IMAGE_MAX_WIDTH,
  SOCIAL_PLATFORM_LABEL,
  SPACER_HEIGHT_MAX,
} from '../types';
import type {
  AvatarBlock,
  BlockAlign,
  ButtonBlock,
  ButtonSize,
  ButtonShape,
  ButtonWidth,
  ColumnRatio,
  ColumnsBlock,
  DividerBlock,
  EmailBlock,
  FontWeight,
  FooterBlock,
  HeadingBlock,
  HeadingLevel,
  ImageBlock,
  ListBlock,
  LogoBlock,
  MediaShape,
  MenuBlock,
  SocialBlock,
  SocialPlatform,
  SpacerBlock,
  TextBlock,
  VideoBlock,
} from '../types';

/** 이미지 폭 초과 안내 — 목업 확정 문구 */
export const IMAGE_WIDTH_ERROR = '최대 800 px';

/* ── 공통 옵션 ───────────────────────────────────────────────────────────── */

const ALIGN_OPTIONS: readonly IconToggleOption<BlockAlign>[] = [
  { id: 'left', label: '왼쪽 정렬', icon: <Icon name="align-left" /> },
  { id: 'center', label: '가운데 정렬', icon: <Icon name="align-center" /> },
  { id: 'right', label: '오른쪽 정렬', icon: <Icon name="align-right" /> },
];

type VerticalAlign = ImageBlock['verticalAlign'];

const VERTICAL_ALIGN_OPTIONS: readonly IconToggleOption<VerticalAlign>[] = [
  { id: 'top', label: '위쪽 정렬', icon: <Icon name="align-top" /> },
  { id: 'middle', label: '가운데 정렬(세로)', icon: <Icon name="align-middle" /> },
  { id: 'bottom', label: '아래쪽 정렬', icon: <Icon name="align-bottom" /> },
];

const LEVEL_OPTIONS = [
  { id: 'h1', label: 'H1' },
  { id: 'h2', label: 'H2' },
  { id: 'h3', label: 'H3' },
] as const;

const WEIGHT_TWO_OPTIONS = [
  { id: 'regular', label: '보통' },
  { id: 'bold', label: '굵게' },
] as const;

const WEIGHT_THREE_OPTIONS = [
  { id: 'regular', label: '보통' },
  { id: 'medium', label: '중간' },
  { id: 'bold', label: '굵게' },
] as const;

const BUTTON_WIDTH_OPTIONS = [
  { id: 'full', label: '꽉 채움' },
  { id: 'auto', label: '내용에 맞춤' },
] as const;

const BUTTON_SIZE_OPTIONS = [
  { id: 'xs', label: '아주 작게' },
  { id: 'sm', label: '작게' },
  { id: 'md', label: '보통' },
  { id: 'lg', label: '크게' },
] as const;

const BUTTON_SHAPE_OPTIONS = [
  { id: 'rectangle', label: '사각형' },
  { id: 'rounded', label: '둥근 모서리' },
  { id: 'pill', label: '알약형' },
] as const;

const MEDIA_SHAPE_OPTIONS = [
  { id: 'circle', label: '원형' },
  { id: 'square', label: '사각형' },
  { id: 'rounded', label: '둥근 모서리' },
] as const;

const LIST_STYLE_OPTIONS = [
  { id: 'bulleted', label: '글머리표' },
  { id: 'ordered', label: '번호' },
] as const;

/** 비율 — 라벨이 곧 값이라 운영자가 무엇을 고르는지 그대로 보인다 */
const COLUMN_RATIO_OPTIONS = [
  { id: '1:1', label: '1:1' },
  { id: '2:1', label: '2:1' },
  { id: '1:2', label: '1:2' },
  { id: '1:1:1', label: '1:1:1' },
] as const;

const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'instagram',
  'facebook',
  'x',
  'youtube',
  'linkedin',
  'kakao',
  'naver',
];

/** 수신거부 링크 아래 안내 — 왜 필수인지를 그 자리에서 알린다(정보통신망법 제50조) */
const UNSUBSCRIBE_HINT = '수신거부 링크는 법적 필수 항목이에요 (정보통신망법 제50조).';

/** 쌓임 스위치 아래 안내 — 미디어 쿼리를 쓰지 않는다는 사실이 동작을 설명한다 */
const STACK_HINT = '끄면 좁은 화면에서도 칸이 나란히 남아요.';

/** 대체 텍스트 안내 — '접근성' 이 아니라 '전달력' 의 문제임을 말한다 */
const ALT_TEXT_HINT = '이미지를 차단하는 메일 앱에서 대신 보이는 글이에요.';

/* ── 타입 가드 (SegmentedControl 은 string 을 준다) ──────────────────────── */

function isHeadingLevel(value: string): value is HeadingLevel {
  return value === 'h1' || value === 'h2' || value === 'h3';
}
function isFontWeight(value: string): value is FontWeight {
  return value === 'regular' || value === 'medium' || value === 'bold';
}
function isButtonWidth(value: string): value is ButtonWidth {
  return value === 'full' || value === 'auto';
}
function isButtonSize(value: string): value is ButtonSize {
  return value === 'xs' || value === 'sm' || value === 'md' || value === 'lg';
}
function isButtonShape(value: string): value is ButtonShape {
  return value === 'rectangle' || value === 'rounded' || value === 'pill';
}
function isMediaShape(value: string): value is MediaShape {
  return value === 'circle' || value === 'square' || value === 'rounded';
}
function isSocialPlatform(value: string): value is SocialPlatform {
  return SOCIAL_PLATFORMS.some((platform) => platform === value);
}
function isColumnRatio(value: string): value is ColumnRatio {
  return value === '1:1' || value === '2:1' || value === '1:2' || value === '1:1:1';
}

/**
 * 본문 카운터 — `(8 / 10 000자)`.
 * 천 단위를 **얇은 공백**이 아니라 보통 공백으로 끊는다.
 */
function counterOf(length: number): string {
  const max = `${Math.floor(BLOCK_CONTENT_MAX / 1000)} ${String(BLOCK_CONTENT_MAX % 1000).padStart(3, '0')}`;
  return `(${length} / ${max}자)`;
}

/* ── 공통 조각 ───────────────────────────────────────────────────────────── */

function FontFamilyBox({
  id,
  value,
  disabled,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (next: string) => void;
}) {
  return (
    <FieldBox label="글꼴">
      <SelectField
        id={id}
        aria-label="글꼴"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </SelectField>
    </FieldBox>
  );
}

function ColorBox({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (next: string) => void;
}) {
  return (
    <FieldBox label={label}>
      <ColorField id={id} label={label} value={value} disabled={disabled} onChange={onChange} />
    </FieldBox>
  );
}

/**
 * 대체 텍스트 — 이미지·비디오가 공유한다.
 *
 * [왜 눈에 띄는 자리에 두는가] Outlook 은 기본적으로 외부 이미지를 차단한다. alt 가 없으면
 * 수신자에게는 **빈 상자**가 도착한다 — 보조기술 사용자만의 문제가 아니라 전달력의 문제다.
 */
function AltTextBox({
  id,
  value,
  disabled,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (next: string) => void;
}) {
  return (
    <FieldBox label="대체 텍스트" required helper={ALT_TEXT_HINT}>
      <TextField
        id={id}
        label="대체 텍스트"
        value={value}
        required
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </FieldBox>
  );
}

/** 본문 + 카운터 — Heading/Text/Button 이 공유한다 */
function ContentBox({
  label,
  value,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (next: string) => void;
}) {
  return (
    <TextareaField
      label={label}
      value={value}
      maxLength={BLOCK_CONTENT_MAX}
      required
      rows={3}
      disabled={disabled}
      hint={counterOf(value.length)}
      onChange={onChange}
    />
  );
}

/** 파일 줄 — 파일명 / 업로드 / 고르기. 실제 업로드는 셸이 붙인다(이 컴포넌트는 파일명만 갖는다) */
function FileRow({
  id,
  fileName,
  disabled,
  onChange,
  removable,
}: {
  readonly id: string;
  readonly fileName: string;
  readonly disabled: boolean;
  readonly onChange: (next: string) => void;
  /** 로고·아바타는 값이 있으면 Remove 버튼을 낸다 */
  readonly removable?: boolean;
}) {
  const hasFile = fileName.trim() !== '';
  return (
    <FieldBox label="파일명" required>
      <TextField
        id={id}
        label="파일명"
        value={fileName}
        required
        placeholder="이미지 업로드"
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {removable === true && hasFile ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChange('');
          }}
        >
          삭제
        </Button>
      ) : (
        <Button variant="secondary" size="sm" disabled={disabled}>
          이미지 선택
        </Button>
      )}
    </FieldBox>
  );
}

/* ── 종류별 패널 ─────────────────────────────────────────────────────────── */

interface PanelProps<T extends EmailBlock> {
  readonly block: T;
  readonly disabled: boolean;
  readonly onChange: (next: EmailBlock) => void;
}

function HeadingPanel({ block, disabled, onChange }: PanelProps<HeadingBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <ContentBox
        label="본문"
        value={block.content}
        disabled={disabled}
        onChange={(content) => {
          onChange({ ...block, content });
        }}
      />
      <FieldBox label="제목 단계">
        <SegmentedControl
          value={block.level}
          options={LEVEL_OPTIONS}
          size="sm"
          ariaLabel="제목 단계"
          disabled={disabled}
          onChange={(next) => {
            if (isHeadingLevel(next)) onChange({ ...block, level: next });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="굵기">
        <SegmentedControl
          value={block.fontWeight}
          options={WEIGHT_TWO_OPTIONS}
          size="sm"
          ariaLabel="굵기"
          disabled={disabled}
          onChange={(next) => {
            if (isFontWeight(next)) onChange({ ...block, fontWeight: next });
          }}
        />
      </FieldBox>
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function TextPanel({ block, disabled, onChange }: PanelProps<TextBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <ContentBox
        label="본문"
        value={block.content}
        disabled={disabled}
        onChange={(content) => {
          onChange({ ...block, content });
        }}
      />
      <FieldBox label="마크다운">
        <ToggleSwitch
          checked={block.markdown}
          label="마크다운"
          disabled={disabled}
          onChange={(markdown) => {
            onChange({ ...block, markdown });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <FieldBox label="굵기">
        <SegmentedControl
          value={block.fontWeight}
          options={WEIGHT_TWO_OPTIONS}
          size="sm"
          ariaLabel="굵기"
          disabled={disabled}
          onChange={(next) => {
            if (isFontWeight(next)) onChange({ ...block, fontWeight: next });
          }}
        />
      </FieldBox>
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function ButtonPanel({ block, disabled, onChange }: PanelProps<ButtonBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <ContentBox
        label="본문"
        value={block.content}
        disabled={disabled}
        onChange={(content) => {
          onChange({ ...block, content });
        }}
      />
      <FieldBox label="연결 주소" required>
        <TextField
          id={`${id}-url`}
          label="연결 주소"
          value={block.url}
          required
          placeholder="http://"
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, url: event.target.value });
          }}
        />
      </FieldBox>
      <FieldBox label="너비">
        <SegmentedControl
          value={block.width}
          options={BUTTON_WIDTH_OPTIONS}
          size="sm"
          ariaLabel="너비"
          disabled={disabled}
          onChange={(next) => {
            if (isButtonWidth(next)) onChange({ ...block, width: next });
          }}
        />
      </FieldBox>
      <FieldBox label="크기">
        <SegmentedControl
          value={block.size}
          options={BUTTON_SIZE_OPTIONS}
          size="sm"
          ariaLabel="크기"
          disabled={disabled}
          onChange={(next) => {
            if (isButtonSize(next)) onChange({ ...block, size: next });
          }}
        />
      </FieldBox>
      <FieldBox label="모양">
        <SegmentedControl
          value={block.shape}
          options={BUTTON_SHAPE_OPTIONS}
          size="sm"
          ariaLabel="모양"
          disabled={disabled}
          onChange={(next) => {
            if (isButtonShape(next)) onChange({ ...block, shape: next });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-button`}
        label="버튼색"
        value={block.buttonColor}
        disabled={disabled}
        onChange={(buttonColor) => {
          onChange({ ...block, buttonColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <FieldBox label="굵기">
        <SegmentedControl
          value={block.fontWeight}
          options={WEIGHT_THREE_OPTIONS}
          size="sm"
          ariaLabel="굵기"
          disabled={disabled}
          onChange={(next) => {
            if (isFontWeight(next)) onChange({ ...block, fontWeight: next });
          }}
        />
      </FieldBox>
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function ImagePanel({ block, disabled, onChange }: PanelProps<ImageBlock>) {
  const id = useId();
  // 폭 초과 — 붉은 테두리 + 안내 문구, 그리고 aria-invalid/aria-describedby 로 AT 에도 닿게 한다
  const tooWide = block.width > IMAGE_MAX_WIDTH;
  const widthErrorId = `${id}-width-error`;

  return (
    <div style={panelFieldListStyle}>
      <FileRow
        id={`${id}-file`}
        fileName={block.fileName}
        disabled={disabled}
        onChange={(fileName) => {
          onChange({ ...block, fileName });
        }}
      />

      {/* 장식용이면 alt 를 물어보지 않는다 — 빈 alt 가 정답인 경우까지 채우라고 요구하면
          운영자는 '이미지' 같은 무의미한 글을 적어 넣는다(스크린리더에는 소음이다) */}
      <FieldBox label="장식용 이미지">
        <ToggleSwitch
          checked={block.decorative}
          label="장식용 이미지"
          disabled={disabled}
          onChange={(decorative) => {
            onChange({ ...block, decorative });
          }}
        />
      </FieldBox>

      {!block.decorative && (
        <AltTextBox
          id={`${id}-alt`}
          value={block.alt}
          disabled={disabled}
          onChange={(alt) => {
            onChange({ ...block, alt });
          }}
        />
      )}

      <FieldBox label="연결 주소">
        <TextField
          id={`${id}-url`}
          label="연결 주소"
          value={block.clickThroughUrl}
          placeholder="http://"
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, clickThroughUrl: event.target.value });
          }}
        />
      </FieldBox>

      <div style={panelPairStyle}>
        <FieldBox
          label="너비 (px)"
          invalid={tooWide}
          helper={tooWide ? IMAGE_WIDTH_ERROR : ''}
          helperId={widthErrorId}
        >
          <TextField
            id={`${id}-width`}
            label="너비 (px)"
            type="number"
            value={String(block.width)}
            disabled={disabled}
            aria-invalid={tooWide}
            aria-describedby={widthErrorId}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              onChange({ ...block, width: Number.isNaN(next) ? 0 : next });
            }}
          />
        </FieldBox>

        <FieldBox label="높이 (px)">
          <TextField
            id={`${id}-height`}
            label="높이 (px)"
            type="number"
            placeholder="자동"
            value={block.height === null ? '' : String(block.height)}
            disabled={disabled}
            onChange={(event) => {
              const raw = event.target.value;
              const next = Number.parseInt(raw, 10);
              onChange({ ...block, height: raw === '' || Number.isNaN(next) ? null : next });
            }}
          />
        </FieldBox>
      </div>

      <FieldBox label="세로 정렬">
        <IconToggleGroup
          label="세로 정렬"
          value={block.verticalAlign}
          options={VERTICAL_ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(verticalAlign) => {
            onChange({ ...block, verticalAlign });
          }}
        />
      </FieldBox>

      <FieldBox label="가로 정렬">
        <IconToggleGroup
          label="가로 정렬"
          value={block.horizontalAlign}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(horizontalAlign) => {
            onChange({ ...block, horizontalAlign });
          }}
        />
      </FieldBox>

      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />

      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

/** 로고와 아바타는 필드가 같다 — 두 벌을 쓰지 않고 한 컴포넌트가 둘을 받는다 */
function MediaPanel({ block, disabled, onChange }: PanelProps<LogoBlock | AvatarBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <FileRow
        id={`${id}-file`}
        fileName={block.fileName}
        disabled={disabled}
        removable
        onChange={(fileName) => {
          onChange({ ...block, fileName });
        }}
      />
      <FieldBox label="크기">
        <Slider
          id={`${id}-size`}
          label="크기"
          value={block.size}
          min={MEDIA_SIZE_MIN}
          max={MEDIA_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(size) => {
            onChange({ ...block, size });
          }}
        />
      </FieldBox>
      <FieldBox label="모양">
        <SegmentedControl
          value={block.shape}
          options={MEDIA_SHAPE_OPTIONS}
          size="sm"
          ariaLabel="모양"
          disabled={disabled}
          onChange={(next) => {
            if (isMediaShape(next)) onChange({ ...block, shape: next });
          }}
        />
      </FieldBox>
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function DividerPanel({ block, disabled, onChange }: PanelProps<DividerBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <ColorBox
        id={`${id}-color`}
        label="선 색"
        value={block.color}
        disabled={disabled}
        onChange={(color) => {
          onChange({ ...block, color });
        }}
      />
      <FieldBox label="높이">
        <Slider
          id={`${id}-height`}
          label="높이"
          value={block.height}
          min={1}
          max={DIVIDER_HEIGHT_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(height) => {
            onChange({ ...block, height });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

/* ── 반복 항목 (소셜·메뉴·목록이 공유) ────────────────────────────────────────
 *
 * [왜 공용으로 빼나] 세 블록 모두 '줄을 더하고 지우는' 같은 조작을 갖는다. 각자 그리면 상한
 * 처리·빈 목록 문구·삭제 버튼의 접근 가능한 이름이 셋 다 미묘하게 달라진다. */

/**
 * 새 항목의 id — 기존 id 와 겹치지 않는 가장 작은 번호를 쓴다.
 *
 * [왜 난수·타임스탬프가 아닌가] 같은 조작이 같은 결과를 내야 테스트가 값을 단언할 수 있고,
 * 되돌리기 후 다시 더했을 때 id 가 달라지면 이력이 실제보다 커진다.
 */
function nextEntryId(blockId: string, existing: readonly { readonly id: string }[]): string {
  let index = existing.length + 1;
  while (existing.some((entry) => entry.id === `${blockId}-item-${String(index)}`)) index += 1;
  return `${blockId}-item-${String(index)}`;
}

function RepeatableRows({
  label,
  count,
  max,
  disabled,
  onAdd,
  children,
}: {
  readonly label: string;
  readonly count: number;
  readonly max: number;
  readonly disabled: boolean;
  readonly onAdd: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div style={panelFieldListStyle}>
      {children}
      <Button variant="secondary" size="sm" disabled={disabled || count >= max} onClick={onAdd}>
        {`${label} 추가`}
      </Button>
    </div>
  );
}

/** 항목 한 줄의 지우기 — 이름에 무엇을 지우는지 담아 스크린리더가 줄을 구분할 수 있게 한다 */
function RemoveRowButton({
  name,
  disabled,
  onRemove,
}: {
  readonly name: string;
  readonly disabled: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <Button variant="secondary" size="sm" disabled={disabled} onClick={onRemove}>
      {`${name} 삭제`}
    </Button>
  );
}

/* ── 새 블록의 패널 ──────────────────────────────────────────────────────── */

function SpacerPanel({ block, disabled, onChange }: PanelProps<SpacerBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <FieldBox label="높이">
        <Slider
          id={`${id}-height`}
          label="높이"
          value={block.height}
          min={0}
          max={SPACER_HEIGHT_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(height) => {
            onChange({ ...block, height });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
    </div>
  );
}

function SocialPanel({ block, disabled, onChange }: PanelProps<SocialBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <RepeatableRows
        label="소셜 링크"
        count={block.links.length}
        max={SOCIAL_LINK_MAX}
        disabled={disabled}
        onAdd={() => {
          onChange({
            ...block,
            links: [
              ...block.links,
              { id: nextEntryId(block.id, block.links), platform: 'instagram', url: '' },
            ],
          });
        }}
      >
        {block.links.map((link, index) => (
          <FieldBox key={link.id} label={`링크 ${String(index + 1)}`}>
            <SelectField
              id={`${id}-platform-${link.id}`}
              aria-label={`링크 ${String(index + 1)} 채널`}
              value={link.platform}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                if (!isSocialPlatform(next)) return;
                onChange({
                  ...block,
                  links: block.links.map((candidate) =>
                    candidate.id === link.id ? { ...candidate, platform: next } : candidate,
                  ),
                });
              }}
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {SOCIAL_PLATFORM_LABEL[platform]}
                </option>
              ))}
            </SelectField>
            <TextField
              id={`${id}-url-${link.id}`}
              label={`링크 ${String(index + 1)} 주소`}
              value={link.url}
              placeholder="https://"
              disabled={disabled}
              onChange={(event) => {
                const url = event.target.value;
                onChange({
                  ...block,
                  links: block.links.map((candidate) =>
                    candidate.id === link.id ? { ...candidate, url } : candidate,
                  ),
                });
              }}
            />
            <RemoveRowButton
              name={`링크 ${String(index + 1)}`}
              disabled={disabled}
              onRemove={() => {
                onChange({
                  ...block,
                  links: block.links.filter((candidate) => candidate.id !== link.id),
                });
              }}
            />
          </FieldBox>
        ))}
      </RepeatableRows>

      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function MenuPanel({ block, disabled, onChange }: PanelProps<MenuBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <RepeatableRows
        label="메뉴 항목"
        count={block.items.length}
        max={MENU_ITEM_MAX}
        disabled={disabled}
        onAdd={() => {
          onChange({
            ...block,
            items: [...block.items, { id: nextEntryId(block.id, block.items), label: '', url: '' }],
          });
        }}
      >
        {block.items.map((item, index) => (
          <FieldBox key={item.id} label={`항목 ${String(index + 1)}`}>
            <TextField
              id={`${id}-label-${item.id}`}
              label={`항목 ${String(index + 1)} 이름`}
              value={item.label}
              disabled={disabled}
              onChange={(event) => {
                const label = event.target.value;
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, label } : candidate,
                  ),
                });
              }}
            />
            <TextField
              id={`${id}-url-${item.id}`}
              label={`항목 ${String(index + 1)} 주소`}
              value={item.url}
              placeholder="https://"
              disabled={disabled}
              onChange={(event) => {
                const url = event.target.value;
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, url } : candidate,
                  ),
                });
              }}
            />
            <RemoveRowButton
              name={`항목 ${String(index + 1)}`}
              disabled={disabled}
              onRemove={() => {
                onChange({
                  ...block,
                  items: block.items.filter((candidate) => candidate.id !== item.id),
                });
              }}
            />
          </FieldBox>
        ))}
      </RepeatableRows>

      <FieldBox label="구분 문자">
        <TextField
          id={`${id}-separator`}
          label="구분 문자"
          value={block.separator}
          maxLength={3}
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, separator: event.target.value });
          }}
        />
      </FieldBox>
      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="굵기">
        <SegmentedControl
          value={block.fontWeight}
          options={WEIGHT_THREE_OPTIONS}
          size="sm"
          ariaLabel="굵기"
          disabled={disabled}
          onChange={(next) => {
            if (isFontWeight(next)) onChange({ ...block, fontWeight: next });
          }}
        />
      </FieldBox>
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function VideoPanel({ block, disabled, onChange }: PanelProps<VideoBlock>) {
  const id = useId();
  const tooWide = block.width > IMAGE_MAX_WIDTH;
  const widthErrorId = `${id}-width-error`;

  return (
    <div style={panelFieldListStyle}>
      <FieldBox label="영상 주소" required>
        <TextField
          id={`${id}-url`}
          label="영상 주소"
          value={block.videoUrl}
          required
          placeholder="https://"
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, videoUrl: event.target.value });
          }}
        />
      </FieldBox>
      <FileRow
        id={`${id}-file`}
        fileName={block.thumbnailFileName}
        disabled={disabled}
        onChange={(thumbnailFileName) => {
          onChange({ ...block, thumbnailFileName });
        }}
      />
      <AltTextBox
        id={`${id}-alt`}
        value={block.alt}
        disabled={disabled}
        onChange={(alt) => {
          onChange({ ...block, alt });
        }}
      />
      <FieldBox
        label="너비 (px)"
        invalid={tooWide}
        helper={tooWide ? IMAGE_WIDTH_ERROR : ''}
        helperId={widthErrorId}
      >
        <TextField
          id={`${id}-width`}
          label="너비 (px)"
          type="number"
          value={String(block.width)}
          disabled={disabled}
          aria-invalid={tooWide}
          aria-describedby={widthErrorId}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            onChange({ ...block, width: Number.isNaN(next) ? 0 : next });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

function ListPanel({ block, disabled, onChange }: PanelProps<ListBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <FieldBox label="목록 스타일">
        <SegmentedControl
          value={block.ordered ? 'ordered' : 'bulleted'}
          options={LIST_STYLE_OPTIONS}
          size="sm"
          ariaLabel="목록 스타일"
          disabled={disabled}
          onChange={(next) => {
            onChange({ ...block, ordered: next === 'ordered' });
          }}
        />
      </FieldBox>

      <RepeatableRows
        label="목록 항목"
        count={block.items.length}
        max={LIST_ITEM_MAX}
        disabled={disabled}
        onAdd={() => {
          onChange({
            ...block,
            items: [...block.items, { id: nextEntryId(block.id, block.items), text: '' }],
          });
        }}
      >
        {block.items.map((item, index) => (
          <FieldBox key={item.id} label={`항목 ${String(index + 1)}`}>
            <TextField
              id={`${id}-text-${item.id}`}
              label={`항목 ${String(index + 1)}`}
              value={item.text}
              disabled={disabled}
              onChange={(event) => {
                const text = event.target.value;
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, text } : candidate,
                  ),
                });
              }}
            />
            <RemoveRowButton
              name={`항목 ${String(index + 1)}`}
              disabled={disabled}
              onRemove={() => {
                onChange({
                  ...block,
                  items: block.items.filter((candidate) => candidate.id !== item.id),
                });
              }}
            />
          </FieldBox>
        ))}
      </RepeatableRows>

      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

/**
 * 법적 푸터의 패널.
 *
 * 수신거부 **문구**는 편집 대상이 아니다(UNSUBSCRIBE_LABEL 상수) — 법이 요구하는 표현이라
 * 운영자가 고칠 수 있으면 '무료' 가 지워진다. 여기서 정하는 것은 그 링크가 어디로 가느냐다.
 */
function FooterPanel({ block, disabled, onChange }: PanelProps<FooterBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <FieldBox label="회사명" required>
        <TextField
          id={`${id}-company`}
          label="회사명"
          value={block.companyName}
          required
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, companyName: event.target.value });
          }}
        />
      </FieldBox>
      <FieldBox label="주소">
        <TextField
          id={`${id}-address`}
          label="주소"
          value={block.companyAddress}
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, companyAddress: event.target.value });
          }}
        />
      </FieldBox>
      <FieldBox label="문의 이메일">
        <TextField
          id={`${id}-contact`}
          label="문의 이메일"
          value={block.contactEmail}
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, contactEmail: event.target.value });
          }}
        />
      </FieldBox>
      <FieldBox label="수신거부 주소" required helper={UNSUBSCRIBE_HINT}>
        <TextField
          id={`${id}-unsubscribe`}
          label="수신거부 주소"
          value={block.unsubscribeUrl}
          required
          placeholder="https://"
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...block, unsubscribeUrl: event.target.value });
          }}
        />
      </FieldBox>

      <FontFamilyBox
        id={`${id}-font`}
        value={block.fontFamily}
        disabled={disabled}
        onChange={(fontFamily) => {
          onChange({ ...block, fontFamily });
        }}
      />
      <FieldBox label="글자 크기">
        <Slider
          id={`${id}-size`}
          label="글자 크기"
          value={block.fontSize}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(fontSize) => {
            onChange({ ...block, fontSize });
          }}
        />
      </FieldBox>
      <ColorBox
        id={`${id}-text`}
        label="글자색"
        value={block.textColor}
        disabled={disabled}
        onChange={(textColor) => {
          onChange({ ...block, textColor });
        }}
      />
      <ColorBox
        id={`${id}-link`}
        label="링크색"
        value={block.linkColor}
        disabled={disabled}
        onChange={(linkColor) => {
          onChange({ ...block, linkColor });
        }}
      />
      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <FieldBox label="정렬">
        <IconToggleGroup
          label="정렬"
          value={block.align}
          options={ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(align) => {
            onChange({ ...block, align });
          }}
        />
      </FieldBox>
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

/**
 * 다단 행의 패널.
 *
 * [Stack on mobile 이 왜 스위치인가] 이것은 '보기 방식' 이 아니라 **켜고 끄는 동작**이다 —
 * role="switch" 로 두어 스크린리더가 상태(켜짐/꺼짐)를 읽게 한다.
 */
function ColumnsPanel({ block, disabled, onChange }: PanelProps<ColumnsBlock>) {
  const id = useId();
  return (
    <div style={panelFieldListStyle}>
      <FieldBox label="배치">
        <SegmentedControl
          value={block.ratio}
          options={COLUMN_RATIO_OPTIONS}
          size="sm"
          ariaLabel="배치"
          disabled={disabled}
          onChange={(next) => {
            if (isColumnRatio(next)) onChange(applyColumnRatio(block, next));
          }}
        />
      </FieldBox>

      <FieldBox label="좁은 화면에서 쌓기" helper={STACK_HINT}>
        <ToggleSwitch
          checked={block.stackOnMobile}
          label="좁은 화면에서 쌓기"
          disabled={disabled}
          onChange={(stackOnMobile) => {
            onChange({ ...block, stackOnMobile });
          }}
        />
      </FieldBox>

      <FieldBox label="칸 간격">
        <Slider
          id={`${id}-gap`}
          label="칸 간격"
          value={block.gap}
          min={0}
          max={COLUMN_GAP_MAX}
          unit={PX_UNIT}
          disabled={disabled}
          onChange={(gap) => {
            onChange({ ...block, gap });
          }}
        />
      </FieldBox>

      <FieldBox label="세로 정렬">
        <IconToggleGroup
          label="세로 정렬"
          value={block.verticalAlign}
          options={VERTICAL_ALIGN_OPTIONS}
          disabled={disabled}
          onChange={(verticalAlign) => {
            onChange({ ...block, verticalAlign });
          }}
        />
      </FieldBox>

      <ColorBox
        id={`${id}-bg`}
        label="배경색"
        value={block.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => {
          onChange({ ...block, backgroundColor });
        }}
      />
      <PaddingField
        idPrefix={id}
        value={block.padding}
        disabled={disabled}
        onChange={(padding) => {
          onChange({ ...block, padding });
        }}
      />
    </div>
  );
}

/* ── 진입점 ──────────────────────────────────────────────────────────────── */

interface InspectPanelProps {
  readonly block: EmailBlock;
  readonly disabled?: boolean;
  readonly onChange: (next: EmailBlock) => void;
}

/** '제목 블록' 처럼 INSPECT 의 소제목을 만든다 */
export function inspectHeadingOf(block: EmailBlock): string {
  return `${BLOCK_KIND_LABEL[block.blockKind]} 블록`;
}

export function InspectPanel({ block, disabled, onChange }: InspectPanelProps) {
  const locked = disabled === true;

  switch (block.blockKind) {
    case 'heading':
      return <HeadingPanel block={block} disabled={locked} onChange={onChange} />;
    case 'text':
      return <TextPanel block={block} disabled={locked} onChange={onChange} />;
    case 'button':
      return <ButtonPanel block={block} disabled={locked} onChange={onChange} />;
    case 'image':
      return <ImagePanel block={block} disabled={locked} onChange={onChange} />;
    case 'logo':
    case 'avatar':
      return <MediaPanel block={block} disabled={locked} onChange={onChange} />;
    case 'divider':
      return <DividerPanel block={block} disabled={locked} onChange={onChange} />;
    case 'spacer':
      return <SpacerPanel block={block} disabled={locked} onChange={onChange} />;
    case 'social':
      return <SocialPanel block={block} disabled={locked} onChange={onChange} />;
    case 'menu':
      return <MenuPanel block={block} disabled={locked} onChange={onChange} />;
    case 'video':
      return <VideoPanel block={block} disabled={locked} onChange={onChange} />;
    case 'list':
      return <ListPanel block={block} disabled={locked} onChange={onChange} />;
    case 'footer':
      return <FooterPanel block={block} disabled={locked} onChange={onChange} />;
    case 'columns':
      return <ColumnsPanel block={block} disabled={locked} onChange={onChange} />;
  }
}
