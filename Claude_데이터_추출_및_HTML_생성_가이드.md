# Claude 데이터 추출 및 HTML 생성 가이드
## Argus 브리핑 — 기술 상세 지침

**대상**: 기술적 이해가 필요한 담당자, 시스템 관리자  
**목적**: 데이터 추출 규칙, HTML 구조, 파일 형식 등 상세 기술 지침

---

## 📂 Google Drive 폴더 구조 이해

### 전체 구조

```
My Drive
  └── Argus/
       ├── 원문 PDF/                    (ID: 1oMyl4hTVN8chOw5MPLQKYWdMonStRLxo)
       │    ├── 2026-04/
       │    │    ├── 20260407_fmbamm.pdf
       │    │    ├── 20260408_fmbamm.pdf
       │    │    ├── 20260408_hydrogen.pdf
       │    │    └── ...
       │    └── 2026-05/
       │         └── ...
       │
       ├── OCR 영문본/                  (ID: 1R3F2gqKA4m4lKi7dA-E-f_vtXjqDLDug)
       │    ├── 20260407_fmbamm_OCR
       │    │    └── (Google Doc - 영문 텍스트만)
       │    ├── 20260408_fmbamm_OCR
       │    ├── 20260408_hydrogen_OCR
       │    └── ...
       │
       └── 번역본 한글/                 (ID: 1Gw18D61S2DFNG1MVnvvBTIf9Yr7hLjFH)
            ├── 20260407_fmbamm_번역본
            │    └── (Google Doc - 한글 전체)
            ├── 20260408_fmbamm_번역본
            ├── 20260408_hydrogen_번역본
            └── ...
```

### 각 폴더의 역할

| 폴더 | 파일 유형 | 역할 | Claude에서 사용 |
|------|---------|------|----------------|
| 원문 PDF | PDF | Argus Media에서 수신한 원본 | 참고용 (링크) |
| OCR 영문본 | Google Doc | PDF를 Google Drive OCR로 변환 | ✅ **데이터 추출** |
| 번역본 한글 | Google Doc | OCR 원문을 한글로 번역 | ✅ **버튼 링크** |

---

## 🔍 데이터 추출 규칙 (상세)

### 1. 기본 정보 추출

#### 1.1 날짜 추출

```
소스: 파일명의 앞 8자리

파일명: "20260620_fmbamm_OCR"
        YYYYMMDD
        ↓
추출: 2026-06-20 (YYYY-MM-DD 형식)

요일 계산:
  2026-06-20 = Saturday? → 아니, Thursday (토? 목?)
  
  정확한 계산 방법:
  1. 2026-06-20의 요일을 계산
  2. 영어 요일 → 한글 변환
     Monday = 월, Tuesday = 화, ... , Sunday = 일
  
  2026-06-20은 목요일 ✓
```

#### 1.2 Argus 호수 추출

```
소스: OCR 원문 문서 내용

원문에서 찾기:
  "Argus Media"
  "Issue 26-70"
  또는
  "AMMONIA: Issue 26-70"

패턴: Issue [NUMBER-NUMBER]

추출:
  Issue 26-70 → 26-70
  
표기:
  제26-70호

주의사항:
  ✅ 정확한 호수 필수
  ❌ "Issue 26-7"로 잘못 읽으면 안됨
  ❌ "26호" 또는 "70호"로 분리하면 안됨
```

#### 1.3 문서 타입 판별

```
소스: 파일명의 타입 표시

파일명 패턴:
  "20260620_fmbamm_OCR"    → 암모니아 (ammonia)
  "20260620_hydrogen_OCR"  → 수소 (hydrogen)
  "20260620_lcabsupp_OCR"  → 보충 자료 (보통 처리 안함)

판별:
  if 파일명에 "fmbamm" → type = "ammonia"
  if 파일명에 "hydrogen" → type = "hydrogen"
```

---

### 2. 가격 데이터 추출 (가장 중요)

#### 2.1 가격 구간 찾기

```
OCR 문서 내용 예시:
────────────────────────────────────────
AMMONIA PRICES ($/t)

Mideast FOB: 770 $/t, nc
East Asia (excl Taiwan) CFR: 825 $/t, nc
NW Europe CFR: 880 $/t, nc
US Gulf CFR: 775 $/t, nc

JKLAB — LOW CARBON AMMONIA
CFR Ulsan: 828.99 $/t, +3.67 vs. previous week
────────────────────────────────────────
```

