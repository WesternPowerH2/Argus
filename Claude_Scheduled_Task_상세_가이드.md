# Claude Scheduled Task 상세 가이드
## Argus 브리핑 자동 생성 시스템 — 단계별 실행 설명

**대상**: Claude 프로젝트에서 자동화 작업을 이해/관리할 담당자  
**목적**: SKILL.md의 각 STEP을 상세히 설명하고 오류 진단 가이드 제공

---

## 🎯 Scheduled Task 기본 개념

### 무엇인가?

Claude의 **Scheduled Task**는 정해진 시간(매일 09:00)에 자동으로 실행되는 지능형 워크플로우입니다.

```
시간 도래 (매일 09:00)
    ↓
Claude 시스템이 자동 깨어남
    ↓
SKILL.md의 지침 읽음
    ↓
Python/JavaScript 코드 실행 (실제로는 Claude가 지침을 읽고 작업 수행)
    ↓
결과 생성 (HTML, 텍스트, 파일 변경)
    ↓
로그 저장 (Cowork에서 확인 가능)
```

### 왜 필요한가?

- **수동 작업 제거**: 매일 아침 클릭해서 실행할 필요 없음
- **시간 보장**: 정확하게 09:00에 실행됨
- **연속성**: 휴일/주말 관계없이 매일 실행
- **에러 복구**: 실패 시 자동으로 기록되어 다음날 재시도 가능

---

## 📋 STEP-BY-STEP 상세 설명

### STEP 1 — 대시보드 최신 날짜 파악

**목표**: 현재 아카이브의 가장 최신 브리핑 날짜를 알아냄

**실행 내용**:
```
파일 읽기: C:\Argus\dashboard.html
          (또는 /sessions/[session]/mnt/Argus 수소정보지 정리/dashboard.html)

읽은 내용에서 찾기:
  const briefs = [
    { date:'2026-06-19', ...    ← 이 날짜!
    { date:'2026-06-18', ...
    ...
  ]

최신 날짜 변수에 저장:
  LATEST_DATE = '2026-06-19'
```

**왜 필요한가?

- 같은 날짜의 브리핑을 중복으로 생성하지 않기 위함
- 새로운 날짜의 파일만 처리하기 위함
- 아카이브 데이터의 연속성 보장

**에러 가능성**:
- ❌ 파일을 읽을 수 없음 → 권한 문제 또는 파일 경로 오류
- ❌ `const briefs = [...]` 구조 찾을 수 없음 → dashboard.html 손상

**확인 방법**:
```
Claude 작업 로그에서 다음 메시지 보이는지 확인:
✅ "현재 최신 브리핑: 2026-06-19"
```

---

### STEP 2 — Google Drive에서 신규 파일 탐색

**목표**: 최신 날짜보다 새로운 번역본 파일을 찾음

**실행 내용**:

```
Google Drive MCP 호출:
  mcp__5290966b-f25d-4a16-a05a-8bca137049c5__search_files

검색 쿼리:
  parentId = '1Gw18D61S2DFNG1MVnvvBTIf9Yr7hLjFH'
  (번역본 한글 폴더 ID)
  
  AND modifiedTime > '2026-06-19T00:00:00Z'
  (최신 날짜 이후에 수정된 파일)
  
  pageSize: 20
  (한 번에 최대 20개 파일)

결과 예시:
  ✅ 파일 1: 20260620_fmbamm_번역본
  ✅ 파일 2: 20260621_fmbamm_번역본
  ✅ 파일 3: 20260621_hydrogen_번역본
  (같은 날짜에 암모니아 + 수소 모두 있음)

파일명에서 날짜 추출:
  "20260620_fmbamm_번역본" → YYYYMMDD = "20260620"
  
날짜 비교:
  20260620 > 20260619? ✅ YES → 처리 대상
  20260621 > 20260619? ✅ YES → 처리 대상

날짜 오름차순 정렬:
  [20260620, 20260621] → 오래된 것부터 처리
```

**파일 유형 분류**:

