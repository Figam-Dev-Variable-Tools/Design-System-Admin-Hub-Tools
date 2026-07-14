# 모듈 추출 스캔 — 2026-07-14

> page-module-pipeline **② 페이지 조사 · 공통 모듈 후보 추출** (A75 Component Reuse AI) — 어드민 페이지의 반복 UI 패턴을 공통 모듈 후보로 승격 제안한다 (docs/tds/guidelines/page-module-pipeline.md).

- 실행 시각: 2026-07-14T14:02:47.814Z
- 스캔 범위: apps/admin/src — .tsx 30개 파일, JSX 엘리먼트 364개
- 후보 기준: 정규화 시그니처(태그 구조 + 주요 속성 키) 동일 — 또는 유사 구조(태그 골격 동일 + 속성 키 자카드 >= 60.0%) 병합 — 출현 2회 이상
- 권고 기준(기존 계약 유사도): >= 85.0% REUSE · 60.0%~85.0% EXTEND · < 60.0% CREATE (비교 계약 1건)
- 제안 레벨 기준: 리프(깊이 1) atom · 깊이 2 molecule · 깊이 3+ organism (Storybook 카테고리 판정 기준과 동일)

## 모듈 후보 (34건)

| # | 후보명 | 출현 수 | 위치 | 제안 레벨 | 기존 계약 유사도 | 권고 |
|---|---|---|---|---|---|---|
| 1 | PathItem | 57 (2개 파일) | apps/admin/src/pages/login/icons.tsx:29<br>apps/admin/src/pages/login/icons.tsx:39<br>apps/admin/src/pages/login/icons.tsx:40<br>외 54곳 | atom | Button 25.0% | CREATE |
| 2 | PItem | 17 (9개 파일) | apps/admin/src/pages/dashboard/components/ListCard.tsx:94<br>apps/admin/src/pages/dashboard/DashboardPage.tsx:94<br>apps/admin/src/pages/login/LoginPage.tsx:315<br>외 14곳 | atom | Button 16.7% | CREATE |
| 3 | TdsDashSkeleton | 11 (6개 파일) | apps/admin/src/pages/dashboard/components/ListCard.tsx:90<br>apps/admin/src/pages/dashboard/components/ListCard.tsx:91<br>apps/admin/src/pages/dashboard/components/StatsSection.tsx:106<br>외 8곳 | atom | Button 20.0% | CREATE |
| 4 | RectItem | 8 (2개 파일) | apps/admin/src/shared/icons.tsx:29<br>apps/admin/src/shared/icons.tsx:30<br>apps/admin/src/shared/icons.tsx:31<br>외 5곳 | atom | Button 25.0% | CREATE |
| 5 | SpanItem | 8 (4개 파일) | apps/admin/src/pages/dashboard/components/Card.tsx:62<br>apps/admin/src/pages/dashboard/components/ListCard.tsx:106<br>apps/admin/src/pages/dashboard/components/ListCard.tsx:107<br>외 5곳 | atom | Button 12.5% | CREATE |
| 6 | CircleItem | 7 (4개 파일) | apps/admin/src/pages/dashboard/components/VisitorChart.tsx:200<br>apps/admin/src/pages/login/icons.tsx:30<br>apps/admin/src/pages/login/icons.tsx:61<br>외 4곳 | atom | Button 10.0% | CREATE |
| 7 | DivItem | 7 (5개 파일) | apps/admin/src/pages/dashboard/components/StatsSection.tsx:88<br>apps/admin/src/pages/dashboard/DashboardPage.tsx:117<br>apps/admin/src/pages/login/components/TextField.tsx:147<br>외 4곳 | atom | Button 14.3% | CREATE |
| 8 | Button | 6 (2개 파일) | apps/admin/src/pages/product-registration/ImageUploadField.tsx:199<br>apps/admin/src/pages/product-registration/ImageUploadField.tsx:210<br>apps/admin/src/pages/product-registration/ImageUploadField.tsx:222<br>외 3곳 | atom | Button 100.0% | REUSE |
| 9 | SvgPathGroup | 5 (2개 파일) | apps/admin/src/pages/login/icons.tsx:38<br>apps/admin/src/pages/login/icons.tsx:49<br>apps/admin/src/shared/icons.tsx:40<br>외 2곳 | molecule | Button 16.7% | CREATE |
| 10 | PItem2 | 5 (4개 파일) | apps/admin/src/pages/dashboard/components/StatsSection.tsx:102<br>apps/admin/src/pages/dashboard/components/StatsSection.tsx:120<br>apps/admin/src/pages/dashboard/DashboardPage.tsx:102<br>외 2곳 | atom | Button 16.7% | CREATE |
| 11 | TdsDashFocusable | 4 (4개 파일) | apps/admin/src/pages/dashboard/components/RangeToggle.tsx:57<br>apps/admin/src/pages/login/components/Button.tsx:58<br>apps/admin/src/pages/permissions/PermissionsPage.tsx:121<br>외 1곳 | atom | Button 8.0% | CREATE |
| 12 | TdsPrFocusable | 4 (2개 파일) | apps/admin/src/pages/login/components/TextField.tsx:121<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:384<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:451<br>외 1곳 | atom | Button 7.1% | CREATE |
| 13 | FieldGroup | 3 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:377<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:444<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:485 | molecule | Button 10.0% | CREATE |
| 14 | SvgPathGroup2 | 3 (1개 파일) | apps/admin/src/shared/icons.tsx:63<br>apps/admin/src/shared/icons.tsx:212<br>apps/admin/src/shared/icons.tsx:221 | molecule | Button 15.4% | CREATE |
| 15 | TrThGroup | 3 (1개 파일) | apps/admin/src/pages/dashboard/components/PeriodTable.tsx:92<br>apps/admin/src/pages/dashboard/components/PeriodTable.tsx:106<br>apps/admin/src/pages/dashboard/components/PeriodTable.tsx:124 | molecule | Button 22.2% | CREATE |
| 16 | H1Item | 3 (2개 파일) | apps/admin/src/pages/login/LoginPage.tsx:328<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:102<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:345 | atom | Button 16.7% | CREATE |
| 17 | LabelItem | 3 (3개 파일) | apps/admin/src/pages/login/components/Checkbox.tsx:43<br>apps/admin/src/pages/login/components/TextField.tsx:143<br>apps/admin/src/pages/product-registration/ui.tsx:178 | atom | Button 22.2% | CREATE |
| 18 | PathItem2 | 3 (2개 파일) | apps/admin/src/pages/dashboard/components/VisitorChart.tsx:190<br>apps/admin/src/pages/dashboard/components/VisitorChart.tsx:198<br>apps/admin/src/shared/layout/LogoPlaceholder.tsx:53 | atom | Button 22.2% | CREATE |
| 19 | SpanItem2 | 3 (3개 파일) | apps/admin/src/pages/product-registration/ImageUploadField.tsx:134<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:577<br>apps/admin/src/pages/product-registration/ui.tsx:168 | atom | Button 11.1% | CREATE |
| 20 | UlItem | 3 (3개 파일) | apps/admin/src/pages/dashboard/components/ListCard.tsx:96<br>apps/admin/src/pages/dashboard/components/TodoCard.tsx:66<br>apps/admin/src/pages/permissions/PermissionsPage.tsx:100 | atom | Button 16.7% | CREATE |
| 21 | SvgPathGroup3 | 2 (1개 파일) | apps/admin/src/shared/icons.tsx:83<br>apps/admin/src/shared/icons.tsx:189 | molecule | Button 15.4% | CREATE |
| 22 | SvgPathGroup4 | 2 (1개 파일) | apps/admin/src/shared/icons.tsx:106<br>apps/admin/src/shared/icons.tsx:165 | molecule | Button 15.4% | CREATE |
| 23 | FormSectionGroup | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:443<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:484 | organism | Button 18.8% | CREATE |
| 24 | CardTitleGroup | 2 (2개 파일) | apps/admin/src/pages/dashboard/components/ListCard.tsx:82<br>apps/admin/src/pages/dashboard/components/TodoCard.tsx:58 | molecule | Button 21.4% | CREATE |
| 25 | LiSpanGroup | 2 (1개 파일) | apps/admin/src/pages/dashboard/components/VisitorChart.tsx:146<br>apps/admin/src/pages/dashboard/components/VisitorChart.tsx:150 | molecule | Button 9.1% | CREATE |
| 26 | Alert | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:355<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:372 | atom | Button 0.0% | CREATE |
| 27 | BarChartIcon | 2 (2개 파일) | apps/admin/src/pages/dashboard/components/StatsSection.tsx:84<br>apps/admin/src/shared/layout/AppShell.tsx:64 | atom | Button 33.3% | CREATE |
| 28 | H1Item2 | 2 (2개 파일) | apps/admin/src/pages/placeholder/PlaceholderPage.tsx:37<br>apps/admin/src/shared/layout/AppHeader.tsx:96 | atom | Button 14.3% | CREATE |
| 29 | OptionItem | 2 (1개 파일) | apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:562<br>apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:566 | atom | Button 30.0% | CREATE |
| 30 | PItem3 | 2 (2개 파일) | apps/admin/src/pages/login/components/TextField.tsx:155<br>apps/admin/src/pages/product-registration/ui.tsx:196 | atom | Button 16.7% | CREATE |
| 31 | TdsLoginSpinner | 2 (2개 파일) | apps/admin/src/pages/login/components/Button.tsx:65<br>apps/admin/src/pages/product-registration/ui.tsx:35 | atom | Button 13.3% | CREATE |
| 32 | TextItem | 2 (1개 파일) | apps/admin/src/pages/dashboard/components/VisitorChart.tsx:175<br>apps/admin/src/pages/dashboard/components/VisitorChart.tsx:214 | atom | Button 25.0% | CREATE |
| 33 | TextField | 2 (2개 파일) | apps/admin/src/pages/login/components/LoginForm.tsx:81<br>apps/admin/src/pages/login/components/PasswordField.tsx:103 | atom | Button 11.1% | CREATE |
| 34 | UlItem2 | 2 (2개 파일) | apps/admin/src/pages/dashboard/components/TabBar.tsx:49<br>apps/admin/src/pages/product-registration/ImageUploadField.tsx:163 | atom | Button 14.3% | CREATE |

