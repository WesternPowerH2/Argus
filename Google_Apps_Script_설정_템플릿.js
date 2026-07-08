/**
 * Argus 수소·암모니아 PDF → OCR → 한글 번역 자동화 스크립트 v3.2
 *
 * 📌 마이그레이션 설정 템플릿
 * 아래 [설정값] 섹션에서 4개 항목만 변경하면 새 환경에서 그대로 작동합니다.
 *
 * 변경 이력:
 *  v3.2 (2026-05-22) — Gmail 검색 조건 수정
 *    - processArgusEmails(): 발신자를 notifications@argusmedia.com → choosy@iwest.co.kr 로 변경
 *      (Argus 메일이 직접 수신이 아닌 추승엽 님 전달(FW) 방식으로 수신됨)
 *    - 검색 조건에 subject:Argus 추가하여 Argus 관련 메일만 선별
 *  v3.1 (2026-05-14) — OCR 오류 처리 강화
 *    - ocrPdf(): 최대 3회 재시도 + 지수 백오프 (2s → 4s → 8s)
 *    - processArgusEmails(): OCR 실패 시 Argus-processed 라벨 미부여 → 다음 실행 시 자동 재시도
 *
 * 기능:
 *  1. Gmail에서 Argus PDF 첨부파일 수신 감지
 *  2. Google Drive PDF 폴더에 저장
 *  3. Drive OCR로 영문 텍스트 추출 → OCR 폴더에 저장
 *  4. LanguageApp으로 한글 번역 → 번역본 폴더에 저장
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 [설정값] — 이 4개 항목만 새 계정의 정보로 변경하면 됩니다
// ═══════════════════════════════════════════════════════════════════════════════

// 1️⃣ 원문 PDF 폴더 ID
// 위치: Google Drive > Argus > 원문 PDF 폴더 우클릭 > 링크 복사
// 링크: https://drive.google.com/drive/folders/[이 부분이 폴더 ID]
// 예: https://drive.google.com/drive/folders/1oMyl4hTVN8chOw5MPLQKYWdMonStRLxo
//     → 1oMyl4hTVN8chOw5MPLQKYWdMonStRLxo
const PDF_FOLDER_ID   = 'YOUR_PDF_FOLDER_ID_HERE';

// 2️⃣ OCR 영문본 폴더 ID
// 위치: Google Drive > Argus > OCR 영문본 폴더 우클릭 > 링크 복사
const OCR_FOLDER_ID   = 'YOUR_OCR_FOLDER_ID_HERE';

// 3️⃣ 번역본 한글 폴더 ID
// 위치: Google Drive > Argus > 번역본 한글 폴더 우클릭 > 링크 복사
const TRANS_FOLDER_ID = 'YOUR_TRANS_FOLDER_ID_HERE';

// 4️⃣ Argus 메일을 받는 Gmail 주소
// 이 주소로 오는 Argus Media 메일을 감지합니다
// 현재 설정: choosy@iwest.co.kr (추승엽 님 계정)
// 새 계정이면: 새 담당자의 Gmail 주소로 변경 (예: new.person@example.com)
const ARGUS_EMAIL_FROM = 'choosy@iwest.co.kr';  // ← 새 계정의 이메일로 변경

// Gmail 라벨 (보통 변경 불필요)
const PROCESSED_LABEL = 'Argus-processed';

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ 아래 코드는 변경하지 마세요
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 메인 실행 함수 (트리거 연결)
 * Google Apps Script > 트리거에서 이 함수를 지정하면 매 1분마다 자동 실행
 */
