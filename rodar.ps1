$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-Listening([int] $port) {
    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    return $null -ne ($listeners | Where-Object { $_.Port -eq $port })
}

function Stop-Tree($process) {
    if ($null -eq $process -or $process.HasExited) {
        return
    }
    & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null
}

function Update-Code {
    Write-Host "Atualizando o código..."
    Push-Location $root
    try {
        & git pull
        if ($LASTEXITCODE -ne 0) {
            throw "Não consegui atualizar o código. Nada foi iniciado."
        }
    }
    finally {
        Pop-Location
    }
}

function Install-Backend {
    $backendDir = Join-Path $root "backend"
    $venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Write-Host "Criando o ambiente do backend..."
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
        if (-not $pythonCmd) {
            $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
        }
        if (-not $pythonCmd) {
            throw "Não encontrei o Python para criar o ambiente do backend."
        }
        Push-Location $backendDir
        try {
            if ($pythonCmd.Name -eq "py.exe" -or $pythonCmd.Name -eq "py") {
                & py -3 -m venv .venv
            }
            else {
                & python -m venv .venv
            }
            if ($LASTEXITCODE -ne 0 -or -not (Test-Path $venvPython)) {
                throw "Não consegui criar o ambiente do backend."
            }
        }
        finally {
            Pop-Location
        }
    }
    Write-Host "Conferindo dependências do backend..."
    & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        throw "Não consegui instalar as dependências do backend."
    }
}

function Update-Database {
    Write-Host "Atualizando o banco..."
    $backendDir = Join-Path $root "backend"
    $venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
    Push-Location $backendDir
    try {
        & $venvPython -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) {
            throw "Não consegui atualizar o banco. Nada foi iniciado."
        }
    }
    finally {
        Pop-Location
    }
}

function Start-DatabaseTunnel([int] $port) {
    if (Test-Listening $port) {
        Write-Host "O banco já está acessível na porta $port."
        return $null
    }
    $ssh = Get-Command ssh -ErrorAction SilentlyContinue
    if (-not $ssh) {
        throw "Não encontrei o ssh para acessar o banco."
    }
    $key = Join-Path $env:USERPROFILE ".ssh\id_ed25519"
    if (-not (Test-Path $key)) {
        throw "Não encontrei a chave SSH em $key."
    }
    Write-Host "Abrindo o acesso ao banco..."
    $errorLog = Join-Path $env:TEMP "db-tunnel-$port.err"
    if (Test-Path $errorLog) {
        Remove-Item $errorLog -Force
    }
    $process = Start-Process -FilePath $ssh.Source -ArgumentList @(
        "-N",
        "-i", $key,
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=30",
        "-L", "${port}:127.0.0.1:${port}",
        "root@2.24.107.120"
    ) -PassThru -WindowStyle Hidden -RedirectStandardError $errorLog
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
        if (Test-Listening $port) {
            return $process
        }
        if ($process.HasExited) {
            break
        }
        Start-Sleep -Milliseconds 300
    }
    Stop-Tree $process
    $detail = ""
    if (Test-Path $errorLog) {
        $detail = (Get-Content $errorLog -Raw -ErrorAction SilentlyContinue)
        $detail = "$detail".Trim()
    }
    if ($detail) {
        throw "Não consegui abrir o acesso ao banco. $detail"
    }
    throw "Não consegui abrir o acesso ao banco na porta $port."
}

function Install-Frontend {
    Write-Host "Conferindo dependências do site..."
    Push-Location (Join-Path $root "frontend")
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Não consegui instalar as dependências do site."
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Quer atualizar o código antes de rodar?"
Write-Host "1 - Sim"
Write-Host "2 - Não"
$choice = Read-Host "Digite 1 ou 2"
if ($choice -ne "1" -and $choice -ne "2") {
    Write-Host "Escolha inválida. Nada foi iniciado."
    exit 1
}

if (Test-Listening 8003) {
    Write-Host "A porta 8003 já está em uso. Feche o backend que estiver rodando e tente de novo."
    exit 1
}
if (Test-Listening 5175) {
    Write-Host "A porta 5175 já está em uso. Feche o site que estiver rodando e tente de novo."
    exit 1
}

$tunnel = $null
try {
    if ($choice -eq "1") {
        Update-Code
    }
    else {
        Write-Host "Seguindo com o código que já está aqui."
    }
    Install-Backend
    $tunnel = Start-DatabaseTunnel 5434
    Update-Database
    Install-Frontend
}
catch {
    Stop-Tree $tunnel
    Write-Host $_.Exception.Message
    exit 1
}

$python = Join-Path $root "backend\.venv\Scripts\python.exe"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class DevJob {
    public const uint KillOnJobClose = 0x2000;

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public System.UIntPtr MinimumWorkingSetSize;
        public System.UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public System.UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public System.UIntPtr ProcessMemoryLimit;
        public System.UIntPtr JobMemoryLimit;
        public System.UIntPtr PeakProcessMemoryUsed;
        public System.UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateJobObject(IntPtr attributes, string name);

    [DllImport("kernel32.dll")]
    public static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll")]
    public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string applicationName,
        string commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref STARTUPINFO startupInfo,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr handle);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public IntPtr lpReserved;
        public IntPtr lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }
}
"@

