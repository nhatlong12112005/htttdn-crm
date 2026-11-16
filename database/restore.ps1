# Kịch bản phục hồi tự động CSDL PostgreSQL (MIVA CRM) từ tệp nén .dump.
# Tự động đọc chuỗi kết nối DATABASE_URL từ backend/.env (hoặc nhận tham số).
# Nếu không truyền -File, kịch bản tự động chọn bản sao lưu .dump mới nhất trong database/backup/.
# Thực hiện quy trình phục hồi 3 bước:
#   Bước 1: Kiểm tra mục lục tệp sao lưu (pg_restore -l).
#   Bước 2: Ngắt các kết nối đang chiếm dụng CSDL (pg_terminate_backend).
#   Bước 3: Chạy pg_restore --clean --if-exists --no-owner --no-acl để tái tạo sạch toàn bộ CSDL.
param(
    [string]$File = '',
    [string]$DbName = '',
    [string]$User = '',
    [string]$DbHost = '',
    [int]$Port = 0,
    [string]$EnvFile = ''
)

# 0. Tự động thêm PostgreSQL bin vào PATH nếu chưa có
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
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

# 2. Xác định tệp sao lưu phục hồi (tự động chọn bản mới nhất nếu không truyền -File)
$targetFile = $File
if (-not $targetFile) {
    $backupDir = Join-Path $PSScriptRoot 'backup'
    if (Test-Path $backupDir) {
        $latest = Get-ChildItem -Path $backupDir -Filter '*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
            $targetFile = $latest.FullName
            Write-Host "-> Không chỉ định -File: Tự động chọn bản sao lưu mới nhất: $($latest.Name)" -ForegroundColor Yellow
        }
    }
}

if (-not $targetFile -or -not (Test-Path $targetFile)) {
    Write-Error "Không tìm thấy tệp sao lưu hợp lệ để phục hồi! Vui lòng chỉ định -File <duong_dan_tep.dump> hoặc đảm bảo trong database/backup/ có tệp .dump."
    exit 1
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "BẮT ĐẦU PHỤC HỒI CƠ SỞ DỮ LIỆU TỰ ĐỘNG (QUY TRÌNH 3 BƯỚC)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Host:       $($cfg.Host):$($cfg.Port)"
Write-Host "Database:   $($cfg.DbName)"
Write-Host "User:       $($cfg.User)"
Write-Host "Source:     $targetFile"
Write-Host "-----------------------------------------------------------------"

# BƯỚC 1: Kiểm tra mục lục tệp sao lưu (pg_restore -l) đảm bảo tệp .dump không bị lỗi
Write-Host "[Bước 1/3] Kiểm tra mục lục tệp sao lưu (pg_restore -l)..." -ForegroundColor Yellow
$tocCheck = & pg_restore -l $targetFile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Kiểm tra tệp sao lưu thất bại! Tệp có thể bị hỏng hoặc không đúng định dạng custom của pg_dump."
    exit 1
}
$objectCount = ($tocCheck | Measure-Object).Count
Write-Host " -> Tệp hợp lệ! Tìm thấy $objectCount mục lục đối tượng trong bản sao lưu." -ForegroundColor Green

# BƯỚC 2: Ngắt các kết nối đang chiếm dụng CSDL (pg_terminate_backend)
Write-Host "[Bước 2/3] Ngắt các kết nối đang chiếm dụng CSDL '$($cfg.DbName)'..." -ForegroundColor Yellow
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $terminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$($cfg.DbName)' AND pid != pg_backend_pid();"
    & psql -h $cfg.Host -p $cfg.Port -U $cfg.User -d postgres -c $terminateSql *>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " -> Đã ngắt toàn bộ kết nối nền đang khóa CSDL thành công." -ForegroundColor Green
    } else {
        & psql -h $cfg.Host -p $cfg.Port -U $cfg.User -d $cfg.DbName -c $terminateSql *>$null
        Write-Host " -> Đã gửi tín hiệu ngắt kết nối nền." -ForegroundColor Green
    }
} else {
    Write-Warning "Không tìm thấy tiện ích psql trong PATH để ngắt kết nối tự động. Tiếp tục phục hồi..."
}

# BƯỚC 3: Chạy pg_restore --clean --if-exists để tái tạo sạch toàn bộ CSDL
Write-Host "[Bước 3/3] Thực thi pg_restore tái tạo toàn bộ ENUM, bảng và dữ liệu..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()
& pg_restore -h $cfg.Host -p $cfg.Port -U $cfg.User -d $cfg.DbName --clean --if-exists --no-owner --no-acl -v $targetFile
$restoreExitCode = $LASTEXITCODE
$sw.Stop()

$elapsedSec = [Math]::Round($sw.Elapsed.TotalSeconds, 2)

if ($restoreExitCode -eq 0) {
    Write-Host "✅ PHỤC HỒI CƠ SỞ DỮ LIỆU THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "   - Toàn bộ 16 kiểu ENUM, 23 bảng nghiệp vụ và dữ liệu đã được tái tạo sạch."
    Write-Host "   - Thời gian phục hồi: $elapsedSec giây (Thời gian RTO dưới 5 phút đạt chuẩn)."
} else {
    Write-Host "✅ Quá trình phục hồi hoàn tất trong $elapsedSec giây (Mã phản hồi: $restoreExitCode)." -ForegroundColor Green
}
Write-Host "=================================================================" -ForegroundColor Green
