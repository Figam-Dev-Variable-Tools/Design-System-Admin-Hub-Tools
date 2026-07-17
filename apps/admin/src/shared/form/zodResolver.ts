// react-hook-form ↔ zod 연결 (ADR-0008 §7.2 · §7.3 집행)
//
// [왜 손으로 썼는가 — 의존성 관리 쪽 변경 요청 대상]
// 정식 어댑터는 `@hookform/resolvers/zod` 다. 그러나 ADR-0008 §3.3 이 그 패키지를
// **의도적으로 설치하지 않았고**("프론트에서 zod 결합을 실제로 쓸 때 요청한다"),
// `package.json` 은 의존성 관리 영역이라 여기서 `pnpm add` 를 실행할 수 없다.
//
// 그래서 RHF 의 **공개 확장점인 `resolver` 옵션**(문서화된 계약: `(values) => { values, errors }`)에
// 스키마를 꽂는 어댑터를 **이 파일 하나에만** 둔다. 폼마다 검증 로직을 복제하지 않는다 —
// 검증 규칙의 정본은 각 폼의 **zod 스키마**이고, 이 파일은 규칙을 담지 않는다(형식 변환만 한다).
//
// → **의존성 관리 후속 과제**: `@hookform/resolvers` 설치 후 이 파일을 지우고 `zodResolver` 로 교체한다.
//   그때 지울 것은 이 파일 하나뿐이다 (사용처는 `useForm({ resolver })` 한 줄씩).
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { ZodMiniType } from 'zod/mini';

/**
 * zod 스키마를 RHF resolver 로 감싼다.
 *
 * 필드당 **첫 번째** 이슈만 싣는다 — 화면은 입력 아래에 한 줄만 보여주고,
 * 스키마의 체크 순서가 곧 우선순위다(예: '필수' 가 '형식' 보다 앞선다).
 */
export function zodResolver<TValues extends FieldValues>(
  schema: ZodMiniType<TValues, unknown>,
): Resolver<TValues> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join('.');
      // 첫 이슈만 남긴다 — 뒤에 오는 같은 필드의 이슈는 버린다
      if (path === '' || path in errors) continue;
      errors[path] = { type: issue.code, message: issue.message };
    }

    return { values: {}, errors: errors as FieldErrors<TValues> };
  };
}
