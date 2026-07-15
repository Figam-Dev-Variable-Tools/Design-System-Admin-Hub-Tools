// 이미지 파일 클라이언트 검증 (A41 소유 — apps/admin/src/shared/ui/**)
//
// 단일 업로드(ImageUploadField)와 다중 갤러리(ImageGalleryField)가 같은 규칙으로 파일을 막는다:
// 이미지 타입(image/*)·용량 상한. 두 컴포넌트가 복사하지 않게 규칙을 여기 한 벌만 둔다.

/** 위반이면 인라인에 띄울 오류 문구, 통과면 null. **테스트가 이 순수 함수를 직접 부른다.** */
export function imageFileError(file: File, maxSizeMB: number): string | null {
  if (!file.type.startsWith('image/')) return '이미지 파일만 올릴 수 있습니다.';
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `파일 용량은 ${String(maxSizeMB)}MB 를 넘을 수 없습니다.`;
  }
  return null;
}
