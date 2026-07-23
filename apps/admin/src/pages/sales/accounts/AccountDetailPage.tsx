// AccountDetailPage — 거래처 상세 (라우트: /sales/accounts/:id)
//
// [왜 만들었나 — 두 가지 결함을 한 화면이 함께 푼다]
// ① 거래처에는 읽기 전용 상세가 없었다. 담당자·여신한도·결제조건·신용등급을 **보기만** 하려는
//    조회 전용 역할도 수정 폼(/:id/edit)을 열어야 했다 — 고칠 수 없는 사람에게 편집 화면을 여는 것은
//    그 자체로 오조작의 초대장이다. 이 화면은 전부 읽기 전용이고, 수정은 명시적 버튼 하나뿐이다.
// ② **거래처 → 그 거래처의 계약/견적/프로젝트** 역방향 조회가 앱 전체에 없었다. 계약도 견적도
//    거래처를 자유 입력 문자열로 들고 있었으니 애초에 물을 수 없는 질문이었다. accountId 참조가
//    생긴 지금(../_shared/account-reference) 그 질문에 답하는 곳이 여기다.
//
// [세 이력을 각각 조회한다] 모듈마다 어댑터가 따로다(계약·견적·프로젝트). 한 요청으로 합치려면
// 서버가 필요하고, 지금은 픽스처라 세 목록을 받아 accountId 로 거른다 — 필터는 순수 함수 하나
// (filterByAccount)라 세 구획이 같은 규칙을 쓴다. 백엔드가 붙으면 각 TODO(backend) 자리에
// `?accountId=` 질의가 들어오고 화면은 그대로 둔다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { isNotFound } from '../../../shared/errors/http-error';
import { DetailCellLink, useCrudListQuery } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  hintStyle,
  inlineBadgeRowStyle,
  Icon,
  mutedTextStyle,
  pageTitleStyle,
  StatusBadge,
} from '../../../shared/ui';
import { filterByAccount } from '../_shared/account-reference';
import { formatWon } from '../_shared/business';
import { contractAdapter } from '../contracts/data-source';
import { contractStatusMeta, contractTypeLabel } from '../contracts/types';
import type { Contract } from '../contracts/types';
import { quoteAdapter } from '../quotes/data-source';
import { computeTotals, quoteStatusMeta } from '../quotes/types';
import type { Quote } from '../quotes/types';
import { projectAdapter } from '../projects/data-source';
import { stageLabel, stageTone } from '../projects/types';
import type { Project } from '../projects/types';
import { accountAdapter } from './data-source';
import { RelatedRecordsCard } from './components/RelatedRecordsCard';
import type { RelatedColumn } from './components/RelatedRecordsCard';
import {
  creditGradeLabel,
  creditGradeTone,
  paymentTermLabel,
  taxTypeLabel,
  tradeTypeLabel,
  tradeTypeTone,
} from './types';

const RESOURCE = 'sales-accounts';
const LIST_PATH = '/sales/accounts';
const CONTRACT_PATH = '/sales/contracts';
const QUOTE_PATH = '/sales/quotes';
const PROJECT_PATH = '/sales/projects';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: cssVar('space.2'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const contactListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const contactItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
};