```
파일명 패턴                설명              처리 방식
─────────────────────────────────────────────────────
YYYYMMDD_fmbamm_번역본    암모니아 일간지     생성 + 입력
YYYYMMDD_hydrogen_번역본  수소 주간지        생성 + 입력
YYYYMMDD_lcabsupp_번역본  보충자료           같은 날짜 fmbamm과 함께 반영
```

**특수 경우**:

```
경우 1: 같은 날짜에 fmbamm + hydrogen 모두 있음
  → 탭 분리형 HTML 생성 (20260608.html 참조)
  → dashboard.html에 두 탭 모두 데이터 입력

경우 2: fmbamm만 있음
  → 암모니아 단독형 HTML (20260407.html 참조)
  → 가격 섹션만 포함

경우 3: 처리 대상이 없음 (모두 이전 날짜)
  → "가장 최신 브리핑(2026-06-19) 이후 새로운 자료가 없습니다."
  → 작업 종료
```

**에러 가능성**:
- ❌ Google Drive API 오류 → 인증 만료 또는 API 비활성화
- ❌ 폴더 ID 잘못됨 → SKILL.md의 폴더 ID 재확인
- ❌ 결과가 20개를 넘음 → nextPageToken으로 추가 페이지 요청

**확인 방법**:
```
Claude 작업 로그에서:
✅ "신규 파일 발견: 20260620_fmbamm_번역본"
✅ "신규 파일 발견: 20260621_fmbamm_번역본"
✅ "날짜 오름차순 정렬: [20260620, 20260621]"

또는

✅ "가장 최신 브리핑(2026-06-19) 이후 새로운 자료가 없습니다."
  → 작업 정상 종료 (에러 아님)
```

---

### STEP 3 — OCR 원문 내용 읽기 (데이터 추출 기준)

**목표**: Google Drive의 OCR 원문(영문 문서)에서 브리핑에 필요한 모든 데이터를 추출

**중요**: 번역본이 아니라 **OCR 원문(영문)**을 읽는 이유
- 번역본은 링크 연결 목적에만 사용
- 정확한 가격 수치는 원문 기준
- 영문 원문이 표준 데이터소스

**실행 내용**:

#### 3-1. OCR 원문 파일 찾기
```
같은 날짜의 OCR 폴더에서 파일 검색:

STEP 2에서 발견한 파일: 20260620_fmbamm_번역본
↓
대응하는 OCR 파일명 생성: 20260620_fmbamm_OCR
↓
Google Drive에서 OCR 폴더(1R3F2gqKA4m4lKi7dA-E-f_vtXjqDLDug)에서 검색
↓
파일 발견: "20260620_fmbamm_OCR" ← 이 파일을 읽음

if 파일 없음:
  → "OCR 원문을 찾을 수 없습니다. 번역본만 생성된 상태"
  → 작업 중지 (번역본 링크는 설정했지만 데이터 추출 불가)
```

#### 3-2. OCR 문서 내용 전체 읽기
```
google_drive_fetch 또는 read_file_content로 문서 전체 읽기

예상 내용 구조:
─────────────────────────────────────────────────
Argus Media — Daily Ammonia Report
Date: June 20, 2026
Issue 26-70

PRICE SECTION:
Mideast FOB: 770 $/t, nc
East Asia CFR: 825 $/t, nc
NW Europe CFR: 880 $/t, nc
US Gulf CFR: 775 $/t, nc
JKLAB CFR Ulsan: 828.99 $/t, +3.67

KEY TOPICS:
1. [HOT] Supply Disruption at Hormuz...
   Impact: Prices may decline if transit resumes
   
2. Market equilibrium continues despite geopolitical risks
   
3. [POLICY] EU CBAM implementation delayed...
   
TREND:
• Item 1
• Item 2

MONITORING:
□ Point 1
□ Point 2
─────────────────────────────────────────────────
```

#### 3-3. 데이터 추출 (정확도 최우선)

