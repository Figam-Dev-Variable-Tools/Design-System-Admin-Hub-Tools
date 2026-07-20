// 문자 편집기 중앙 카드 — 툴바 · 본문 입력 · 첨부 이미지
//
// [왜 TextareaField(@tds/ui)가 아닌가] 그 컴포넌트는 FormField 에 라벨과 'N/max' 카운터를 맡긴다.
// 목업이 요구하는 것은 (가) 보라 구역 제목, (나) 입력 **안쪽 우하단**에 붙은 `(748 / 2000자)`
// 카운터다 — 둘 다 FormField 가 그리는 자리(위·바깥)와 다르다. 계약 컴포넌트를 인라인 스타일로
// 비틀 수는 없으므로(className/style 차단) 이 자리만 controlStyle 위에 직접 조립한다.
// 표면(테두리·라운드·여백·오류 테두리)은 여전히 공용 controlStyle 의 것이다.
import type { CSSProperties, ReactNode } from 'react';

import { Card, controlStyle, errorIdOf, errorTextStyle, hintIdOf } from '../../../../shared/ui';
import { byteLengthOf, LMS_SUBJECT_MAX_BYTES } from '../../_shared/messaging';
import {
  BODY_CALLOUT_LINES,
  BODY_PLACEHOLDER,
  BODY_PLACEHOLDER_INVALID,
  characterCounterOf,
  IMAGE_CALLOUT_LINES,
  LABEL_ATTACH_IMAGE,
  LABEL_CONTENT_INPUT,
  LABEL_SUBJECT,
  SUBJECT_CALLOUT_LINES,
  SUBJECT_PLACEHOLDER,
} from '../copy';
import { sectionHeadingStyle, sectionStyle } from '../styles';
import { TEXT_BODY_MAX } from '../types';
import { ImageAttachRow } from './ImageAttachRow';
import { InfoCallout } from './InfoCallout';
import { cssVar } from '@tds/ui';

const BODY_FIELD_ID = 'message-template-body';
const SUBJECT_FIELD_ID = 'message-template-subject';

/** 목업의 본문 상자 — 16줄 남짓. 파생 치수는 space 토큰의 calc 배수로만 표현한다 */
const textareaStyle = (invalid: boolean, disabled: boolean): CSSProperties => ({
  ...controlStyle(invalid, disabled),
  minHeight: 'calc(var(--tds-space-10) * 8)',
  // 카운터가 마지막 줄을 덮지 않도록 아래 여백을 넓힌다
  paddingBottom: cssVar('space.7'),
  resize: 'vertical',
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
});

/** 입력 안쪽 우하단 — 상자를 기준으로 절대 배치한다 */
const fieldWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const counterStyle: CSSProperties = {
  position: 'absolute',
  right: cssVar('space.3'),
  bottom: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
};

/** 제목 칸의 바이트 카운터 — 본문 카운터가 글자를 세는 것과 **다른 축**이다(제목은 byte 규격) */
const subjectCounterStyle: CSSProperties = {
  alignSelf: 'flex-end',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
};