const contactNameStyle: CSSProperties = {
  // 담당자 이름 옆 '대표담당' 배지 — 간격의 정의는 공용 상수 하나다(shared/ui/styles.ts)
  ...inlineBadgeRowStyle,
  display: 'flex',
  fontSize: cssVar('typography.label.md.font-size'),
};

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/** 빈 문자열은 '값이 없다' 는 뜻이다 — 빈 칸으로 두면 로딩 중인지 없는 것인지 구분되지 않는다 */
const dash = (value: string): string => (value.trim() === '' ? '—' : value);

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accountId = id ?? '';
  const navigate = useNavigate();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', accountId],
    queryFn: ({ signal }) => accountAdapter.fetchOne(accountId, signal),
    enabled: id !== undefined,
  });
  const account = detailQuery.data;

  // TODO(backend): GET /api/sales/{contracts,quotes,projects}?accountId=:id
  //   — 지금은 목록을 받아 화면에서 거른다(픽스처). 서버가 붙으면 질의만 바뀌고 아래는 그대로다.
  const contractsQuery = useCrudListQuery('sales-contracts', contractAdapter);
  const quotesQuery = useCrudListQuery('sales-quotes', quoteAdapter);
  const projectsQuery = useCrudListQuery('sales-projects', projectAdapter);

  const contracts = filterByAccount(contractsQuery.data ?? [], accountId);
  const quotes = filterByAccount(quotesQuery.data ?? [], accountId);
  const projects = filterByAccount(projectsQuery.data ?? [], accountId);

  const contractColumns: readonly RelatedColumn<Contract>[] = [
    {
      id: 'title',
      header: '계약명',
      // 계약은 아직 읽기 전용 상세가 없다 — 유일한 조회 표면인 수정 폼으로 간다.
      render: (item) => (
        <DetailCellLink to={`${CONTRACT_PATH}/${item.id}/edit`}>{item.title}</DetailCellLink>
      ),
    },
    {
      id: 'type',
      header: '유형',
      nowrap: true,
      render: (item) => contractTypeLabel(item.contractType),
    },
    {
      id: 'period',
      header: '계약기간',
      nowrap: true,
      render: (item) => <span style={mutedTextStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
    { id: 'amount', header: '금액', numeric: true, render: (item) => formatWon(item.amount) },
    {
      id: 'status',
      header: '상태',
      nowrap: true,
      render: (item) => {
        const meta = contractStatusMeta(item.status);
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
  ];

  const quoteColumns: readonly RelatedColumn<Quote>[] = [
    {
      id: 'quoteNo',
      header: '견적번호',
      nowrap: true,
      render: (item) => (
        <DetailCellLink to={`${QUOTE_PATH}/${item.id}`}>
          <span style={numericStyle}>{item.quoteNo}</span>
        </DetailCellLink>
      ),
    },
    { id: 'issueDate', header: '견적일', nowrap: true, render: (item) => item.issueDate },
    {
      id: 'total',
      header: '합계금액',
      numeric: true,
      render: (item) => formatWon(computeTotals(item.items, item.taxMode).total),
    },
    {
      id: 'status',
      header: '상태',
      nowrap: true,
      render: (item) => {
        const meta = quoteStatusMeta(item.status);
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
  ];

  const projectColumns: readonly RelatedColumn<Project>[] = [
    {
      id: 'name',
      header: '프로젝트명',
      // 프로젝트도 상세가 없어 수정 폼이 유일한 조회 표면이다.
      render: (item) => (
        <DetailCellLink to={`${PROJECT_PATH}/${item.id}/edit`}>{item.name}</DetailCellLink>
      ),
    },
    {
      id: 'stage',
      header: '단계',
      nowrap: true,
      render: (item) => <StatusBadge tone={stageTone(item.stage)} label={stageLabel(item.stage)} />,
    },
    {
      id: 'revenue',
      header: '예상매출',
      numeric: true,
      render: (item) => formatWon(item.expectedRevenue),
    },
    {
      id: 'period',
      header: '기간',
      nowrap: true,
      render: (item) => <span style={mutedTextStyle}>{`${item.startAt} ~ ${item.endAt}`}</span>,
    },
  ];

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 거래처에 '다시 시도'는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '거래처를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '거래처를 불러오지 못했어요.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      {account === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <div style={headRowStyle}>
            <div>
              <h1 style={pageTitleStyle}>{account.name}</h1>
              <div style={badgeRowStyle}>
                <StatusBadge
                  tone={tradeTypeTone(account.tradeType)}
                  label={tradeTypeLabel(account.tradeType)}
                />
                <StatusBadge
                  tone={creditGradeTone(account.creditGrade)}
                  label={`신용 ${creditGradeLabel(account.creditGrade)}`}
                />
                <StatusBadge
                  tone={account.active ? 'success' : 'neutral'}
                  label={account.active ? '거래중' : '거래중지'}
                />
              </div>
            </div>
            {/* 이 화면은 읽기 전용이다 — 고치는 길은 이 버튼 하나뿐이고, 권한이 없으면 없다 (EXC-03) */}
            {canUpdate && (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`${LIST_PATH}/${account.id}/edit`)}
              >
                거래처 수정
              </Button>
            )}
          </div>

          <div style={gridStyle}>
            <Card>
              <CardTitle>기본 정보</CardTitle>
              <dl style={dlStyle}>
                <dt style={dtStyle}>상호</dt>
                <dd style={ddStyle}>{account.name}</dd>
                <dt style={dtStyle}>사업자등록번호</dt>
                <dd style={{ ...ddStyle, ...numericStyle }}>{dash(account.bizNo)}</dd>
                <dt style={dtStyle}>대표자</dt>
                <dd style={ddStyle}>{dash(account.ceoName)}</dd>
                <dt style={dtStyle}>업태 · 종목</dt>
                <dd style={ddStyle}>{`${dash(account.bizType)} · ${dash(account.bizItem)}`}</dd>
                <dt style={dtStyle}>주소</dt>
                <dd style={ddStyle}>{dash(account.address)}</dd>
                <dt style={dtStyle}>대표전화</dt>
                <dd style={ddStyle}>{dash(account.phone)}</dd>
                <dt style={dtStyle}>최근거래</dt>
                <dd style={ddStyle}>{dash(account.lastTradeAt)}</dd>
                <dt style={dtStyle}>비고</dt>
                <dd style={ddStyle}>{dash(account.note)}</dd>
              </dl>
            </Card>

            <Card>
              <CardTitle>거래 조건 · 신용</CardTitle>
              <dl style={dlStyle}>
                <dt style={dtStyle}>거래유형</dt>
                <dd style={ddStyle}>{tradeTypeLabel(account.tradeType)}</dd>
                <dt style={dtStyle}>과세유형</dt>
                <dd style={ddStyle}>{taxTypeLabel(account.taxType)}</dd>
                <dt style={dtStyle}>여신한도</dt>
                <dd style={{ ...ddStyle, ...numericStyle }}>
                  {/* 0 은 '한도 없음' 이 아니라 '아직 정하지 않음' 이다 (types.ts 의 정의) */}
                  {account.creditLimit === 0 ? '미설정' : formatWon(account.creditLimit)}
                </dd>
                <dt style={dtStyle}>결제조건</dt>
                <dd style={ddStyle}>{paymentTermLabel(account.paymentTerm)}</dd>
                <dt style={dtStyle}>신용등급</dt>
                <dd style={ddStyle}>
                  <StatusBadge
                    tone={creditGradeTone(account.creditGrade)}
                    label={creditGradeLabel(account.creditGrade)}
                  />
                </dd>
              </dl>
            </Card>
          </div>

          <Card>
            <CardTitle>담당자</CardTitle>
            {account.contacts.length === 0 ? (
              <p style={hintStyle}>등록된 담당자가 없어요.</p>
            ) : (
              <ul style={contactListStyle}>
                {account.contacts.map((contact) => (
                  <li key={contact.id} style={contactItemStyle}>
                    <span style={contactNameStyle}>
                      <span>{contact.name}</span>
                      {contact.primary && <StatusBadge tone="info" label="대표담당" />}
                      <span style={mutedTextStyle}>
                        {`${dash(contact.department)} · ${dash(contact.position)}`}
                      </span>
                    </span>
                    <span style={mutedTextStyle}>
                      {`${dash(contact.phone)} · ${dash(contact.email)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── 역방향 조회 — 이 거래처가 등장하는 네 모듈 ─────────────────────── */}
          <RelatedRecordsCard<Contract>
            title="이 거래처의 계약"
            entityLabel="계약"
            columns={contractColumns}
            items={contracts}
            loading={contractsQuery.data === undefined && contractsQuery.isFetching}
            error={contractsQuery.error}
            onRetry={() => void contractsQuery.refetch()}
            emptyText="이 거래처로 체결된 계약이 없어요."
          />

          <RelatedRecordsCard<Quote>
            title="이 거래처의 견적"
            entityLabel="견적"
            columns={quoteColumns}
            items={quotes}
            loading={quotesQuery.data === undefined && quotesQuery.isFetching}
            error={quotesQuery.error}
            onRetry={() => void quotesQuery.refetch()}
            emptyText="이 거래처로 발행된 견적이 없어요."
          />

          <RelatedRecordsCard<Project>
            title="이 거래처의 프로젝트"
            entityLabel="프로젝트"
            columns={projectColumns}
            items={projects}
            loading={projectsQuery.data === undefined && projectsQuery.isFetching}
            error={projectsQuery.error}
            onRetry={() => void projectsQuery.refetch()}
            emptyText="이 거래처로 진행 중인 영업 기회가 없어요."
          />

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