**A. 기본 정보**
```
날짜:
  파일명 "20260620_fmbamm_OCR"의 앞 8자리 → 20260620
  포맷: YYYY-MM-DD → 2026-06-20
  요일 계산: June 20, 2026 = Thursday (목)

Argus 호수:
  원문에서 찾기: "Issue 26-70"
  포맷: 제26-70호

타입 판별:
  파일명에 "fmbamm" → 암모니아
  파일명에 "hydrogen" → 수소
```

**B. 가격 데이터 (매우 중요)**

```
원문의 PRICE 섹션을 정확하게 추출

매핑:
  Mideast FOB              → 중동 fob (me)
  East Asia CFR            → 동아시아 cfr (ea)
  NW Europe CFR            → NW유럽 cfr (nwe)
  US Gulf CFR              → 미국걸프 cfr (usg)
  JKLAB CFR Ulsan          → JKLAB cfr 울산 (jklab)

변동 규칙:
  "nc" (no change)         → "nc"
  "+N" (plus N)            → "+N"
  "-N" (minus N)           → "-N"
  숫자만 있으면            → "nc"

예시:
  원문: "Mideast FOB: 770 $/t, nc"
  추출: { me: 770, chg_me: "nc" }

주의사항:
  ✅ 숫자 정확도: 소수점 자리수 일치
     - 일반 가격: 정수 (예: 770)
     - JKLAB: 소수 2자리 (예: 828.99)
  
  ❌ 오류 사례:
     - "770.0"이 "770"으로 변환되지 않음
     - "828"이 "828.99"로 잘못 기록됨
     - "+3.67"이 "+4"로 반올림됨
```

**C. 핵심 이슈 (5개 이내)**

```
원문의 KEY TOPICS 섹션 추출

각 이슈마다:
  1. 유형 분류
     - [HOT] 또는 🔴 시작 → type: "hot" (공급 차질, 가격 급등)
     - [POLICY] 또는 🟣 시작 → type: "pol" (정책, 규제)
     - 일반 텍스트 시작 → type: "" (시장, 수급)
  
  2. 한 줄 요약 (한국어)
     원문 문장 → 한국어로 번역/요약
     예: "Supply Disruption at Hormuz continues"
     → "호르무즈 공급 차질 지속"
  
  3. 세부 내용 (불릿/화살표)
     원문의 설명 부분 → 한국어 번역
     예: "Impact: Prices may decline if transit resumes"
     → "→ 호르무즈 재개 시 가격 하락 가능"
  
  4. 시사점
     시장 의미 또는 향후 영향
     예: "→ 공급 재개 타이밍 주시 필수"

output format (dashboard.html용):
  {
    type: 'hot',
    text: '호르무즈 공급 차질 지속 — 전지역 가격 영향'
  }
```

**D. 주요 동향 (5~6개)**

```
원문의 TREND 섹션 추출

각 항목마다:
  • 한 줄 요약 (20자 이내)
  • 구체적인 내용 1줄 추가 (선택)

예시:
  원문: "Market equilibrium continues despite risks"
  추출: "시장 균형세 지속 — 지정학적 리스크에도 안정세"
```

**E. 모니터링 포인트 (3~4개)**

```
원문의 MONITORING 섹션 추출

각 포인트마다:
  □ 주시 대상 (간단한 설명)

예시:
  원문: "Hormuz transit resumption timing"
  추출: "호르무즈 통항 재개 일정"
```

**에러 가능성**:
- ❌ 원문이 비어있음 → OCR 실패 (이전 단계 오류)
- ❌ 가격이 찾을 수 없음 → 원문 구조 변경
- ❌ 일부 필드만 있음 → 암모니아/수소 타입 확인

**확인 방법**:
```
Claude 작업 로그에서:
✅ "OCR 원문 읽음: 20260620_fmbamm_OCR"
✅ "가격 추출: me=770, ea=825, nwe=880, usg=775, jklab=828.99"
✅ "이슈 5개 추출 완료"
✅ "모니터링 포인트 3개 추출 완료"
```

---

### STEP 4 — 번역본 폴더에서 링크 확인

**목표**: 번역본 구글 문서의 공유 링크를 얻어 HTML에 "번역본" 버튼 연결