## 후보 상세

### 1. PathItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
path[d]
```

- 구조: 루트 `path` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `d`
- 출현 위치 (57곳):
  - apps/admin/src/pages/login/icons.tsx:29
  - apps/admin/src/pages/login/icons.tsx:39
  - apps/admin/src/pages/login/icons.tsx:40
  - apps/admin/src/pages/login/icons.tsx:41
  - apps/admin/src/pages/login/icons.tsx:50
  - apps/admin/src/pages/login/icons.tsx:51
  - apps/admin/src/pages/login/icons.tsx:52
  - apps/admin/src/pages/login/icons.tsx:62
  - apps/admin/src/pages/login/icons.tsx:63
  - apps/admin/src/shared/icons.tsx:41
  - apps/admin/src/shared/icons.tsx:42
  - apps/admin/src/shared/icons.tsx:43
  - apps/admin/src/shared/icons.tsx:52
  - apps/admin/src/shared/icons.tsx:54
  - apps/admin/src/shared/icons.tsx:55
  - apps/admin/src/shared/icons.tsx:64
  - apps/admin/src/shared/icons.tsx:73
  - apps/admin/src/shared/icons.tsx:74
  - apps/admin/src/shared/icons.tsx:75
  - apps/admin/src/shared/icons.tsx:84
  - apps/admin/src/shared/icons.tsx:85
  - apps/admin/src/shared/icons.tsx:86
  - apps/admin/src/shared/icons.tsx:87
  - apps/admin/src/shared/icons.tsx:88
  - apps/admin/src/shared/icons.tsx:98
  - apps/admin/src/shared/icons.tsx:107
  - apps/admin/src/shared/icons.tsx:108
  - apps/admin/src/shared/icons.tsx:109
  - apps/admin/src/shared/icons.tsx:110
  - apps/admin/src/shared/icons.tsx:119
  - apps/admin/src/shared/icons.tsx:120
  - apps/admin/src/shared/icons.tsx:121
  - apps/admin/src/shared/icons.tsx:122
  - apps/admin/src/shared/icons.tsx:123
  - apps/admin/src/shared/icons.tsx:124
  - apps/admin/src/shared/icons.tsx:135
  - apps/admin/src/shared/icons.tsx:144
  - apps/admin/src/shared/icons.tsx:145
  - apps/admin/src/shared/icons.tsx:146
  - apps/admin/src/shared/icons.tsx:156
  - apps/admin/src/shared/icons.tsx:157
  - apps/admin/src/shared/icons.tsx:166
  - apps/admin/src/shared/icons.tsx:167
  - apps/admin/src/shared/icons.tsx:168
  - apps/admin/src/shared/icons.tsx:169
  - apps/admin/src/shared/icons.tsx:179
  - apps/admin/src/shared/icons.tsx:180
  - apps/admin/src/shared/icons.tsx:181
  - apps/admin/src/shared/icons.tsx:190
  - apps/admin/src/shared/icons.tsx:191
  - apps/admin/src/shared/icons.tsx:192
  - apps/admin/src/shared/icons.tsx:193
  - apps/admin/src/shared/icons.tsx:194
  - apps/admin/src/shared/icons.tsx:203
  - apps/admin/src/shared/icons.tsx:204
  - apps/admin/src/shared/icons.tsx:213
  - apps/admin/src/shared/icons.tsx:222
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 2. PItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
p[style]
```

