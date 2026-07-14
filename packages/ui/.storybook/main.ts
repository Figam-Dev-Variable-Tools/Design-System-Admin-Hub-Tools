// Storybook 메인 설정 (@tds/ui)
// 스토리 소스: src(컴포넌트 스토리 + MDX 문서), pages(조립 전용 페이지 스토리 — A32 소유)
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../src/**/*.stories.tsx', '../src/**/*.mdx', '../pages/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  core: {
    disableTelemetry: true,
  },
};

export default config;
