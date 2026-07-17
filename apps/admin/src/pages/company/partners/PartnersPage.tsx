// PartnersPage — 파트너사 (라우트: /company/partners)
//
// 고객사와 **동일 모듈**(logo-list)을 공유한다. 여기서는 config(resource·라벨·adapter)만 주입한다.
import { LogoListPage } from '../logo-list/LogoListPage';
import { partnersAdapter } from './data-source';

export default function PartnersPage() {
  return <LogoListPage resource="partners" entityLabel="파트너사" adapter={partnersAdapter} />;
}