- 구조: 루트 `p` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (17곳):
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:94
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:94
  - apps/admin/src/pages/login/LoginPage.tsx:315
  - apps/admin/src/pages/login/LoginPage.tsx:317
  - apps/admin/src/pages/login/LoginPage.tsx:318
  - apps/admin/src/pages/login/LoginPage.tsx:331
  - apps/admin/src/pages/login/LoginPage.tsx:353
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:89
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:38
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:39
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:348
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:636
  - apps/admin/src/pages/product-registration/ui.tsx:131
  - apps/admin/src/pages/product-registration/ui.tsx:235
  - apps/admin/src/shared/layout/AppHeader.tsx:93
  - apps/admin/src/shared/layout/AppHeader.tsx:103
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:61
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 속성 자카드 0.0% · 종합 16.7%

### 3. TdsDashSkeleton — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[aria-hidden,style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-hidden`, `style`
- 출현 위치 (11곳):
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:90
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:91
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:106
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:124
  - apps/admin/src/pages/dashboard/components/TodoCard.tsx:64
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:147
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:151
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:47
  - apps/admin/src/pages/product-registration/ui.tsx:171
  - apps/admin/src/pages/product-registration/ui.tsx:181
  - apps/admin/src/pages/product-registration/ui.tsx:189
- 병합된 유사 시그니처 1건:
  - `span[aria-hidden,className,style]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 20.0% · 속성 자카드 0.0% · 종합 20.0%

### 4. RectItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
rect[height,rx,width,x,y]
```

