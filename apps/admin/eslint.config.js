// @tds/admin ESLint flat config (eslint 9) — 소유: A81 (Lint & Format Engineer)
//
// [배치 순서는 계약이다 — flat config 는 뒤에 오는 객체가 앞의 rules 를 통째로 덮어쓴다]
//   ① ignores → ② 프리셋 → ③ eslint-config-prettier → ④ **우리 커스텀 룰(맨 마지막)**
// 커스텀 룰이 마지막에 와야 프리셋이 방어선을 조용히 덮어쓰지 못한다. 순서를 바꾸지 말 것.
//
// [프리셋 선택 근거 — ADR-0008]
//   eslint-config-airbnb 는 ESLint 8 legacy(eslintrc) 전용이라 이 리포(flat config)에서 쓸 수 없다.
//   Airbnb 가 실제로 강제하는 규칙군을 공식 지원 패키지로 직접 구성한다:
//   typescript-eslint(strict+stylistic) · import-x · react · react-hooks · jsx-a11y.
//
// [방어선 4종 — 절대 약화 금지 (ADR-0008 · G6 체크리스트)]
//   ① 하드코딩 색상(hex) 금지  ② px 리터럴 금지
//   ③ @tds/ui deep import 금지 (public entry만)  ④ 레이어 역방향 의존 금지(packages/ui 쪽)
//   ※ ①②의 기준은 packages/ui/eslint.config.js 와 **동일해야 한다** — 한쪽만 고치지 않는다.
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** 하드코딩 색상(hex) · px 문자열 리터럴 검출 규칙 — packages/ui/eslint.config.js와 동일 기준 */
const noRawValueRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
      message: '하드코딩 색상(hex) 금지 — 토큰 파이프라인의 CSS 변수만 사용한다 (G6 체크리스트)',
    },
    {
      selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]',
      message: '하드코딩 색상(hex) 금지 — 토큰 파이프라인의 CSS 변수만 사용한다 (G6 체크리스트)',
    },
    {
      selector: 'Literal[value=/[0-9]px/]',
      message: '하드코딩 px 금지 — spacing/size 토큰 참조만 허용한다 (G6 체크리스트)',
    },
    {
      selector: 'TemplateElement[value.raw=/[0-9]px/]',
      message: '하드코딩 px 금지 — spacing/size 토큰 참조만 허용한다 (G6 체크리스트)',
    },
  ],
};