$job = [DevJob]::CreateJobObject([IntPtr]::Zero, $null)
if ($job -eq [IntPtr]::Zero) {
    Stop-Tree $tunnel
    Write-Host "Não foi possível preparar o encerramento dos processos."
    exit 1
}

$extended = New-Object DevJob+JOBOBJECT_EXTENDED_LIMIT_INFORMATION
$basic = New-Object DevJob+JOBOBJECT_BASIC_LIMIT_INFORMATION
$basic.LimitFlags = [DevJob]::KillOnJobClose
$extended.BasicLimitInformation = $basic
$size = [Runtime.InteropServices.Marshal]::SizeOf($extended)
$pointer = [Runtime.InteropServices.Marshal]::AllocHGlobal($size)
try {
    [Runtime.InteropServices.Marshal]::StructureToPtr($extended, $pointer, $false)
    $configured = [DevJob]::SetInformationJobObject($job, 9, $pointer, [uint32]$size)
}
finally {
    [Runtime.InteropServices.Marshal]::FreeHGlobal($pointer)
}
if (-not $configured) {
    Stop-Tree $tunnel
    Write-Host "Não foi possível preparar o encerramento dos processos."
    exit 1
}
if ($null -ne $tunnel -and -not $tunnel.HasExited) {
    $tunnelAssigned = [DevJob]::AssignProcessToJobObject($job, $tunnel.Handle)
    if (-not $tunnelAssigned) {
        Stop-Tree $tunnel
        Write-Host "Não foi possível ligar o acesso ao banco ao encerramento da janela."
        exit 1
    }
}

function Start-Dev($file, $arguments, $directory, [switch] $NewWindow, $WindowTitle) {
    if ($NewWindow) {
        $tail = ($arguments | ForEach-Object { $_ }) -join " "
        $command = "`"$file`" $tail"
        $startup = New-Object DevJob+STARTUPINFO
        $startup.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
        $startup.lpTitle = $WindowTitle
        $startup.dwFlags = 1
        $startup.wShowWindow = 1
        $created = New-Object DevJob+PROCESS_INFORMATION
        $ok = [DevJob]::CreateProcess(
            $file,
            $command,
            [IntPtr]::Zero,
            [IntPtr]::Zero,
            $false,
            16,
            [IntPtr]::Zero,
            $directory,
            [ref] $startup,
            [ref] $created
        )
        if (-not $ok) {
            throw "Não foi possível abrir o backend."
        }
        $process = [Diagnostics.Process]::GetProcessById($created.dwProcessId)
        $assigned = [DevJob]::AssignProcessToJobObject($job, $created.hProcess)
        [DevJob]::CloseHandle($created.hThread) | Out-Null
        [DevJob]::CloseHandle($created.hProcess) | Out-Null
        if (-not $assigned) {
            Stop-Tree $process
            throw "Não foi possível ligar o processo ao encerramento da janela."
        }
        return $process
    }
    $process = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $directory -PassThru -NoNewWindow
    $assigned = [DevJob]::AssignProcessToJobObject($job, $process.Handle)
    if (-not $assigned) {
        Stop-Tree $process
        throw "Não foi possível ligar o processo ao encerramento da janela."
    }
    return $process
}

function Start-Backend {
    Start-Dev $python @("-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8003") (Join-Path $root "backend") -NewWindow -WindowTitle "Sistemaponto - backend"
}

$backend = $null
$frontend = $null
try {
    $backend = Start-Backend
    $frontend = Start-Dev "$env:ComSpec" @("/c", "npm run dev") (Join-Path $root "frontend")
    Write-Host ""
    Write-Host "Backend: http://127.0.0.1:8003"
    Write-Host "Site:    http://localhost:5175"
    Write-Host ""
    Write-Host "O backend fica em outra janela, e o log dele aparece lá."
    Write-Host "Se essa janela fechar, ela abre de novo."
    Write-Host "Feche esta janela para encerrar o site, o backend e o acesso ao banco."
    Write-Host ""
    while (-not $frontend.HasExited) {
        if ($null -eq $backend -or $backend.HasExited) {
            Write-Host "Backend encerrou. Abrindo de novo..."
            Start-Sleep -Seconds 1
            if ($frontend.HasExited) {
                break
            }
            try {
                $backend = Start-Backend
            }
            catch {
                Write-Host $_.Exception.Message
                $backend = $null
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Stop-Tree $backend
    Stop-Tree $frontend
    Stop-Tree $tunnel
}
