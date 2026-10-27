# Phuc hoi CSDL PostgreSQL tu file .dump
# Cach dung: .\database\restore.ps1 -File .\database\backup\htttdn_crm_20261101_120000.dump
param(
    [Parameter(Mandatory = $true)][string]$File,
    [string]$DbName = 'htttdn_crm',
    [string]$User = 'postgres',
    [string]$DbHost = 'localhost',
    [int]$Port = 5432
)
if (-not (Test-Path $File)) { Write-Error "Khong tim thay file: $File"; exit 1 }
# --clean --if-exists: xoa doi tuong cu truoc khi tao lai
pg_restore -h $DbHost -p $Port -U $User -d $DbName --clean --if-exists -v $File
if ($LASTEXITCODE -eq 0) { Write-Host "Da phuc hoi $DbName tu $File" } else { Write-Error 'Phuc hoi that bai' }
