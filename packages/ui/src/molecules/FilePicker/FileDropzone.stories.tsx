// FileDropzone — Storybook 스토리 (CSF3 · File 계열)
//
// [고정 IA] Docs · Overview · Playground · States(Idle·Drag Over·Disabled·Error) ·
// Content(Hint Text·File Types) · Accessibility(Keyboard·RTL·ARIA) ·
// Examples(Beside File Chip) · Interaction(Select File·Drop File·Disabled).
// disabled × isInvalid 세부 조합은 낱개 스토리로 폭발시키지 않고 Playground Controls 로 넘긴다.
// 계약 states 전수(hover·focus-visible 등)는 FileDropzone.test.tsx 가 소유한다.
//
// argTypes 는 계약 생성물(generated/argtypes/FileDropzone.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, fn, userEvent, within } from '@storybook/test';

import { FileDropzoneArgTypes } from '../../../generated/argtypes/FileDropzone.argtypes';
import { FileChip } from './FileChip';
import { FileDropzone } from './FileDropzone';

const meta: Meta<typeof FileDropzone> = {
  title: 'Design System/Components/FileDropzone',
  component: FileDropzone,
  argTypes: { ...FileDropzoneArgTypes },
  args: {
    label: '파비콘',
    title: '파일 선택 또는 끌어다 놓기',
    meta: '최소 16x16 / ICO · PNG',
    accept: 'image/x-icon,image/png',
    describedBy: '',
    disabled: false,
    isInvalid: false,
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', inlineSize: '26rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof FileDropzone>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** 테스트용 파일 한 건 — 탐색기/드롭 두 경로가 같은 출구(onSelect)로 나가는지 본다 */
const icoFile = (): File => new File(['x'], 'favicon.ico', { type: 'image/x-icon' });

const zoneOf = (canvasElement: HTMLElement): HTMLElement =>
  within(canvasElement).getByRole('button');

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 한 줄짜리 드롭존(제목 + 형식 안내). Controls 로 상태를 바꿔 본다 */
export const Overview: Story = {};

/* ── Playground ─────────────────────────────────────────────────────────── */

/**
 * Playground — 컨트롤을 한 화면에서 전부 살려 둔다.
 * disabled 와 isInvalid 는 표면(테두리·커서)을 함께 결정하고 서로 겹칠 수 있어
 * 둘을 같이 돌려 봐야 우선순위가 보인다.
 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 기본(Idle) — 잠기지 않은 대기 상태 */
export const Default: Story = {
  name: 'States/Idle',
};

/** 드래그 중(Drag Over) — 파일을 끌어와 얹은 동안 테두리가 primary 로 강조된다 */
export const DragOver: Story = {
  name: 'States/Drag Over',
  play: async ({ canvasElement }) => {
    const zone = zoneOf(canvasElement);
    fireEvent.dragOver(zone);
    await expect(zone).toHaveAttribute('data-drag-active', 'true');
  },
};

/** 잠김(Disabled) — 클릭·드롭을 함께 막고 흐리게 표시한다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
};

/** 오류(Error) — 테두리만 danger 로 바뀐다. 문구는 호출부가 소유한다 */
export const Invalid: Story = {
  name: 'States/Error',
  args: { isInvalid: true },
  play: async ({ canvasElement }) => {
    await expect(zoneOf(canvasElement)).toHaveAttribute('data-invalid', 'true');
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 형식·크기 안내 문구 — meta 둘째 줄이 무엇을·얼마나 올릴 수 있는지 알린다 */
export const HintText: Story = {
  name: 'Content/Hint Text',
  args: { meta: '최소 16x16 픽셀 · ICO 또는 PNG · 1MB 이하' },
};

/** 허용 형식 제한 — accept 가 탐색기 필터를 좁히고 안내 문구가 형식을 밝힌다(보증이 아니라 1차 필터) */
export const FileTypes: Story = {
  name: 'Content/File Types',
  args: {
    label: '대표 이미지',
    accept: 'image/png,image/jpeg',
    meta: 'PNG · JPG',
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** 키보드 — 숨은 입력이 아니라 버튼 하나가 탭 정지점이다. Tab 으로 포커스를 받는다 */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  play: async ({ canvasElement }) => {
    const zone = zoneOf(canvasElement);
    await userEvent.tab();
    await expect(zone).toHaveFocus();
    // 두 조작 경로를 접근 이름 안에서 함께 알린다
    await expect(zone).toHaveAttribute('aria-label', '파비콘 — 클릭하거나 파일을 끌어다 놓으세요');
  },
};

/** RTL — 컨테이너 방향이 뒤집혀도 배치가 무너지지 않는다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '아이콘', title: '파일 선택 또는 끌어다 놓기', meta: 'ICO · PNG' },
  decorators: [rtlFrame],
};

/** ARIA — 오류 문단은 호출부가 소유하고 드롭존은 describedBy 로 잇기만 한다 */
export const DescribedByError: Story = {
  name: 'Accessibility/ARIA',
  args: { isInvalid: true, describedBy: 'favicon-error' },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '26rem' }}>
        <div style={{ display: 'flex' }}>
          <Story />
        </div>
        <p
          id="favicon-error"
          role="alert"
          style={{
            marginBlock: 'var(--tds-space-1)',
            color: 'var(--tds-color-feedback-danger-text)',
            fontSize: 'var(--tds-typography-caption-md-font-size)',
          }}
        >
          ICO 또는 PNG 파일만 올릴 수 있어요.
        </p>
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const zone = zoneOf(canvasElement);
    await expect(zone).toHaveAttribute('aria-describedby', 'favicon-error');
    await expect(zone).toHaveAttribute('data-invalid', 'true');
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 실제 배치 — 걸린 파일 칩과 드롭존이 가로로 나란히 선다 (이 쌍이 존재하는 이유) */
export const BesideFileChip: Story = {
  name: 'Examples/Beside File Chip',
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--tds-space-3)',
          flexWrap: 'wrap',
          inlineSize: '32rem',
        }}
      >
        <FileChip src="" name="favicon.ico" size={13_000} onRemove={() => undefined} />
        <Story />
      </div>
    ),
  ],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 탐색기에서 고른 파일이 onSelect 로 나간다 (비발생 단언이 공허하지 않음을 보인다) */
export const FiresWhenEnabled: Story = {
  name: 'Interaction/Select File',
  play: async ({ canvasElement, args }) => {
    const input = canvasElement.querySelector('.tds-dropzone__input');
    if (!(input instanceof HTMLInputElement)) throw new Error('숨은 file input 을 찾지 못했다');

    // 숨은 입력은 pointer-events:none 이라 upload 가 닿지 않는다 — 탐색기가 값을 채우는 지점을 만든다
    await userEvent.upload(input, icoFile(), { applyAccept: false });

    await expect(args.onSelect).toHaveBeenCalled();
  },
};

/** 끌어다 놓은 파일도 같은 onSelect 로 나간다 (두 경로가 한 출구를 쓴다) */
export const DropFile: Story = {
  name: 'Interaction/Drop File',
  play: async ({ canvasElement, args }) => {
    const zone = zoneOf(canvasElement);
    fireEvent.drop(zone, { dataTransfer: { files: [icoFile()] } });
    await expect(args.onSelect).toHaveBeenCalled();
  },
};

/** 잠기면 발화하지 않는다 (계약 blockedWhen: disabled) — 스파이를 관찰한다 */
export const BlockedWhenDisabled: Story = {
  name: 'Interaction/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const zone = zoneOf(canvasElement);

    await expect(zone).toBeDisabled();
    await userEvent.click(zone, { pointerEventsCheck: 0 });

    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};
