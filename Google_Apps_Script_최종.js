/**
 * Argus 수소·암모니아 PDF → OCR → 한글 번역 자동화 스크립트 v3.2
 *
 * 📌 마이그레이션 완료본 — WesternPowerH2 계정용
 * 이 파일 전체를 복사해서 Google Apps Script 프로젝트의 Code.gs에 붙여넣으세요.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 [설정값] — WesternPowerH2 계정 기준으로 이미 채워져 있습니다
// ═══════════════════════════════════════════════════════════════════════════════

// 1️⃣ 원문 PDF 폴더 ID (Argus 수소정보지)
const PDF_FOLDER_ID   = '1BjFJ8bDzWrpZXUk12xTbO26u4rC2hXnr';

// 2️⃣ OCR 영문본 폴더 ID (Argus OCR 소스)
const OCR_FOLDER_ID   = '1kJWRFFvlJ6fE89Dipyx_Xhbo7uEntXj8';

// 3️⃣ 번역본 한글 폴더 ID (Argus 번역본)
const TRANS_FOLDER_ID = '1DWqm8vew-Q8x8tnmO6loQEAvC5ElLApE';

// 4️⃣ Argus 메일을 받는 Gmail 주소
const ARGUS_EMAIL_FROM = 'bhb23@iwest.co.kr';

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
  if (PDF_FOLDER_ID === 'YOUR_PDF_FOLDER_ID_HERE' ||
      OCR_FOLDER_ID === 'YOUR_OCR_FOLDER_ID_HERE' ||
      TRANS_FOLDER_ID === 'YOUR_TRANS_FOLDER_ID_HERE') {
    Logger.log('❌ 오류: 설정값이 완성되지 않았습니다.');
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
          const pdfBlob   = att.copyBlob().setName(name);
          const pdfFolder = DriveApp.getFolderById(PDF_FOLDER_ID);

          const monthKey    = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM');
          const monthFolder = getOrCreateSubfolder(pdfFolder, monthKey);
          const pdfFile     = monthFolder.createFile(pdfBlob);

          Logger.log('✅ PDF 저장 완료: ' + name);

          const ocrDocId = ocrPdf(pdfFile.getId(), name.replace('.pdf', ''), OCR_FOLDER_ID);

          if (!ocrDocId) {
            Logger.log('⚠️ OCR 최종 실패 — 다음 실행 시 재시도 예정: ' + name);
            allSuccess = false;
            return;
          }

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
      Logger.log('라벨 부여 완료: ' + thread.getFirstMessageSubject());
    } else {
      Logger.log('⚠️ 일부 OCR 실패 — 라벨 미부여, 다음 실행 시 재시도: '
                 + thread.getFirstMessageSubject());
    }
  });
}

/**
 * OCR 함수 (재시도 로직 포함)
 */
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
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 함수 (변경하지 마세요)
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('새 라벨 생성: ' + labelName);
  }
  return label;
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  const iter = parentFolder.getFoldersByName(subfolderName);
  if (iter.hasNext()) {
    return iter.next();
  }
  const newFolder = parentFolder.createFolder(subfolderName);
  Logger.log('새 폴더 생성: ' + subfolderName);
  return newFolder;
}
