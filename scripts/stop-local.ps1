param([switch]$WebOnly)
$ErrorActionPreference='Stop'
$projectDirectory=Split-Path -Parent $PSScriptRoot
$recordFile=Join-Path $projectDirectory '.local-services.json'
if(-not(Test-Path -LiteralPath $recordFile)){Write-Host 'No recorded local services.';return}
$records=Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
foreach($record in $records){
 if($WebOnly -and $record.kind -ne 'web'){continue}
 $running=Get-CimInstance Win32_Process -Filter "ProcessId=$($record.id)" -ErrorAction SilentlyContinue
 if(-not $running){continue}
 $created=$running.CreationDate.ToUniversalTime().ToString('o')
 if($created -ne $record.startedAt){continue}
 if(-not $running.CommandLine.ToLowerInvariant().Replace('\','/').Contains($record.match)){continue}
 Stop-Process -Id $running.ProcessId
 Write-Host "Stopped Yee Yuan $($record.kind)."
}