#### 2.2 각 지역별 추출

```
Mideast FOB
  소스: "Mideast FOB: 770 $/t, nc"
  숫자 추출: 770
  변동 추출: nc
  저장: { me: 770, chg: "nc" }
  
East Asia CFR
  소스: "East Asia (excl Taiwan) CFR: 825 $/t, nc"
  숫자 추출: 825
  변동 추출: nc
  저장: { ea: 825, chg: "nc" }
  
NW Europe CFR
  소스: "NW Europe CFR: 880 $/t, nc"
  숫자 추출: 880
  변동 추출: nc
  저장: { nwe: 880, chg: "nc" }
  
US Gulf CFR
  소스: "US Gulf CFR: 775 $/t, nc"
  숫자 추출: 775
  변동 추출: nc
  저장: { usg: 775, chg: "nc" }

JKLAB CFR Ulsan
  소스: "CFR Ulsan: 828.99 $/t, +3.67 vs. previous week"
  숫자 추출: 828.99 (소수점 2자리 유지!)
  변동 추출: +3.67
  저장: { jklab: 828.99, chg: "+3.67" }
```

#### 2.3 변동 기호 정규화

```
변동 원문        정규화     의미
─────────────────────────────
nc              "nc"      보합 (no change)
nc. (마침표)    "nc"      보합
No change       "nc"      보합

+10             "+10"     상승 10달러
+10.5           "+10"     반올림 (정수로)
+3.67           "+3.67"   상승 3.67달러 (소수점 유지)

-15             "-15"     하락 15달러
-5.2            "-5"      반올림 (정수로)

주의사항:
  ✅ 기호 앞의 공백 제거: " +10" → "+10"
  ✅ 소수점 일관성: JKLAB만 소수점 유지
  ❌ 원문의 +/- 부호 누락하면 안됨
```

#### 2.4 숫자 정확도 검증

```
정수와 소수점:

지역별 가격:
  중동/동아시아/NW유럽/미국걸프 → 정수만
  예: 770, 825, 880, 775

JKLAB:
  반드시 소수점 2자리
  예: 828.99, 831.45, 825.00 (0.00도 포함)
  ❌ 828.9 (1자리 부족)
  ❌ 828.995 (3자리 초과)
  
변동:
  정수 또는 소수점 유지 (원문과 동일)
  예: "nc", "+10", "-15", "+3.67"
```

---

### 3. 핵심 이슈 추출

#### 3.1 이슈 섹션 찾기

```
OCR 문서의 구조:

HEADLINES / KEY ISSUES / TOPICS / NEWS
│
├─ [HOT] 로 시작 → 긴급 이슈
├─ [POLICY] / [REGULATORY] → 정책/규제
├─ 일반 텍스트 시작 → 시장/수급
└─ 기타
```

#### 3.2 이슈 유형 분류

```
유형 1: HOT (공급 차질, 가격 급등, 지정학)
  마커: [HOT] / 🔴 / ⚠️ / ALERT
  색상: 주황색 (#F0997B)
  예: "호르무즈 봉쇄 재개 위협"

유형 2: POLICY (정책, 규제, 무역)
  마커: [POLICY] / 🟣 / [REGULATORY]
  색상: 보라색 (#7B5EA7)
  예: "EU CBAM 이행 지연"

유형 3: 일반 (시장, 수급, 프로젝트)
  마커: 없음 (일반 텍스트)
  색상: 파랑색 (#185FA5)
  예: "인도 수입 안정화 추세"

특수:
  type: "" (빈 문자열)은 일반 이슈를 의미
```

#### 3.3 각 이슈 구성