**실행 내용**:

```
같은 날짜의 번역본 파일 검색:

STEP 2에서 발견: 20260620_fmbamm_번역본
↓
파일의 web_view_link 추출 (Google Drive의 공개 링크)
↓
링크 형식: https://docs.google.com/document/d/[DOC_ID]/edit?usp=drivesdk

if 링크를 얻지 못한 경우:
  → 번역본 폴더 전체 링크로 대체:
  → https://drive.google.com/drive/folders/1Gw18D61S2DFNG1MVnvvBTIf9Yr7hLjFH

이 링크를 STEP 5 HTML 생성 시 사용
```

**중요**: 
- 번역본은 "데이터 추출용"이 아니라 "버튼 링크용"
- 실제 데이터는 STEP 3에서 OCR 원문으로 추출
- 번역본 링크는 사용자가 한글 원문을 확인하고 싶을 때 사용

---

### STEP 5 — 브리핑 HTML 작성

**목표**: STEP 3에서 추출한 데이터를 기반으로 새로운 HTML 브리핑 파일 생성

**실행 내용**:

#### 5-1. 템플릿 선택

```
STEP 2에서 파일 유형 확인:

if 같은 날짜에 fmbamm + hydrogen 모두 있음:
  → 템플릿 선택: briefs/20260608.html (탭 분리형)
  → 암모니아 탭 + 수소 탭 구조

else fmbamm만 있음:
  → 템플릿 선택: briefs/20260407.html (암모니아 단독형)
  → 가격 섹션만 포함

else hydrogen만 있음:
  → 템플릿 선택: briefs/[수소_단독형] (필요시 생성)
  → 수소 데이터만 포함
```

#### 5-2. 템플릿 읽기 및 변수 치환

```
선택된 템플릿 파일 읽기

예시 구조 (20260407.html):
────────────────────────────────────────
<!DOCTYPE html>
<html>
<head>
  <script src="auth.js"></script>
  <script>
    AUTH.requireAuth(); ← 인증 요구
  </script>
  ...
</head>
<body>
  <div class="header">
    <span>2026년 4월 7일 (월)</span> ← {{DATE}} / {{DAY}}
    <span>제26-44호</span>              ← {{ISSUE_NUM}}
  </div>
  
  <div class="price-card">
    <div>중동 fob</div>
    <div>{{ME_PRICE}}</div>
    <div>{{ME_CHG}}</div>
  </div>
  
  <!-- 이런 식으로 {{변수}} 형식으로 기록됨 -->
</body>
</html>
────────────────────────────────────────

변수 치환:
  {{DATE}} → "2026-06-20"
  {{DAY}} → "목"
  {{ISSUE_NUM}} → "제26-70호"
  {{ME_PRICE}} → 770
  {{ME_CHG}} → "nc"
  {{JKLAB_PRICE}} → 828.99
  {{ISSUE_HOT_1}} → "호르무즈 공급 차질..."
  {{TREND_1}} → "시장 균형세 지속..."
  {{MONITOR}} → "□ 호르무즈 통항..."
  {{OCR_LINK}} → "https://docs.google.com/..."
  {{PDF_LINK}} → "https://drive.google.com/..."
```

#### 5-3. 파일 저장

```
생성된 HTML을 파일로 저장:

파일명: briefs/20260620.html
위치: C:\Argus\briefs\YYYYMMDD.html
인코딩: UTF-8

검증:
  ✅ 파일 생성 확인
  ✅ 파일 크기 정상 (보통 30~50 KB)
  ✅ 특수 문자 깨짐 없음 (한글 정상)
```

**에러 가능성**:
- ❌ 템플릿 파일 없음 → briefs 폴더 확인
- ❌ 변수 치환 실패 → 데이터 타입 오류 (숫자 vs 문자열)
- ❌ 파일 저장 실패 → 권한 또는 경로 오류

