// Alert — Storybook 스토리 (CSF3 · Atoms/Alert)
//
// argTypes 는 계약 생성물(generated/argtypes/Alert.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(tone 4 × state 1 = 4) 전수 + 슬롯 최소/최대 + 닫기 버튼 + Dark/RTL.
//
// onClose 는 meta.args 에 두지 않는다 — **핸들러의 유무가 닫기 버튼의 유무**이므로(계약 events.onClose),
// 전역 args 로 깔면 모든 스토리에 × 가 생겨 "안 주면 안 나온다"를 보여줄 수 없다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { AlertArgTypes } from '../../../generated/argtypes/Alert.argtypes';
import { Alert } from './Alert';
import { Button } from '../Button';

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  argTypes: { ...AlertArgTypes },
  args: { tone: 'danger', children: '이메일 또는 비밀번호가 올바르지 않습니다.', id: '' },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Alert>;

/** 다크 테마 프레임 — tokens.css 의 [data-theme='dark'] 스코프를 그대로 쓴다 */
const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{
      background: 'var(--tds-color-surface-default)',
      padding: 'var(--tds-space-5)',
      borderRadius: 'var(--tds-radius-md)',
    }}
  >
    <Story />
  </div>
);

/** RTL 프레임 — 아이콘/텍스트 배치가 논리 속성대로 뒤집히는지 본다 */
const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** danger — role=alert / aria-live=assertive (즉시 통지) */
export const Danger: Story = {
  args: { tone: 'danger', children: '이메일 또는 비밀번호가 올바르지 않습니다.' },
};

/** info — role=status / aria-live=polite (대기 통지) */
export const Info: Story = {
  args: { tone: 'info', children: '비밀번호는 90일마다 변경해야 합니다.' },
};

/** success — role=status / aria-live=polite */
export const Success: Story = {
  args: { tone: 'success', children: '상품이 정상적으로 등록되었습니다.' },
};

/** warning — role=status / aria-live=polite */
export const Warning: Story = {
  args: { tone: 'warning', children: '재고가 5개 미만입니다. 발주를 검토하세요.' },
};

/** 슬롯 최소 — 아주 짧은 메시지 */
export const SlotMinimal: Story = {
  args: { tone: 'info', children: '저장됨' },
};

/** 슬롯 최대 — 긴 본문에서 아이콘이 첫 줄에 정렬되고 텍스트만 줄바꿈되는지 */
export const SlotLongContent: Story = {
  args: {
    tone: 'warning',
    children:
      '입력하신 사업자등록번호가 국세청 조회 결과와 일치하지 않습니다. 번호를 다시 확인하시거나, 사업자등록증 사본을 첨부해 관리자에게 확인을 요청해 주세요. 확인에는 영업일 기준 1~2일이 걸릴 수 있습니다.',
  },
  parameters: { layout: 'padded' },
};

/** id — 폼 컨트롤의 aria-describedby 가 이 메시지를 가리킬 때 쓴다 */
export const WithId: Story = {
  args: { tone: 'danger', id: 'login-form-error', children: '로그인에 실패했습니다.' },
};

/**
 * 블록 자식 — 루트가 <div> 라 배너 안에 블록 요소와 버튼을 넣을 수 있다 (MemberDetailPage 의 실호출부).
 * 루트가 <p> 였을 때는 브라우저가 <p> 를 자동으로 닫아 이 블록이 배너 바깥으로 밀려났다.
 */
export const WithBlockChildren: Story = {
  args: {
    tone: 'danger',
    children: (
      <div style={{ display: 'grid', gap: 'var(--tds-space-2)' }}>
        <span>회원 정보를 불러오지 못했습니다.</span>
        <span style={{ display: 'flex', gap: 'var(--tds-space-2)' }}>
          <Button size="sm" variant="secondary">
            재시도
          </Button>
          <Button size="sm" variant="ghost">
            목록으로
          </Button>
        </span>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole('alert');

    await expect(alert.tagName).toBe('DIV');
    await expect(within(alert).getAllByRole('button')).toHaveLength(2);
  },
};

/** onClose — 핸들러를 주면 닫기(×) 버튼이 나타난다 (MembersPage 상단 안내 배너) */
export const Dismissible: Story = {
  args: { tone: 'info', children: '회원 등급 정책이 2026-08-01 부터 변경됩니다.', onClose: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '안내 닫기' }));

    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

/** onClose 없음 — 닫기 버튼이 나타나지 않는다 (해제 가능 여부는 핸들러의 유무가 정한다) */
export const NotDismissible: Story = {
  args: { tone: 'info', children: '회원 등급 정책이 2026-08-01 부터 변경됩니다.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('button', { name: '안내 닫기' })).toBeNull();
  },
};

/** Dark — feedback 토큰 페어가 다크에서도 대비를 유지하는지 */
export const DarkTheme: Story = {
  args: { tone: 'danger', children: '다크 테마에서의 오류 메시지' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { tone: 'info', children: 'كلمة المرور غير صحيحة' },
  decorators: [rtlFrame],
};
