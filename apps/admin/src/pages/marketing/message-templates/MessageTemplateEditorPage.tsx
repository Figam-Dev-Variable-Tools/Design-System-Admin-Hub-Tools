// 편집기 라우트 — 종류(문자/이메일)에 따라 편집기를 고른다
//   /marketing/templates/new?kind=text|email
//   /marketing/templates/:id/edit
//
// [왜 라우트를 종류별로 나누지 않았나] `/new/text` · `/new/email` 로 가르면 **수정** 경로도 갈라야
// 하고(:id 만 봐서는 종류를 모른다), 그러면 목록의 '수정' 링크가 항목마다 다른 경로를 계산해야 한다.
// 종류는 저장된 내용에 이미 들어 있으므로(templateKindOf) 라우트는 하나로 두고 여기서 가른다.
//
// [수정 진입 시 두 번 조회하지 않는가] 여기서 쓰는 useCrudItem 과 편집기의 useCrudForm 은 **같은
// react-query 키**(resource + id)를 본다 — 캐시가 한 벌이라 요청은 한 번이다.
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Alert, alertActionRowStyle, Button } from '../../../shared/ui';
import { useCrudItem } from '../../../shared/crud';
import AlimtalkTemplateEditor from './AlimtalkTemplateEditor';
import BrandMessageTemplateEditor from './BrandMessageTemplateEditor';
import EmailTemplateEditor from './EmailTemplateEditor';
import {
  MESSAGE_TEMPLATE_LIST_PATH,
  MESSAGE_TEMPLATE_RESOURCE,
  messageTemplateAdapter,
} from './data-source';
import TextTemplateEditor from './TextTemplateEditor';
import { templateKindOf } from './types';
import type { MessageTemplate, TemplateKind } from './types';
import type { MessageTemplateDraft } from './store';

const KINDS: readonly TemplateKind[] = ['email', 'text', 'alimtalk', 'brandmessage'];

/** 쿼리스트링은 사용자가 손으로 고칠 수 있다 — 모르는 값은 문자로 되돌린다(`as` 없이 좁힌다) */
function parseKind(raw: string | null): TemplateKind {
  return KINDS.find((kind) => kind === raw) ?? 'text';
}

/**
 * 종류 → 편집기. 네 종류가 되면서 삼항 연산자로는 읽히지 않는다 — switch 는 종류가 하나 더
 * 늘었을 때 **컴파일 오류로** 빠진 자리를 알려 준다(삼항은 조용히 마지막 갈래로 흘려보낸다).
 */
function editorFor(kind: TemplateKind) {
  switch (kind) {
    case 'email':
      return <EmailTemplateEditor />;
    case 'text':
      return <TextTemplateEditor />;
    case 'alimtalk':
      return <AlimtalkTemplateEditor />;
    case 'brandmessage':
      return <BrandMessageTemplateEditor />;
  }
}

export default function MessageTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // 등록이면 조회할 것이 없다 — useCrudItem 은 빈 id 에서 스스로 멈춘다(enabled: id !== '')
  const detail = useCrudItem<MessageTemplate, MessageTemplateDraft>(
    MESSAGE_TEMPLATE_RESOURCE,
    messageTemplateAdapter,
    id ?? '',
  );

  if (id === undefined) return editorFor(parseKind(params.get('kind')));

  if (detail.error !== null) {
    // 종류를 알기 전이라 편집기를 고를 수 없다 — 편집기 안의 EXC-12 배너가 아니라 여기서 끝낸다
    return (
      <Alert tone="danger">
        <div style={alertActionRowStyle}>
          <span>메시지 템플릿을 불러오지 못했어요.</span>
          <Button variant="secondary" onClick={() => navigate(MESSAGE_TEMPLATE_LIST_PATH)}>
            목록으로
          </Button>
        </div>
      </Alert>
    );
  }

  // 도착 전에는 아무 편집기도 고르지 않는다 — 문자 편집기를 먼저 그렸다가 이메일이면 통째로
  // 갈아치우게 되고, 그 사이 잠깐 뜬 폼에 입력한 값이 사라진다.
  if (detail.data === undefined) return null;

  return editorFor(templateKindOf(detail.data));
}
