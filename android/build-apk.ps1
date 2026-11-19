# Builds the signed release APK.
#
#   .\build-apk.ps1            -> release APK, signed with the release key
#   .\build-apk.ps1 -Debug     -> debug APK (installable beside the release)
#
# The signing key and its passwords live in keys\release-signing.env, which
# is never committed. Back the keystore up: without the same key, a new APK
# cannot replace the one already on the tablet.
param([switch]$Debug)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- the signing material -------------------------------------------------
$envFile = Join-Path $here 'keys\release-signing.env'
if (-not (Test-Path $envFile)) {
    throw "No signing material. Expected $envFile"
}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $split = $line.IndexOf('=')
    if ($split -lt 0) { return }
    $name = $line.Substring(0, $split).Trim()
    $value = $line.Substring($split + 1).Trim()
    Set-Item -Path "env:$name" -Value $value
}

# --- a JDK new enough for the Android build -------------------------------
# Gradle picks JAVA_HOME, and the `java` on the PATH can be an old one.
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    foreach ($candidate in @('C:\tools\jdk-21.0.12.1+1', 'C:\Program Files\Android\Android Studio\jbr')) {
        if (Test-Path (Join-Path $candidate 'bin\java.exe')) {
            $env:JAVA_HOME = $candidate
            break
        }
    }
}
if (-not $env:JAVA_HOME) { throw 'No JDK found. Set JAVA_HOME to a JDK 17 or newer.' }

# --- build ----------------------------------------------------------------
Push-Location $here
try {
    $task = if ($Debug) { 'assembleDebug' } else { 'assembleRelease' }
    & (Join-Path $here 'gradlew.bat') $task
    if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

$apk = if ($Debug) {
    Join-Path $here 'app\build\outputs\apk\debug\app-debug.apk'
} else {
    Join-Path $here 'app\build\outputs\apk\release\app-release.apk'
}
if (-not (Test-Path $apk)) { throw "The build reported success but $apk is missing." }

"APK: $apk ({0:N0} KB)" -f ((Get-Item $apk).Length / 1KB)
