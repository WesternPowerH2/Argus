# Claude 프로젝트 운영 매뉴얼
## Argus 수소·암모니아 브리핑 포털 — 일상 운영 지침

**대상**: 새로운 Claude 계정에서 프로젝트 관리할 담당자  
**목적**: 마이그레이션 후 일상적으로 참조할 운영 지침서

---

## 📌 전체 워크플로우 이해

### 시간대별 실행 흐름

```
시간          작업                     담당           상태
────────────────────────────────────────────────────────────
수신시간      Argus 이메일 수신         Gmail          자동
(임의)        → PDF 첨부

수신 후       Google Apps Script       Google Apps    자동
1~5분        - PDF → Google Drive      Script
             - OCR (영문 텍스트 추출)
             - 한글 번역본 생성
             
             ✅ 결과: Google Drive에 파일 생성
             📁 OCR 폴더: 영문 원문 (데이터 추출용)
             📁 번역본 폴더: 한글 문서 (링크용)

매일          Claude Scheduled Task    Claude         자동
09:00        - dashboard.html 최신 날짜 확인
             - Google Drive 신규 파일 탐색
             - OCR 원문 읽어 데이터 추출
             - HTML 브리핑 생성
             - dashboard.html 업데이트
             - 카톡 공유용 텍스트 생성
             
             ✅ 결과: briefs/YYYYMMDD.html 생성
             + stdout으로 카톡 텍스트 출력

매일          Windows 작업 스케줄러    PC 자동화      자동
09:20        PowerShell 스크립트
             - 변경 파일 감지
             - GitHub에 자동 푸시
             
             ✅ 결과: GitHub Pages 배포 (1~3분)

1~3분 후      포털 활성화               GitHub Pages   자동
09:23        https://[계정].github.io/argus/
             브리핑 확인 가능
```

---

## 🔄 일일 확인 체크리스트

### 아침 (09:30 ~ 10:00)

**목표**: 어제 자동화된 작업 확인

- [ ] **Gmail 확인**
  - Argus 메일 수신 여부 확인
  - 정상 수신: `from:choosy@iwest.co.kr subject:Argus`
  - 수신 안됨 → 포워딩 설정 확인 필요

- [ ] **Google Drive 확인**
  - OCR 폴더: 어제 PDF의 영문 변환본 확인
  - 번역본 폴더: 어제 PDF의 한글 번역본 확인
  - 파일명 형식: `YYYYMMDD_fmbamm_OCR` (또는 `hydrogen`)
  - ⚠️ 파일 없음 → Google Apps Script 오류 (아래 참고)

- [ ] **Claude 예정작업 결과 확인**
  - 브리핑 폴더: `briefs/YYYYMMDD.html` 생성 확인
  - dashboard.html: `const briefs = [...]` 배열 맨 앞에 새 항목 추가 확인
  - ⚠️ 파일 없음 → Claude Task 미실행 (아래 참고)

- [ ] **포털 확인**
  - https://[GitHub계정].github.io/argus/ 접속
  - 최신 브리핑 표시 확인
  - 가격 데이터 정확성 확인
  - ⚠️ 반영 안됨 → GitHub 푸시 오류 (아래 참고)

- [ ] **카톡 텍스트 확인**
  - Claude 작업 로그에서 카톡 텍스트 생성 확인
  - 형식: 🔴 ARGUS 암모니아 브리핑 | YYYY.MM.DD 로 시작
  - ⚠️ 텍스트 생성 안됨 → SKILL.md STEP 7 재확인

### 주간 (금요일 오후)

**목표**: 전체 시스템 안정성 점검

- [ ] **Google Apps Script 실행 로그 확인**
  - Google Apps Script 프로젝트 > 실행 로그
  - 지난 5일간 모든 실행 성공 여부 확인
  - OCR 실패 건이 있는지 확인
  - 재시도 (지수백오프) 기록 확인

