# Argus 수소·암모니아 브리핑 포털 — 마이그레이션 가이드

**프로젝트**: 서부발전 수소사업실 Argus 수소·암모니아 일간 브리핑 자동화 시스템  
**목적**: 다른 담당자의 PC/계정에서 동일한 워크플로우를 운영하기 위한 마이그레이션 가이드

---

## 📋 완전한 워크플로우 (누락사항 보충)

### 1단계: Email 수신 및 PDF 수집
- **트리거**: Argus Media에서 일일/주간 브리핑 PDF를 특정 인물(예: 추승엽)에게 메일 발송
- **Google Apps Script**: Gmail 수신 감지 → PDF를 Google Drive에 저장
  - 발신자: `choosy@iwest.co.kr` (Argus 메일이 추승엽 님에게 포워딩됨)
  - 라벨: `Argus-processed` (처리 완료 표시)

### 2단계: OCR 및 번역
- **Google Apps Script (자동)**: 
  - OCR → 영문 Google Doc 생성 (OCR 폴더)
  - LanguageApp → 한글 번역본 생성 (번역본 폴더)
  - 최대 3회 재시도 + 지수 백오프 (2s→4s→8s)

### 3단계: Claude 예정작업 (Scheduled Task)
- **시간대**: 매일 특정 시간(예: 09:00 KST)에 자동 실행
- **동작**:
  - dashboard.html에서 최신 날짜 확인
  - Google Drive에서 신규 번역본 파일 탐색
  - OCR 원문(영문)을 읽어 데이터 추출
  - 브리핑 HTML 생성 → `briefs/YYYYMMDD.html`
  - dashboard.html 업데이트
  - 이전 브리핑 네비게이션 수정
  - **카톡 공유용 텍스트 요약 생성** ← 사용자에게 복사-붙여넣기 제공
- **결과**: 사용자가 카톡에 붙여넣기 가능한 형식의 요약 제시

### 4단계: GitHub 자동 배포
- **Windows 작업 스케줄러**: 매일 09:20에 PowerShell 스크립트 실행
  - 변경된 파일을 GitHub에 자동 푸시
  - GitHub Pages에 배포 (1~3분 후 반영)
- **포털 URL**: `https://[GitHub계정].github.io/argus/`

### 5단계: 사용자 인증 및 접근
- **로그인**: `login.html` - 지정된 계정으로만 접근 가능
- **암호화**: `auth.js` - 클라이언트 사이드 인증 (간단한 구현, 보안 강화 권장)
- **대시보드**: `dashboard.html` - 아카이브 검색·조회, 가격 추이 차트

---

## 🚀 마이그레이션 체크리스트

### Phase 1: 사전 준비 (신규 담당자)

#### 1.1 Google 계정 준비
- [ ] **Gmail 계정** 신설 또는 기존 계정 준비
- [ ] **Google Drive** 접근 권한 확인
- [ ] **Google Apps Script** 활성화 (Google Drive 설정 > 새 기능)
- [ ] Google 계정 메모: `_____________`

#### 1.2 GitHub 계정 준비
- [ ] **GitHub 계정** 신설 또는 기존 계정 준비 (개인 계정 추천)
- [ ] **Personal Access Token (PAT)** 생성
  - Settings > Developer settings > Personal access tokens > Tokens (classic)
  - Scopes: `repo`, `workflow`, `admin:public_key`
  - 생성된 토큰: 안전하게 보관 (스크립트에 입력할 예정)
- GitHub 계정: `_____________`
- GitHub 레포 이름: `argus` (또는 자유롭게 설정)

#### 1.3 PC 환경 준비
- [ ] **PowerShell**: Windows 10 이상 기본 내장
- [ ] **Git**: https://git-scm.com 설치 (Windows용)
- [ ] **Python** (선택사항): 3.8+ 설치 (향후 자동화 확장용)
  ```bash
  # Python 설치 후 확인
  python --version
  ```
- [ ] **Windows 작업 스케줄러**: 제어판 > 관리 도구 > 작업 스케줄러

#### 1.4 Argus Media 이메일 설정
- [ ] 현재 담당자(추승엽)에게 "Argus 메일을 새 담당자 Gmail로 포워딩 설정" 요청
  - 또는: 새 담당자 Gmail 계정을 Argus Media 구독자로 직접 등록
- [ ] 테스트: 임의의 Argus 메일 수신 확인

---

### Phase 2: 파일 및 폴더 준비

