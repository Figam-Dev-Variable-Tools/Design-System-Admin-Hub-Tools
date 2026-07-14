# 레이어 의존 규칙 (A40 react-engineer 참고 문서)

> 원천: docs/architecture/org-design-v2.md §4 금지 규칙, §8 G6 체크리스트.
> 위반은 `pnpm lint`(dependency-cruiser + eslint-plugin-boundaries)와 A02 Boundary Enforcer가 차단한다.

## 1. 방향 규칙 — Atom ← Molecule ← Organism

Atomic Design 레이어는 **단방향으로만** 의존한다. 화살표는 "import 당하는" 방향이다.

```
Atom ← Molecule ← Organism ← Template ← App(apps/*/src)
```

즉, Molecule은 Atom을 import할 수 있지만 **Atom은 Molecule을 import할 수 없다** (역방향 의존 금지).

| import 하는 쪽 | import 가능 대상 |
|---|---|
| Atom | 다른 컴포넌트 import 금지 — 토큰 · 내부 유틸만 |
| Molecule | Atom |
| Organism | Atom, Molecule |
| Template | Atom, Molecule, Organism |
| App (`apps/*/src`) | `@tds/ui` public entry 전체 |

## 2. 앱 코드 import 규칙 — public entry만

`apps/*/src`는 `packages/ui` 내부 경로를 **절대 직접 import하지 않는다**. 계약 생성 타입도 public entry로 재노출된 것을 사용한다. (`packages/ui/generated/**` 읽기 권한은 타입 구조 파악용이며, import 경로로 쓰라는 뜻이 아니다.)

```tsx
// O — public entry
import { Button, Select } from '@tds/ui';
import type { ButtonProps } from '@tds/ui'; // 계약 생성 타입 (codegen이 public entry로 재노출)

// X — deep import (전부 G6 blocker)
import { Button } from '@tds/ui/src/atoms/Button';
import { Button } from 'packages/ui/src/atoms/Button/Button';
import type { ButtonProps } from '../../../packages/ui/generated/Button.types';
```

역방향도 금지: `packages/ui`가 `apps/**`를 import하면 안 된다 (eslint-plugin-boundaries).

## 3. dependency-cruiser 규칙 예시

설정 파일(`*.config.*`)은 **A01(Architecture AI) 소유**다 — 규칙 추가/변경이 필요하면 A01에 change_request를 발행한다. 아래는 시행 중인 규칙의 참고 발췌이며, A40은 이 파일을 편집하지 않는다.

```js
// .dependency-cruiser.cjs (참고 발췌 — 원본 소유: A01)
module.exports = {
  forbidden: [
    {
      name: 'no-atom-upward',
      comment: 'Atom은 상위 레이어(Molecule/Organism/Template)를 import할 수 없다',
      severity: 'error',
      from: { path: '^packages/ui/src/atoms' },
      to: { path: '^packages/ui/src/(molecules|organisms|templates)' }
    },
    {
      name: 'no-molecule-upward',
      comment: 'Molecule은 Organism/Template을 import할 수 없다',
      severity: 'error',
      from: { path: '^packages/ui/src/molecules' },
      to: { path: '^packages/ui/src/(organisms|templates)' }
    },
    {
      name: 'no-organism-upward',
      comment: 'Organism은 Template을 import할 수 없다',
      severity: 'error',
      from: { path: '^packages/ui/src/organisms' },
      to: { path: '^packages/ui/src/templates' }
    },
    {
      name: 'no-app-deep-import',
      comment: '앱 코드는 @tds/ui public entry로만 — packages/ui 내부 경로 직접 참조 금지',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^packages/ui/(src|generated)/' }
    },
    {
      name: 'no-ui-to-app',
      comment: 'UI 패키지 → 앱 역방향 의존 금지',
      severity: 'error',
      from: { path: '^packages/ui' },
      to: { path: '^apps/' }
    }
  ]
};
```

## 4. 위반 시 처리

1. pre-commit / `pnpm lint` 단계에서 차단 (dependency-cruiser + eslint-plugin-boundaries)
2. PR 단계에서 A02 Boundary Enforcer가 CODEOWNERS 기반으로 차단
3. G6 검수에서 A42가 체크리스트 항목 "레이어 의존 방향 준수" / "packages/ui 내부 경로 직접 import 금지" 위반으로 반려
4. 규칙 자체가 부당하다고 판단되면 — 위반 커밋 대신 **A01에 규칙 개정 change_request**를 발행한다
