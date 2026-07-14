# 모듈 추출 스캔 — 2026-07-15

> page-module-pipeline **② 페이지 조사 · 공통 모듈 후보 추출** (A75 Component Reuse AI) — 어드민 페이지의 반복 UI 패턴을 공통 모듈 후보로 승격 제안한다 (docs/tds/guidelines/page-module-pipeline.md).

- 실행 시각: 2026-07-14T22:46:58.799Z
- 스캔 범위: apps/admin/src — .tsx 63개 파일, JSX 엘리먼트 984개
- 후보 기준: 정규화 시그니처(태그 구조 + 주요 속성 키) 동일 — 또는 유사 구조(태그 골격 동일 + 속성 키 자카드 >= 60.0%) 병합 — 출현 2회 이상
- 권고 기준(기존 계약 유사도): >= 85.0% REUSE · 60.0%~85.0% EXTEND · < 60.0% CREATE (비교 계약 15건)
- 제안 레벨 기준: 리프(깊이 1) atom · 깊이 2 molecule · 깊이 3+ organism (Storybook 카테고리 판정 기준과 동일)

## 모듈 후보 (83건)

| # | 후보명 | 출현 수 | 위치 | 제안 레벨 | 기존 계약 유사도 | 권고 |
|---|---|---|---|---|---|---|
| 1 | PathItem | 77 (4개 파일) | apps/admin/src/pages/members/icons.tsx:41<br>apps/admin/src/pages/members/icons.tsx:42<br>apps/admin/src/pages/permissions/icons.tsx:28<br>외 74곳 | atom | Alert 25.0% | CREATE |
| 2 | PItem | 39 (24개 파일) | apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:89<br>apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:93<br>apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:121<br>외 36곳 | atom | ListRow 28.6% | CREATE |
| 3 | SpanItem | 37 (21개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:170<br>apps/admin/src/pages/admins/AdminsPage.tsx:172<br>apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:63<br>외 34곳 | atom | Badge 25.0% | CREATE |
| 4 | TdItem | 28 (5개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:149<br>apps/admin/src/pages/admins/components/AdminsTable.tsx:150<br>apps/admin/src/pages/admins/components/AdminsTable.tsx:151<br>외 25곳 | atom | TextField 33.3% | CREATE |
| 5 | LabelItem | 22 (13개 파일) | apps/admin/src/pages/admins/components/AdminsSearchCard.tsx:43<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:76<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:121<br>외 19곳 | atom | Alert 33.3% | CREATE |
| 6 | PItem2 | 20 (12개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:103<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:130<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:166<br>외 17곳 | atom | ListRow 28.6% | CREATE |
| 7 | TdsPermSticky | 17 (7개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:106<br>apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:134<br>apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:137<br>외 14곳 | atom | Alert 23.1% | CREATE |
| 8 | Button | 15 (11개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:201<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:273<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:339<br>외 12곳 | atom | Button 100.0% | REUSE |
| 9 | CircleItem | 12 (4개 파일) | apps/admin/src/pages/members/icons.tsx:30<br>apps/admin/src/pages/members/icons.tsx:31<br>apps/admin/src/pages/members/icons.tsx:32<br>외 9곳 | atom | Alert 30.0% | CREATE |
| 10 | DivItem | 12 (9개 파일) | apps/admin/src/pages/dashboard/components/DashboardTabPanel.tsx:112<br>apps/admin/src/pages/dashboard/components/StatsSection.tsx:149<br>apps/admin/src/pages/members/components/ConsentCard.tsx:114<br>외 9곳 | atom | DataTable 22.2% | CREATE |
| 11 | Row | 11 (1개 파일) | apps/admin/src/pages/members/components/MemberInfoCard.tsx:108<br>apps/admin/src/pages/members/components/MemberInfoCard.tsx:109<br>apps/admin/src/pages/members/components/MemberInfoCard.tsx:110<br>외 8곳 | atom | ListRow 42.9% | CREATE |
| 12 | CardTitle | 10 (9개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:70<br>apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:112<br>apps/admin/src/pages/members/components/ActivityCard.tsx:20<br>외 7곳 | atom | Card 44.4% | CREATE |
| 13 | OptionItem | 9 (5개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:98<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:161<br>apps/admin/src/pages/members/components/CreateGroupModal.tsx:206<br>외 6곳 | atom | Button 30.0% | CREATE |
| 14 | RectItem | 9 (3개 파일) | apps/admin/src/pages/permissions/icons.tsx:38<br>apps/admin/src/shared/icons.tsx:29<br>apps/admin/src/shared/icons.tsx:30<br>외 6곳 | atom | TextField 33.3% | CREATE |
| 15 | ConfirmDialog | 8 (8개 파일) | apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:345<br>apps/admin/src/pages/members/components/CreateGroupModal.tsx:255<br>apps/admin/src/pages/members/components/PointsCard.tsx:374<br>외 5곳 | atom | Card 23.1% | CREATE |
| 16 | CaptionItem | 7 (7개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:92<br>apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:129<br>apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:121<br>외 4곳 | atom | Button 27.3% | CREATE |
| 17 | SpanItem2 | 7 (4개 파일) | apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:188<br>apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:227<br>apps/admin/src/pages/members/components/MemberInfoCard.tsx:98<br>외 4곳 | atom | Alert 22.2% | CREATE |
| 18 | SpanItem3 | 7 (7개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:130<br>apps/admin/src/pages/members/components/MembersTable.tsx:159<br>apps/admin/src/pages/members/components/MemoCard.tsx:104<br>외 4곳 | atom | Alert 23.9% | CREATE |
| 19 | HelpTip | 6 (3개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:79<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:124<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:143<br>외 3곳 | atom | Checkbox 25.0% | CREATE |
| 20 | SvgPathGroup | 5 (2개 파일) | apps/admin/src/shared/icons.tsx:40<br>apps/admin/src/shared/icons.tsx:63<br>apps/admin/src/shared/icons.tsx:134<br>외 2곳 | molecule | ListRow 25.0% | CREATE |
| 21 | DivLabelGroup | 5 (3개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:189<br>apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:213<br>apps/admin/src/pages/members/components/CreateGroupModal.tsx:161<br>외 2곳 | molecule | Alert 23.1% | CREATE |
| 22 | DivSpanGroup | 5 (5개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:199<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:271<br>apps/admin/src/pages/login-history/LoginHistoryPage.tsx:260<br>외 2곳 | molecule | ListRow 33.3% | CREATE |
| 23 | SvgPathGroup2 | 5 (4개 파일) | apps/admin/src/pages/members/icons.tsx:40<br>apps/admin/src/pages/permissions/icons.tsx:27<br>apps/admin/src/shared/icons.tsx:193<br>외 2곳 | molecule | SegmentedControl 25.0% | CREATE |
| 24 | DdItem | 5 (2개 파일) | apps/admin/src/pages/members/components/ActivityCard.tsx:24<br>apps/admin/src/pages/members/components/ActivityCard.tsx:31<br>apps/admin/src/pages/members/components/ActivityCard.tsx:36<br>외 2곳 | atom | DataTable 22.2% | CREATE |
| 25 | DtItem | 5 (2개 파일) | apps/admin/src/pages/members/components/ActivityCard.tsx:23<br>apps/admin/src/pages/members/components/ActivityCard.tsx:30<br>apps/admin/src/pages/members/components/ActivityCard.tsx:35<br>외 2곳 | atom | DataTable 33.3% | CREATE |
| 26 | H2Item | 5 (5개 파일) | apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:51<br>apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:94<br>apps/admin/src/pages/members/components/GroupFilter.tsx:77<br>외 2곳 | atom | TextField 22.2% | CREATE |
| 27 | Pagination | 5 (5개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:190<br>apps/admin/src/pages/login-history/LoginHistoryPage.tsx:250<br>apps/admin/src/pages/members/components/CouponsCard.tsx:81<br>외 2곳 | atom | Button 30.0% | CREATE |
| 28 | TdsUiSkeleton | 5 (5개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:62<br>apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:117<br>apps/admin/src/pages/members/components/MembersTable.tsx:79<br>외 2곳 | atom | Button 30.8% | CREATE |
| 29 | UlItem | 5 (5개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:96<br>apps/admin/src/pages/members/components/CouponsCard.tsx:69<br>apps/admin/src/pages/members/components/TierFilter.tsx:40<br>외 2곳 | atom | ListRow 28.6% | CREATE |
| 30 | LiSection | 4 (3개 파일) | apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:54<br>apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:71<br>apps/admin/src/pages/members/components/GroupFilter.tsx:107<br>외 1곳 | organism | ListRow 55.6% | CREATE |
| 31 | SvgPathGroup3 | 4 (2개 파일) | apps/admin/src/shared/icons.tsx:203<br>apps/admin/src/shared/icons.tsx:212<br>apps/admin/src/shared/ui/icons.tsx:142<br>외 1곳 | molecule | SegmentedControl 25.0% | CREATE |
| 32 | TrTdGroup | 4 (4개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:117<br>apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:156<br>apps/admin/src/pages/members/components/MembersTable.tsx:145<br>외 1곳 | molecule | Badge 22.2% | CREATE |
| 33 | Button2 | 4 (2개 파일) | apps/admin/src/pages/product-registration/ImageUploadField.tsx:215<br>apps/admin/src/pages/product-registration/ImageUploadField.tsx:227<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:757<br>외 1곳 | atom | Button 85.7% | REUSE |
| 34 | PencilIcon | 4 (4개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:166<br>apps/admin/src/pages/members/components/MembersTable.tsx:195<br>apps/admin/src/pages/permissions/components/RolePanel.tsx:115<br>외 1곳 | atom | SegmentedControl 25.0% | CREATE |
| 35 | TriStateCheckbox | 4 (1개 파일) | apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:157<br>apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:217<br>apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:302<br>외 1곳 | atom | Checkbox 50.0% | CREATE |
| 36 | SvgPathGroup4 | 3 (2개 파일) | apps/admin/src/shared/icons.tsx:74<br>apps/admin/src/shared/icons.tsx:180<br>apps/admin/src/shared/ui/icons.tsx:102 | molecule | SegmentedControl 25.0% | CREATE |
| 37 | DivSection | 3 (3개 파일) | apps/admin/src/pages/admins/components/AdminsSearchCard.tsx:42<br>apps/admin/src/pages/login-history/components/LoginHistoryToolbar.tsx:66<br>apps/admin/src/pages/members/components/MembersToolbar.tsx:89 | organism | ListRow 40.0% | CREATE |
| 38 | AlertGroup | 3 (3개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:198<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:270<br>apps/admin/src/pages/members/MembersPage.tsx:406 | organism | Alert 50.0% | CREATE |
| 39 | SvgCircleGroup | 3 (1개 파일) | apps/admin/src/shared/ui/icons.tsx:38<br>apps/admin/src/shared/ui/icons.tsx:59<br>apps/admin/src/shared/ui/icons.tsx:81 | molecule | SegmentedControl 25.0% | CREATE |
| 40 | SpanSpanGroup | 3 (3개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:222<br>apps/admin/src/pages/members/components/CouponsCard.tsx:72<br>apps/admin/src/pages/members/components/MemberInfoCard.tsx:101 | molecule | StatsCard 38.5% | CREATE |
| 41 | SvgCircleGroup2 | 3 (2개 파일) | apps/admin/src/shared/icons.tsx:87<br>apps/admin/src/shared/ui/icons.tsx:49<br>apps/admin/src/shared/ui/icons.tsx:132 | molecule | Alert 20.0% | CREATE |
| 42 | DivPGroup | 3 (3개 파일) | apps/admin/src/pages/login-history/LoginHistoryPage.tsx:231<br>apps/admin/src/pages/members/MembersPage.tsx:385<br>apps/admin/src/shared/ui/ConfirmDialog.tsx:154 | molecule | ListRow 33.3% | CREATE |
| 43 | TdSpanGroup | 3 (3개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:61<br>apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:116<br>apps/admin/src/pages/members/components/MembersTable.tsx:78 | molecule | ListRow 27.3% | CREATE |
| 44 | TdTriStateCheckboxGroup | 3 (1개 파일) | apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:156<br>apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:216<br>apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:314 | molecule | Checkbox 34.8% | CREATE |
| 45 | Alert | 3 (3개 파일) | apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:248<br>apps/admin/src/pages/members/components/PasswordChangeModal.tsx:169<br>apps/admin/src/shared/ui/ConfirmDialog.tsx:156 | atom | Alert 100.0% | REUSE |
| 46 | TdsPrFocusable | 3 (3개 파일) | apps/admin/src/pages/members/components/ActionMenu.tsx:201<br>apps/admin/src/pages/product-registration/ui.tsx:65<br>apps/admin/src/shared/ui/Toast.tsx:119 | atom | DataTable 35.7% | CREATE |
| 47 | FilterGroup | 3 (1개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:158<br>apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:167<br>apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:178 | atom | ListRow 36.4% | CREATE |
| 48 | H1Item | 3 (2개 파일) | apps/admin/src/pages/login/LoginPage.tsx:379<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:372<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:642 | atom | TextField 22.2% | CREATE |
| 49 | TdsUiFocusable | 3 (2개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:85<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:148<br>apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:114 | atom | DataTable 35.7% | CREATE |
| 50 | SkeletonRows | 3 (3개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:115<br>apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:154<br>apps/admin/src/pages/members/components/MembersTable.tsx:143 | atom | SegmentedControl 37.5% | CREATE |
| 51 | TdsUiSkeleton2 | 3 (1개 파일) | apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:291<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:292<br>apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:293 | atom | Button 28.6% | CREATE |
| 52 | TrashIcon | 3 (3개 파일) | apps/admin/src/pages/members/components/PointsCard.tsx:355<br>apps/admin/src/pages/permissions/components/RolePanel.tsx:125<br>apps/admin/src/shared/ui/ConfirmDialog.tsx:57 | atom | Button 22.2% | CREATE |
| 53 | DivSection2 | 2 (1개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:74<br>apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:138 | organism | ListRow 36.4% | CREATE |
| 54 | TdSection | 2 (1개 파일) | apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:165<br>apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:208 | organism | Button 33.3% | CREATE |
| 55 | DivSection3 | 2 (1개 파일) | apps/admin/src/pages/members/components/CreateGroupModal.tsx:185<br>apps/admin/src/pages/members/components/CreateGroupModal.tsx:213 | organism | ListRow 36.4% | CREATE |
| 56 | SvgPathGroup5 | 2 (1개 파일) | apps/admin/src/shared/icons.tsx:97<br>apps/admin/src/shared/icons.tsx:156 | molecule | SegmentedControl 25.0% | CREATE |
| 57 | TdsPermChildrow | 2 (1개 파일) | apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:148<br>apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:194 | organism | ListRow 26.7% | CREATE |
| 58 | DivLabelGroup2 | 2 (2개 파일) | apps/admin/src/pages/members/components/PointsCard.tsx:282<br>apps/admin/src/pages/permissions/components/RoleFormModal.tsx:72 | molecule | Alert 21.4% | CREATE |
| 59 | DivSpanGroup2 | 2 (2개 파일) | apps/admin/src/pages/members/components/MemoCard.tsx:103<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:345 | molecule | ListRow 30.8% | CREATE |
| 60 | LiSection2 | 2 (2개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:102<br>apps/admin/src/pages/members/components/GroupFilter.tsx:80 | organism | ListRow 50.0% | CREATE |
| 61 | NavH2Group | 2 (2개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:93<br>apps/admin/src/pages/members/components/TierFilter.tsx:37 | molecule | Alert 20.0% | CREATE |
| 62 | TdSection2 | 2 (2개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:157<br>apps/admin/src/pages/members/components/MembersTable.tsx:186 | organism | Button 30.0% | CREATE |
| 63 | TdSpanGroup2 | 2 (2개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:129<br>apps/admin/src/pages/members/components/MembersTable.tsx:158 | molecule | ListRow 25.0% | CREATE |
| 64 | TdsUiBtnGhost | 2 (2개 파일) | apps/admin/src/shared/ui/Modal.tsx:205<br>apps/admin/src/shared/ui/Toast.tsx:133 | molecule | Button 23.1% | CREATE |
| 65 | ButtonGroup | 2 (2개 파일) | apps/admin/src/pages/login-history/components/LoginHistoryToolbar.tsx:84<br>apps/admin/src/pages/members/components/MembersToolbar.tsx:119 | molecule | Button 54.5% | CREATE |
| 66 | FieldGroup | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:140<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:200 | molecule | ListRow 30.0% | CREATE |
| 67 | FieldsetLegendGroup | 2 (2개 파일) | apps/admin/src/pages/members/components/ConsentCard.tsx:116<br>apps/admin/src/pages/product-registration/ui.tsx:127 | molecule | ListRow 26.3% | CREATE |
| 68 | SpanLockIconGroup | 2 (2개 파일) | apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:101<br>apps/admin/src/pages/permissions/components/RolePanel.tsx:145 | molecule | SegmentedControl 35.3% | CREATE |
| 69 | SpanSpanGroup2 | 2 (2개 파일) | apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:98<br>apps/admin/src/pages/permissions/components/RolePanel.tsx:142 | molecule | StatsCard 35.7% | CREATE |
| 70 | TdLinkGroup | 2 (2개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:143<br>apps/admin/src/pages/members/components/MembersTable.tsx:172 | molecule | ListRow 36.4% | CREATE |
| 71 | TdsCardGroup | 2 (2개 파일) | apps/admin/src/pages/members/MemberDetailPage.tsx:103<br>apps/admin/src/shared/ui/Card.tsx:19 | molecule | TodoCard 41.7% | CREATE |
| 72 | ThSpanGroup | 2 (2개 파일) | apps/admin/src/pages/members/components/MembersTable.tsx:135<br>apps/admin/src/pages/members/components/PointsCard.tsx:325 | molecule | ListRow 27.3% | CREATE |
| 73 | ActionMenu | 2 (2개 파일) | apps/admin/src/pages/members/components/MembersTable.tsx:200<br>apps/admin/src/pages/members/MemberDetailPage.tsx:211 | atom | Button 30.0% | CREATE |
| 74 | Alert2 | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:650<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:667 | atom | Alert 83.3% | EXTEND |
| 75 | BarChartIcon | 2 (2개 파일) | apps/admin/src/pages/dashboard/components/StatsSection.tsx:145<br>apps/admin/src/shared/layout/AppShell.tsx:65 | atom | Button 33.3% | CREATE |
| 76 | ChevronRightIcon | 2 (2개 파일) | apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:205<br>apps/admin/src/shared/ui/Pagination.tsx:123 | atom | Checkbox 25.0% | CREATE |
| 77 | H1Item2 | 2 (2개 파일) | apps/admin/src/pages/placeholder/PlaceholderPage.tsx:37<br>apps/admin/src/shared/layout/AppHeader.tsx:96 | atom | TextField 22.2% | CREATE |
| 78 | TdsUiFocusable2 | 2 (2개 파일) | apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:111<br>apps/admin/src/shared/ui/TriStateCheckbox.tsx:59 | atom | DataTable 33.3% | CREATE |
| 79 | NumberFieldSection | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:681<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:696 | atom | SegmentedControl 27.8% | CREATE |
| 80 | RoleFormModal | 2 (1개 파일) | apps/admin/src/pages/permissions/PermissionsPage.tsx:145<br>apps/admin/src/pages/permissions/PermissionsPage.tsx:158 | atom | Alert 23.1% | CREATE |
| 81 | SelectAllHeaderCell | 2 (2개 파일) | apps/admin/src/pages/admins/components/AdminsTable.tsx:99<br>apps/admin/src/pages/members/components/MembersTable.tsx:124 | atom | SegmentedControl 26.3% | CREATE |
| 82 | Tabs | 2 (2개 파일) | apps/admin/src/pages/admins/AdminsPage.tsx:159<br>apps/admin/src/pages/dashboard/DashboardPage.tsx:88 | atom | Tabs 100.0% | REUSE |
| 83 | TdsPrFocusable2 | 2 (2개 파일) | apps/admin/src/pages/members/components/MemoCard.tsx:83<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:238 | atom | DataTable 33.3% | CREATE |

## 후보 상세

### 1. PathItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
path[d]
```

- 구조: 루트 `path` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `d`
- 출현 위치 (77곳):
  - apps/admin/src/pages/members/icons.tsx:41
  - apps/admin/src/pages/members/icons.tsx:42
  - apps/admin/src/pages/permissions/icons.tsx:28
  - apps/admin/src/pages/permissions/icons.tsx:29
  - apps/admin/src/pages/permissions/icons.tsx:39
  - apps/admin/src/shared/icons.tsx:41
  - apps/admin/src/shared/icons.tsx:42
  - apps/admin/src/shared/icons.tsx:43
  - apps/admin/src/shared/icons.tsx:52
  - apps/admin/src/shared/icons.tsx:54
  - apps/admin/src/shared/icons.tsx:55
  - apps/admin/src/shared/icons.tsx:64
  - apps/admin/src/shared/icons.tsx:65
  - apps/admin/src/shared/icons.tsx:66
  - apps/admin/src/shared/icons.tsx:75
  - apps/admin/src/shared/icons.tsx:76
  - apps/admin/src/shared/icons.tsx:77
  - apps/admin/src/shared/icons.tsx:78
  - apps/admin/src/shared/icons.tsx:79
  - apps/admin/src/shared/icons.tsx:89
  - apps/admin/src/shared/icons.tsx:98
  - apps/admin/src/shared/icons.tsx:99
  - apps/admin/src/shared/icons.tsx:100
  - apps/admin/src/shared/icons.tsx:101
  - apps/admin/src/shared/icons.tsx:110
  - apps/admin/src/shared/icons.tsx:111
  - apps/admin/src/shared/icons.tsx:112
  - apps/admin/src/shared/icons.tsx:113
  - apps/admin/src/shared/icons.tsx:114
  - apps/admin/src/shared/icons.tsx:115
  - apps/admin/src/shared/icons.tsx:126
  - apps/admin/src/shared/icons.tsx:135
  - apps/admin/src/shared/icons.tsx:136
  - apps/admin/src/shared/icons.tsx:137
  - apps/admin/src/shared/icons.tsx:147
  - apps/admin/src/shared/icons.tsx:148
  - apps/admin/src/shared/icons.tsx:157
  - apps/admin/src/shared/icons.tsx:158
  - apps/admin/src/shared/icons.tsx:159
  - apps/admin/src/shared/icons.tsx:160
  - apps/admin/src/shared/icons.tsx:170
  - apps/admin/src/shared/icons.tsx:171
  - apps/admin/src/shared/icons.tsx:172
  - apps/admin/src/shared/icons.tsx:181
  - apps/admin/src/shared/icons.tsx:182
  - apps/admin/src/shared/icons.tsx:183
  - apps/admin/src/shared/icons.tsx:184
  - apps/admin/src/shared/icons.tsx:185
  - apps/admin/src/shared/icons.tsx:194
  - apps/admin/src/shared/icons.tsx:195
  - apps/admin/src/shared/icons.tsx:204
  - apps/admin/src/shared/icons.tsx:213
  - apps/admin/src/shared/ui/icons.tsx:29
  - apps/admin/src/shared/ui/icons.tsx:30
  - apps/admin/src/shared/ui/icons.tsx:40
  - apps/admin/src/shared/ui/icons.tsx:41
  - apps/admin/src/shared/ui/icons.tsx:51
  - apps/admin/src/shared/ui/icons.tsx:61
  - apps/admin/src/shared/ui/icons.tsx:62
  - apps/admin/src/shared/ui/icons.tsx:71
  - apps/admin/src/shared/ui/icons.tsx:72
  - apps/admin/src/shared/ui/icons.tsx:73
  - apps/admin/src/shared/ui/icons.tsx:83
  - apps/admin/src/shared/ui/icons.tsx:84
  - apps/admin/src/shared/ui/icons.tsx:93
  - apps/admin/src/shared/ui/icons.tsx:94
  - apps/admin/src/shared/ui/icons.tsx:103
  - apps/admin/src/shared/ui/icons.tsx:104
  - apps/admin/src/shared/ui/icons.tsx:105
  - apps/admin/src/shared/ui/icons.tsx:106
  - apps/admin/src/shared/ui/icons.tsx:107
  - apps/admin/src/shared/ui/icons.tsx:122
  - apps/admin/src/shared/ui/icons.tsx:123
  - apps/admin/src/shared/ui/icons.tsx:124
  - apps/admin/src/shared/ui/icons.tsx:134
  - apps/admin/src/shared/ui/icons.tsx:143
  - apps/admin/src/shared/ui/icons.tsx:152
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 2. PItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
p[style]
```

- 구조: 루트 `p` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (39곳):
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:89
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:93
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:121
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:176
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:331
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:80
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:242
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:249
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:232
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:240
  - apps/admin/src/pages/login/LoginPage.tsx:366
  - apps/admin/src/pages/login/LoginPage.tsx:368
  - apps/admin/src/pages/login/LoginPage.tsx:369
  - apps/admin/src/pages/login/LoginPage.tsx:382
  - apps/admin/src/pages/login/LoginPage.tsx:409
  - apps/admin/src/pages/members/components/ConsentCard.tsx:105
  - apps/admin/src/pages/members/components/CouponsCard.tsx:66
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:247
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:113
  - apps/admin/src/pages/members/components/PointsCard.tsx:236
  - apps/admin/src/pages/members/components/PointsCard.tsx:371
  - apps/admin/src/pages/members/MembersPage.tsx:365
  - apps/admin/src/pages/members/MembersPage.tsx:386
  - apps/admin/src/pages/permissions/components/DashboardWidgetsCard.tsx:126
  - apps/admin/src/pages/permissions/components/RoleFormModal.tsx:100
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:132
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:164
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:168
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:115
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:38
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:39
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:645
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:775
  - apps/admin/src/pages/product-registration/ui.tsx:131
  - apps/admin/src/pages/product-registration/ui.tsx:237
  - apps/admin/src/shared/layout/AppHeader.tsx:93
  - apps/admin/src/shared/layout/AppHeader.tsx:103
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:61
  - apps/admin/src/shared/ui/ConfirmDialog.tsx:155
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 28.6% · 속성 자카드 0.0% · 종합 28.6%

### 3. SpanItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (37곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:170
  - apps/admin/src/pages/admins/AdminsPage.tsx:172
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:63
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:80
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:169
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:171
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:162
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:294
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:113
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:198
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:205
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:224
  - apps/admin/src/pages/members/components/ConsentCard.tsx:92
  - apps/admin/src/pages/members/components/CouponsCard.tsx:74
  - apps/admin/src/pages/members/components/GroupFilter.tsx:95
  - apps/admin/src/pages/members/components/GroupFilter.tsx:116
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:102
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:103
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:116
  - apps/admin/src/pages/members/components/MembersTable.tsx:136
  - apps/admin/src/pages/members/components/PointsCard.tsx:326
  - apps/admin/src/pages/members/components/TierFilter.tsx:54
  - apps/admin/src/pages/permissions/components/DashboardWidgetsCard.tsx:143
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:151
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:206
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:211
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:290
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:291
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:309
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:129
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:150
  - apps/admin/src/pages/product-registration/ui.tsx:108
  - apps/admin/src/pages/product-registration/ui.tsx:175
  - apps/admin/src/pages/product-registration/ui.tsx:185
  - apps/admin/src/pages/product-registration/ui.tsx:223
  - apps/admin/src/shared/ui/Pagination.tsx:109
  - apps/admin/src/shared/ui/Toast.tsx:116
- 최근접 계약: **Badge**@1.0.0 (contracts/Badge.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 4. TdItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style]
```

- 구조: 루트 `td` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (28곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:149
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:150
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:151
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:153
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:154
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:155
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:154
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:155
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:156
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:176
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:178
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:190
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:192
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:195
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:214
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:216
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:219
  - apps/admin/src/pages/members/components/MembersTable.tsx:178
  - apps/admin/src/pages/members/components/MembersTable.tsx:179
  - apps/admin/src/pages/members/components/MembersTable.tsx:180
  - apps/admin/src/pages/members/components/MembersTable.tsx:181
  - apps/admin/src/pages/members/components/MembersTable.tsx:182
  - apps/admin/src/pages/members/components/MembersTable.tsx:183
  - apps/admin/src/pages/members/components/MembersTable.tsx:184
  - apps/admin/src/pages/members/components/PointsCard.tsx:340
  - apps/admin/src/pages/members/components/PointsCard.tsx:341
  - apps/admin/src/pages/members/components/PointsCard.tsx:342
  - apps/admin/src/pages/members/components/PointsCard.tsx:343
- 최근접 계약: **TextField**@1.1.0 (contracts/TextField.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 5. LabelItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
label[htmlFor,style]
```

- 구조: 루트 `label` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `htmlFor`, `style`
- 출현 위치 (22곳):
  - apps/admin/src/pages/admins/components/AdminsSearchCard.tsx:43
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:76
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:121
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:140
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:168
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:211
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:190
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:214
  - apps/admin/src/pages/login-history/components/LoginHistoryToolbar.tsx:67
  - apps/admin/src/pages/members/components/ConsentCard.tsx:89
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:162
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:187
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:215
  - apps/admin/src/pages/members/components/MembersToolbar.tsx:90
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:119
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:145
  - apps/admin/src/pages/members/components/PointsCard.tsx:247
  - apps/admin/src/pages/members/components/PointsCard.tsx:264
  - apps/admin/src/pages/members/components/PointsCard.tsx:283
  - apps/admin/src/pages/permissions/components/RoleFormModal.tsx:73
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:109
  - apps/admin/src/pages/product-registration/ui.tsx:178
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 6. PItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
p[id,role,style]
```

- 구조: 루트 `p` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `role`, `style`
- 출현 위치 (20곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:103
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:130
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:166
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:194
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:201
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:233
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:97
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:207
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:230
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:237
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:242
  - apps/admin/src/pages/members/components/MemoCard.tsx:98
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:138
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:163
  - apps/admin/src/pages/members/components/PointsCard.tsx:303
  - apps/admin/src/pages/permissions/components/RoleFormModal.tsx:94
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:161
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:159
  - apps/admin/src/pages/product-registration/ui.tsx:196
  - apps/admin/src/pages/product-registration/ui.tsx:201
- 병합된 유사 시그니처 2건:
  - `p[role,style]`
  - `p[id,style]`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 28.6% · 속성 자카드 0.0% · 종합 28.6%

### 7. TdsPermSticky — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
th[scope,style]
```

- 구조: 루트 `th` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `scope`, `style`
- 출현 위치 (17곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:106
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:134
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:137
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:140
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:143
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:151
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:126
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:129
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:132
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:160
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:145
  - apps/admin/src/pages/members/components/MembersTable.tsx:131
  - apps/admin/src/pages/members/components/PointsCard.tsx:313
  - apps/admin/src/pages/members/components/PointsCard.tsx:316
  - apps/admin/src/pages/members/components/PointsCard.tsx:319
  - apps/admin/src/pages/members/components/PointsCard.tsx:322
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:285
- 병합된 유사 시그니처 1건:
  - `th[className,scope,style]`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 23.1% · 속성 자카드 0.0% · 종합 23.1%

### 8. Button — REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)

```
Button[onClick,variant]
```

- 구조: 루트 `Button` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `onClick`, `variant`
- 출현 위치 (15곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:201
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:273
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:339
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:262
  - apps/admin/src/pages/members/components/GroupFilter.tsx:96
  - apps/admin/src/pages/members/components/GroupFilter.tsx:124
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:117
  - apps/admin/src/pages/members/components/MembersToolbar.tsx:110
  - apps/admin/src/pages/members/components/MembersToolbar.tsx:113
  - apps/admin/src/pages/members/components/MemoCard.tsx:107
  - apps/admin/src/pages/members/MemberDetailPage.tsx:244
  - apps/admin/src/pages/members/MemberDetailPage.tsx:252
  - apps/admin/src/pages/members/MembersPage.tsx:409
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:204
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:349
- 병합된 유사 시그니처 2건:
  - `Button[disabled,onClick,variant]`
  - `Button[ariaLabel,onClick,variant]`
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 100.0% · 속성 자카드 11.1% · 종합 100.0%

### 9. CircleItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
circle[cx,cy,r]
```

- 구조: 루트 `circle` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `cx`, `cy`, `r`
- 출현 위치 (12곳):
  - apps/admin/src/pages/members/icons.tsx:30
  - apps/admin/src/pages/members/icons.tsx:31
  - apps/admin/src/pages/members/icons.tsx:32
  - apps/admin/src/shared/icons.tsx:53
  - apps/admin/src/shared/icons.tsx:88
  - apps/admin/src/shared/icons.tsx:125
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:59
  - apps/admin/src/shared/ui/icons.tsx:39
  - apps/admin/src/shared/ui/icons.tsx:50
  - apps/admin/src/shared/ui/icons.tsx:60
  - apps/admin/src/shared/ui/icons.tsx:82
  - apps/admin/src/shared/ui/icons.tsx:133
- 병합된 유사 시그니처 1건:
  - `circle[cx,cy,fill,r]`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 10. DivItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style]
```

- 구조: 루트 `div` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (12곳):
  - apps/admin/src/pages/dashboard/components/DashboardTabPanel.tsx:112
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:149
  - apps/admin/src/pages/members/components/ConsentCard.tsx:114
  - apps/admin/src/pages/members/MemberDetailPage.tsx:104
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:189
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:202
  - apps/admin/src/pages/product-registration/ui.tsx:111
  - apps/admin/src/pages/product-registration/ui.tsx:166
  - apps/admin/src/shared/ui/Card.tsx:20
  - apps/admin/src/shared/ui/Modal.tsx:219
  - apps/admin/src/shared/ui/Modal.tsx:231
  - apps/admin/src/shared/ui/ToastProvider.tsx:120
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 11. Row — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Row[label]
```

- 구조: 루트 `Row` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `label`
- 출현 위치 (11곳):
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:108
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:109
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:110
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:123
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:124
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:125
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:126
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:127
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:128
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:129
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:130
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 42.9% · 속성 자카드 0.0% · 종합 42.9%

### 12. CardTitle — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
CardTitle[id]
```

- 구조: 루트 `CardTitle` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`
- 출현 위치 (10곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:70
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:112
  - apps/admin/src/pages/members/components/ActivityCard.tsx:20
  - apps/admin/src/pages/members/components/ConsentCard.tsx:104
  - apps/admin/src/pages/members/components/ConsentCard.tsx:112
  - apps/admin/src/pages/members/components/CouponsCard.tsx:63
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:95
  - apps/admin/src/pages/members/components/MemoCard.tsx:81
  - apps/admin/src/pages/members/components/PointsCard.tsx:234
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:113
- 최근접 계약: **Card**@1.0.0 (contracts/Card.contract.json) — 이름 유사도 44.4% · 속성 자카드 0.0% · 종합 44.4%

### 13. OptionItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
option[value]
```

- 구조: 루트 `option` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `value`
- 출현 위치 (9곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:98
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:161
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:206
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:234
  - apps/admin/src/pages/members/components/PointsCard.tsx:258
  - apps/admin/src/pages/members/components/PointsCard.tsx:259
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:124
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:335
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:337
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 14. RectItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
rect[height,rx,width,x,y]
```

- 구조: 루트 `rect` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `height`, `rx`, `width`, `x`, `y`
- 출현 위치 (9곳):
  - apps/admin/src/pages/permissions/icons.tsx:38
  - apps/admin/src/shared/icons.tsx:29
  - apps/admin/src/shared/icons.tsx:30
  - apps/admin/src/shared/icons.tsx:31
  - apps/admin/src/shared/icons.tsx:32
  - apps/admin/src/shared/icons.tsx:124
  - apps/admin/src/shared/icons.tsx:146
  - apps/admin/src/shared/icons.tsx:169
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:42
- 병합된 유사 시그니처 1건:
  - `rect[fill,height,rx,stroke,strokeWidth,width,x,y]`
- 최근접 계약: **TextField**@1.1.0 (contracts/TextField.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 15. ConfirmDialog — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ConfirmDialog[busy,confirmLabel,error,intent,message,onCancel,onConfirm,title]
```

- 구조: 루트 `ConfirmDialog` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `busy`, `confirmLabel`, `error`, `intent`, `message`, `onCancel`, `onConfirm`, `title`
- 출현 위치 (8곳):
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:345
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:255
  - apps/admin/src/pages/members/components/PointsCard.tsx:374
  - apps/admin/src/pages/members/MemberDetailPage.tsx:294
  - apps/admin/src/pages/members/MembersPage.tsx:435
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:171
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:782
  - apps/admin/src/shared/ui/useUnsavedChangesDialog.tsx:212
- 병합된 유사 시그니처 3건:
  - `ConfirmDialog[busy,confirmLabel,intent,message,onCancel,onConfirm,title]`
  - `ConfirmDialog[busy,error,intent,message,onCancel,onConfirm,title]`
  - `ConfirmDialog[busy,intent,message,onCancel,onConfirm,suppressCancelToast,title]`
- 최근접 계약: **Card**@1.0.0 (contracts/Card.contract.json) — 이름 유사도 23.1% · 속성 자카드 10.0% · 종합 23.1%

### 16. CaptionItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
caption[style]
```

- 구조: 루트 `caption` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (7곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:92
  - apps/admin/src/pages/customer-settings/components/TierDistributionCard.tsx:129
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:121
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:137
  - apps/admin/src/pages/members/components/MembersTable.tsx:117
  - apps/admin/src/pages/members/components/PointsCard.tsx:310
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:277
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 27.3% · 속성 자카드 0.0% · 종합 27.3%

### 17. SpanItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[aria-hidden,style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-hidden`, `style`
- 출현 위치 (7곳):
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:188
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:227
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:98
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:47
  - apps/admin/src/pages/product-registration/ui.tsx:171
  - apps/admin/src/pages/product-registration/ui.tsx:181
  - apps/admin/src/pages/product-registration/ui.tsx:189
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 18. SpanItem3 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[id,style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `style`
- 출현 위치 (7곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:130
  - apps/admin/src/pages/members/components/MembersTable.tsx:159
  - apps/admin/src/pages/members/components/MemoCard.tsx:104
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:136
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:346
  - apps/admin/src/pages/product-registration/ui.tsx:168
  - apps/admin/src/shared/ui/TableSelection.tsx:57
- 병합된 유사 시그니처 1건:
  - `span[id,role,style]`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 22.2% · 속성 자카드 25.0% · 종합 23.9%

### 19. HelpTip — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
HelpTip[label]
```

- 구조: 루트 `HelpTip` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `label`
- 출현 위치 (6곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:79
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:124
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:143
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:112
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:190
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:218
- 최근접 계약: **Checkbox**@1.1.0 (contracts/Checkbox.contract.json) — 이름 유사도 25.0% · 속성 자카드 20.0% · 종합 25.0%

### 20. SvgPathGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 4개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (5곳):
  - apps/admin/src/shared/icons.tsx:40
  - apps/admin/src/shared/icons.tsx:63
  - apps/admin/src/shared/icons.tsx:134
  - apps/admin/src/shared/ui/icons.tsx:70
  - apps/admin/src/shared/ui/icons.tsx:121
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 21. DivLabelGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](label[htmlFor,style]+input[aria-describedby,aria-invalid,autoComplete,className,disabled,id,name,onBlur,onChange,style,type])
```

- 구조: 루트 `div` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:189
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:213
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:161
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:118
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:144
- 병합된 유사 시그니처 2건:
  - `div[style](label[htmlFor,style]+input[aria-describedby,aria-invalid,className,id,onChange,style,type,value])`
  - `div[style](label[htmlFor,style]+input[aria-invalid,className,disabled,id,name,onBlur,onChange,placeholder,style,type])`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 23.1% · 속성 자카드 0.0% · 종합 23.1%

### 22. DivSpanGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](span[]+Button[onClick,variant])
```

- 구조: 루트 `div` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:199
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:271
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:260
  - apps/admin/src/pages/members/components/GroupFilter.tsx:94
  - apps/admin/src/pages/members/MembersPage.tsx:407
- 병합된 유사 시그니처 1건:
  - `div[role,style](span[style]+Button[onClick,variant])`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 23. SvgPathGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (5곳):
  - apps/admin/src/pages/members/icons.tsx:40
  - apps/admin/src/pages/permissions/icons.tsx:27
  - apps/admin/src/shared/icons.tsx:193
  - apps/admin/src/shared/ui/icons.tsx:28
  - apps/admin/src/shared/ui/icons.tsx:92
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 24. DdItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
dd[style]
```

- 구조: 루트 `dd` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/members/components/ActivityCard.tsx:24
  - apps/admin/src/pages/members/components/ActivityCard.tsx:31
  - apps/admin/src/pages/members/components/ActivityCard.tsx:36
  - apps/admin/src/pages/members/components/ActivityCard.tsx:39
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:78
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 25. DtItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
dt[style]
```

- 구조: 루트 `dt` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/members/components/ActivityCard.tsx:23
  - apps/admin/src/pages/members/components/ActivityCard.tsx:30
  - apps/admin/src/pages/members/components/ActivityCard.tsx:35
  - apps/admin/src/pages/members/components/ActivityCard.tsx:38
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:77
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 26. H2Item — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
h2[style]
```

- 구조: 루트 `h2` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:51
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:94
  - apps/admin/src/pages/members/components/GroupFilter.tsx:77
  - apps/admin/src/pages/members/components/TierFilter.tsx:38
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:101
- 최근접 계약: **TextField**@1.1.0 (contracts/TextField.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 27. Pagination — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Pagination[label,onChange,page,totalPages]
```

- 구조: 루트 `Pagination` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `label`, `onChange`, `page`, `totalPages`
- 출현 위치 (5곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:190
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:250
  - apps/admin/src/pages/members/components/CouponsCard.tsx:81
  - apps/admin/src/pages/members/components/PointsCard.tsx:364
  - apps/admin/src/pages/members/MembersPage.tsx:403
- 병합된 유사 시그니처 1건:
  - `Pagination[onChange,page,totalPages]`
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 28. TdsUiSkeleton — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[aria-hidden,className]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-hidden`, `className`
- 출현 위치 (5곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:62
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:117
  - apps/admin/src/pages/members/components/MembersTable.tsx:79
  - apps/admin/src/pages/members/MemberDetailPage.tsx:106
  - apps/admin/src/pages/product-registration/ui.tsx:35
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 30.8% · 속성 자카드 0.0% · 종합 30.8%

### 29. UlItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ul[style]
```

- 구조: 루트 `ul` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:96
  - apps/admin/src/pages/members/components/CouponsCard.tsx:69
  - apps/admin/src/pages/members/components/TierFilter.tsx:40
  - apps/admin/src/pages/permissions/components/DashboardWidgetsCard.tsx:130
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:130
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 28.6% · 속성 자카드 0.0% · 종합 28.6%

### 30. LiSection — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
li[](button[aria-pressed,className,onClick,style,type](span[]+span[style]))
```

- 구조: 루트 `li` · 노드 4개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: (없음)
- 출현 위치 (4곳):
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:54
  - apps/admin/src/pages/admins/components/AdminGroupPanel.tsx:71
  - apps/admin/src/pages/members/components/GroupFilter.tsx:107
  - apps/admin/src/pages/members/components/TierFilter.tsx:45
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 55.6% · 종합 55.6%

### 31. SvgPathGroup3 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d])
```

- 구조: 루트 `svg` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (4곳):
  - apps/admin/src/shared/icons.tsx:203
  - apps/admin/src/shared/icons.tsx:212
  - apps/admin/src/shared/ui/icons.tsx:142
  - apps/admin/src/shared/ui/icons.tsx:151
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 32. TrTdGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
tr[](td[colSpan,style])
```

- 구조: 루트 `tr` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (4곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:117
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:156
  - apps/admin/src/pages/members/components/MembersTable.tsx:145
  - apps/admin/src/pages/members/components/PointsCard.tsx:332
- 최근접 계약: **Badge**@1.0.0 (contracts/Badge.contract.json) — 이름 유사도 22.2% · 종합 22.2%

### 33. Button2 — REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)

```
Button[ariaLabel,disabled,onClick,variant]
```

- 구조: 루트 `Button` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `ariaLabel`, `disabled`, `onClick`, `variant`
- 출현 위치 (4곳):
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:215
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:227
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:757
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:765
- 병합된 유사 시그니처 1건:
  - `Button[disabled,loading,onClick,variant]`
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 85.7% · 속성 자카드 20.0% · 종합 85.7%

### 34. PencilIcon — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
PencilIcon[]
```

- 구조: 루트 `PencilIcon` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (4곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:166
  - apps/admin/src/pages/members/components/MembersTable.tsx:195
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:115
  - apps/admin/src/shared/ui/ConfirmDialog.tsx:51
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 35. TriStateCheckbox — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
TriStateCheckbox[describedBy,disabled,label,onChange]
```

- 구조: 루트 `TriStateCheckbox` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `describedBy`, `disabled`, `label`, `onChange`
- 출현 위치 (4곳):
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:157
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:217
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:302
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:315
- 병합된 유사 시그니처 1건:
  - `TriStateCheckbox[checked,describedBy,disabled,indeterminate,label,onChange]`
- 최근접 계약: **Checkbox**@1.1.0 (contracts/Checkbox.contract.json) — 이름 유사도 50.0% · 속성 자카드 28.6% · 종합 50.0%

### 36. SvgPathGroup4 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 6개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/shared/icons.tsx:74
  - apps/admin/src/shared/icons.tsx:180
  - apps/admin/src/shared/ui/icons.tsx:102
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 37. DivSection — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](label[htmlFor,style]+span[style](SearchIcon[])+input[className,id,onChange,placeholder,style,type,value])
```

- 구조: 루트 `div` · 노드 5개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/admins/components/AdminsSearchCard.tsx:42
  - apps/admin/src/pages/login-history/components/LoginHistoryToolbar.tsx:66
  - apps/admin/src/pages/members/components/MembersToolbar.tsx:89
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 40.0% · 속성 자카드 0.0% · 종합 40.0%

### 38. AlertGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Alert[tone](div[style](span[]+Button[onClick,variant]))
```

- 구조: 루트 `Alert` · 노드 4개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `tone`
- 출현 위치 (3곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:198
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:270
  - apps/admin/src/pages/members/MembersPage.tsx:406
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 50.0% · 속성 자카드 33.3% · 종합 50.0%

### 39. SvgCircleGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](circle[cx,cy,r]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 4개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/shared/ui/icons.tsx:38
  - apps/admin/src/shared/ui/icons.tsx:59
  - apps/admin/src/shared/ui/icons.tsx:81
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 40. SpanSpanGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[style](span[]+span[style])
```

- 구조: 루트 `span` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:222
  - apps/admin/src/pages/members/components/CouponsCard.tsx:72
  - apps/admin/src/pages/members/components/MemberInfoCard.tsx:101
- 병합된 유사 시그니처 1건:
  - `span[style](span[style]+span[style])`
- 최근접 계약: **StatsCard**@1.0.1 (contracts/StatsCard.contract.json) — 이름 유사도 38.5% · 속성 자카드 0.0% · 종합 38.5%

### 41. SvgCircleGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](circle[cx,cy,r]+path[d])
```

- 구조: 루트 `svg` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/shared/icons.tsx:87
  - apps/admin/src/shared/ui/icons.tsx:49
  - apps/admin/src/shared/ui/icons.tsx:132
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 20.0% · 종합 20.0%

### 42. DivPGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](p[style])
```

- 구조: 루트 `div` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login-history/LoginHistoryPage.tsx:231
  - apps/admin/src/pages/members/MembersPage.tsx:385
  - apps/admin/src/shared/ui/ConfirmDialog.tsx:154
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 43. TdSpanGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](span[aria-hidden,className])
```

- 구조: 루트 `td` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:61
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:116
  - apps/admin/src/pages/members/components/MembersTable.tsx:78
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 27.3% · 속성 자카드 0.0% · 종합 27.3%

### 44. TdTriStateCheckboxGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](TriStateCheckbox[describedBy,disabled,label,onChange])
```

- 구조: 루트 `td` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:156
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:216
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:314
- 병합된 유사 시그니처 1건:
  - `td[style](TriStateCheckbox[checked,describedBy,disabled,indeterminate,label,onChange])`
- 최근접 계약: **Checkbox**@1.1.0 (contracts/Checkbox.contract.json) — 이름 유사도 34.8% · 속성 자카드 0.0% · 종합 34.8%

### 45. Alert — REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)

```
Alert[tone]
```

- 구조: 루트 `Alert` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `tone`
- 출현 위치 (3곳):
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:248
  - apps/admin/src/pages/members/components/PasswordChangeModal.tsx:169
  - apps/admin/src/shared/ui/ConfirmDialog.tsx:156
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 100.0% · 속성 자카드 33.3% · 종합 100.0%

### 46. TdsPrFocusable — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
button[aria-busy,className,disabled,onClick,style,type]
```

- 구조: 루트 `button` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-busy`, `className`, `disabled`, `onClick`, `style`, `type`
- 출현 위치 (3곳):
  - apps/admin/src/pages/members/components/ActionMenu.tsx:201
  - apps/admin/src/pages/product-registration/ui.tsx:65
  - apps/admin/src/shared/ui/Toast.tsx:119
- 병합된 유사 시그니처 2건:
  - `button[aria-disabled,className,disabled,onClick,role,style,type]`
  - `button[className,onClick,style,type]`
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 35.7% · 속성 자카드 0.0% · 종합 35.7%

### 47. FilterGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
FilterGroup[ariaLabel,countOf,heading,onChange,options,value]
```

- 구조: 루트 `FilterGroup` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `ariaLabel`, `countOf`, `heading`, `onChange`, `options`, `value`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:158
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:167
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:178
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 36.4% · 속성 자카드 0.0% · 종합 36.4%

### 48. H1Item — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
h1[id,style]
```

- 구조: 루트 `h1` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login/LoginPage.tsx:379
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:372
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:642
- 최근접 계약: **TextField**@1.1.0 (contracts/TextField.contract.json) — 이름 유사도 22.2% · 속성 자카드 7.7% · 종합 22.2%

### 49. TdsUiFocusable — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
select[aria-describedby,className,disabled,id,onChange,style,value]
```

- 구조: 루트 `select` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-describedby`, `className`, `disabled`, `id`, `onChange`, `style`, `value`
- 출현 위치 (3곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:85
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:148
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:114
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 35.7% · 속성 자카드 0.0% · 종합 35.7%

### 50. SkeletonRows — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
SkeletonRows[]
```

- 구조: 루트 `SkeletonRows` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:115
  - apps/admin/src/pages/login-history/components/LoginHistoryTable.tsx:154
  - apps/admin/src/pages/members/components/MembersTable.tsx:143
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 37.5% · 종합 37.5%

### 51. TdsUiSkeleton2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[className]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `className`
- 출현 위치 (3곳):
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:291
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:292
  - apps/admin/src/pages/customer-settings/CustomerSettingsPage.tsx:293
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 28.6% · 속성 자카드 0.0% · 종합 28.6%

### 52. TrashIcon — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
TrashIcon[]
```

- 구조: 루트 `TrashIcon` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/pages/members/components/PointsCard.tsx:355
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:125
  - apps/admin/src/shared/ui/ConfirmDialog.tsx:57
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 22.2% · 종합 22.2%

### 53. DivSection2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](span[style](label[htmlFor,style]+HelpTip[label])+select[aria-describedby,className,disabled,id,onChange,style,value]+p[id,style])
```

- 구조: 루트 `div` · 노드 6개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:74
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:138
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 36.4% · 속성 자카드 0.0% · 종합 36.4%

### 54. TdSection — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](div[style](div[style](label[htmlFor,style]+input[aria-describedby,aria-invalid,autoComplete,className,disabled,id,inputMode,onBlur,onChange,style,type,value]+span[aria-hidden,style])))
```

- 구조: 루트 `td` · 노드 6개 · 깊이 4 → 제안 레벨 **organism**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:165
  - apps/admin/src/pages/customer-settings/components/TierPolicyCard.tsx:208
- 병합된 유사 시그니처 1건:
  - `td[style](div[style](div[style](label[htmlFor,style]+input[aria-describedby,aria-invalid,autoComplete,className,disabled,id,inputMode,onChange,style,type,value]+span[aria-hidden,style])))`
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 55. DivSection3 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](span[style](label[htmlFor,style]+HelpTip[label])+select[className,disabled,id,name,onBlur,onChange,style])
```

- 구조: 루트 `div` · 노드 5개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:185
  - apps/admin/src/pages/members/components/CreateGroupModal.tsx:213
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 36.4% · 속성 자카드 0.0% · 종합 36.4%

### 56. SvgPathGroup5 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 5개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/shared/icons.tsx:97
  - apps/admin/src/shared/icons.tsx:156
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 57. TdsPermChildrow — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
tr[className,id](th[className,scope,style](span[style](span[style])))
```

- 구조: 루트 `tr` · 노드 4개 · 깊이 4 → 제안 레벨 **organism**
- 루트 속성 키: `className`, `id`
- 출현 위치 (2곳):
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:148
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:194
- 병합된 유사 시그니처 1건:
  - `tr[className](th[className,scope,style](span[style](span[style])))`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 26.7% · 속성 자카드 0.0% · 종합 26.7%

### 58. DivLabelGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](label[htmlFor,style]+input[aria-invalid,className,id,maxLength,onChange,placeholder,style,type,value])
```

- 구조: 루트 `div` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/PointsCard.tsx:282
  - apps/admin/src/pages/permissions/components/RoleFormModal.tsx:72
- 병합된 유사 시그니처 1건:
  - `div[style](label[htmlFor,style]+input[className,disabled,id,onChange,placeholder,style,type,value])`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 21.4% · 속성 자카드 0.0% · 종합 21.4%

### 59. DivSpanGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style](span[id,role,style]+Button[disabled,onClick,variant])
```

- 구조: 루트 `div` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/MemoCard.tsx:103
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:345
- 병합된 유사 시그니처 1건:
  - `div[style](span[id,style]+Button[disabled,onClick,variant])`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 30.8% · 속성 자카드 0.0% · 종합 30.8%

### 60. LiSection2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
li[](button[aria-pressed,className,onClick,style,type](span[]))
```

- 구조: 루트 `li` · 노드 3개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:102
  - apps/admin/src/pages/members/components/GroupFilter.tsx:80
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 50.0% · 종합 50.0%

### 61. NavH2Group — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
nav[aria-label,style](h2[style]+ul[style])
```

- 구조: 루트 `nav` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `aria-label`, `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryFilters.tsx:93
  - apps/admin/src/pages/members/components/TierFilter.tsx:37
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 20.0% · 속성 자카드 0.0% · 종합 20.0%

### 62. TdSection2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](Link[aria-label,className,style,title,to](PencilIcon[]))
```

- 구조: 루트 `td` · 노드 3개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:157
  - apps/admin/src/pages/members/components/MembersTable.tsx:186
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 63. TdSpanGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](span[id,style]+input[aria-labelledby,checked,className,onChange,style,type])
```

- 구조: 루트 `td` · 노드 3개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:129
  - apps/admin/src/pages/members/components/MembersTable.tsx:158
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 64. TdsUiBtnGhost — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
button[aria-label,className,onClick,style,type](CloseIcon[])
```

- 구조: 루트 `button` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `aria-label`, `className`, `onClick`, `style`, `type`
- 출현 위치 (2곳):
  - apps/admin/src/shared/ui/Modal.tsx:205
  - apps/admin/src/shared/ui/Toast.tsx:133
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 23.1% · 속성 자카드 8.3% · 종합 23.1%

### 65. ButtonGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Button[disabled,onClick,variant](DownloadIcon[])
```

- 구조: 루트 `Button` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `disabled`, `onClick`, `variant`
- 출현 위치 (2곳):
  - apps/admin/src/pages/login-history/components/LoginHistoryToolbar.tsx:84
  - apps/admin/src/pages/members/components/MembersToolbar.tsx:119
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 54.5% · 속성 자카드 22.2% · 종합 54.5%

### 66. FieldGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Field[counter,error,id,label,required](input[aria-describedby,aria-invalid,aria-required,className,disabled,id,maxLength,onBlur,onChange,placeholder,style,type,value])
```

- 구조: 루트 `Field` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `counter`, `error`, `id`, `label`, `required`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:140
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:200
- 병합된 유사 시그니처 1건:
  - `Field[error,hint,id,label,required](input[aria-describedby,aria-invalid,aria-required,autoComplete,className,disabled,id,inputMode,onBlur,onChange,onFocus,style,type,value])`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 67. FieldsetLegendGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
fieldset[style](legend[id,style])
```

- 구조: 루트 `fieldset` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/ConsentCard.tsx:116
  - apps/admin/src/pages/product-registration/ui.tsx:127
- 병합된 유사 시그니처 1건:
  - `fieldset[style](legend[style])`
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 26.3% · 속성 자카드 0.0% · 종합 26.3%

### 68. SpanLockIconGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[style,title](LockIcon[])
```

- 구조: 루트 `span` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`, `title`
- 출현 위치 (2곳):
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:101
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:145
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 35.3% · 속성 자카드 0.0% · 종합 35.3%

### 69. SpanSpanGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[style](span[])
```

- 구조: 루트 `span` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/permissions/components/RoleHeaderCard.tsx:98
  - apps/admin/src/pages/permissions/components/RolePanel.tsx:142
- 최근접 계약: **StatsCard**@1.0.1 (contracts/StatsCard.contract.json) — 이름 유사도 35.7% · 속성 자카드 0.0% · 종합 35.7%

### 70. TdLinkGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
td[style](Link[className,to])
```

- 구조: 루트 `td` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:143
  - apps/admin/src/pages/members/components/MembersTable.tsx:172
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 36.4% · 속성 자카드 0.0% · 종합 36.4%

### 71. TdsCardGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
TdsCard[](div[style])
```

- 구조: 루트 `TdsCard` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/MemberDetailPage.tsx:103
  - apps/admin/src/shared/ui/Card.tsx:19
- 최근접 계약: **TodoCard**@2.0.0 (contracts/TodoCard.contract.json) — 이름 유사도 41.7% · 종합 41.7%

### 72. ThSpanGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
th[scope,style](span[style])
```

- 구조: 루트 `th` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `scope`, `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/MembersTable.tsx:135
  - apps/admin/src/pages/members/components/PointsCard.tsx:325
- 최근접 계약: **ListRow**@1.0.0 (contracts/ListRow.contract.json) — 이름 유사도 27.3% · 속성 자카드 0.0% · 종합 27.3%

### 73. ActionMenu — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ActionMenu[actions,label]
```

- 구조: 루트 `ActionMenu` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `actions`, `label`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/MembersTable.tsx:200
  - apps/admin/src/pages/members/MemberDetailPage.tsx:211
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 74. Alert2 — EXTEND — 기존 계약 확장 검토 (A18 change_request)

```
Alert[actions,message,tone]
```

- 구조: 루트 `Alert` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `actions`, `message`, `tone`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:650
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:667
- 병합된 유사 시그니처 1건:
  - `Alert[message,tone]`
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 83.3% · 속성 자카드 20.0% · 종합 83.3%

### 75. BarChartIcon — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
BarChartIcon[]
```

- 구조: 루트 `BarChartIcon` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:145
  - apps/admin/src/shared/layout/AppShell.tsx:65
- 최근접 계약: **Button**@1.1.0 (contracts/Button.contract.json) — 이름 유사도 33.3% · 종합 33.3%

### 76. ChevronRightIcon — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ChevronRightIcon[]
```

- 구조: 루트 `ChevronRightIcon` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/permissions/components/PermissionMatrixTable.tsx:205
  - apps/admin/src/shared/ui/Pagination.tsx:123
- 최근접 계약: **Checkbox**@1.1.0 (contracts/Checkbox.contract.json) — 이름 유사도 25.0% · 종합 25.0%

### 77. H1Item2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
h1[style]
```

- 구조: 루트 `h1` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:37
  - apps/admin/src/shared/layout/AppHeader.tsx:96
- 최근접 계약: **TextField**@1.1.0 (contracts/TextField.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 78. TdsUiFocusable2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
input[aria-checked,aria-describedby,aria-label,aria-labelledby,checked,className,disabled,id,onChange,style,type]
```

- 구조: 루트 `input` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-checked`, `aria-describedby`, `aria-label`, `aria-labelledby`, `checked`, `className`, `disabled`, `id`, `onChange`, `style`, `type`
- 출현 위치 (2곳):
  - apps/admin/src/pages/customer-settings/components/TierCriteriaCard.tsx:111
  - apps/admin/src/shared/ui/TriStateCheckbox.tsx:59
- 병합된 유사 시그니처 1건:
  - `input[aria-describedby,checked,className,disabled,id,onChange,style,type]`
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

### 79. NumberFieldSection — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
NumberFieldSection[busy,display,error,field,fieldRefs,hint,label,onBlurValidate,onChangeValue,onFocusField,sectionId,sectionTitle]
```

- 구조: 루트 `NumberFieldSection` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `busy`, `display`, `error`, `field`, `fieldRefs`, `hint`, `label`, `onBlurValidate`, `onChangeValue`, `onFocusField`, `sectionId`, `sectionTitle`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:681
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:696
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 27.8% · 속성 자카드 0.0% · 종합 27.8%

### 80. RoleFormModal — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
RoleFormModal[initialName,mode,onClose,onSubmit]
```

- 구조: 루트 `RoleFormModal` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `initialName`, `mode`, `onClose`, `onSubmit`
- 출현 위치 (2곳):
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:145
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:158
- 최근접 계약: **Alert**@1.1.0 (contracts/Alert.contract.json) — 이름 유사도 23.1% · 속성 자카드 0.0% · 종합 23.1%

### 81. SelectAllHeaderCell — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
SelectAllHeaderCell[label,labelId,onToggleAll,selection]
```

- 구조: 루트 `SelectAllHeaderCell` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `label`, `labelId`, `onToggleAll`, `selection`
- 출현 위치 (2곳):
  - apps/admin/src/pages/admins/components/AdminsTable.tsx:99
  - apps/admin/src/pages/members/components/MembersTable.tsx:124
- 최근접 계약: **SegmentedControl**@1.0.0 (contracts/SegmentedControl.contract.json) — 이름 유사도 26.3% · 속성 자카드 0.0% · 종합 26.3%

### 82. Tabs — REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)

```
Tabs[ariaLabel,items,onChange,value]
```

- 구조: 루트 `Tabs` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `ariaLabel`, `items`, `onChange`, `value`
- 출현 위치 (2곳):
  - apps/admin/src/pages/admins/AdminsPage.tsx:159
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:88
- 최근접 계약: **Tabs**@1.0.0 (contracts/Tabs.contract.json) — 이름 유사도 100.0% · 속성 자카드 75.0% · 종합 100.0%

### 83. TdsPrFocusable2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
textarea[aria-describedby,aria-invalid,aria-label,className,disabled,id,onChange,style,value]
```

- 구조: 루트 `textarea` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-describedby`, `aria-invalid`, `aria-label`, `className`, `disabled`, `id`, `onChange`, `style`, `value`
- 출현 위치 (2곳):
  - apps/admin/src/pages/members/components/MemoCard.tsx:83
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:238
- 병합된 유사 시그니처 1건:
  - `textarea[aria-describedby,aria-invalid,className,disabled,id,onBlur,onChange,rows,style,value]`
- 최근접 계약: **DataTable**@1.1.0 (contracts/DataTable.contract.json) — 이름 유사도 33.3% · 속성 자카드 0.0% · 종합 33.3%

## 후속 조치

- **REUSE** 후보: 페이지 로컬 사본을 기존 컴포넌트 소비로 교체한다 (A40) — 사본 잔존은 중복률 SLO(<= 3%) 위반.
- **EXTEND** 후보: 기존 계약 확장을 우선 검토한다 — A18에 change_request 발행 (G3 재진입, additive 변경이면 MINOR).
- **CREATE** 후보: 후보 1건 = 1 Task 로 G0 접수한다. 접수 시 `pnpm --filter @tds/reuse-guard run check --name <후보명> --props <속성들>` 로 정밀 판정을 다시 받는다 (본 스캔의 속성 키는 계약 props 만큼 정제되지 않았다).
- 이 리포트 없이 신규 모듈 계약(G3)을 생성하는 것은 금지된다 (page-module-pipeline §2-②).