```
원문 구조:
──────────────────────────────
[HOT] Hormuz Strait Supply Disruption Continues

- Shipping lanes remain closed due to escalating tensions
- Trapped ammonia vessels (3 ships) unable to transit
- Market participants estimate 4-5 month recovery timeline

Impact: Prices may decline sharply if transit resumes
Implications: Supply chain vulnerabilities exposed
──────────────────────────────

추출 항목:

1. 제목 (한 줄 요약)
   원문: "[HOT] Hormuz Strait Supply Disruption Continues"
   추출: "호르무즈 공급 차질 지속 — 선박 3척 갇혀"
   (30자 이내, 핵심 한 줄)

2. 유형
   [HOT] → type: "hot"

3. 세부 내용 (선택사항)
   불릿/화살표로 표현:
   → 호르무즈 해협 통항 폐쇄 상태 지속
   → 갇힌 암모니아선 3척 통행 불가
   → 복구까지 4~5개월 소요 예상

4. 시사점
   → 통항 재개 시 가격 급락 가능성
   → 공급망 취약성 노출
```

#### 3.4 최대 5개까지만 처리

```
원문에 이슈가 6개 이상 있으면:

우선순위:
  1순위: [HOT] 이슈 (긴급)
  2순위: [POLICY] 이슈 (정책)
  3순위: 일반 이슈 (시장)

선택:
  [HOT] 2개 + [POLICY] 1개 + 일반 2개 = 5개
  또는
  상위 5개 중요도순으로 선택
  
과다한 이슈는 "주요 동향" 섹션으로 이동
```

---

### 4. 주요 동향 추출

#### 4.1 동향 섹션 찾기

```
OCR 문서의 TRENDS / NEWS / UPDATES / DEVELOPMENTS

각 항목: 한 줄짜리 뉴스
```

#### 4.2 추출 규칙

```
원문 예시:
  • Japan's Jera-MHI ammonia fuel burner test delayed
  • India import volumes stabilizing after supply crisis
  • Morocco phosphate production update

추출:
  "일본 Jera-MHI, 암모니아 연료 버너 실증 지연"
  "인도 수입량 공급 위기 후 안정화"
  "모로코 인산염 생산 현황 업데이트"

형식:
  • [한 줄 요약] (20~30자)
  
최대 6개
```

---

### 5. 모니터링 포인트 추출

#### 5.1 포인트 섹션 찾기

```
OCR 문서의 MONITORING / WATCH LIST / KEY INDICATORS

항목들: 향후 주시해야 할 사항
```

#### 5.2 추출 규칙

```
원문 예시:
  □ Hormuz transit resumption timing
  □ EU CBAM implementation progress
  □ India import trend continuation

추출:
  "□ 호르무즈 통항 재개 시점"
  "□ EU CBAM 이행 진행 상황"
  "□ 인도 수입 추세 지속 여부"

형식:
  □ [한 줄 주시 항목]

최대 4개
```

---

## 📝 HTML 생성 규칙

### 1. HTML 파일 구조

#### 1.1 기본 골격

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Argus 암모니아 브리핑 - YYYY년 M월 D일</title>
    <script src="auth.js"></script>
    <script>
        AUTH.requireAuth(); // ← 인증 필수
    </script>
    <style>
        /* CSS 스타일 — 기존 템플릿 유지 */
    </style>
</head>
<body>
    <div class="container">
        <!-- 헤더 -->
        <!-- 가격 카드 -->
        <!-- 이슈 카드 -->
        <!-- 동향 리스트 -->
        <!-- 모니터링 포인트 -->
        <!-- 네비게이션 -->
        <!-- 푸터 -->
    </div>
</body>
</html>
```

#### 1.2 주요 섹션

```html
<!-- 1. 헤더 (인증 후 표시) -->
<div class="header">
    <div class="header-left">
        <h1>2026년 6월 20일 (목요일)</h1>
        <p>제26-70호</p>
        <p>서부발전 수소사업실</p>
    </div>
    <div class="header-buttons">
        <a href="../dashboard.html" class="btn-back">← 대시보드</a>
        <a href="https://drive.google.com/drive/folders/1oMyl4hTVN8chOw5MPLQKYWdMonStRLxo" 
           class="btn-pdf">📄 원문 PDF</a>
        <a href="https://docs.google.com/document/d/..." 
           class="btn-doc">📋 번역본</a>
    </div>
</div>

