// Storybook 프리뷰 설정 (@tds/ui)
// 테마(light/dark)와 문서 방향(ltr/rtl)을 툴바 전역으로 노출하고,
// 데코레이터가 html 루트에 data-theme / dir 속성으로 주입한다.
import type { Decorator, Preview } from '@storybook/react';

// [주의] 아래 CSS는 tools/codegen 산출물이다 (tokens/tokens.json → generated/tokens/tokens.css).
// 리포 초기 상태에는 파일이 아직 존재하지 않으므로, Storybook 실행/빌드 전 반드시
// 루트에서 `pnpm codegen`을 선행해야 한다 (packages/ui/README.md 참고).
// 이 import 구문은 토큰 파이프라인 계약의 일부이므로 삭제/주석 처리 금지.
import '../generated/tokens/tokens.css';

// 테마 데코레이터 — generated 토큰 CSS가 [data-theme='dark'] 셀렉터로 다크 값을 제공한다.
const withTheme: Decorator = (Story, context) => {
  const theme = String(context.globals['theme'] ?? 'light');
  document.documentElement.setAttribute('data-theme', theme);
  return Story();
};

// 방향 데코레이터 — RTL 스토리 검수(G5 체크리스트)용.
const withDirection: Decorator = (Story, context) => {
  const direction = String(context.globals['direction'] ?? 'ltr');
  document.documentElement.setAttribute('dir', direction);
  return Story();
};

const preview: Preview = {
  decorators: [withTheme, withDirection],
  globalTypes: {
    theme: {
      description: '컬러 테마 — html[data-theme]로 주입',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    direction: {
      description: '문서 방향 — html[dir]로 주입 (RTL 검수용)',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        items: ['ltr', 'rtl'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    direction: 'ltr',
  },
  parameters: {
    // 사이드바 정렬 — Foundations(토큰 문서)를 최상단에, 이후 원자적 계층 순서.
    options: {
      storySort: {
        order: ['Foundations', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages'],
      },
    },
    // 다크 페어 배경 — color.surface.default 가 각 테마에서 해석되는 primitive 를 직접 참조한다.
    // semantic 변수(--tds-color-surface-default)를 쓰면 두 항목이 현재 data-theme 값으로 함께
    // 해석돼 구분이 사라지므로, 테마 무관하게 고정인 primitive 를 가리킨다. 하드코딩 hex 0건.
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'var(--tds-primitive-color-gray-0)' },
        { name: 'dark', value: 'var(--tds-primitive-color-gray-900)' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
