// 상세 페이로드 뷰 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [읽기 전용이다 — 그리고 그것이 눈에 보여야 한다]
//
// 이 다이얼로그의 푸터에는 **'닫기' 하나뿐**이다. 저장도 삭제도 없다. 폼이 아니므로
// 미저장 이탈 가드(FEEDBACK-04/06)가 걸릴 대상 자체가 없다 — dirty 해질 수 있는 입력이 없다.
// Esc·딤 클릭·× 로 언제든 닫힌다. 감사 기록을 열어 본 것은 아무것도 바꾸지 않는다.
//
// [민감정보는 여기서 가려진다 — masking.ts]
// 페이로드는 요청 본문 그대로다. 그 안에는 비밀번호·토큰·카드번호가 실제로 들어 있다.
// **화면에 닿는 유일한 경로가 formatMaskedPayload 다** — 날것을 그리는 분기는 이 파일에 없다.
// 키는 남기고 값만 가린다: `password` 필드가 있었다는 사실은 감사에 필요하고, 그 값은 아니다.
//
// [왜 라우트가 아니라 다이얼로그인가]
// 상세에서 할 일이 '읽는 것' 뿐이고 목록의 맥락(어느 필터로 좁힌 결과의 몇 번째 행인가)이
// 상세를 읽는 동안에도 필요하기 때문이다. IA-06 의 무게 규칙: 편집할 것이 없는 짧은 읽기는
// 전용 라우트를 만들 이유가 없다 — 라우트를 만들면 목록으로 돌아올 때마다 조회가 다시 돈다.
// ─────────────────────────────────────────────────────────────────────────────
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { TIME_ZONE_NOTICE } from '../../../shared/format';
import { Button, ddStyle, dlStyle, dtStyle, Modal } from '../../../shared/ui';
import { formatMaskedPayload } from '../masking';
import type { LogDetail } from '../types';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

interface LogPayloadDialogProps {
  readonly detail: LogDetail;
  readonly onClose: () => void;
}

export function LogPayloadDialog({ detail, onClose }: LogPayloadDialogProps) {
  // A11Y-02 — 제목만이 아니라 '무엇에 대한 다이얼로그인가' 도 함께 읽히게 한다
  const bodyId = useId();

  return (
    <Modal
      title={detail.title}
      onClose={onClose}
      describedBy={bodyId}
      footer={
        // 읽기 전용 — 닫기 외의 선택지가 없다. 그것이 이 화면의 계약이다
        <Button variant="secondary" size="md" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <div style={bodyStyle} id={bodyId}>
        <section style={sectionStyle}>
          {/* IA-11 — 읽기 전용 레코드는 공유 dl/dt/dd 로 그린다 (손수 만든 key/value 격자 금지) */}
          <dl style={dlStyle}>
            {detail.fields.map((field) => (
              <div key={field.label} style={{ display: 'contents' }}>
                <dt style={dtStyle}>{field.label}</dt>
                <dd style={ddStyle}>{field.value}</dd>
              </div>
            ))}
          </dl>
          <p className="tds-log-mask-note">{TIME_ZONE_NOTICE}</p>
        </section>

        {detail.payload !== null && (
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>{detail.payloadLabel}</h3>

            {/* 가려진 이유를 말한다 — 말하지 않으면 '값이 깨졌다'로 읽히고, 운영자는 없는 버그를 신고한다 */}
            <p className="tds-log-mask-note">
              비밀번호 · 토큰 · 인증 키 · 카드/계좌 번호 등 민감한 값은 자동으로 가려집니다. 필드가
              있었다는 사실은 남고 값만 가려집니다.
            </p>

            <pre className="tds-log-payload">{formatMaskedPayload(detail.payload)}</pre>
          </section>
        )}
      </div>
    </Modal>
  );
}