<!-- 2. 가격 섹션 -->
<div class="price-section">
    <div class="price-grid">
        <!-- 중동 fob -->
        <div class="price-card">
            <div class="region">중동 fob</div>
            <div class="price">770</div>
            <div class="change">보합</div>
        </div>
        <!-- 동아시아 cfr -->
        <div class="price-card">
            <div class="region">동아시아 cfr</div>
            <div class="price">825</div>
            <div class="change">보합</div>
        </div>
        <!-- NW유럽 cfr -->
        <div class="price-card">
            <div class="region">NW유럽 cfr</div>
            <div class="price">880</div>
            <div class="change">보합</div>
        </div>
        <!-- 미국걸프 cfr -->
        <div class="price-card">
            <div class="region">미국걸프 cfr</div>
            <div class="price">775</div>
            <div class="change">보합</div>
        </div>
    </div>
    
    <!-- JKLAB 행 -->
    <div class="jklab-row">
        <div class="label">JKLAB cfr 울산</div>
        <div class="price">828.99</div>
        <div class="change">+3.67 (전주比)</div>
        <div class="note">45Q 미포함</div>
    </div>
</div>

<!-- 3. 이슈 섹션 -->
<div class="issue-section">
    <h2>🔥 핵심 이슈</h2>
    
    <!-- HOT 이슈 -->
    <div class="issue-card issue-hot">
        <div class="badge">긴급</div>
        <div class="title">호르무즈 공급 차질 지속</div>
        <div class="content">
            <p class="quote">"호르무즈 해협 봉쇄 지속으로 선박 3척 갇혀있음"</p>
            <ul>
                <li>호르무즈 통항 폐쇄 상태 지속</li>
                <li>암모니아선 3척 선박 갇혀</li>
                <li>통항 재개까지 4~5개월 예상</li>
            </ul>
            <p class="implication">→ 통항 재개 시 가격 급락 가능성</p>
        </div>
    </div>
    
    <!-- POLICY 이슈 -->
    <div class="issue-card issue-policy">
        <div class="badge">정책</div>
        <div class="title">EU CBAM 이행 지연</div>
        <div class="content">
            ...
        </div>
    </div>
    
    <!-- 일반 이슈 -->
    <div class="issue-card issue-mid">
        <div class="badge">시장</div>
        <div class="title">인도 수입 안정화 추세</div>
        <div class="content">
            ...
        </div>
    </div>
</div>

<!-- 4. 동향 섹션 -->
<div class="trend-section">
    <h2>📋 주요 동향</h2>
    <ul class="trend-list">
        <li>• 일본 Jera-MHI, 연료 버너 실증 지연</li>
        <li>• 인도 수입량 안정화 지속</li>
        ...
    </ul>
</div>

<!-- 5. 모니터링 -->
<div class="monitoring-section">
    <h2>⚠️ 모니터링 포인트</h2>
    <ul>
        <li>□ 호르무즈 통항 재개 시점</li>
        <li>□ EU CBAM 세부규칙 확정</li>
        ...
    </ul>
</div>

<!-- 6. 네비게이션 -->
<div class="nav-buttons">
    <a href="20260619.html" class="nav-btn prev">← 이전 (6월 19일)</a>
    <a href="20260621.html" class="nav-btn next">다음 (6월 21일) →</a>
</div>

<!-- 7. 푸터 -->
<footer>
    <p>Argus Media | 제26-70호 | 2026년 6월 20일</p>
    <a href="../dashboard.html">아카이브</a>
</footer>
```

---

### 2. CSS 클래스 및 스타일

#### 2.1 이슈 색상 매핑

```css
/* HOT 이슈 — 주황색 */
.issue-hot {
    border-left: 4px solid #F0997B;
    background-color: #FFF4EF;
}

.issue-hot .badge {
    background-color: #F0997B;
    color: white;
}

/* POLICY 이슈 — 보라색 */
.issue-policy {
    border-left: 4px solid #B59BDB;
    background-color: #F7F0FF;
}

.issue-policy .badge {
    background-color: #7B5EA7;
    color: white;
}

/* 일반 이슈 — 파랑색 */
.issue-mid {
    border-left: 4px solid #85B7EB;
    background-color: #E6F1FB;
}

.issue-mid .badge {
    background-color: #185FA5;
    color: white;
}
```

#### 2.2 price-card 스타일

```css
.price-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
}

.price-card .region {
    font-size: 12px;
    color: #888;
    margin-bottom: 6px;
}

.price-card .price {
    font-size: 24px;
    font-weight: 700;
    color: #0C447C;
    margin: 6px 0;
}