function processArgusEmails() {
  // 설정값 검증
  if (PDF_FOLDER_ID === 'YOUR_PDF_FOLDER_ID_HERE' ||
      OCR_FOLDER_ID === 'YOUR_OCR_FOLDER_ID_HERE' ||
      TRANS_FOLDER_ID === 'YOUR_TRANS_FOLDER_ID_HERE') {
    Logger.log('❌ 오류: 설정값이 완성되지 않았습니다.');
    Logger.log('   위의 [설정값] 섹션에서 4개 항목을 모두 변경해주세요.');
    Logger.log('   - PDF_FOLDER_ID');
    Logger.log('   - OCR_FOLDER_ID');
    Logger.log('   - TRANS_FOLDER_ID');
    Logger.log('   - ARGUS_EMAIL_FROM');
    return;
  }

  const label   = getOrCreateLabel(PROCESSED_LABEL);
  const threads = GmailApp.search(
    'from:' + ARGUS_EMAIL_FROM + ' subject:Argus has:attachment -label:' + PROCESSED_LABEL,
    0, 10
  );

  Logger.log('🔍 검색: from:' + ARGUS_EMAIL_FROM + ' subject:Argus');
  Logger.log('   발견된 이메일: ' + threads.length + '개');

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

          Logger.log('✅ PDF 저장 완료: ' + name);

          // 2) OCR → 영문 Google Doc (재시도 포함)
          const ocrDocId = ocrPdf(pdfFile.getId(), name.replace('.pdf', ''), OCR_FOLDER_ID);

          if (!ocrDocId) {
            Logger.log('⚠️ OCR 최종 실패 — 다음 실행 시 재시도 예정: ' + name);
            allSuccess = false;
            return;
          }

          // 3) 한글 번역본 생성
          if (TRANS_FOLDER_ID !== 'YOUR_TRANS_FOLDER_ID_HERE') {
            translateDocToKorean(ocrDocId, name.replace('.pdf', ''), TRANS_FOLDER_ID);
          }

          Logger.log('✅ 완료: ' + name);

        } catch (e) {
          Logger.log('❌ 오류 [' + name + ']: ' + e.message);
          allSuccess = false;
        }
      });
    });

    if (allSuccess) {
      thread.addLabel(label);
      Logger.log('라벨 부여 완료: ' + thread.getFirstMessageSubject());
    } else {
      Logger.log('⚠️ 일부 OCR 실패 — 라벨 미부여, 다음 실행 시 재시도: '
                 + thread.getFirstMessageSubject());
    }
  });
}

/**
 * OCR 함수 (재시도 로직 포함)
 * PDF를 Google Drive OCR로 변환하여 영문 텍스트 추출
 */
function ocrPdf(pdfFileId, baseName, targetFolderId) {
  const token        = ScriptApp.getOAuthToken();
  const MAX_RETRIES  = 3;
  const RETRY_DELAYS = [2000, 4000, 8000]; // ms — 지수 백오프

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
      const retryInfo = attempt > 1 ? ' (시도 ' + attempt + '회 만에 성공)' : '';
      Logger.log('OCR 완료: ' + result.id + retryInfo);
      return result.id;
    }

    Logger.log('OCR 오류 (시도 ' + attempt + '/' + MAX_RETRIES + '): '
               + JSON.stringify(result.error));

    if (attempt < MAX_RETRIES) {
      Logger.log('재시도 대기 ' + RETRY_DELAYS[attempt - 1] + 'ms...');
      Utilities.sleep(RETRY_DELAYS[attempt - 1]);
    }
  }

  Logger.log('OCR 최종 실패 (3회 모두 실패): ' + baseName);
  return null;
}

/**
 * 한글 번역 함수
 * OCR 결과(영문)를 Google Translate를 이용해 한글로 번역
 */
function translateDocToKorean(ocrDocId, baseName, transFolderId) {
  const srcDoc  = DocumentApp.openById(ocrDocId);
  const body    = srcDoc.getBody();
  const srcText = body.getText();

  if (!srcText || srcText.trim().length === 0) {
    Logger.log('번역 건너뜀 — 빈 문서: ' + ocrDocId);
    return;
  }

  // Google Apps Script 내장 번역 함수 (영어 → 한국어)
  // 텍스트가 길면 4500자 단위로 분할 번역
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

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 함수 (변경하지 마세요)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gmail 라벨 생성 또는 조회
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('새 라벨 생성: ' + labelName);
  }
  return label;
}

/**
 * 하위 폴더 생성 또는 조회
 */
function getOrCreateSubfolder(parentFolder, subfolderName) {
  const iter = parentFolder.getFoldersByName(subfolderName);
  if (iter.hasNext()) {
    return iter.next();
  }
  const newFolder = parentFolder.createFolder(subfolderName);
  Logger.log('새 폴더 생성: ' + subfolderName);
  return newFolder;
}