#### 2.1 로컬 폴더 구조 생성
```
C:\Argus\ (또는 원하는 경로)
├── dashboard.html
├── index.html
├── login.html
├── auth.js
├── .gitignore
├── .nojekyll
├── briefs/
│   ├── 20260407.html
│   ├── 20260408.html
│   └── ... (모든 브리핑 HTML)
├── .gh_token (보안 주의)
└── .git/ (GitHub 동기화)
```

#### 2.2 기존 자료 이전
**현재 PC에서 다음 파일/폴더를 새 PC의 `C:\Argus\` 로 복사:**
- [ ] `dashboard.html` (핵심 중요 — CSS/JS 구조 유지)
- [ ] `index.html`, `login.html`, `auth.js` (인증 시스템)
- [ ] `briefs/` 폴더 전체 (모든 HTML 브리핑)
- [ ] `.gitignore`, `.nojekyll`
- [ ] `.git/` 폴더 (GitHub 연동 이력)
- [ ] `auth.js` (수정 사항 있으면 함께)

**NOT 복사** (재생성):
- `깃헙_자동업로드.ps1` (토큰 재설정 필요)
- `.gh_token` (새로 생성)
- `apps_script_*.js` (Google Apps Script 별도 재설정)

#### 2.3 Google Drive 폴더 준비

**새 담당자의 Google Drive에 다음 폴더 생성:**
```
My Drive / Argus /
├── 원문 PDF/ (폴더 ID 기록: _____________)
├── OCR 영문본/ (폴더 ID 기록: _____________)
└── 번역본 한글/ (폴더 ID 기록: _____________)
```

**폴더 ID 확인 방법:**
1. Google Drive에서 폴더 > 우클릭 > "링크 복사"
2. 링크: `https://drive.google.com/drive/folders/1abc...xyz`
3. `1abc...xyz` 부분이 폴더 ID

**기록:**
- 원문 PDF 폴더 ID: `_________________________`
- OCR 영문본 폴더 ID: `_________________________`
- 번역본 한글 폴더 ID: `_________________________`

---

### Phase 3: Google Apps Script 재설정

#### 3.1 Google Apps Script 프로젝트 생성
1. Google Drive > 새로 만들기 > 더보기 > "Google Apps Script"
2. 프로젝트명: `Argus_Email_Automation`
3. 새 파일 생성 (기본값 `Code.gs`)

#### 3.2 스크립트 코드 입력

