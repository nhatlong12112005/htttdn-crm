# Phuc hoi CSDL PostgreSQL tu file .dump (dinh dang custom cua pg_dump)
# Cach dung:
#   1) Phuc hoi tu ban sao luu moi nhat trong database/backup/:
#      .\database\restore.ps1 -Latest
#   2) Phuc hoi tu mot file .dump cu the:
#      .\database\restore.ps1 -File .\database\backup\htttdn_crm_20261105_092000.dump
param(
    [string]$File = '',
    [switch]$Latest,
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

if (-not $DbName) { $DbName = 'htttdn_crm' }
if (-not $User)   { $User   = 'postgres' }
if (-not $DbHost) { $DbHost = 'localhost' }
if ($Port -eq 0)  { $Port   = 5432 }

# 2. Xac dinh file .dump can phuc hoi
$backupDir = Join-Path $PSScriptRoot 'backup'
if ($Latest -or -not $File) {
    $latestDump = Get-ChildItem -Path $backupDir -Filter '*.dump' -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestDump) {
        Write-Error "Khong tim thay ban sao luu .dump nao trong $backupDir"
        exit 1
    }
    $File = $latestDump.FullName
}

if (-not (Test-Path $File)) {
    Write-Error "Khong tim thay file sao luu: $File"
    exit 1
}

# 3. Tim cong cu pg_restore
$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
    $pgRestore = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' -ErrorAction SilentlyContinue |
                 Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgRestore) {
    Write-Error 'Khong tim thay pg_restore.exe. Vui long cai dat PostgreSQL client tools.'
    exit 1
}

if ($Password) { $env:PGPASSWORD = $Password }

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host " BAT DAU PHUC HOI CO SO DU LIEU POSTGRESQL (MIVA CRM)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host (" - May chu CSDL : {0}:{1}" -f $DbHost, $Port)
Write-Host (" - Ten CSDL     : {0}" -f $DbName)
Write-Host (" - Tai khoan    : {0}" -f $User)
Write-Host (" - Nguon backup : {0}" -f $File)

# --clean --if-exists --no-owner --no-privileges: xoa doi tuong cu an toan truoc khi khoi phuc
$restoreLog = & $pgRestore -h $DbHost -p $Port -U $User -d $DbName --clean --if-exists --no-owner --no-privileges $File 2>&1
$exitCode = $LASTEXITCODE
$logText = ($restoreLog | Out-String)
$isBenignPg18Warning = ($exitCode -eq 1) -and ($logText -match 'transaction_timeout') -and ($logText -match 'errors ignored on restore:\s*1\b')

if ($exitCode -eq 0 -or $isBenignPg18Warning) {
    Write-Host "------------------------------------------------------------" -ForegroundColor Green
    Write-Host (" [THANH CONG] Da phuc hoi CSDL {0} tu {1}" -f $DbName, $File) -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Yellow
    exit 0
} else {
    if ($logText) { Write-Host $logText -ForegroundColor Red }
    Write-Error 'Phuc hoi CSDL that bai!'
    exit 1
}