- [ ] **Claude 작업 이력 확인**
  - Claude Cowork > 프로젝트 > 작업 이력
  - 지난 5일 모든 실행 성공 여부
  - 에러 로그 확인
  - 소요 시간 확인 (일반적으로 2~5분)

- [ ] **GitHub 커밋 이력 확인**
  - https://github.com/[계정]/argus/commits/main
  - 지난 5일 매일 09:20경 커밋 확인
  - 커밋 메시지와 변경 파일 확인

- [ ] **포털 전체 테스트**
  - 로그인 기능 테스트
  - 검색 기능 테스트
  - 필터 기능 테스트
  - 가격 추이 차트 표시 확인
  - 이전/다음 네비게이션 확인

---

## ⚠️ 문제 진단 가이드

### 상황 1: Google Drive에 파일 없음 (OCR/번역본 미생성)

**증상**: 아침에 Google Drive 폴더에 어제 파일 없음

**진단 순서**:

1. **Gmail 라벨 확인**
   - Gmail 검색: `label:Argus-processed`
   - 어제 이메일 있는지 확인
   - 있으면 → Google Apps Script 오류
   - 없으면 → 이메일 수신 자체가 안됨

2. **Google Apps Script 실행 로그 확인**
   - 프로젝트 > 실행 로그
   - 어제 09:00~10:00 사이 실행 기록 있는지 확인
   - 오류 메시지 확인:
     - `❌ 오류 [파일명]` → API 오류
     - `⚠️ OCR 최종 실패` → 3회 모두 재시도 실패
     - `번역 건너뜀 — 빈 문서` → OCR은 됐지만 텍스트 추출 실패

3. **Google Drive API 상태 확인**
   - Google Cloud Console > APIs & Services > Drive API
   - 활성화 여부 확인
   - 할당량 사용 현황 확인

4. **폴더 ID 정확성 확인**
   - Google Apps Script 코드에서:
     ```
     const PDF_FOLDER_ID   = '...'
     const OCR_FOLDER_ID   = '...'
     const TRANS_FOLDER_ID = '...'
     ```
   - Google Drive에서 각 폴더 ID 재확인
   - 불일치하면 코드 수정 → 저장

**해결 후**:
- [ ] Google Apps Script 다시 Run
- [ ] 5분 대기 후 Google Drive 재확인
- [ ] 성공 로그 확인

---

### 상황 2: Claude Task가 실행되지 않음 (브리핑 미생성)

**증상**: 09:00 이후에도 briefs 폴더에 새 파일 없음

**진단 순서**:

1. **Claude Scheduled Task 상태 확인**
   - Claude Cowork > 프로젝트
   - "Argus briefing" Task 설정 확인:
     - 활성화 여부
     - 실행 시간 (09:00)
     - 반복 빈도 (매일)

2. **마지막 실행 기록 확인**
   - Scheduled Tasks > 이력
   - 어제 09:00경 실행 기록 있는지 확인
   - 오류 메시지 있는지 확인

3. **Google Drive 파일 확인**
   - OCR 폴더 / 번역본 폴더에 어제 파일 있는지 재확인
   - 있으면 → Claude가 새 파일을 감지 못한 것
   - 없으면 → Google Apps Script 오류 (상황 1 참고)

4. **dashboard.html 최신 날짜 확인**
   - `const briefs = [` 부분 보기
   - 첫 번째 항목의 `date:` 필드 확인
   - 예: `date:'2026-06-19'` ← 이전 날짜?
   - 만약 어제 파일이 오늘 오전 생성되었다면, 
     Task는 내일 09:00에 실행할 때 감지 가능

5. **Claude PC 상태 확인**
   - PC가 09:00에 켜져 있었는지 확인
   - Claude 앱이 백그라운드 실행 중인지 확인
   - PC 절전 모드 설정 확인

**해결 후**:
- [ ] Claude Cowork > Task > "Run Now" 수동 실행
- [ ] briefs 폴더 확인
- [ ] dashboard.html 확인

---

