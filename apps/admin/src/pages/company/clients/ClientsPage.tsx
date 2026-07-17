// ClientsPage — 고객사 (라우트: /company/clients)
//
// 파트너사와 **동일 모듈**(logo-list)을 공유한다. config(resource·라벨·adapter)만 다르다.
import { LogoListPage } from '../logo-list/LogoListPage';
import { clientsAdapter } from './data-source';

export default function ClientsPage() {
  return <LogoListPage resource="clients" entityLabel="고객사" adapter={clientsAdapter} />;
}
