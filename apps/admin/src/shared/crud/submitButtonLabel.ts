// 폼 저장 버튼 라벨 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용 선언적 CRUD 프레임워크)
//
// 모든 등록/수정 폼(FormPageShell 포함)이 같은 3분기 라벨을 반복한다:
//   저장 중이면 '저장 중…', 아니면 수정이면 '저장' · 등록이면 '등록'.
// 한 벌로 모아 각 폼 render 의 삼항 분기를 제거한다(동작·문구 불변).
export function submitButtonLabel(saving: boolean, isEdit: boolean): string {
  if (saving) return '저장 중…';
  return isEdit ? '저장' : '등록';
}