**확인 방법**:
```
Claude 작업 로그에서:
✅ "HTML 생성 완료: briefs/20260620.html"

로컬에서:
✅ C:\Argus\briefs\20260620.html 파일 존재 확인
✅ 파일 크기: 35 KB 정도 (정상)
✅ 파일 열기 > 내용 확인 (가격, 이슈 데이터 표시)
```

---

### STEP 6 — dashboard.html 업데이트

**목표**: 새로 생성한 브리핑을 아카이브 목록의 맨 앞에 추가

**실행 내용**:

#### 6-1. dashboard.html 읽기
```
파일 읽기: C:\Argus\dashboard.html

구조 확인:
  const briefs = [
    { date:'2026-06-19', ... },  ← 현재 최신
    { date:'2026-06-18', ... },
    ...
  ]
```

#### 6-2. 새 항목 생성 및 삽입

```
STEP 3에서 추출한 데이터로 새 항목 생성:

새 항목:
{
  date:'2026-06-20',           ← YYYY-MM-DD 형식
  label:'6월 20일',             ← M월 D일 형식
  day:'목',                     ← 요일 한글 (월화수목금)
  hot:true,                     ← 긴급 이슈 있으면 true
  tags:'호르무즈·공급차질·가격변동',  ← 키워드 3개 · 구분
  ocrUrl:'https://docs.google.com/document/d/...',  ← STEP 4 링크
  prices:{
    me:770,
    ea:825,
    nwe:880,
    usg:775,
    jklab:828.99
  },
  chg:{
    me:'nc',
    ea:'nc',
    nwe:'nc',
    usg:'nc'
  },
  issues:[
    { type:'hot', text:'호르무즈 공급 차질 지속 — 전지역 영향' },
    { type:'', text:'시장 균형세 유지 — 지정학적 리스크에도 안정' },
    { type:'pol', text:'EU CBAM 이행 지연 — 최종 규칙 확정 대기' },
    { type:'', text:'일본 연료 버너 실증 지연 — GI기금 철수' },
    { type:'', text:'인도 수입 안정화 — 케르테 공장 재가동 예상' }
  ],
  monitor:'□ 호르무즈 통항 재개 일정 □ EU CBAM 세부규칙 □ 일본 GI기금 현황'
}

배열 맨 앞에 삽입:
const briefs = [
  { date:'2026-06-20', ... },  ← 새 항목 (맨 앞!)
  { date:'2026-06-19', ... },  ← 이전 최신
  { date:'2026-06-18', ... },
  ...
]
```

#### 6-3. 파일 저장

```
수정된 dashboard.html 저장:

위치: C:\Argus\dashboard.html
인코딩: UTF-8

const briefs = [
  { date:'2026-06-20', ... },
  ...
] 구조 유지 (CSS/JS 절대 변경 금지)
```

**주의사항**:
- ✅ 배열 구조 유지 (JSON 형식)
- ❌ CSS 스타일 블록 수정하지 말 것
- ❌ JavaScript 함수 수정하지 말 것
- ✅ 새 항목만 맨 앞에 추가

**에러 가능성**:
- ❌ JSON 포맷 오류 (쉼표 빠짐, 따옴표 불일치)
- ❌ CSS/JS 실수로 변경 → 포털 화면 깨짐
- ❌ 문자열 인코딩 오류 (한글 깨짐)

**확인 방법**:
```
Claude 작업 로그에서:
✅ "dashboard.html 업데이트 완료"
✅ "새 항목 추가: 2026-06-20"

로컬 파일에서:
✅ C:\Argus\dashboard.html 열기
✅ 맨 앞에 date:'2026-06-20' 항목 있는지 확인
✅ 가격 데이터 정확한지 확인

브라우저에서:
✅ 포털 새로고침 (Ctrl+F5)
✅ 맨 앞에 "6월 20일" 브리핑 표시 확인
```

---

### STEP 7 — 이전 브리핑 네비게이션 수정

**목표**: 직전 브리핑 (20260619.html)의 "다음 브리핑" 버튼을 새 파일로 업데이트

**실행 내용**:

#### 7-1. 이전 브리핑 파일 찾기

