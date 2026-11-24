param(
    [Parameter(Mandatory = $true)]
    [string]$GameDir,
    [string]$OutFile = (Join-Path (Resolve-Path "$PSScriptRoot\..\..").Path "dump\item-stats.json")
)

if ([IntPtr]::Size -ne 4) {
    $ps32 = Join-Path $env:SystemRoot "SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
    & $ps32 -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -GameDir $GameDir -OutFile $OutFile
    exit $LASTEXITCODE
}

[Environment]::CurrentDirectory = $GameDir
$asm = [System.Reflection.Assembly]::LoadFrom((Join-Path $GameDir "Terraria.exe"))
$script:inResolve = $false
[AppDomain]::CurrentDomain.add_AssemblyResolve({
    param($s, $e)
    $short = ($e.Name -split ",")[0]
    if ($short.EndsWith(".resources")) { return $null }
    if ($script:inResolve) { return $null }
    $script:inResolve = $true
    try {
        foreach ($rn in $asm.GetManifestResourceNames()) {
            if ($rn.EndsWith("$short.dll", [StringComparison]::OrdinalIgnoreCase)) {
                $st = $asm.GetManifestResourceStream($rn)
                $buf = New-Object byte[] $st.Length
                $null = $st.Read($buf, 0, $buf.Length)
                return [System.Reflection.Assembly]::Load($buf)
            }
        }
        $cand = Join-Path $GameDir "$short.dll"
        if (Test-Path $cand) { return [System.Reflection.Assembly]::LoadFrom($cand) }
        return $null
    } finally {
        $script:inResolve = $false
    }
})

$asm.GetType("Terraria.Program").GetField("SavePath").SetValue($null, $env:TEMP)
$itemsJsonPath = Join-Path (Split-Path -Parent $OutFile) "items.json"
$maxId = 6195
if (Test-Path $itemsJsonPath) {
    $maxId = ((Get-Content $itemsJsonPath -Raw | ConvertFrom-Json) | Measure-Object).Count
}
$itemType = $asm.GetType("Terraria.Item")

$out = New-Object System.Collections.Generic.List[object]
for ($id = 1; $id -le $maxId; $id++) {
    $item = [Activator]::CreateInstance($itemType)
    try { $item.SetDefaults($id) } catch {}

    $cat = "misc"
    if ($item.headSlot -ge 0 -or $item.bodySlot -ge 0 -or $item.legSlot -ge 0 -or $item.vanity) { $cat = "armor" }
    elseif ($item.accessory) { $cat = "accessory" }
    elseif ($item.pick -gt 0 -or $item.axe -gt 0 -or $item.hammer -gt 0) { $cat = "tool" }
    elseif ($item.damage -gt 0) { $cat = "weapon" }
    elseif ($item.createTile -ge 0 -or $item.createWall -ge 0) { $cat = "block" }
    elseif ($item.consumable) { $cat = "consumable" }

    $out.Add([pscustomobject]@{
        id = $id
        cat = $cat
        stack = [int]$item.maxStack
        rare = [int]$item.rare
    })
}

$outDir = Split-Path -Parent $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
[System.IO.File]::WriteAllText($OutFile, ($out | ConvertTo-Json -Compress), [System.Text.Encoding]::UTF8)
Write-Output "Exported $($out.Count) item stats from Terraria.exe to $OutFile"