- 구조: 루트 `rect` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `height`, `rx`, `width`, `x`, `y`
- 출현 위치 (8곳):
  - apps/admin/src/shared/icons.tsx:29
  - apps/admin/src/shared/icons.tsx:30
  - apps/admin/src/shared/icons.tsx:31
  - apps/admin/src/shared/icons.tsx:32
  - apps/admin/src/shared/icons.tsx:133
  - apps/admin/src/shared/icons.tsx:155
  - apps/admin/src/shared/icons.tsx:178
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:42
- 병합된 유사 시그니처 1건:
  - `rect[fill,height,rx,stroke,strokeWidth,width,x,y]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 5. SpanItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (8곳):
  - apps/admin/src/pages/dashboard/components/Card.tsx:62
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:106
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:107
  - apps/admin/src/pages/dashboard/components/TodoCard.tsx:71
  - apps/admin/src/pages/product-registration/ui.tsx:108
  - apps/admin/src/pages/product-registration/ui.tsx:175
  - apps/admin/src/pages/product-registration/ui.tsx:185
  - apps/admin/src/pages/product-registration/ui.tsx:222
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 12.5% · 속성 자카드 0.0% · 종합 12.5%

### 6. CircleItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
circle[cx,cy,r]
```

- 구조: 루트 `circle` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `cx`, `cy`, `r`
- 출현 위치 (7곳):
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:200
  - apps/admin/src/pages/login/icons.tsx:30
  - apps/admin/src/pages/login/icons.tsx:61
  - apps/admin/src/shared/icons.tsx:53
  - apps/admin/src/shared/icons.tsx:97
  - apps/admin/src/shared/icons.tsx:134
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:59
- 병합된 유사 시그니처 1건:
  - `circle[cx,cy,fill,r]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 10.0% · 속성 자카드 0.0% · 종합 10.0%

### 7. DivItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
div[style]
```