```
대상: STEP 1에서 확인한 최신 날짜의 파일
파일명: briefs/20260619.html (즉, 20260619.html)
```

#### 7-2. 파일 읽기 및 수정

```
파일 읽기: briefs/20260619.html

이전 상태 (예시):
────────────────────────────────────────
<div class="nav-buttons">
  <a class="nav-btn prev" href="20260618.html">← 이전 (6월 18일)</a>
  <span class="nav-disabled next">다음 브리핑 →</span> ← 다음 브리핑이 없었음
</div>
────────────────────────────────────────

수정 후:
────────────────────────────────────────
<div class="nav-buttons">
  <a class="nav-btn prev" href="20260618.html">← 이전 (6월 18일)</a>
  <a class="nav-btn next" href="20260620.html">다음 (6월 20일) →</a> ← 새로 추가됨
</div>
────────────────────────────────────────
```

#### 7-3. 파일 저장

```
수정된 20260619.html 저장

위치: briefs/20260619.html
인코딩: UTF-8
```

**에러 가능성**:
- ❌ 파일을 찾을 수 없음 → 최신 날짜 확인
- ❌ 네비게이션 요소를 찾을 수 없음 → HTML 구조 변경
- ❌ 링크 오류 (날짜 불일치) → STEP 2 날짜 재확인

**확인 방법**:
```
Claude 작업 로그에서:
✅ "이전 브리핑 네비게이션 수정: briefs/20260619.html"

브라우저에서:
✅ 6월 19일 브리핑 > "다음 (6월 20일) →" 클릭
✅ 6월 20일 브리핑으로 이동 확인
```

---

### STEP 8 — 카톡 공유용 텍스트 생성 및 결과 보고

**목표**: 사용자가 카톡에 복사-붙여넣기할 수 있는 형식의 텍스트 요약 생성

**실행 내용**:

#### 8-1. 텍스트 생성

```
정해진 템플릿에 STEP 3 데이터 입력:

생성 결과 예시:
────────────────────────────────────────────────
🔴 ARGUS 암모니아 브리핑 | 2026.06.20 (Issue 26-70)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 현물가격 ($/t)

중동 fob         770  (보합)
동아시아 cfr     825  (보합)
NW유럽 cfr       880  (보합)
미국 걸프 cfr    775  (보합)

JKLAB cfr울산    828.99  (전주比 +3.67)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 핵심 이슈

✦ [호르무즈 공급 차질]
→ 호르무즈 해협 봉쇄 지속
→ 전지역 가격 영향 우려
→ 재개 타이밍 주시 필수

✦ [시장 균형세 유지]
→ 지정학적 리스크에도 안정세 지속
→ 거래량 제한적

✦ [EU CBAM 이행 지연]
→ 최종 규칙 확정 대기 중
→ 비료 분야 중단 가능성 낮음

(이슈 3~5개 계속)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 주요 동향

• 일본 Jera-MHI, 연료 버너 실증 지연
• 인도 수입 안정화 추세
• 중국 FOB 박스권 형성

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ 모니터링 포인트

□ 호르무즈 통항 재개 일정
□ EU CBAM 세부규칙 확정
□ 인도 케르테 공장 재가동 여부

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 서부발전 수소사업실 | Argus Media
────────────────────────────────────────────────
```

#### 8-2. 결과 출력

```
이 텍스트를 stdout으로 출력:

Claude 작업 로그에서 이 텍스트가 보이면, 사용자가 선택해서 복사

사용자 행동:
  1. Claude 작업 로그에서 텍스트 전체 선택
  2. Ctrl+C (복사)
  3. 카톡 오픈
  4. Ctrl+V (붙여넣기)
  5. 전송
```

#### 8-3. 최종 보고

```
작업 완료 후 사용자에게 보고:

✅ 신규 작성 완료:
   • briefs/20260620.html (암모니아)

✅ 업데이트 완료:
   • dashboard.html (새 항목 추가)
   • briefs/20260619.html (네비 수정)

📋 카톡 공유용 텍스트:
   [위의 텍스트 출력]

💾 다음 단계:
   "Windows 작업 스케줄러(09:20)가 자동으로 GitHub에 푸시합니다.
    1~3분 후 포털에서 확인 가능합니다."
```

