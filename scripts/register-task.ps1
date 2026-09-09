#Requires -Version 5.1
<#
  注册 Windows 计划任务：每天自动抓取并发布云南公考编招数据
  由「注册每日自动更新.bat」调用，也可直接在 PowerShell 里运行。
#>

param(
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$Root    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$BatPath = Join-Path $Root 'scripts\daily-update.bat'
$TaskName = '云南公考编招-每日更新'

# ---------- 卸载分支 ----------
if ($Uninstall) {
    Write-Host ""
    $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $t) {
        Write-Host "  任务不存在，无需卸载。" -ForegroundColor Yellow
    } else {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "  已删除计划任务: $TaskName" -ForegroundColor Green
    }
    Write-Host ""
    Read-Host "按回车键关闭"
    exit 0
}

# ---------- 注册分支 ----------
if (-not (Test-Path $BatPath)) {
    Write-Host "找不到脚本: $BatPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  注册每日自动更新任务" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  项目目录: $Root"
Write-Host "  执行脚本: $BatPath"
Write-Host "  触发时间: 每天 08:00 与 20:00"
Write-Host ""

$action = New-ScheduledTaskAction `
    -Execute 'cmd.exe' `
    -Argument "/c `"$BatPath`"" `
    -WorkingDirectory $Root

$triggers = @(
    (New-ScheduledTaskTrigger -Daily -At '08:00'),
    (New-ScheduledTaskTrigger -Daily -At '20:00')
)

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 10)

# 断网时不必跑（抓取必然失败）
$settings.RunOnlyIfNetworkAvailable = $true
$settings.DisallowStartIfOnBatteries = $false
$settings.Hidden = $false

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $triggers `
        -Settings $settings `
        -Description '每天 08:00 与 20:00 抓取云南公考编招 20 个官方数据源并发布到 GitHub Pages' `
        -Force | Out-Null

    Write-Host "  注册成功。" -ForegroundColor Green
} catch {
    Write-Host "  注册失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  如果提示权限不足，请右键「注册每日自动更新.bat」选择以管理员身份运行。" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  任务名称: $TaskName"
Write-Host ""

# 回显确认
$t = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($t) {
    Write-Host "  当前状态: $($t.State)"
    $t.Triggers | ForEach-Object {
        Write-Host ("  触发点: " + $_.StartBoundary)
    }
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  已就绪，每天自动更新。" -ForegroundColor Green
    Write-Host ""
    Write-Host "  想立刻试跑一次？在 PowerShell 里执行："
    Write-Host "    Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "  运行日志会写在: $Root\logs\"
    Write-Host "============================================" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "按回车键关闭"
