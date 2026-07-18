// AUTO-GENERATED from contracts/FormField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Forms · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type FormFieldState = 'default' | 'error';

/**
 * 라벨 붙은 폼 필드 껍데기 — 라벨(+필수 표식·ⓘ 도움말) · 우측 글자수 카운터 · 컨트롤 슬롯 · 인라인 오류/힌트를 한 골격으로 묶는다. 출처: apps/admin/src/shared/ui/FormField.tsx (소비 45곳: 콘텐츠·회원·상품·마케팅·영업·예약·지원 폼 전반). 이 골격을 페이지마다 손으로 그리면 오류 문구 자리·필수 표식이 화면마다 어긋난다.

[도메인을 모른다] 무슨 필드인지 알지 못한다 — 라벨/오류/힌트 문자열과 자식 컨트롤만 받는다. 컨트롤 자체(input/select/textarea)는 호출부가 children 으로 넣고, 이 껍데기는 label 의 htmlFor 로만 컨트롤과 잇는다.

[오류·힌트 id 파생 — 헬퍼] 오류는 role=alert + 붉은(feedback.danger) 텍스트로 색·시맨틱 이중 전달한다(WCAG 1.4.1). 오류/힌트 <p> 의 id 는 htmlFor 에서 파생한다 — 동반 헬퍼 errorIdOf(htmlFor)·hintIdOf(htmlFor) 를 노출해 호출부가 컨트롤의 aria-describedby 에 물릴 수 있게 한다 (TextField 의 textFieldErrorId 선례). 이 두 헬퍼는 계약 prop 이 아니라 함수로 export 된다.

[의존] 라벨 옆 ⓘ 도움말은 HelpTip(atom) 을 조립해 그린다 (dependencies: HelpTip).

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·counter)은 호출부가 error={errors.x?.message}(string|undefined)를 그대로 넘긴다. 구현은 계약 타입(?: string)을 그 경계에서 undefined 허용으로 넓혀 받고 빈 문자열/undefined 를 '오류 없음'으로 정규화한다 (TriStateCheckbox.describedBy 의 '' 정규화 선례) — 45곳 호출부 무변경.
 */
export interface FormFieldProps {
  /**
   * 컨트롤의 id — <label> 의 htmlFor 와 잇는다. 힌트/오류 <p> 의 id 는 여기서 파생한다(errorIdOf·hintIdOf)
   */
  htmlFor: string;
  /**
   * 필드 레이블 텍스트. 시각적으로 노출되며 htmlFor 로 컨트롤의 접근 가능한 이름이 된다
   */
  label: string;
  /**
   * 필수 필드 — 레이블 옆에 붉은 시각 마커(*)를 붙인다. 마커는 aria-hidden 장식이다(라벨 텍스트 오염 방지). 마커만으로는 필수 여부가 AT 에 닿지 않으므로, 구현이 이 값을 **단일 폼 컨트롤 자식의 aria-required 로 주입**한다 (a11y.aria.required-wiring — A11Y-11). 실제 필수 검증은 자식 컨트롤/스키마가 소유한다
   * @default false
   */
  required?: boolean;
  /**
   * 인라인 오류 메시지. 빈 문자열/미지정이면 오류 없음(힌트를 대신 그린다). 값이 있으면 role=alert 로 오류 <p>(id=errorIdOf(htmlFor))를 그린다. 호출부는 errors.x?.message(string|undefined)를 그대로 넘긴다 — 구현이 정규화한다
   * @default ""
   */
  error?: string;
  /**
   * 보조 안내 문구. 오류가 없을 때만 힌트 <p>(id=hintIdOf(htmlFor))로 그린다. 빈 문자열/미지정이면 그리지 않는다
   * @default ""
   */
  hint?: string;
  /**
   * 우측 상단 글자수 카운터 표시 문자열('12/500' 등). 빈 문자열/미지정이면 그리지 않는다. tabular-nums 로 자릿수 흔들림을 막는다
   * @default ""
   */
  counter?: string;
  /**
   * 라벨 옆 ⓘ 도움말 패널 본문 — 있으면 HelpTip(atom) 을 그려 열면 설명이 펼쳐진다. 미지정이면 도움말을 그리지 않는다
   * @default null
   */
  help?: ReactNode;
  /**
   * 폼 컨트롤 슬롯 — input/select/textarea 를 호출부가 넣는다. 이 껍데기는 감싸지 않고 그대로 렌더한다
   */
  children: ReactNode;
}
