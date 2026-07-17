// 문의 유형 사용 건수 집계
//
// 유형 삭제 차단(사용 중)은 그 유형을 참조하는 티켓·템플릿을 세어 판단한다. 순수 함수로 떼어
// 저장소가 얇아지고 테스트가 직접 부른다.
import type { ReplyTemplate, Ticket } from './domain';

interface CategoryUsage {
  readonly tickets: number;
  readonly templates: number;
}

export function countCategoryUsage(
  categoryId: string,
  tickets: readonly Pick<Ticket, 'categoryId'>[],
  templates: readonly Pick<ReplyTemplate, 'categoryId'>[],
): CategoryUsage {
  return {
    tickets: tickets.filter((ticket) => ticket.categoryId === categoryId).length,
    templates: templates.filter((template) => template.categoryId === categoryId).length,
  };
}
