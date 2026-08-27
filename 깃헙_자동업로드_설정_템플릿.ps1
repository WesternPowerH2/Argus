# ════════════════════════════════════════════════════════════════════════════════
#  Argus H2 브리핑 포털 — GitHub 자동 업로드 (PowerShell)
#  마이그레이션 설정 템플릿
#
#  📌 아래 [설정값] 섹션에서 3개 항목만 변경하면 새 환경에서 그대로 작동합니다.
#
#  실행: PowerShell에서 아래 한 줄 실행
#  powershell -ExecutionPolicy Bypass -File "깃헙_자동업로드.ps1"
# ════════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 [설정값] — 이 3개 항목만 새 계정의 정보로 변경하면 됩니다
# ═══════════════════════════════════════════════════════════════════════════════

# 1️⃣ GitHub Personal Access Token (PAT)
# 생성 방법:
#   1. GitHub 로그인 > Settings > Developer settings > Personal access tokens > Tokens (classic)
#   2. "Generate new token (classic)"
#   3. Scopes 선택: repo, workflow, admin:public_key
#   4. 생성된 토큰 복사: ghp_XXXXXXXXXXXXXXXXXX...
#
# 보안 주의: 이 파일은 .gitignore에 포함되어 GitHub에 업로드되지 않습니다
$TOKEN  = "YOUR_GITHUB_PAT_HERE"

# 2️⃣ GitHub 계정 이름
# GitHub 프로필 URL: https://github.com/[이 부분이 계정명]
# 예: https://github.com/KowepoH2 → KowepoH2
#
# ⚠️ 주의: 자동 인식되므로 일반적으로 변경할 필요가 없습니다
# (아래 스크립트가 실행 중 자동으로 인식합니다)
$GITHUB_ACCOUNT = $null  # 자동 인식 (변경 금지)

# 3️⃣ GitHub 저장소 이름
# 현재 설정: argus (또는 argus-h2-briefing)
# 변경 가능: 새로운 이름을 사용하고 싶으면 여기서 변경
$REPO   = "argus"

$HEADERS = @{
    "Authorization" = "token $TOKEN"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "ArgusH2Portal"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ⚠️ 아래 코드는 변경하지 마세요
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Argus H2 브리핑 포털 — GitHub 자동 업로드" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ── 1. 설정값 검증 ──────────────────────────────────────────────────────
if ($TOKEN -eq "YOUR_GITHUB_PAT_HERE") {
    Write-Host ""
    Write-Host "❌ 오류: GitHub PAT이 설정되지 않았습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "해결 방법:" -ForegroundColor Yellow
    Write-Host "  1. 이 파일을 텍스트 에디터로 열기"
    Write-Host "  2. [설정값] 섹션의 `$TOKEN = '...' 라인 찾기"
    Write-Host "  3. 'YOUR_GITHUB_PAT_HERE'를 실제 GitHub PAT으로 교체"
    Write-Host "     예: `$TOKEN = 'ghp_XXXXXXXXXXXXXXXXXX'"
    Write-Host "  4. 파일 저장"
    Write-Host ""
    Write-Host "GitHub PAT 생성 가이드:" -ForegroundColor Yellow
    Write-Host "  1. GitHub > Settings > Developer settings > Personal access tokens"
    Write-Host "  2. Tokens (classic) 선택"
    Write-Host "  3. 'Generate new token' 클릭"
    Write-Host "  4. Scopes: repo, workflow, admin:public_key 선택"
    Write-Host "  5. Generate 클릭 > 토큰 복사"
    Write-Host ""
    Write-Host "Press Enter to exit..." -ForegroundColor Gray
    [void][System.Console]::ReadKey($true)
    exit
}

# ── 2. 인증 확인 ──────────────────────────────────────────────────────
Write-Host "`n🔐 GitHub 인증 중..." -ForegroundColor Yellow
try {
    $userInfo = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $HEADERS -Method Get
    $GITHUB_ACCOUNT = $userInfo.login
    Write-Host "✅ 인증 완료: @$GITHUB_ACCOUNT" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "확인사항:" -ForegroundColor Yellow
    Write-Host "  1. GitHub PAT이 올바르게 입력되었는가?"
    Write-Host "  2. GitHub PAT이 만료되지 않았는가?"
    Write-Host "  3. 인터넷 연결이 정상인가?"
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    [void][System.Console]::ReadKey($true)
    exit
}

# ── 3. 저장소 생성 ────────────────────────────────────────────────────
Write-Host "`n📦 저장소 '$REPO' 확인 중..." -ForegroundColor Yellow
$repoBody = @{
    name        = $REPO
    description = "서부발전 수소사업팀 — Argus 수소·암모니아 일간 브리핑 포털"
    private     = $false
    auto_init   = $false
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $HEADERS -Method Post -Body $repoBody -ContentType "application/json" | Out-Null
    Write-Host "✅ 저장소 생성 완료" -ForegroundColor Green
    Start-Sleep -Seconds 2
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "ℹ️  기존 저장소 사용" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  저장소 생성 응답: $_" -ForegroundColor Yellow
    }
}

