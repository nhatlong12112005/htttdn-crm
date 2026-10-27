# Sao luu CSDL PostgreSQL ra file .dump (dinh dang custom cua pg_dump)
# Cach dung: .\database\backup.ps1 [-DbName htttdn_crm] [-User postgres] [-Host localhost] [-Port 5432]
param(
    [string]$DbName = 'htttdn_crm',
    [string]$User = 'postgres',
    [string]$DbHost = 'localhost',
    [int]$Port = 5432
)
$dir = Join-Path $PSScriptRoot 'backup'
New-Item -ItemType Directory -Force $dir | Out-Null
$file = Join-Path $dir ("{0}_{1}.dump" -f $DbName, (Get-Date -Format 'yyyyMMdd_HHmmss'))
pg_dump -h $DbHost -p $Port -U $User -F c -b -v -f $file $DbName
if ($LASTEXITCODE -eq 0) { Write-Host "Da sao luu: $file" } else { Write-Error 'Sao luu that bai' }
