// @tds/ui ESLint flat config (eslint 9) — 담당: 린트·포맷
//
// 목적: G5/G6 체크리스트의 "하드코딩 값 0건" · "레이어 역방향 의존 금지"를 커밋 전에 기계적으로 차단한다.
//
// [배치 순서는 계약이다 — flat config 는 뒤에 오는 객체가 앞의 rules 를 통째로 덮어쓴다]
//   ① ignores → ② 프리셋 → ③ eslint-config-prettier → ④ **우리 커스텀 룰(맨 마지막)**
// 커스텀 룰이 마지막에 와야 프리셋이 방어선을 조용히 덮어쓰지 못한다. 순서를 바꾸지 말 것.
//
// [프리셋 선택 근거 — ADR-0008] apps/admin/eslint.config.js 와 **동일한 프리셋 스택**을 쓴다.
//   eslint-config-airbnb 는 ESLint 8 legacy(eslintrc) 전용이라 쓸 수 없다. Airbnb 의 실질을 직접 구성한다:
//   typescript-eslint(strict+stylistic) · import-x · react · react-hooks · jsx-a11y.
//
// - no-raw-value 커스텀 룰이 도입되기 전까지 no-restricted-syntax 정규식 셀렉터로 대용 (org-design-v2 §4 금지 규칙).
// - eslint-plugin-boundaries / dependency-cruiser 기반의 패키지 경계 강제는 tools/boundary에서 도입 예정.
// - generated/**는 codegen 산출물이므로 lint 대상에서 제외한다.
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** 하드코딩 색상(hex) · px 문자열 리터럴 검출 규칙 — apps/admin/eslint.config.js와 동일 기준 */
const noRawValueRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
      message:
        '하드코딩 색상(hex) 금지 — generated/tokens의 CSS 변수만 사용한다 (G5/G6 체크리스트, 토큰 필요 시 토큰 소유 영역에 요청)',
    },
    {
      selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]',
      message:
        '하드코딩 색상(hex) 금지 — generated/tokens의 CSS 변수만 사용한다 (G5/G6 체크리스트, 토큰 필요 시 토큰 소유 영역에 요청)',
    },
    {
      selector: 'Literal[value=/[0-9]px/]',
      message: '하드코딩 px 금지 — spacing/size 토큰 참조만 허용한다 (G5/G6 체크리스트)',
    },
    {
      selector: 'TemplateElement[value.raw=/[0-9]px/]',
      message: '하드코딩 px 금지 — spacing/size 토큰 참조만 허용한다 (G5/G6 체크리스트)',
    },
  ],
};

/** 레이어 역방향 의존 차단 패턴 생성기 — 방향: atoms ← molecules ← organisms ← templates */
const banLayer = (layer, from) => ({
  group: [`**/${layer}`, `**/${layer}/**`],
  message: `${from}은(는) ${layer}를 import할 수 없다 — 레이어 방향: atoms ← molecules ← organisms ← templates (G6 체크리스트)`,
});

/** UI 패키지 → 앱 코드 역방향 의존 차단 */
const banApps = {
  group: ['@tds/admin', '@tds/admin/*', '@tds/admin/*/**', '**/apps/**'],
  message: 'UI 패키지는 앱 코드를 import할 수 없다 — 역방향 의존 금지 (G6 체크리스트)',
};