interface ContentInputCardProps {
  readonly toolbar: ReactNode;
  /** 제목 — LMS/MMS 만 갖는다. 적으면 90byte 안이어도 LMS 로 승격된다(types.ts subject 머리말) */
  readonly subject: string;
  readonly body: string;
  readonly imageFileName: string;
  readonly disabled: boolean;
  /** 본문 오류 — 있으면 붉은 테두리 + 자리표시자 교체 + 아래 붉은 문구 */
  readonly bodyError?: string | undefined;
  /** 제목 오류 — 40byte 를 넘겼을 때 */
  readonly subjectError?: string | undefined;
  readonly onSubjectChange: (subject: string) => void;
  readonly onBodyChange: (body: string) => void;
  readonly onImageChange: (fileName: string) => void;
  /** 변수 삽입이 커서 자리를 알 수 있도록 편집기가 textarea 를 붙잡는다 */
  // @types/react 18 기준 — useRef<T>(null) 은 RefObject<T> 를 준다(19 의 RefObject<T | null> 아님).
  // 19 문법으로 적으면 textarea 의 ref(LegacyRef<T>)에 대입되지 않는다.
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ContentInputCard({
  toolbar,
  subject,
  body,
  imageFileName,
  disabled,
  bodyError,
  subjectError,
  onSubjectChange,
  onBodyChange,
  onImageChange,
  textareaRef,
}: ContentInputCardProps) {
  const invalid = bodyError !== undefined;
  const subjectInvalid = subjectError !== undefined;
  const subjectBytes = byteLengthOf(subject);

  return (
    <Card>
      {toolbar}

      {/* ── 제목 ────────────────────────────────────────────────────────────
          본문 **위**에 둔다 — 수신 화면에서 제목이 본문 위에 붙기 때문이다. 아래에 두면
          편집 순서와 수신 순서가 어긋나 미리보기를 볼 때마다 눈이 되돌아간다. */}
      <section style={sectionStyle}>
        <label htmlFor={SUBJECT_FIELD_ID} style={sectionHeadingStyle}>
          {LABEL_SUBJECT}
        </label>

        <div id={hintIdOf(SUBJECT_FIELD_ID)}>
          <InfoCallout lines={SUBJECT_CALLOUT_LINES} />
        </div>

        <input
          id={SUBJECT_FIELD_ID}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(subjectInvalid, disabled)}
          value={subject}
          disabled={disabled}
          aria-invalid={subjectInvalid}
          aria-describedby={
            subjectInvalid
              ? `${hintIdOf(SUBJECT_FIELD_ID)} ${errorIdOf(SUBJECT_FIELD_ID)}`
              : hintIdOf(SUBJECT_FIELD_ID)
          }
          placeholder={SUBJECT_PLACEHOLDER}
          onChange={(event) => onSubjectChange(event.target.value)}
        />
        {/* 제목은 **byte** 로 잰다 — 아래 본문 카운터가 글자를 세는 것과 다른 축이다(규격이 그렇다) */}
        <span style={subjectCounterStyle}>
          {`${String(subjectBytes)} / ${String(LMS_SUBJECT_MAX_BYTES)} byte`}
        </span>
        {subjectInvalid && (
          <p id={errorIdOf(SUBJECT_FIELD_ID)} style={errorTextStyle} role="alert">
            {subjectError}
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        {/*
          구역 제목은 <label> 이다 — 보라 제목이 곧 이 입력의 이름이라 별도 라벨을 또 두면 같은 이름이
          두 번 읽힌다. 필수 표식(*)은 시각 표현이고, AT 에는 aria-required 가 사실을 전한다.
        */}
        <label htmlFor={BODY_FIELD_ID} style={sectionHeadingStyle}>
          {`${LABEL_CONTENT_INPUT} *`}
        </label>

        <div id={hintIdOf(BODY_FIELD_ID)}>
          <InfoCallout lines={BODY_CALLOUT_LINES} />
        </div>

        <div style={fieldWrapStyle}>
          <textarea
            id={BODY_FIELD_ID}
            ref={textareaRef}
            className="tds-ui-input tds-ui-focusable"
            style={textareaStyle(invalid, disabled)}
            value={body}
            maxLength={TEXT_BODY_MAX}
            disabled={disabled}
            required
            aria-required="true"
            aria-invalid={invalid}
            aria-describedby={
              invalid
                ? `${hintIdOf(BODY_FIELD_ID)} ${errorIdOf(BODY_FIELD_ID)}`
                : hintIdOf(BODY_FIELD_ID)
            }
            placeholder={invalid ? BODY_PLACEHOLDER_INVALID : BODY_PLACEHOLDER}
            onChange={(event) => onBodyChange(event.target.value)}
          />
          {/* 글자 수로 센다 — 카운터가 '자' 라고 말하는 그대로다(등급은 바이트로 가른다) */}
          <span style={counterStyle}>{characterCounterOf(body.length)}</span>
        </div>

        {invalid && (
          <p id={errorIdOf(BODY_FIELD_ID)} style={errorTextStyle} role="alert">
            {bodyError}
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>{LABEL_ATTACH_IMAGE}</h3>
        <InfoCallout lines={IMAGE_CALLOUT_LINES} />
        <ImageAttachRow fileName={imageFileName} disabled={disabled} onChange={onImageChange} />
      </section>
    </Card>
  );
}
