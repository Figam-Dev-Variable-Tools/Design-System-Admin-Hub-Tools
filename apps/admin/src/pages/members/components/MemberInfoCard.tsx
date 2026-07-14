// 회원 정보 카드 (A40 소유)
//
// [읽기 전용 원칙] 여기 있는 값은 **전부 텍스트**다. input/select 로 만들지 않는다.
// 관리자가 바꿀 수 있는 유일한 항목은 비밀번호이며, 그것만 버튼으로 모달을 연다.
//
// [운영진 그룹 없음] 운영진/권한은 /users/admins 의 관심사다 — 일반 회원 상세에 노출하지 않는다.
import type { CSSProperties, ReactNode } from 'react';

import {
  Button,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { initialOf } from '../../../shared/format';
import { TIER_LABEL } from '../types';
import type { MemberDetail } from '../types';

const identityStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-4)',
};

/** 아바타 — 프로필 이미지가 없으므로 닉네임 이니셜 원형으로 대신한다 */
const avatarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 'calc(var(--tds-space-6) * 2)',
  height: 'calc(var(--tds-space-6) * 2)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-action-primary-default)',
  color: 'var(--tds-color-text-on-primary)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const nameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
};

const nicknameStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
  overflowWrap: 'anywhere',
};

const accountStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  overflowWrap: 'anywhere',
};

const passwordRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

/** 값이 비면 '—' — 빈칸이 그냥 누락처럼 보이지 않게 한다 */
function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

function text(value: string): string {
  return value.trim() === '' ? '—' : value;
}

interface MemberInfoCardProps {
  readonly detail: MemberDetail;
  readonly onChangePassword: () => void;
}

export function MemberInfoCard({ detail, onChangePassword }: MemberInfoCardProps) {
  return (
    <Card aria-labelledby="member-info-title">
      <CardTitle id="member-info-title">회원 정보</CardTitle>

      <div style={identityStyle}>
        <span style={avatarStyle} aria-hidden="true">
          {initialOf(detail.nickname)}
        </span>
        <span style={nameStyle}>
          <span style={nicknameStyle}>{detail.nickname}</span>
          <span style={accountStyle}>{detail.account}</span>
        </span>
      </div>

      <dl style={dlStyle}>
        <Row label="추천인 코드">{text(detail.referralCode)}</Row>
        <Row label="회원 유형">{TIER_LABEL[detail.tier]}</Row>
        <Row label="계정">{detail.account}</Row>

        <Row label="비밀번호">
          <span style={passwordRowStyle}>
            {/* 실제 값은 절대 내려오지 않는다 — 자리표시자만 보여준다 */}
            <span aria-hidden="true">••••••••</span>
            <span style={visuallyHiddenStyle}>비밀번호는 표시되지 않습니다</span>
            <Button variant="secondary" onClick={onChangePassword}>
              비밀번호 변경
            </Button>
          </span>
        </Row>

        <Row label="이름">{text(detail.name)}</Row>
        <Row label="연락처">{text(detail.phone)}</Row>
        <Row label="국가">{text(detail.country)}</Row>
        <Row label="주소">{text(detail.address)}</Row>
        <Row label="상세주소">{text(detail.addressDetail)}</Row>
        <Row label="생년월일">{text(detail.birthday)}</Row>
        <Row label="소셜 로그인">{text(detail.socialLogin)}</Row>
        <Row label="추천인">{text(detail.referrer)}</Row>
      </dl>
    </Card>
  );
}
