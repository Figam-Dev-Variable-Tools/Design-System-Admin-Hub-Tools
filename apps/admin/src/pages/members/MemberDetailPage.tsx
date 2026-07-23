// MemberDetailPage — 회원 상세 (라우트: /users/members/:id)
//
// [핵심 규칙 — 지우지 말 것]
// 1. 회원 정보는 **전부 읽기 전용**이다. 입력 필드/드롭다운으로 만들지 않는다.
//    관리자가 바꿀 수 있는 유일한 값은 **비밀번호**뿐이다 (계정 복구 목적).
//    ※ '관리자 메모'와 '적립금 지급/차감'은 회원의 정보가 아니라 운영 기록이라 예외다.
// 2. **운영진 그룹 섹션을 만들지 않는다.** 운영진은 별도 뷰(/users/admins)의 관심사다.
// 3. 우측 상단 ⋯ 메뉴에는 **'회원 삭제' / '알림 발송' 두 개만** 둔다.
//
// [실패는 조용히 삼키지 않는다]
// 알림 발송·회원 삭제·비밀번호 변경·적립금 조정·내역 삭제·메모 저장은 실패할 수 있다.
// 성공은 성공 톤, 실패는 **위험 톤 배너 + 복구 경로(다시 시도)** 또는 다이얼로그/폼 안의 안내로 떨어진다.
//
// [이 화면은 회원 상세 하나다 — 재사용 주입은 없다]
// 예전 머리말은 '운영자 상세(/users/admins/:id)가 이 화면을 그대로 재사용한다' 고 적고,
// 그 재사용을 위해 목록 경로(listPath)와 상세 조회 함수(fetchDetail)를 props 로 받았다.
// **그 재사용은 이제 없다.** 운영자 상세는 자기 화면을 갖는다(pages/admins/AdminDetailPage.tsx).
// 남아 있던 두 prop 은 넘기는 곳이 한 군데도 없어 언제나 기본값으로만 돌았다 —
// 주입 가능한 척하는 상수였고, 다음 사람에게 '어딘가 다른 호출자가 있다' 고 거짓말을 했다.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import './members.css';
import { isAbort } from '../../shared/async';
import { Card as TdsCard, cssVar, Menu, Skeleton } from '@tds/ui';

import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import { Alert, Button, ConfirmDialog, useToast } from '../../shared/ui';
import { ActivityCard } from './components/ActivityCard';
import { ConsentCard } from './components/ConsentCard';
import { CouponsCard } from './components/CouponsCard';
import { MemberInfoCard } from './components/MemberInfoCard';
import { MemoCard } from './components/MemoCard';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { PointsCard } from './components/PointsCard';
import { fetchMemberDetail } from './data-source';
import { ArrowLeftIcon } from './icons';
import { useDeleteMember, useMemberDetailQuery, useSendNotification } from './queries';

/** 기본 목록 경로 — 회원 상세의 '리스트로 돌아가기' */
const LIST_PATH = '/users/members';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

const errorActionsStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  textDecoration: 'none',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  // 2단 — 좁은 화면에서는 auto-fit 이 한 단으로 접는다
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 16), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

/** 스켈레톤 줄들의 세로 간격 — 카드 표면은 @tds/ui Card 가 그린다 (사본을 쓰지 않는다) */
const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