### 상황 3: GitHub에 반영되지 않음 (포털 미갱신)

**증상**: 09:20 이후에도 포털 URL에 새 브리핑 보이지 않음

**진단 순서**:

1. **로컬 파일 확인**
   - `C:\Argus\briefs\YYYYMMDD.html` 존재 확인
   - 파일 내용 확인 (최신 데이터 있는지)

2. **Windows 작업 스케줄러 로그 확인**
   - 작업 스케줄러 > 작업 > Argus_GitHubPush_Daily
   - 이력 > 어제 09:20경 실행 기록 확인
   - 결과 코드 확인:
     - 0 = 성공
     - 기타 = 오류

3. **PowerShell 스크립트 로그 확인**
   - `C:\Argus\깃헙_자동업로드.ps1` 수동 실행
   - 출력 메시지 확인:
     - `✅ 인증 완료: @[계정]`
     - `✅ N / N 개 파일 업로드 완료`
   - 오류 메시지 있는지 확인

4. **GitHub PAT 확인**
   - GitHub PAT 만료 여부 확인
   - Settings > Tokens > 확인
   - 만료됐으면 새로 생성 > 스크립트 수정

5. **깃헙_자동업로드.ps1 내용 확인**
   - 파일 열기 > 상단부 확인:
     ```
     $TOKEN  = "ghp_..."  ← 정확한가?
     $REPO   = "argus"    ← 정확한가?
     ```
   - 잘못되었으면 수정

**해결 후**:
- [ ] PowerShell에서 수동 실행
- [ ] GitHub 저장소 커밋 이력 확인
- [ ] 포털 URL 새로고침 (Ctrl+Shift+Del 캐시 삭제)

---

### 상황 4: 포털 로그인 안됨

**증상**: login.html에서 계정 입력 후 진입 안됨

**진단 순서**:

1. **auth.js 확인**
   - `C:\Argus\auth.js` 파일 열기
   - 계정 정보 확인:
     ```javascript
     const ACCOUNTS = {
       'username': 'password_hash',
       ...
     }
     ```
   - 입력한 계정이 목록에 있는지 확인

2. **브라우저 개발자 도구 확인** (F12)
   - Console 탭 > 오류 메시지 확인
   - 로그인 시도 시 출력되는 메시지 확인
   - localStorage 상태 확인

3. **auth.js 비밀번호 확인**
   - 입력한 비밀번호가 맞는지 다시 확인
   - 대소문자 구분 확인
   - 공백 없는지 확인

**해결 후**:
- [ ] 브라우저 캐시 삭제
- [ ] 로컬 스토리지 삭제 (개발자 도구 > Application > Storage)
- [ ] 다시 로그인 시도

---

## 📊 모니터링 포인트 (매일 관찰)

### 1. 파일 생성 타이밍

**정상 흐름**:
- 09:00 ~ 09:10: Google Drive에 신규 파일 생성 (또는 이미 생성됨)
- 09:00 ~ 09:05: Claude Task 실행, briefs 폴더에 HTML 생성
- 09:20: PowerShell 스크립트 실행
- 09:23 ~ 09:25: 포털에 반영 (GitHub Pages 배포 대기)

**지연 신호**:
- 09:30 이후에도 파일 미생성 → 문제 발생
- 10:00 이후에도 미반영 → 한 단계 이상 실패

### 2. 데이터 정확도

**매 브리핑마다 확인**:
- [ ] 가격 숫자 (중동/동아시아/NW유럽/미국걸프/JKLAB)
  - 정확한 소수점 자리수 (JKLAB은 .XX)
  - 변동 기호 (+/nc/-)
  
- [ ] Argus 호수 표기
  - 형식: `제XX-XX호`
  - 빠진 호수 없는지
  
- [ ] 날짜와 요일
  - 요일 정확성 확인
  - 날짜 연속성 확인

- [ ] 이슈 분류
  - hot (주황) / '' (파랑) / pol (보라) 색상 정확
  - 긴급이슈 1개 이상 시 `hot: true`
  - 키워드 3개 정확

