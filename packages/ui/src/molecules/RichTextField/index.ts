// RichTextField (molecule) — 배럴 export
//
// 에디터 본체(RichTextFieldEditor)는 **일부러 내보내지 않는다** — RichTextField 가 React.lazy 로만
// 부르는 청크다. 배럴에서 내보내면 정적 import 경로가 생겨 Tiptap 이 메인 번들로 되돌아온다.
export {
  RichTextField,
  ensureRichText,
  isRichTextEmpty,
  plainToRichText,
  richTextLength,
  sanitizeRichText,
} from './RichTextField';
export type {
  RichTextFieldProps,
  RichTextFieldState,
} from '../../../generated/types/RichTextField.types';
