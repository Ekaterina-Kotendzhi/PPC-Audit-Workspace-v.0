# Recreate .venv with Python 3.11/3.12 (not 3.14).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\setup-venv.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-PythonMinor {
    param([string]$Exe, [string[]]$Args)
    try {
        $v = & $Exe @($Args + @('-c', 'import sys; print(str(sys.version_info.major)+chr(46)+str(sys.version_info.minor))'))
        $v = ($v | Out-String).Trim()
        if ($v -match "^3\.(11|12)$") {
            return @{ Exe = $Exe; Args = $Args; Minor = $v }
        }
    } catch { }
    return $null
}

$py = $null
$extraPaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
)
foreach ($spec in @(
    @{ Exe = "py"; Args = @("-3.12") },
    @{ Exe = "py"; Args = @("-3.11") }
)) {
    $py = Test-PythonMinor -Exe $spec.Exe -Args $spec.Args
    if ($py) { break }
}
if (-not $py) {
    foreach ($p in $extraPaths) {
        if (Test-Path $p) {
            $py = Test-PythonMinor -Exe $p -Args @()
            if ($py) { break }
        }
    }
}

if (-not $py) {
    Write-Host "Python 3.11 or 3.12 not found. Install from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "Enable 'Add python.exe to PATH'. Check: py -0p" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using: $($py.Exe) $($py.Args -join ' ') (Python $($py.Minor))" -ForegroundColor Cyan
& $py.Exe @($py.Args + @("-c", "import sys; print(sys.version)"))

if (Test-Path ".venv") {
    Write-Host "Removing old .venv ..." -ForegroundColor Yellow
    $venvPyOld = Join-Path $Root ".venv\Scripts\python.exe"
    Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $venvPyOld } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    try {
        Remove-Item -Recurse -Force .venv
    } catch {
        Write-Host "Stop the dev server (Ctrl+C) and close terminals with .venv active, then run this script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Creating .venv ..." -ForegroundColor Cyan
& $py.Exe @($py.Args + @("-m", "venv", ".venv"))

$venvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "Failed to create .venv" -ForegroundColor Red
    exit 1
}

& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example"
    }
}

Write-Host "Done. Activate: .\.venv\Scripts\Activate.ps1" -ForegroundColor Green
Write-Host "Run server: .\start_dev_windows.bat  OR  .\scripts\start-dev.ps1" -ForegroundColor Green