- 구조: 루트 `div` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (7곳):
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:88
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:117
  - apps/admin/src/pages/login/components/TextField.tsx:147
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:184
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:197
  - apps/admin/src/pages/product-registration/ui.tsx:111
  - apps/admin/src/pages/product-registration/ui.tsx:166
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 14.3% · 속성 자카드 0.0% · 종합 14.3%

### 8. Button — REUSE — 기존 컴포넌트 소비로 교체 (사본 제거)

```
Button[ariaLabel,disabled,onClick,variant]
```

- 구조: 루트 `Button` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `ariaLabel`, `disabled`, `onClick`, `variant`
- 출현 위치 (6곳):
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:199
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:210
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:222
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:580
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:618
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:626
- 병합된 유사 시그니처 3건:
  - `Button[disabled,loading,onClick,variant]`
  - `Button[ariaLabel,onClick,variant]`
  - `Button[disabled,onClick,variant]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 100.0% · 속성 자카드 25.0% · 종합 100.0%

### 9. SvgPathGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 4개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (5곳):
  - apps/admin/src/pages/login/icons.tsx:38
  - apps/admin/src/pages/login/icons.tsx:49
  - apps/admin/src/shared/icons.tsx:40
  - apps/admin/src/shared/icons.tsx:72
  - apps/admin/src/shared/icons.tsx:143
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 종합 16.7%

### 10. PItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
p[role,style]
```

- 구조: 루트 `p` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `role`, `style`
- 출현 위치 (5곳):
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:102
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:120
  - apps/admin/src/pages/dashboard/DashboardPage.tsx:102
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:157
  - apps/admin/src/pages/product-registration/ui.tsx:201
- 병합된 유사 시그니처 1건:
  - `p[id,role,style]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 속성 자카드 0.0% · 종합 16.7%

### 11. TdsDashFocusable — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
button[aria-busy,className,disabled,onClick,style,type]
```

- 구조: 루트 `button` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-busy`, `className`, `disabled`, `onClick`, `style`, `type`
- 출현 위치 (4곳):
  - apps/admin/src/pages/dashboard/components/RangeToggle.tsx:57
  - apps/admin/src/pages/login/components/Button.tsx:58
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:121
  - apps/admin/src/pages/product-registration/ui.tsx:65
- 병합된 유사 시그니처 3건:
  - `button[aria-busy,className,disabled,style,type]`
  - `button[aria-checked,className,disabled,onClick,role,style,type]`
  - `button[className,onClick,style,type]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 6.3% · 속성 자카드 9.1% · 종합 8.0%

### 12. TdsPrFocusable — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
input[aria-describedby,aria-invalid,aria-required,autoComplete,className,disabled,id,inputMode,onBlur,onChange,onFocus,style,type,value]
```

- 구조: 루트 `input` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-describedby`, `aria-invalid`, `aria-required`, `autoComplete`, `className`, `disabled`, `id`, `inputMode`, `onBlur`, `onChange`, `onFocus`, `style`, `type`, `value`
- 출현 위치 (4곳):
  - apps/admin/src/pages/login/components/TextField.tsx:121
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:384
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:451
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:492
- 병합된 유사 시그니처 2건:
  - `input[aria-describedby,aria-invalid,aria-required,className,disabled,id,maxLength,onBlur,onChange,placeholder,style,type,value]`
  - `input[aria-describedby,aria-invalid,autoComplete,className,disabled,id,inputMode,name,onBlur,onChange,placeholder,required,style,type,value]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 7.1% · 속성 자카드 5.3% · 종합 7.1%

### 13. FieldGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Field[error,hint,id,label,required](input[aria-describedby,aria-invalid,aria-required,autoComplete,className,disabled,id,inputMode,onBlur,onChange,onFocus,style,type,value])
```

