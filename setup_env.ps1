$pyDir = "C:\Users\Krit Kumar\python311"
$pthFile = "$pyDir\python311._pth"

if (Test-Path $pthFile) {
    $txt = [System.IO.File]::ReadAllText($pthFile)
    $txt = $txt -replace '#import site', 'import site'
    [System.IO.File]::WriteAllText($pthFile, $txt)
}

$getPip = "$pyDir\get-pip.py"
if (-not (Test-Path $getPip)) {
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
}

& "$pyDir\python.exe" $getPip --no-warn-script-location
& "$pyDir\Scripts\pip.exe" install -r requirements.txt --no-warn-script-location