# ── 4. 파일 업로드 함수 ───────────────────────────────────────────────
function Upload-File($localPath, $repoPath) {
    $content = [System.IO.File]::ReadAllBytes($localPath)
    $encoded = [Convert]::ToBase64String($content)
    $apiUrl  = "https://api.github.com/repos/$GITHUB_ACCOUNT/$REPO/contents/$repoPath"

    # 기존 파일 SHA 확인
    $sha = $null
    try {
        $existing = Invoke-RestMethod -Uri $apiUrl -Headers $HEADERS -Method Get
        $sha = $existing.sha
    } catch {}

    $body = @{ message = "Add $repoPath"; content = $encoded }
    if ($sha) { $body.sha = $sha }
    $bodyJson = $body | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $apiUrl -Headers $HEADERS -Method Put -Body $bodyJson -ContentType "application/json" | Out-Null
        if ($sha) {
            Write-Host "  🔄 $repoPath" -ForegroundColor DarkCyan
        } else {
            Write-Host "  ✅ $repoPath" -ForegroundColor Green
        }
        return $true
    } catch {
        Write-Host "  ❌ $repoPath : $_" -ForegroundColor Red
        return $false
    }
}

# ── 5. 업로드할 파일 목록 ─────────────────────────────────────────────
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EXCLUDE = @('admin.html','hydrogen_archive_v2.html','hydrogen_daily_v2.html',
             'apps_script_v2.js','github_setup.sh','깃헙_자동업로드.py',
             '깃헙_자동업로드.ps1','.DS_Store','Thumbs.db','github_upload.py',
             'Google_Apps_Script_설정_템플릿.js','깃헙_자동업로드_설정_템플릿.ps1')

Write-Host "`n📤 파일 업로드 시작..." -ForegroundColor Yellow

$ok = 0; $total = 0

# 루트 파일들
$rootFiles = Get-ChildItem -Path $SCRIPT_DIR -File | Where-Object { $EXCLUDE -notcontains $_.Name }
foreach ($f in $rootFiles) {
    $total++
    if (Upload-File $f.FullName $f.Name) { $ok++ }
    Start-Sleep -Milliseconds 300
}

# .nojekyll (숨김 파일)
$nojekyll = Join-Path $SCRIPT_DIR ".nojekyll"
if (Test-Path $nojekyll) {
    $total++
    if (Upload-File $nojekyll ".nojekyll") { $ok++ }
    Start-Sleep -Milliseconds 300
}

# briefs/ 폴더
$briefsDir = Join-Path $SCRIPT_DIR "briefs"
if (Test-Path $briefsDir) {
    $briefFiles = Get-ChildItem -Path $briefsDir -File
    foreach ($f in $briefFiles) {
        $total++
        if (Upload-File $f.FullName "briefs/$($f.Name)") { $ok++ }
        Start-Sleep -Milliseconds 300
    }
}

Write-Host "`n✅ $ok / $total 개 파일 업로드 완료" -ForegroundColor Green

# ── 6. GitHub Pages 활성화 ───────────────────────────────────────────
Write-Host "`n🌐 GitHub Pages 활성화 중..." -ForegroundColor Yellow
$pagesBody = @{ source = @{ branch = "main"; path = "/" } } | ConvertTo-Json
$pagesUrl  = "https://api.github.com/repos/$GITHUB_ACCOUNT/$REPO/pages"
try {
    Invoke-RestMethod -Uri $pagesUrl -Headers $HEADERS -Method Post -Body $pagesBody -ContentType "application/json" | Out-Null
    Write-Host "✅ GitHub Pages 활성화!" -ForegroundColor Green
} catch {
    try {
        Invoke-RestMethod -Uri $pagesUrl -Headers $HEADERS -Method Put -Body $pagesBody -ContentType "application/json" | Out-Null
        Write-Host "✅ GitHub Pages 설정 완료!" -ForegroundColor Green
    } catch {
        Write-Host "ℹ️  Pages 활성화 상태 확인 필요 (이미 활성화되었을 수 있음)" -ForegroundColor Yellow
    }
}

# ── 7. 완료 ─────────────────────────────────────────────────────
$portalUrl = "https://$GITHUB_ACCOUNT.github.io/$REPO/"
$repoUrl   = "https://github.com/$GITHUB_ACCOUNT/$REPO"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 모든 설정 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 포털 주소 (1~3분 후 활성화):" -ForegroundColor White
Write-Host "   $portalUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 GitHub 저장소:" -ForegroundColor White
Write-Host "   $repoUrl" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
[void][System.Console]::ReadKey($true)