---

## 🔍 실시간 모니터링 (Task 실행 중)

### Claude Cowork에서 확인하기

```
1. Claude 앱 열기
2. 프로젝트 > "Argus 브리핑 포털"
3. Scheduled Tasks > "argus-briefing-daily"
4. "작업 이력" 탭 클릭

표시되는 정보:
  • 실행 시작 시간
  • 진행 상황 (각 STEP별)
  • 결과 (성공/실패)
  • 소요 시간
  • 에러 메시지 (있으면)
```

### 로그 해석

```
로그 메시지 예시:

✅ STEP 1 완료: 현재 최신 날짜 = 2026-06-19
✅ STEP 2 완료: 신규 파일 1개 발견
  → 20260620_fmbamm_번역본
✅ STEP 3 완료: 데이터 추출
  → 가격: me=770, ea=825, nwe=880, usg=775, jklab=828.99
  → 이슈: 5개 추출
✅ STEP 4 완료: 번역본 링크 확보
✅ STEP 5 완료: HTML 생성
  → briefs/20260620.html (35 KB)
✅ STEP 6 완료: dashboard.html 업데이트
✅ STEP 7 완료: 이전 브리핑 네비 수정
✅ STEP 8 완료: 카톡 텍스트 생성

⏱ 총 소요 시간: 3분 42초
```

---

## 🚨 주요 오류 및 해결

### 오류 1: "Google Drive API 오류"

```
원인: Google Apps Script에서 파일을 Google Drive에 생성/OCR할 때 오류
증상: Google Drive에 파일이 생성되지 않음

해결:
  1. Google Cloud Console > APIs & Services
  2. Drive API 활성화 상태 확인
  3. Apps Script > 프로젝트 설정 > 권한 재확인
  4. Google Apps Script 다시 Run
```

### 오류 2: "OCR 최종 실패 (3회 모두 실패)"

```
원인: Google Drive의 OCR 기능이 PDF를 변환하지 못함
증상: Google Drive에 OCR 폴더에 파일이 없음

해결:
  1. PDF 파일 자체가 손상된 건 아닌지 확인
  2. 다음 날 Argus 메일 대기
  3. 계속 실패하면 Argus에 연락
```

### 오류 3: "HTML 생성 실패 — 템플릿 찾을 수 없음"

```
원인: briefs 폴더에 템플릿 파일이 없음
증상: briefs 폴더가 비어있음

해결:
  1. briefs/20260407.html (암모니아 단독형) 확인
  2. briefs/20260408.html (탭 분리형) 확인
  3. 파일이 없으면 현재 PC에서 복사
```

### 오류 4: "dashboard.html 수정 실패 — JSON 오류"

```
원인: 새 항목 추가 시 JSON 포맷 오류
증상: 포털이 열리지 않음 또는 콘솔 오류 발생

해결:
  1. dashboard.html 백업 생성
  2. 마지막 저장 이전 버전 복원
  3. Claude에게 JSON 포맷 다시 확인 요청
```

---

## 📊 성능 지표

### 정상 실행 시간

```
STEP 1 (최신 날짜 확인): 5초
STEP 2 (Google Drive 검색): 10초
STEP 3 (데이터 추출): 30초
STEP 4 (번역본 링크): 5초
STEP 5 (HTML 생성): 20초
STEP 6 (dashboard 업데이트): 10초
STEP 7 (네비 수정): 5초
STEP 8 (텍스트 생성): 10초

총합: 약 95초 (1분 35초~3분)
```

### 병목 지점

```
가장 오래 걸리는 부분: STEP 3 (데이터 추출)
이유: OCR 문서를 읽고 모든 필드를 파싱하는 과정

예상 개선:
  • Claude 모델 성능 향상
  • 캐싱 메커니즘 도입
  • 병렬 처리 (현재는 순차 처리)
```

---

**버전**: 1.0  
**마지막 수정**: 2026-07-07
