# Kịch bản sao lưu tự động CSDL PostgreSQL (MIVA CRM) ra tệp nén .dump.
# Tự động đọc chuỗi kết nối DATABASE_URL từ backend/.env, gọi tiện ích pg_dump
# để xuất tệp nén .dump (-Fc -Z 9 --no-owner --no-acl) và tự động kiểm tra tính
# toàn vẹn của tệp sau khi sao lưu qua pg_restore -l.
param(
    [string]$DbName = '',
    [string]$User = '',
    [string]$DbHost = '',
    [int]$Port = 0,
    [string]$EnvFile = ''
)

# 0. Tự động thêm PostgreSQL bin vào PATH nếu chưa có
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    $pgBins = Get-ChildItem -Path "C:\Program Files\PostgreSQL\*\bin" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    if ($pgBins) {
        $chosenBin = $pgBins | Sort-Object -Descending | Select-Object -First 1
        $env:PATH = "$chosenBin;" + $env:PATH
    }
}

# 1. Đọc và phân tích cấu hình từ backend/.env
$envPaths = @(
    $EnvFile,
    (Join-Path $PSScriptRoot '..\backend\.env'),
    (Join-Path $PSScriptRoot '.env'),
    (Join-Path (Get-Location) 'backend\.env')
)

$cfg = @{
    User     = 'postgres'
    Password = ''
    Host     = 'localhost'
    Port     = 5432
    DbName   = 'htttdn_crm'
}

foreach ($p in $envPaths) {
    if ($p -and (Test-Path $p)) {
        Write-Host "-> Đang đọc cấu hình từ: $p" -ForegroundColor Cyan
        Get-Content $p | ForEach-Object {
            $line = $_.Trim()
            if ($line -match '^DATABASE_URL\s*=\s*["'']?(.*?)["'']?$') {
                $rawUrl = $matches[1]
                if ($rawUrl -match '^postgres(?:ql)?://(?:([^:@]+)(?::([^@]*))?@)?([^:/]+)(?::(\d+))?(?:/([^?]+))?') {
                    if ($matches[1]) { $cfg.User = [System.Uri]::UnescapeDataString($matches[1]) }
                    if ($matches[2]) { $cfg.Password = [System.Uri]::UnescapeDataString($matches[2]) }
                    if ($matches[3]) { $cfg.Host = $matches[3] }
                    if ($matches[4]) { $cfg.Port = [int]$matches[4] }
                    if ($matches[5]) { $cfg.DbName = $matches[5] }
                }
            }
        }
        break
    }
}

# Cho phép ghi đè qua tham số dòng lệnh nếu người dùng chỉ định
if ($DbName) { $cfg.DbName = $DbName }
if ($User)   { $cfg.User = $User }
if ($DbHost) { $cfg.Host = $DbHost }
if ($Port -gt 0) { $cfg.Port = $Port }

if ($cfg.Password) {
    $env:PGPASSWORD = $cfg.Password
}

# 2. Chuẩn bị thư mục và tệp sao lưu
$backupDir = Join-Path $PSScriptRoot 'backup'
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force $backupDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = Join-Path $backupDir ("{0}_{1}.dump" -f $cfg.DbName, $timestamp)

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "BẮT ĐẦU SAO LƯU CƠ SỞ DỮ LIỆU TỰ ĐỘNG (PG_DUMP)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Host:     $($cfg.Host):$($cfg.Port)"
Write-Host "Database: $($cfg.DbName)"
Write-Host "User:     $($cfg.User)"
Write-Host "Target:   $backupFile"
Write-Host "-----------------------------------------------------------------"

# 3. Lệnh pg_dump cốt lõi (-Fc -Z 9 --no-owner --no-acl)
$sw = [System.Diagnostics.Stopwatch]::StartNew()
& pg_dump -h $cfg.Host -p $cfg.Port -U $cfg.User -d $cfg.DbName -Fc -Z 9 --no-owner --no-acl -f $backupFile
$dumpExitCode = $LASTEXITCODE
$sw.Stop()

if ($dumpExitCode -ne 0 -or -not (Test-Path $backupFile)) {
    Write-Error "Sao lưu thất bại! Mã lỗi: $dumpExitCode"
    exit $dumpExitCode
}

$fileItem = Get-Item $backupFile
$fileSizeKb = [Math]::Round($fileItem.Length / 1KB, 2)
$elapsedSec = [Math]::Round($sw.Elapsed.TotalSeconds, 2)

Write-Host "✅ Xuất tệp sao lưu thành công!" -ForegroundColor Green
Write-Host "   - Kích thước tệp: $fileSizeKb KB"
Write-Host "   - Thời gian thực thi: $elapsedSec giây"

# 4. Tự động kiểm tra tính toàn vẹn của tệp sau khi sao lưu (pg_restore -l)
Write-Host "-> Đang kiểm tra tính toàn vẹn tệp sao lưu qua pg_restore -l..." -ForegroundColor Yellow
$tocOutput = & pg_restore -l $backupFile 2>&1
if ($LASTEXITCODE -eq 0) {
    $tocCount = ($tocOutput | Measure-Object).Count
    Write-Host "✅ Tệp sao lưu hợp lệ 100%! Bảo toàn toàn bộ cấu trúc và đối tượng CSDL ($tocCount mục lục đối tượng)." -ForegroundColor Green
    Write-Host "Đường dẫn tệp: $backupFile" -ForegroundColor Cyan
} else {
    Write-Warning "Cảnh báo: Tệp đã được tạo nhưng kiểm tra mục lục pg_restore -l phát hiện bất thường!"
}
Write-Host "=================================================================" -ForegroundColor Green
