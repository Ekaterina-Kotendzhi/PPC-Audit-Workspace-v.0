# Free a dev port from stale uvicorn/python servers (used by start-dev.ps1).

function Stop-UvicornOnPort {
    param(
        [int]$Port,
        [switch]$ForceAnyPython,
        [switch]$Force
    )

    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if (-not $listeners.Count) {
        return $false
    }

    $stopped = $false
    foreach ($conn in $listeners) {
        $procId = $conn.OwningProcess
        if (-not $procId) { continue }

        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
        $cmd = if ($proc) { $proc.CommandLine } else { "" }
        $name = if ($proc) { $proc.Name } else { "" }

        $isOurServer = $cmd -match 'uvicorn\s+app\.main:app' -or $cmd -match 'app\.main:app'
        $isPythonName = $name -match '^(python|pythonw)(\.exe)?$'
        $isPythonCmd = $cmd -match 'python(\.exe)?'
        $isPython = $isPythonName -or $isPythonCmd

        $shouldStop = $Force -or $isOurServer -or ($ForceAnyPython -and $isPython)

        if ($shouldStop) {
            $label = if ($Force) { 'listener' } elseif ($isOurServer) { 'uvicorn' } else { 'python' }
            Write-Host "Stopping $label on port ${Port} (PID $procId)..." -ForegroundColor Yellow
            if ($cmd) { Write-Host "  $cmd" -ForegroundColor DarkGray }
            elseif ($name) { Write-Host "  $name" -ForegroundColor DarkGray }
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $stopped = $true
        } else {
            Write-Host "Port $Port is used by PID $procId ($name). Close it manually or use -Port 8001." -ForegroundColor Red
            if ($cmd) { Write-Host "  $cmd" -ForegroundColor DarkGray }
        }
    }

    if ($stopped) {
        Start-Sleep -Seconds 2
    }
    return $stopped
}

function Test-PortListen {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-PortListenerPid {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    return [int]$conn.OwningProcess
}

function Test-PortGhostListener {
    param([int]$Port)
    $listenerPid = Get-PortListenerPid -Port $Port
    if (-not $listenerPid) { return $false }
    return -not (Get-Process -Id $listenerPid -ErrorAction SilentlyContinue)
}

function Test-DevServerHealth {
    param([int]$Port)
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}
