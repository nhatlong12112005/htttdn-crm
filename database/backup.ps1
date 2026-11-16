# Sao luu CSDL PostgreSQL ra file .dump (dinh dang custom nen nhi phan cua pg_dump)
# Cach dung:
#   1) Tu dong doc cau hinh tu backend/.env:
#      .\database\backup.ps1
#   2) Truyen tham so tuy chinh:
#      .\database\backup.ps1 -DbName htttdn_crm -User user_ecommerce -DbHost localhost -Port 5433
param(
    [string]$DbName = '',
    [string]$User = '',
    [string]$Password = '',
    [string]$DbHost = '',
    [int]$Port = 0
)

# 1. Tu dong doc DATABASE_URL tu backend/.env neu chua truyen tham so
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend\.env'
if (Test-Path $envFile) {
    $dbUrlLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
    if ($dbUrlLine -match 'postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?"]+)') {
        if (-not $User)     { $User     = $Matches[1] }
        if (-not $Password) { $Password = $Matches[2] }
        if (-not $DbHost)   { $DbHost   = $Matches[3] }
        if ($Port -eq 0)    { $Port     = [int]$Matches[4] }
        if (-not $DbName)   { $DbName   = $Matches[5] }
    }
}

# Gia tri mac dinh du phong
if (-not $DbName) { $DbName = 'htttdn_crm' }
if (-not $User)   { $User   = 'postgres' }
if (-not $DbHost) { $DbHost = 'localhost' }
if ($Port -eq 0)  { $Port   = 5432 }

# 2. Tim cong cu pg_dump va pg_restore
$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
    $pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
              Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgDump) {
    Write-Error 'Khong tim thay pg_dump.exe. Vui long cai dat PostgreSQL client tools.'
    exit 1
}
$pgRestore = Join-Path (Split-Path $pgDump -Parent) 'pg_restore.exe'

# 3. Tao thu muc backup va thuc thi pg_dump
$dir = Join-Path $PSScriptRoot 'backup'
New-Item -ItemType Directory -Force $dir | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$file = Join-Path $dir ("{0}_{1}.dump" -f $DbName, $timestamp)

if ($Password) { $env:PGPASSWORD = $Password }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BAT DAU SAO LUU CO SO DU LIEU POSTGRESQL (MIVA CRM)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host (" - May chu CSDL : {0}:{1}" -f $DbHost, $Port)
Write-Host (" - Ten CSDL     : {0}" -f $DbName)
Write-Host (" - Tai khoan    : {0}" -f $User)
Write-Host (" - File dich    : {0}" -f $file)

& $pgDump -h $DbHost -p $Port -U $User -F c -b -v -f $file $DbName 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0 -and (Test-Path $file)) {
    $sizeKB = [math]::Round((Get-Item $file).Length / 1KB, 2)
    $tableCount = 0
    if (Test-Path $pgRestore) {
        $toc = & $pgRestore -l $file 2>$null
        $tableCount = ($toc | Select-String 'TABLE DATA public').Count
    }
    Write-Host "------------------------------------------------------------" -ForegroundColor Green
    Write-Host (" [THANH CONG] Da sao luu CSDL ra file: {0}" -f $file) -ForegroundColor Green
    Write-Host (" - Dung luong ban sao luu : {0} KB" -f $sizeKB) -ForegroundColor Green
    Write-Host (" - So bang du lieu (TOC)  : {0} bang vat ly" -f $tableCount) -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
} else {
    if (Test-Path $file) { Remove-Item $file -Force -ErrorAction SilentlyContinue }
    Write-Error 'Sao luu CSDL that bai!'
    exit 1
}