**파일: `Code.gs`**
```javascript
/**
 * Argus 수소·암모니아 PDF → OCR → 한글 번역 자동화 스크립트 v3.2
 */

// ── 폴더 ID 설정 ─────────────────────────────────────────────
const PDF_FOLDER_ID   = 'YOUR_PDF_FOLDER_ID';      // 원문 PDF
const OCR_FOLDER_ID   = 'YOUR_OCR_FOLDER_ID';      // OCR 영문본
const TRANS_FOLDER_ID = 'YOUR_TRANS_FOLDER_ID';    // 번역본 한글
const PROCESSED_LABEL = 'Argus-processed';

// ── 메인 실행 함수 (트리거 연결) ─────────────────────────────
function processArgusEmails() {
  const label   = getOrCreateLabel(PROCESSED_LABEL);
  const threads = GmailApp.search(
    'from:choosy@iwest.co.kr subject:Argus has:attachment -label:' + PROCESSED_LABEL,
    0, 10
  );

  threads.forEach(thread => {
    let allSuccess = true;

    thread.getMessages().forEach(msg => {
      msg.getAttachments().forEach(att => {
        const name = att.getName();
        if (!name.toLowerCase().endsWith('.pdf')) return;

        try {
          // 1) PDF 저장
          const pdfBlob   = att.copyBlob().setName(name);
          const pdfFolder = DriveApp.getFolderById(PDF_FOLDER_ID);
          const monthKey    = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM');
          const monthFolder = getOrCreateSubfolder(pdfFolder, monthKey);
          const pdfFile     = monthFolder.createFile(pdfBlob);

          // 2) OCR → 영문 Google Doc
          const ocrDocId = ocrPdf(pdfFile.getId(), name.replace('.pdf', ''), OCR_FOLDER_ID);

          if (!ocrDocId) {
            Logger.log('⚠️ OCR 최종 실패: ' + name);
            allSuccess = false;
            return;
          }

          // 3) 한글 번역본
          translateDocToKorean(ocrDocId, name.replace('.pdf', ''), TRANS_FOLDER_ID);
          Logger.log('✅ 완료: ' + name);

        } catch (e) {
          Logger.log('❌ 오류 [' + name + ']: ' + e.message);
          allSuccess = false;
        }
      });
    });

    if (allSuccess) {
      thread.addLabel(label);
      Logger.log('라벨 부여: ' + thread.getFirstMessageSubject());
    } else {
      Logger.log('⚠️ 일부 OCR 실패 — 다음 실행 시 재시도');
    }
  });
}

// ── OCR 함수 (재시도 3회) ─────────────────────────────────────
function ocrPdf(pdfFileId, baseName, targetFolderId) {
  const token        = ScriptApp.getOAuthToken();
  const MAX_RETRIES  = 3;
  const RETRY_DELAYS = [2000, 4000, 8000];

  const payload = JSON.stringify({
    name    : baseName + '_OCR',
    parents : [targetFolderId],
    mimeType: 'application/vnd.google-apps.document'
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const resp = UrlFetchApp.fetch(
      'https://www.googleapis.com/drive/v3/files/' + pdfFileId + '/copy',
      {
        method            : 'POST',
        contentType       : 'application/json',
        headers           : { Authorization: 'Bearer ' + token },
        payload           : payload,
        muteHttpExceptions: true
      }
    );

    const result = JSON.parse(resp.getContentText());

    if (!result.error) {
      Logger.log('OCR 완료: ' + result.id);
      return result.id;
    }

    Logger.log('OCR 오류 (' + attempt + '/' + MAX_RETRIES + '): ' + JSON.stringify(result.error));

    if (attempt < MAX_RETRIES) {
      Logger.log('재시도 대기 ' + RETRY_DELAYS[attempt - 1] + 'ms...');
      Utilities.sleep(RETRY_DELAYS[attempt - 1]);
    }
  }

  Logger.log('OCR 최종 실패 (3회): ' + baseName);
  return null;
}

// ── 한글 번역 함수 ──────────────────────────────────────────
function translateDocToKorean(ocrDocId, baseName, transFolderId) {
  const srcDoc  = DocumentApp.openById(ocrDocId);
  const body    = srcDoc.getBody();
  const srcText = body.getText();

  if (!srcText || srcText.trim().length === 0) {
    Logger.log('번역 건너뜀 — 빈 문서: ' + ocrDocId);
    return;
  }

  const CHUNK = 4500;
  let translated = '';

  if (srcText.length <= CHUNK) {
    translated = LanguageApp.translate(srcText, 'en', 'ko');
  } else {
    for (let i = 0; i < srcText.length; i += CHUNK) {
      const chunk = srcText.substring(i, Math.min(i + CHUNK, srcText.length));
      translated += LanguageApp.translate(chunk, 'en', 'ko');
      Utilities.sleep(300);
    }
  }

  const transFolder = DriveApp.getFolderById(transFolderId);
  const transDoc    = DocumentApp.create(baseName + '_번역본');
  transDoc.getBody().setText(translated);

  const file = DriveApp.getFileById(transDoc.getId());
  transFolder.addFile(file);

  DriveApp.getRootFolder().removeFile(file);

  Logger.log('번역 완료: ' + transDoc.getId());
}

// ── 헬퍼 함수 ───────────────────────────────────────────────
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  return label;
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  const iter = parentFolder.getFoldersByName(subfolderName);
  if (iter.hasNext()) {
    return iter.next();
  }
  return parentFolder.createFolder(subfolderName);
}
```

#### 3.3 폴더 ID 대체
코드에서 다음 부분을 **새 Google Drive 폴더 ID로 교체**:
- `YOUR_PDF_FOLDER_ID` → Phase 2.3에서 기록한 "원문 PDF 폴더 ID"
- `YOUR_OCR_FOLDER_ID` → "OCR 영문본 폴더 ID"
- `YOUR_TRANS_FOLDER_ID` → "번역본 한글 폴더 ID"

#### 3.4 트리거 설정
1. Google Apps Script 에디터 > 왼쪽 "트리거" 메뉴
2. 하단 "트리거 추가" > 다음 설정:
   - 함수: `processArgusEmails`
   - 배포: 헤드
   - 이벤트 소스: 시간 기반 트리거
   - 시간 기반 트리거 유형: 분 단위로
   - 간격: 매 1분마다 (또는 5분, 자유 설정)
   - 알림: 실패 시 이메일로 알림

3. "저장" > 권한 인증 (Google 계정으로 로그인)

---

### Phase 4: Claude 예정작업 재설정

