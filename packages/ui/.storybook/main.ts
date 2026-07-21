// Storybook 메인 설정 (@tds/ui)
// 스토리 소스: src(컴포넌트 스토리 + MDX 문서), pages(조립 전용 페이지 스토리)
import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../src/**/*.stories.tsx', '../src/**/*.mdx', '../pages/**/*.stories.tsx'],
  addons: [
    // essentials 의 번들 docs 를 끄고 addon-docs 를 직접 등록한다 — essentials 는 options.docs 를
    // addon-docs 로 전달하지 않아 remark-gfm 이 안 걸렸다(Props 표가 날 파이프 텍스트로 보임).
    // addon-docs 를 직접 등록하면 mdxPluginOptions 가 확실히 적용된다.
    {
      name: '@storybook/addon-essentials',
      options: { docs: false },
    },
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  core: {
    disableTelemetry: true,
  },
};

export default config;