### 3. 문서 구조 무결성

**dashboard.html 확인**:
- [ ] CSS 스타일 깨짐 없는지
- [ ] JavaScript 에러 없는지 (콘솔 F12)
- [ ] 검색 기능 정상 작동
- [ ] 필터 기능 정상 작동
- [ ] 차트 표시 정상

**브리핑 HTML 확인**:
- [ ] 인증 로그인 필요 (AUTH.requireAuth() 작동)
- [ ] 뒤로가기 버튼 정상 작동
- [ ] 이전/다음 네비게이션 링크 정확
- [ ] 원문 PDF 버튼 링크 유효
- [ ] 번역본 구글 문서 링크 유효

### 4. 카톡 텍스트 품질

**매 생성마다 확인**:
- [ ] 형식 정확
  ```
  🔴 ARGUS 암모니아 브리핑 | YYYY.MM.DD (Issue XX-XX)
  ```
- [ ] 가격 섹션 완정
- [ ] 이슈 요약 명확
- [ ] 동향 항목 5~6개
- [ ] 모니터링 포인트 3~4개
- [ ] 줄바꿈 자연스러움

---

## 📋 주간 리포트 템플릿

**매 금요일 오후 작성**:

```
Argus 브리핑 시스템 주간 리포트
========================================

작성일: YYYY-MM-DD
담당: [담당자명]
기간: MM/DD ~ MM/DD

1. 작업 현황
   - 생성된 브리핑: XX건
   - 정상 생성: XX건
   - 오류 발생: XX건
   
2. 오류 현황
   - Google Apps Script 오류: XX건
     * OCR 실패: XX건
     * 번역 실패: XX건
   - Claude Task 미실행: XX건
   - GitHub 푸시 실패: XX건

3. 데이터 품질
   - 가격 데이터 정확도: ✓
   - 호수 표기 정확도: ✓
   - 이슈 분류 정확도: ✓

4. 시스템 상태
   - 포털 정상 작동: ✓
   - 로그인 기능: ✓
   - 검색 기능: ✓
   - 가격 차트: ✓

5. 이슈 및 조치
   - 이슈 1: [내용]
     조치: [해결 방법]
   - 이슈 2: ...

6. 차주 계획
   - 예정 작업: [내용]
```

---

## 🔗 참고 링크

| 항목 | 링크 |
|------|------|
| 포털 | `https://[계정].github.io/argus/` |
| GitHub 저장소 | `https://github.com/[계정]/argus` |
| Google Drive 폴더 | 북마크: Argus > 원문 PDF / OCR 영문본 / 번역본 한글 |
| Google Apps Script | [프로젝트 URL] |
| Claude Cowork | Claude 앱 > 프로젝트 > Argus |
| 상세 기술 가이드 | Claude_데이터_추출_및_HTML_생성_가이드.md |
| Task 실행 가이드 | Claude_Scheduled_Task_상세_가이드.md |

---

## 💡 팁 & 트릭

### Google Drive 폴더를 빠르게 열기
```
Google Drive > Argus 폴더 우클릭 > "새 탭에서 열기"
북마크 저장: 자주 접근하는 폴더는 즐겨찾기 추가
```

### Claude Task 수동 실행
```
Claude Cowork > 프로젝트 > "Argus briefing" Task
"Run Now" 클릭 (기다리지 말고 즉시 실행)
완료까지 2~5분 소요
```

### GitHub에서 커밋 확인
```
GitHub 저장소 > Commits
"Latest commit" 확인
날짜 09:20경인지 확인 (자동 스크립트 실행 시간)
```

### 포털 캐시 새로고침
```
브라우저: Ctrl + Shift + Del (캐시 삭제)
또는: Ctrl + F5 (강제 새로고침)
GitHub Pages는 최대 5분 대기
```

---

**버전**: 1.0  
**마지막 수정**: 2026-07-07