#### 4.1 Claude의 Cowork에서 새 프로젝트 생성
1. **폴더 선택**: `C:\Argus\` (또는 새 담당자의 경로)
2. **New Project** > Argus 프로젝트명 설정

#### 4.2 SKILL.md 업로드 또는 생성
현재 `SKILL.md` 내용을 새 프로젝트에 복사 (수정 사항: Google Drive 폴더 ID 업데이트)
- OCR 원문(영문) 폴더 ID: Phase 2.3의 값
- 번역본(한글) 폴더 ID: Phase 2.3의 값

#### 4.3 Scheduled Task 설정
Claude Cowork에서:
1. **Schedule** 스킬 호출
2. **Task**: Argus 브리핑 생성 자동 실행
3. **빈도**: 매일 09:00 (또는 선호 시간)
4. **스크립트**: `SKILL.md` 의 단계 1~8 자동 실행

**주의**: 첫 실행 시 `dashboard.html` 최신 날짜를 올바르게 인식하는지 확인

---

### Phase 5: GitHub 및 자동 배포 설정

#### 5.1 GitHub 저장소 초기화 (로컬 PC)

PowerShell을 관리자 권한으로 열고:

```powershell
# 1. 디렉토리 이동
cd C:\Argus

# 2. Git 초기화
git init
git config user.name "새담당자이름"
git config user.email "새담당자@email.com"

# 3. GitHub에 리모트 추가
git remote add origin https://github.com/[GitHub계정]/argus.git

# 4. 초기 커밋 및 푸시
git add .
git commit -m "Initial commit: Argus briefing portal"
git branch -M main
git push -u origin main
```

#### 5.2 PowerShell 스크립트 생성

**파일명**: `C:\Argus\깃헙_자동업로드.ps1`

```powershell
# ================================================================
#  Argus H2 브리핑 포털 — GitHub 자동 업로드 (PowerShell)
# ================================================================

$TOKEN  = "YOUR_GITHUB_PAT"  # Phase 1.2에서 생성한 토큰 입력
$REPO   = "argus"             # GitHub 저장소 이름
$HEADERS = @{
    "Authorization" = "token $TOKEN"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "ArgusH2Portal"
}

# ... (나머지 스크립트는 기존 깃헙_자동업로드.ps1 복사)
```

**토큰 입력**: `YOUR_GITHUB_PAT` 를 실제 Personal Access Token으로 교체

#### 5.3 Windows 작업 스케줄러 설정

1. **작업 스케줄러** 열기 (제어판 > 관리 도구)
2. **작업 만들기** > 다음 설정:
   - **이름**: `Argus_GitHubPush_Daily`
   - **설명**: Argus 브리핑 포털 일일 자동 푸시

3. **트리거** 탭:
   - 매일 09:20에 반복
   - 무기한 실행

4. **작업** 탭:
   - 프로그램/스크립트: `powershell.exe`
   - 인수 추가: `-ExecutionPolicy Bypass -File "C:\Argus\깃헙_자동업로드.ps1"`
   - 시작: `C:\Argus`

5. **조건** 탭:
   - "AC 전원에 연결되어 있을 때만 시작" 해제
   - "유휴 상태일 때만 시작" 해제

6. **확인** 후 저장

#### 5.4 GitHub Pages 활성화 (GitHub 웹)
1. GitHub 저장소 > Settings > Pages
2. Source: `main` branch, `/ (root)` 디렉토리
3. 저장
4. 1~3분 후 포털 URL 활성화: `https://[GitHub계정].github.io/argus/`

---

### Phase 6: 로그인 및 보안 설정

#### 6.1 auth.js 커스터마이징
**파일**: `C:\Argus\auth.js`

현재 구현은 간단한 클라이언트 사이드 인증. 필요시:
- 인증 계정 추가
- 비밀번호 변경 (해시 기반으로 변경 권장)
- 세션 타임아웃 설정

#### 6.2 .gh_token 파일 생성 및 보안
1. **파일 생성**: `C:\Argus\.gh_token`
   ```
   ghp_[GitHub_PAT]
   ```

2. **.gitignore 확인**: `.gh_token` 이 포함되어 있는지 확인
   ```
   .gh_token
   .DS_Store
   Thumbs.db
   *.pyc
   ```

3. **파일 권한 제한** (Windows):
   - `C:\Argus\.gh_token` 우클릭 > 속성 > 보안
   - 현재 사용자만 읽기/쓰기 권한 설정

---

### Phase 7: 테스트

#### 7.1 Google Apps Script 테스트
1. Google Apps Script 에디터에서 **Run** (processArgusEmails 함수)
2. Execution log 확인 (오류 없는지)
3. Google Drive의 "번역본" 폴더에서 최근 파일 확인