- 구조: 루트 `Field` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `error`, `hint`, `id`, `label`, `required`
- 출현 위치 (3곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:377
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:444
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:485
- 병합된 유사 시그니처 1건:
  - `Field[counter,error,id,label,required](input[aria-describedby,aria-invalid,aria-required,className,disabled,id,maxLength,onBlur,onChange,placeholder,style,type,value])`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 10.0% · 속성 자카드 0.0% · 종합 10.0%

### 14. SvgPathGroup2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d])
```

- 구조: 루트 `svg` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/shared/icons.tsx:63
  - apps/admin/src/shared/icons.tsx:212
  - apps/admin/src/shared/icons.tsx:221
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 15.4% · 종합 15.4%

### 15. TrThGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
tr[](th[scope,style])
```

- 구조: 루트 `tr` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (3곳):
  - apps/admin/src/pages/dashboard/components/PeriodTable.tsx:92
  - apps/admin/src/pages/dashboard/components/PeriodTable.tsx:106
  - apps/admin/src/pages/dashboard/components/PeriodTable.tsx:124
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 22.2% · 종합 22.2%

### 16. H1Item — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
h1[id,style]
```

- 구조: 루트 `h1` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login/LoginPage.tsx:328
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:102
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:345
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 속성 자카드 0.0% · 종합 16.7%

### 17. LabelItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
label[htmlFor,style]
```

- 구조: 루트 `label` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `htmlFor`, `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/login/components/Checkbox.tsx:43
  - apps/admin/src/pages/login/components/TextField.tsx:143
  - apps/admin/src/pages/product-registration/ui.tsx:178
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 18. PathItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
path[d,fill,stroke,strokeWidth]
```

- 구조: 루트 `path` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `d`, `fill`, `stroke`, `strokeWidth`
- 출현 위치 (3곳):
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:190
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:198
  - apps/admin/src/shared/layout/LogoPlaceholder.tsx:53
- 병합된 유사 시그니처 1건:
  - `path[d,stroke,strokeLinecap,strokeWidth]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 22.2% · 속성 자카드 0.0% · 종합 22.2%

### 19. SpanItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[id,style]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:134
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:577
  - apps/admin/src/pages/product-registration/ui.tsx:168
- 병합된 유사 시그니처 1건:
  - `span[id,role,style]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 11.1% · 속성 자카드 0.0% · 종합 11.1%

### 20. UlItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ul[style]
```

- 구조: 루트 `ul` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (3곳):
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:96
  - apps/admin/src/pages/dashboard/components/TodoCard.tsx:66
  - apps/admin/src/pages/permissions/PermissionsPage.tsx:100
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 속성 자카드 0.0% · 종합 16.7%

### 21. SvgPathGroup3 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 6개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/shared/icons.tsx:83
  - apps/admin/src/shared/icons.tsx:189
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 15.4% · 종합 15.4%

### 22. SvgPathGroup4 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
svg[](path[d]+path[d]+path[d]+path[d])
```

- 구조: 루트 `svg` · 노드 5개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/shared/icons.tsx:106
  - apps/admin/src/shared/icons.tsx:165
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 15.4% · 종합 15.4%

### 23. FormSectionGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
FormSection[title,titleId](Field[error,hint,id,label,required](input[aria-describedby,aria-invalid,aria-required,autoComplete,className,disabled,id,inputMode,onBlur,onChange,onFocus,style,type,value]))
```

- 구조: 루트 `FormSection` · 노드 3개 · 깊이 3 → 제안 레벨 **organism**
- 루트 속성 키: `title`, `titleId`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:443
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:484
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 18.8% · 속성 자카드 0.0% · 종합 18.8%

### 24. CardTitleGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
CardTitle[](CountBadge[count])
```

- 구조: 루트 `CardTitle` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/ListCard.tsx:82
  - apps/admin/src/pages/dashboard/components/TodoCard.tsx:58
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 21.4% · 종합 21.4%

### 25. LiSpanGroup — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
li[style](span[aria-hidden,style])
```

- 구조: 루트 `li` · 노드 2개 · 깊이 2 → 제안 레벨 **molecule**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:146
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:150
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 9.1% · 속성 자카드 0.0% · 종합 9.1%

### 26. Alert — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
Alert[actions,message,tone]
```

- 구조: 루트 `Alert` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `actions`, `message`, `tone`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:355
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:372
- 병합된 유사 시그니처 1건:
  - `Alert[message,tone]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 0.0% · 속성 자카드 0.0% · 종합 0.0%

### 27. BarChartIcon — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
BarChartIcon[]
```

- 구조: 루트 `BarChartIcon` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: (없음)
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/StatsSection.tsx:84
  - apps/admin/src/shared/layout/AppShell.tsx:64
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 33.3% · 종합 33.3%

### 28. H1Item2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
h1[style]
```

- 구조: 루트 `h1` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/placeholder/PlaceholderPage.tsx:37
  - apps/admin/src/shared/layout/AppHeader.tsx:96
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 14.3% · 속성 자카드 0.0% · 종합 14.3%

### 29. OptionItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
option[value]
```

- 구조: 루트 `option` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `value`
- 출현 위치 (2곳):
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:562
  - apps/admin/src/pages/product-registration/ProductRegistrationPage.tsx:566
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 30.0% · 속성 자카드 0.0% · 종합 30.0%

### 30. PItem3 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
p[id,style]
```

- 구조: 루트 `p` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `id`, `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/login/components/TextField.tsx:155
  - apps/admin/src/pages/product-registration/ui.tsx:196
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 16.7% · 속성 자카드 0.0% · 종합 16.7%

### 31. TdsLoginSpinner — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
span[aria-hidden,className]
```

- 구조: 루트 `span` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-hidden`, `className`
- 출현 위치 (2곳):
  - apps/admin/src/pages/login/components/Button.tsx:65
  - apps/admin/src/pages/product-registration/ui.tsx:35
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 13.3% · 속성 자카드 0.0% · 종합 13.3%

### 32. TextItem — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
text[fill,fontSize,textAnchor,x,y]
```

- 구조: 루트 `text` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `fill`, `fontSize`, `textAnchor`, `x`, `y`
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:175
  - apps/admin/src/pages/dashboard/components/VisitorChart.tsx:214
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 25.0% · 속성 자카드 0.0% · 종합 25.0%

### 33. TextField — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
TextField[autoComplete,disabled,error,id,inputMode,inputRef,label,name,onBlur,onChange,required,type,value]
```

- 구조: 루트 `TextField` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `autoComplete`, `disabled`, `error`, `id`, `inputMode`, `inputRef`, `label`, `name`, `onBlur`, `onChange`, `required`, `type`, `value`
- 출현 위치 (2곳):
  - apps/admin/src/pages/login/components/LoginForm.tsx:81
  - apps/admin/src/pages/login/components/PasswordField.tsx:103
- 병합된 유사 시그니처 1건:
  - `TextField[autoComplete,disabled,error,id,inputRef,label,name,onBlur,onChange,placeholder,required,trailing,type,value]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 11.1% · 속성 자카드 5.6% · 종합 11.1%

### 34. UlItem2 — CREATE — 신규 모듈 후보 (G0 접수 → 정밀 판정)

```
ul[aria-label,role,style]
```

- 구조: 루트 `ul` · 노드 1개 · 깊이 1 → 제안 레벨 **atom**
- 루트 속성 키: `aria-label`, `role`, `style`
- 출현 위치 (2곳):
  - apps/admin/src/pages/dashboard/components/TabBar.tsx:49
  - apps/admin/src/pages/product-registration/ImageUploadField.tsx:163
- 병합된 유사 시그니처 1건:
  - `ul[aria-label,style]`
- 최근접 계약: **Button**@1.0.0 (contracts/Button.contract.json) — 이름 유사도 14.3% · 속성 자카드 0.0% · 종합 14.3%

## 후속 조치

- **REUSE** 후보: 페이지 로컬 사본을 기존 컴포넌트 소비로 교체한다 (A40) — 사본 잔존은 중복률 SLO(<= 3%) 위반.
- **EXTEND** 후보: 기존 계약 확장을 우선 검토한다 — A18에 change_request 발행 (G3 재진입, additive 변경이면 MINOR).
- **CREATE** 후보: 후보 1건 = 1 Task 로 G0 접수한다. 접수 시 `pnpm --filter @tds/reuse-guard run check --name <후보명> --props <속성들>` 로 정밀 판정을 다시 받는다 (본 스캔의 속성 키는 계약 props 만큼 정제되지 않았다).
- 이 리포트 없이 신규 모듈 계약(G3)을 생성하는 것은 금지된다 (page-module-pipeline §2-②).