export default tseslint.config(
  /* ── ① ignores ────────────────────────────────────────────────────────── */
  {
    ignores: ['generated/**', 'dist/**', 'storybook-static/**'],
  },

  /* ── ② 프리셋 ─────────────────────────────────────────────────────────── */
  {
    files: ['src/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Airbnb 의 실질 ①: 타입 안전성(strict) + 일관된 타입 표현(stylistic)
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      // Airbnb 의 실질 ②: import 그래프 위생 (순환·중복·해석 실패)
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      // Airbnb 의 실질 ③: React 관용구
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      // Airbnb 의 실질 ④: 접근성 — 디자인 시스템의 a11y 는 컴포넌트에서 결정된다 (접근성 감사 · G5)
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      // react-hooks v7 의 configs['recommended-latest'] 는 React Compiler 규칙군(15종)을 함께 켠다.
      // 그것은 별도 결정 사항이므로(ADR-0008 §5) 플러그인만 등록하고 규칙을 명시적으로 켠다.
      'react-hooks': reactHooks,
    },
    rules: {
      // 막는 버그: 조건문·루프 안의 훅 호출 → 렌더마다 훅 순서가 달라져 상태가 뒤섞인다.
      'react-hooks/rules-of-hooks': 'error',
      // 막는 버그: effect 가 참조하는 값이 deps 에 없어 stale closure 로 낡은 값을 읽는다.
      // packages/ui 는 위반 0건이므로 처음부터 error 다 (apps/admin 은 위반 3건이라 warn — ADR-0008 §5).
      'react-hooks/exhaustive-deps': 'error',

      // 막는 버그: import 순환 → 모듈 초기화 순서에 따라 undefined 를 읽는다.
      'import-x/no-cycle': 'error',
      // 막는 버그: 같은 모듈을 두 번 import 해 번들 중복·상태 중복을 만든다.
      'import-x/no-duplicates': 'error',

      // forbid 를 `>` `}` 로 좁힌다 — 한국어 본문의 `'`(인용부호)는 버그가 아니며 `&apos;` 로 바꾸면 원문이 읽히지 않는다.
      // 이 규칙이 실제로 막는 버그는 **닫히지 않은 JSX 표현식/태그가 문자로 렌더되는 것**이다.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },

  /* ── ③ eslint-config-prettier (서식 규칙 전면 off) ─────────────────────── */
  // 자동 수정으로 결정 가능한 것(들여쓰기·따옴표·세미콜론·줄바꿈·trailing comma)은 규칙이 아니라 포맷이다.
  // Prettier 가 소유한다(.prettierrc.json). ESLint 에는 '판단이 필요한 것'만 남긴다.
  prettierConfig,

  /* ── ③-b 단계적 도입 (warn) — ADR-0008 §5 ─────────────────────────────
   * 이번 프리셋 도입으로 **새로 켜졌고, 기존 코드에 위반이 존재하는** 규칙이다.
   * 위반 코드(packages/ui/src/**)의 수정은 컴포넌트 엔지니어의 소유 영역이므로 린트·포맷 담당이 고치지 않는다.
   * `// eslint-disable` 로 덮지 않는다 — 규칙은 그대로 두고 **심각도만 warn** 으로 두어 위반을
   * 가시화하고, 소유자가 해소한 뒤 error 로 승격한다. 승격 조건·기한은 ADR-0008 §5.
   * 위반이 0건이 되면 이 블록을 삭제한다 (프리셋 기본 심각도 error 로 복귀).
   */
  {
    files: ['src/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}'],
    rules: {
      // 막는 버그: interactive role 을 준 요소가 focusable 하지 않아 키보드로 도달할 수 없다.
      // 위반 1건 — src/molecules/SegmentedControl/SegmentedControl.tsx:48 (role="radiogroup", 소유 컴포넌트 엔지니어)
      'jsx-a11y/interactive-supports-focus': 'warn',
    },
  },

  /* ── ④ 커스텀 룰 — 조직의 방어선. 반드시 맨 마지막 ────────────────────── */
  {
    files: ['src/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}'],
    rules: {
      ...noRawValueRules,
      'no-restricted-imports': ['error', { patterns: [banApps] }],
    },
  },
  {
    files: ['src/atoms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            banApps,
            banLayer('molecules', 'atom'),
            banLayer('organisms', 'atom'),
            banLayer('templates', 'atom'),
          ],
        },
      ],
    },
  },
  {
    files: ['src/molecules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [banApps, banLayer('organisms', 'molecule'), banLayer('templates', 'molecule')],
        },
      ],
    },
  },
  {
    files: ['src/organisms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [banApps, banLayer('templates', 'organism')],
        },
      ],
    },
  },
);