#### 7.2 Claude 예정작업 테스트
1. Claude Cowork에서 **Run Now** (Argus briefing task)
2. `C:\Argus\briefs\` 에 새로운 HTML 파일 생성 확인
3. `dashboard.html` 업데이트 확인

#### 7.3 GitHub 푸시 테스트
1. 로컬에서 임의 파일 수정 > 저장
2. PowerShell에서 수동 실행:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Argus\깃헙_자동업로드.ps1"
   ```
3. GitHub 저장소에서 커밋 확인
4. `https://[GitHub계정].github.io/argus/` 에서 변경사항 확인 (1~3분 후)

#### 7.4 엔드-투-엔드 테스트
1. Argus 테스트 메일 수신 (또는 기존 메일 포워딩)
2. Google Apps Script 자동 실행 대기 (1~5분)
3. Claude 예정작업 자동 실행 (09:00)
4. Windows 작업 스케줄러 자동 푸시 (09:20)
5. 포털에 새 브리핑 확인

---

## 📦 마이그레이션 시 이전할 파일 목록

### ✅ 반드시 복사할 파일
```
현재 PC: D:\OneDrive\문서\claude\Argus\Argus 수소정보지 정리\
↓ (모두 복사)
새 PC: C:\Argus\ (또는 새 담당자 경로)

- dashboard.html (핵심 아카이브 DB)
- index.html (홈페이지)
- login.html (로그인)
- auth.js (인증 로직)
- .gitignore (Git 무시 목록)
- .nojekyll (GitHub Pages 설정)
- briefs/ 폴더 (모든 YYYYMMDD.html)
- .git/ 폴더 (Git 이력) — 옵션, 있으면 복사
```

### ⚠️ 재설정 필요한 파일
```
❌ 깃헙_자동업로드.ps1
   → 새 GitHub 토큰으로 수정 후 생성

❌ .gh_token
   → 새 GitHub 토큰으로 생성

❌ apps_script_with_translation.js
   → Google Apps Script에서 새로 생성 및 설정
```

### 📄 설정 정보 이전

**기록**:
```
=== Phase 1: 계정 정보 ===
Gmail 계정: ___________________________________
GitHub 계정: ___________________________________
GitHub PAT: ___________________________________

=== Phase 2: Google Drive 폴더 ID ===
원문 PDF 폴더: ___________________________________
OCR 영문본 폴더: ___________________________________
번역본 한글 폴더: ___________________________________

=== Phase 5: GitHub 저장소 ===
저장소 URL: https://github.com/[계정]/argus
포털 URL: https://[계정].github.io/argus/

=== Phase 7: 테스트 ===
✅ Google Apps Script 테스트: 완료 / 미완료
✅ Claude 예정작업 테스트: 완료 / 미완료
✅ GitHub 푸시 테스트: 완료 / 미완료
✅ 엔드-투-엔드 테스트: 완료 / 미완료
```

---

## 🔧 트러블슈팅

### Google Apps Script 오류
**증상**: "OCR 최종 실패" 로그

**해결**:
1. Google Drive API 활성화 확인 (Google Cloud Console)
2. 폴더 ID 정확성 확인
3. 권한 설정 (Google Apps Script > 프로젝트 설정 > 권한)

### Claude 예정작업 미실행
**증상**: 정해진 시간에 작업이 실행되지 않음

**해결**:
1. Cowork에서 스케줄 설정 재확인
2. PC가 정해진 시간에 켜져 있는지 확인
3. Claude 앱이 백그라운드에서 실행 중인지 확인

### GitHub 푸시 실패
**증상**: "Authentication failed" 오류

**해결**:
1. GitHub PAT 유효성 확인 (Settings > Tokens)
2. PAT 만료 여부 확인 (무제한으로 설정 권장)
3. PowerShell 실행 정책 확인: `Get-ExecutionPolicy`
4. 로컬 git 설정 확인: `git config --list`

### 인증 페이지 오류
**증상**: login.html에서 로그인 불가

**해결**:
1. auth.js의 계정 정보 정확성 확인
2. 브라우저 콘솔에서 오류 메시지 확인
3. 로컬 스토리지 또는 쿠키 삭제 후 재시도

---

## 📞 연락처 및 지원

마이그레이션 중 문제 발생 시:
1. 현재 담당자에게 문의 (추승엽)
2. 각 서비스별 고객지원:
   - Google: support.google.com
   - GitHub: github.com/support
   - Claude: support.anthropic.com

---

**작성일**: 2026-07-07  
**마지막 수정**: 2026-07-07  
**버전**: 1.0
