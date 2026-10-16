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

if (Test-Listening 8003) {
    Write-Host "A porta 8003 já está em uso. Feche o backend que estiver rodando e tente de novo."
    exit 1
}
if (Test-Listening 5175) {
    Write-Host "A porta 5175 já está em uso. Feche o site que estiver rodando e tente de novo."
    exit 1
}

$python = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Não encontrei backend\.venv. Crie o ambiente e instale as dependências antes de rodar."
    exit 1
}
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Write-Host "Não encontrei frontend\node_modules. Rode npm install na pasta frontend antes de rodar."
    exit 1
}

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
}
"@

$job = [DevJob]::CreateJobObject([IntPtr]::Zero, $null)
if ($job -eq [IntPtr]::Zero) {
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
    Write-Host "Não foi possível preparar o encerramento dos processos."
    exit 1
}

function Start-Dev($file, $arguments, $directory) {
    $process = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $directory -PassThru -NoNewWindow
    $assigned = [DevJob]::AssignProcessToJobObject($job, $process.Handle)
    if (-not $assigned) {
        Stop-Tree $process
        throw "Não foi possível ligar o processo ao encerramento da janela."
    }
    return $process
}

$backend = $null
$frontend = $null
try {
    $backend = Start-Dev $python @("-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8003") (Join-Path $root "backend")
    $frontend = Start-Dev "$env:ComSpec" @("/c", "npm run dev") (Join-Path $root "frontend")
    Write-Host ""
    Write-Host "Backend: http://127.0.0.1:8003"
    Write-Host "Site:    http://localhost:5175"
    Write-Host ""
    Write-Host "Feche esta janela para encerrar os dois."
    Write-Host ""
    while (-not $backend.HasExited -and -not $frontend.HasExited) {
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Stop-Tree $backend
    Stop-Tree $frontend
}