function LoadingSkeleton() {
  return (
    <div style={gridStyle} aria-busy="true">
      {[0, 1].map((column) => (
        <div key={`col-${String(column)}`} style={columnStyle}>
          <TdsCard>
            <div style={skeletonBodyStyle}>
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          </TdsCard>
        </div>
      ))}
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const memberId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  /**
   * [EXC-03] 쓰기 게이팅 — 삭제는 remove, 알림 발송·비밀번호 변경은 update.
   *
   * 이 화면은 회원 정보를 **읽기 전용**으로 보여 주는 곳이라 read 만 있으면 열려도 된다. 막아야
   * 하는 것은 그 위에 얹힌 액션이다. 리소스는 라우트에서 파생되므로(route-resource.ts) 같은
   * 컴포넌트가 /users/members/:id 에서 그 라우트의 권한으로 판정된다 — 화면이 자기 리소스를
   * 이름으로 들고 있지 않아도 된다.
   */
  const { canUpdate, canRemove } = useRouteWritePermissions();

  // 캐시 키의 컨텍스트 축은 **더 이상 갈리지 않는다.** 이 화면을 여는 라우트가 하나뿐이고
  // 조회 함수도 하나뿐이라(위 머리말), 축은 언제나 같은 상수다. 그래도 키에서 빼지 않는 이유:
  // 축을 없애려면 queries.ts 의 memberKeys.detail 서명을 바꿔야 하고, 그 파일은 이 화면만의
  // 것이 아니다. 상수로 고정해 두면 '두 컨텍스트가 캐시를 공유한다' 는 옛 위험이 애초에
  // 성립하지 않고(컨텍스트가 하나다), 키 모양은 그대로라 무효화 규칙도 건드리지 않는다.
  //
  // [STATE-01] 스켈레톤 조건은 `data === undefined` **하나뿐이다** (아래 본문 분기).
  //
  // 예전엔 `isFetching || data === undefined` 였다. 무엇이 그것을 터뜨렸는가를 정확히 적는다 —
  // 이 화면의 쓰기(적립금 지급·상태 변경)는 **이 상세를 invalidate 하지 않는다**(queries.ts 는
  // memberKeys.lists() 만 무효화하고, 그 키는 detail 키의 접두사가 아니다). 진짜 방아쇠는
  // **목록 ↔ 상세 왕복**이다: queryClient 는 staleTime 30초에 refetchOnMount 기본값(true)이므로,
  // 30초 뒤 상세를 다시 열면 캐시된 데이터를 든 채(data 있음) 재조회가 돈다(isFetching true).
  // 그 순간 예전 조건은 **캐시가 이미 쥐고 있는 회원 카드를 스켈레톤으로 교체**했다 —
  // 캐시를 두고도 캐시의 이득(ADR-0008 §3.2)을 화면이 스스로 버린 셈이다.
  const { data, error, refetch } = useMemberDetailQuery(memberId, LIST_PATH, fetchMemberDetail);

  const [changingPassword, setChangingPassword] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const notify = useSendNotification();
  const deleteOne = useDeleteMember();
  const notifying = notify.isPending;
  const deleting = deleteOne.isPending;

  /** ⋯ '알림 발송' — 확인 절차 없이 즉시 요청한다. 진행 중에는 메뉴 항목이 잠긴다 */
  const onNotify: () => void = () => {
    if (notifying) return;

    notify.mutate(memberId, {
      onSuccess: () => {
        toast.success('회원에게 알림을 발송했어요.');
      },
      onError: () => {
        toast.error('알림을 발송하지 못했어요. 잠시 후 다시 시도해 주세요.', { retry: onNotify });
      },
    });
  };

  /** 다이얼로그를 닫으면 진행 중이던 삭제 요청도 취소한다 */
  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    deleteOne.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    const controller = new AbortController();
    deleteControllerRef.current = controller;

    setDeleteError(null);

    deleteOne.mutate(
      { memberId, signal: controller.signal },
      {
        onSuccess: () => {
          // 삭제된 회원의 상세에 머물 수 없다 — 목록으로 돌려보낸다(히스토리 대체).
          // 결과는 토스트가 나른다 — 페이지가 바뀌어도 살아남는 유일한 통지 수단이다.
          toast.success(
            data === undefined ? '회원을 삭제했어요.' : `${data.nickname} 회원을 삭제했어요.`,
          );
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 실패하면 다이얼로그를 닫지 않는다 — 안내를 띄우고 버튼을 되살린다(재클릭 = 재시도)
          setDeleteError('회원을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <Link to={LIST_PATH} style={backLinkStyle} className="tds-ui-link tds-ui-focusable">
          <ArrowLeftIcon />
          리스트로 돌아가기
        </Link>

        {/* 권한이 하나도 없으면 ⋯ 버튼 자체를 그리지 않는다 — 열어 봐야 빈 메뉴다 */}
        {data !== undefined && (canUpdate || canRemove) && (
          <Menu
            label={`${data.nickname} 회원 액션`}
            items={[
              ...(canRemove ? [{ id: 'delete', label: '회원 삭제', danger: true }] : []),
              ...(canUpdate
                ? [
                    {
                      id: 'notify',
                      // 발송 중에는 라벨로 진행을 알리고 재클릭을 막는다
                      label: notifying ? '발송 중…' : '알림 발송',
                      disabled: notifying,
                    },
                  ]
                : []),
            ]}
            onSelect={(id) => {
              if (id === 'delete') {
                setDeleteError(null);
                setConfirmingDelete(true);
                return;
              }
              onNotify();
            }}
          />
        )}
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={topRowStyle}>
            <span>
              {error.message === '회원을 찾을 수 없어요'
                ? '회원을 찾을 수 없어요.'
                : '회원 정보를 불러오지 못했어요.'}
            </span>
            <span style={errorActionsStyle}>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
              <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
                목록으로
              </Button>
            </span>
          </div>
        </Alert>
      ) : data === undefined ? (
        <LoadingSkeleton />
      ) : (
        <div style={gridStyle}>
          {/* 좌측 — 회원이 제출한 정보 (전부 읽기 전용) */}
          <div style={columnStyle}>
            {/* 비밀번호 변경은 회원 정보를 바꾸는 유일한 액션이다 — update 권한이 없으면 null */}
            <MemberInfoCard
              detail={data}
              onChangePassword={canUpdate ? () => setChangingPassword(true) : null}
            />
            <ConsentCard consents={data.consents} />
          </div>

          {/* 우측 — 운영 기록 (활동 · 적립금 · 쿠폰 · 관리자 메모) */}
          <div style={columnStyle}>
            <ActivityCard detail={data} />
            <PointsCard
              memberId={data.id}
              initialPoints={data.points}
              initialHistory={data.pointHistory}
              canUpdate={canUpdate}
              canRemove={canRemove}
            />
            <CouponsCard coupons={data.coupons} />
            <MemoCard memberId={data.id} initialMemo={data.memo} canUpdate={canUpdate} />
          </div>
        </div>
      )}

      {changingPassword && data !== undefined && (
        <PasswordChangeModal
          memberId={data.id}
          onClose={() => setChangingPassword(false)}
          onSaved={() => {
            setChangingPassword(false);
            toast.success('비밀번호를 변경했어요.');
          }}
        />
      )}

      {confirmingDelete && data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="회원 삭제"
          message={`${data.nickname}(${data.account}) 회원을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="회원 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