export default tseslint.config(
  /* ── ① ignores ────────────────────────────────────────────────────────── */
  {
    // schema.d.ts 는 openapi-typescript 생성물이다 (pnpm openapi:types) — 손으로 고치지 않으므로 린트하지 않는다.
    ignores: ['dist/**', 'src/shared/api/schema.d.ts'],
  },

  /* ── ② 프리셋 ─────────────────────────────────────────────────────────── */
  {
    files: ['src/**/*.{ts,tsx}'],
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
      // Airbnb 의 실질 ④: 접근성 — A72(a11y 게이트)의 정적 1차 방어선
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
      // 그것은 별도 결정 사항이므로(ADR-0008 §5 승격 계획) 여기서는 플러그인만 등록하고
      // 규칙 2종을 명시적으로 켠다 — 우리가 켠 규칙을 우리가 설명할 수 있어야 한다(A81의 존재 이유).
      'react-hooks': reactHooks,
    },
    rules: {
      // 막는 버그: 조건문·루프 안의 훅 호출 → 렌더마다 훅 순서가 달라져 상태가 뒤섞인다.
      'react-hooks/rules-of-hooks': 'error',

      // 막는 버그: import 순환 → 모듈 초기화 순서에 따라 undefined 를 읽는다.
      'import-x/no-cycle': 'error',

      // react/no-unescaped-entities 의 기본 forbid 는 `'` `"` 까지 포함하지만,
      // 우리 코드의 `'` 는 전부 **한국어 본문의 인용부호**('전체' 등)다 — `&apos;` 로 바꾸면 원문이 읽히지 않는다.
      // 이 규칙이 실제로 막는 버그는 **닫히지 않은 JSX 표현식/태그가 문자로 렌더되는 것**이므로
      // forbid 를 `>` `}` 로 좁힌다. 규칙을 끄지 않고 막는 버그만 남긴다.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },

  /* ── ③ eslint-config-prettier (서식 규칙 전면 off) ─────────────────────── */
  // 자동 수정으로 결정 가능한 것(들여쓰기·따옴표·세미콜론·줄바꿈·trailing comma)은 규칙이 아니라 포맷이다.
  // Prettier 가 소유한다(.prettierrc.json). ESLint 에는 '판단이 필요한 것'만 남긴다.
  prettierConfig,

  /* ── ③-b 단계적 도입 (warn) — ADR-0008 §5 ─────────────────────────────
   * 아래 규칙들은 이번 프리셋 도입으로 **새로 켜졌고, 기존 코드에 위반이 존재한다.**
   * 위반 코드(apps/admin/src/**)의 수정은 A41 의 소유 영역이므로 A81 이 고치지 않는다.
   * `// eslint-disable` 로 덮지 않는다 — 규칙은 그대로 두고 **심각도만 warn 으로 두어** 위반을
   * 가시화하고, 소유자가 해소한 뒤 error 로 승격한다. 승격 조건·기한은 ADR-0008 §5 에 확정돼 있다.
   * 위반이 0건이 되면 이 블록을 통째로 삭제한다 (프리셋의 기본 심각도 error 로 복귀).
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // 막는 버그: effect 가 참조하는 값이 deps 에 없어 stale closure 로 낡은 값을 읽는다. (위반 3건)
      'react-hooks/exhaustive-deps': 'warn',
      // 막는 버그: 같은 모듈을 두 번 import 해 번들 중복·상태 중복을 만든다. (위반 2건)
      'import-x/no-duplicates': 'warn',
      // 막는 버그: 라벨과 컨트롤이 연결되지 않아 스크린리더가 입력의 이름을 읽지 못한다. (위반 1건)
      'jsx-a11y/label-has-associated-control': 'warn',
      // 막는 버그: role 이 지원하지 않는 aria-* 를 붙여 보조기술이 상태를 잘못 읽는다. (위반 1건)
      'jsx-a11y/role-supports-aria-props': 'warn',
      // 막는 버그: 비대화형 요소에 클릭 핸들러만 달아 키보드 사용자가 도달하지 못한다. (위반 2건)
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      // 막는 버그: 동적 delete 가 객체 shape 을 런타임에 바꿔 최적화·타입 가정을 깬다. (위반 1건)
      '@typescript-eslint/no-dynamic-delete': 'warn',
      // 표현 일관성(stylistic) — readonly T[] 표기로 통일. (위반 1건)
      '@typescript-eslint/array-type': 'warn',
    },
  },

  /* ── ④ 커스텀 룰 — 조직의 방어선. 반드시 맨 마지막 ────────────────────── */
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      ...noRawValueRules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // '@tds/ui/tokens.css'는 packages/ui package.json exports의 공개 서브패스("./tokens.css")로
              // 제공되는 codegen 산출물 — deep import가 아니므로 유일한 예외로 허용한다 (src/main.tsx에서 import).
              group: ['@tds/ui/*', '@tds/ui/*/**', '!@tds/ui/tokens.css'],
              message:
                '@tds/ui 내부 경로 직접 import 금지 — public entry(@tds/ui)만 허용한다 (예외: 공개 서브패스 @tds/ui/tokens.css) (G6 체크리스트)',
            },
            {
              group: ['**/packages/ui/**'],
              message:
                '상대/절대 경로로 packages/ui 접근 금지 — public entry(@tds/ui)만 허용한다 (G6 체크리스트)',
            },
          ],
        },
      ],
    },
  },
);
