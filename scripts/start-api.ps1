$ErrorActionPreference='Stop'
$projectDirectory=Split-Path -Parent $PSScriptRoot
$settingsFile=Join-Path $projectDirectory '.env.backend'
if (-not (Test-Path -LiteralPath $settingsFile)) { throw 'Copy .env.backend.example to .env.backend first.' }
Get-Content -LiteralPath $settingsFile | ForEach-Object { if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process') } }
$mavenCommand=if($env:MAVEN_CMD){$env:MAVEN_CMD}else{'mvn'}
Push-Location (Join-Path $projectDirectory 'backend')
try { & $mavenCommand spring-boot:run } finally { Pop-Location }