.price-card .change {
    font-size: 12px;
    color: #555;
}
```

---

### 3. 템플릿 변수 (치환 목록)

```
{{DATE}}                 YYYY-MM-DD 형식의 날짜
{{DAY}}                  요일 한글 (월화수목금토일)
{{ISSUE_NUM}}           제XX-XX호
{{ME_PRICE}}            770 (정수)
{{ME_CHG}}              nc / +N / -N
{{EA_PRICE}}            825
{{EA_CHG}}              nc / +N / -N
{{NWE_PRICE}}           880
{{NWE_CHG}}             nc / +N / -N
{{USG_PRICE}}           775
{{USG_CHG}}             nc / +N / -N
{{JKLAB_PRICE}}         828.99 (소수점 2자리)
{{JKLAB_CHG}}           +3.67 / nc
{{PDF_LINK}}            https://drive.google.com/...
{{OCR_LINK}}            https://docs.google.com/...
{{ISSUE_HOT_1}}         [HOT] 이슈 제목
{{ISSUE_HOT_1_CONTENT}} [HOT] 이슈 상세 내용
{{ISSUE_POLICY_1}}      [POLICY] 이슈 제목
{{TREND_1}}             동향 항목 1
{{MONITOR_1}}           모니터링 포인트 1
```

---

## 📊 dashboard.html 업데이트 규칙

### 1. JSON 구조

```javascript
const briefs = [
  {
    date: '2026-06-20',                    // YYYY-MM-DD
    label: '6월 20일',                     // M월 D일
    day: '목',                             // 요일 한글
    hot: true,                             // 이슈 중 HOT이 1개 이상?
    tags: '호르무즈·공급차질·가격',        // 키워드 3개 · 구분
    ocrUrl: 'https://docs.google.com/...', // 번역본 구글 문서 링크
    prices: {
      me: 770,
      ea: 825,
      nwe: 880,
      usg: 775,
      jklab: 828.99
    },
    chg: {
      me: 'nc',
      ea: 'nc',
      nwe: 'nc',
      usg: 'nc'
    },
    issues: [
      { type: 'hot', text: '호르무즈 공급 차질 지속' },
      { type: '', text: '시장 균형세 유지' },
      { type: 'pol', text: 'EU CBAM 이행 지연' },
      ...
    ],
    monitor: '□ 호르무즈 통항 재개 □ EU CBAM 세부규칙'
  },
  { date: '2026-06-19', ... }, // 이전 항목
  ...
]
```

### 2. hot 필드 규칙

```javascript
hot: true   ← 이슈 배열에서 type:'hot'이 1개 이상 있음
hot: false  ← 이슈에 HOT이 없음
```

### 3. tags 필드 규칙

```javascript
tags: '키워드1 · 키워드2 · 키워드3'

예시:
  '호르무즈 · 공급차질 · 가격급등'
  'EU규제 · CBAM · 무역정책'
  '인도수입 · 시장안정 · 케르테공장'

규칙:
  • 핵심 이슈에서 추출
  • 각 10자 이내
  • · (중점) 구분
  • 정확한 띄어쓰기 (· 앞뒤 공백 1개)
```

### 4. JSON 검증

```javascript
// 저장 전 검증 체크리스트:

✅ 데이터 타입 확인:
   - date: 문자열 ('2026-06-20')
   - label: 문자열 ('6월 20일')
   - day: 문자열 ('목')
   - hot: 불린 (true/false)
   - prices: 객체 {me, ea, nwe, usg, jklab}
   - chg: 객체 {me, ea, nwe, usg}
   - issues: 배열 (각 항목: {type, text})

✅ 필수 필드 확인:
   모든 필드가 누락되지 않았는지

✅ 문법 확인:
   쉼표, 따옴표, 괄호 등 일치 여부

❌ 일반적인 오류:
   "date" 대신 "date:" 사용 (필드 분리자로 : 사용)
   마지막 항목 뒤에 쉼표 (JSON은 마지막 쉼표 불가)
   따옴표 대신 작은따옴표 또는 백틱 사용
```

---

## 🎨 탭 분리형 HTML (암모니아 + 수소)

### 구조 (briefs/20260608.html 참조)

```html
<div class="tabs">
    <button class="tab-btn active" onclick="showTab('ammonia')">
        🔴 암모니아
    </button>
    <button class="tab-btn" onclick="showTab('hydrogen')">
        💧 수소
    </button>
</div>

<div id="ammonia-tab" class="tab-content active">
    <!-- 암모니아 데이터 (위와 동일 구조) -->
    <div class="price-section">...</div>
    <div class="issue-section">...</div>
    ...
</div>

<div id="hydrogen-tab" class="tab-content">
    <!-- 수소 데이터 -->
    <div class="price-section-hydrogen">...</div>
    <div class="issue-section">...</div>
    ...
</div>
```

### JavaScript 탭 전환

```javascript
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}
```

---

## 💬 카톡 텍스트 생성 규칙

### 구조 (정확한 포맷)

```
🔴 ARGUS 암모니아 브리핑 | YYYY.MM.DD (Issue XX-XX)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 현물가격 ($/t)

중동 fob         NNN  (보합/상승/하락)
동아시아 cfr     NNN  (보합/상승/하락)
NW유럽 cfr       NNN  (보합/상승/하락)
미국 걸프 cfr    NNN  (보합/상승/하락)

JKLAB cfr울산    NNN.NN  (전주 대비 +/-/nc)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 핵심 이슈

✦ [이슈 제목 1]
→ 내용 1
→ 내용 2
→ 내용 3

✦ [이슈 제목 2]
→ 내용 1
→ 내용 2

(최대 5개, 각 3~4줄)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 주요 동향 (5~6개)

• 항목 1 (구체적 내용 1줄)
• 항목 2
• 항목 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ 모니터링 포인트

□ 포인트 1
□ 포인트 2
□ 포인트 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 서부발전 수소사업실 | Argus Media
```

### 변동 기호 해석

```
가격 변동: nc → 보합
변동: +10 → 상승 (또는 "+10달러")
변동: -10 → 하락 (또는 "-10달러")
```

---

## 🔐 보안 및 파일 무결성

### 1. UTF-8 인코딩 확인

```
모든 파일 저장 시:
  인코딩: UTF-8 (with BOM 불필요)
  줄바꿈: LF (\n, 유닉스 스타일)
  
검증:
  파일을 텍스트 에디터에서 열기
  특수 문자/한글이 깨지지 않았는지 확인
```

### 2. 파일 권한 설정

```
로컬 파일:
  C:\Argus\*.html → 일반 사용자 읽기 가능
  C:\Argus\dashboard.html → 쓰기 가능 (수정용)

Google Drive 파일:
  공개 (Viewer 권한 이상)
```

### 3. 백업 정책

```
매 주말:
  briefs/ 폴더 전체 백업 (별도 폴더)
  dashboard.html 백업
  
오류 발생 시:
  백업에서 복원 가능
```

---

## 📈 성능 최적화

### 1. HTML 파일 크기

```
정상 범위: 30~50 KB
모니터링: 
  - 50 KB 초과 시 불필요한 이미지 제거 검토
  - 대량의 CSS/JS는 외부 파일로 분리
```

### 2. Google Drive API 한도

```
월간 할당량: Google Workspace에 따라 다름

모니터링:
  Google Cloud Console > APIs & Services > Drive API
  사용량 확인
```

### 3. 캐싱 전략

```
브라우저 캐싱:
  .nojekyll 파일로 Jekyll 처리 비활성화
  
GitHub Pages 캐싱:
  최대 5분 (강제 새로고침으로 즉시 반영 가능)
```

---

## 🐛 디버깅 팁

### 1. HTML 검증

```
온라인 도구: https://validator.w3.org/
업로드: 생성된 briefs/YYYYMMDD.html
확인: 문법 오류 여부
```

### 2. JSON 검증

```
온라인 도구: https://jsonlint.com/
입력: dashboard.html의 const briefs = [...] 부분
확인: JSON 포맷 정확성
```

### 3. 브라우저 개발자 도구

```
F12 열기:
  Console: JavaScript 오류 확인
  Elements: HTML 구조 확인
  Network: 리소스 로딩 확인
  Application > Storage: localStorage 확인 (인증)
```

---

**버전**: 1.0  
**마지막 수정**: 2026-07-07
