Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Join-Path (Get-Location) "public\logo.png"))
$bmp = New-Object System.Drawing.Bitmap(64, 64)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 64, 64)
$g.Dispose()

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite((Join-Path (Get-Location) "public\favicon.ico"))
$icon.Save($fs)
$fs.Close()
Copy-Item "public\favicon.ico" -Destination "app_icon.ico" -Force
Write-Host "Icone générée avec succès : public\favicon.ico et app_icon.ico"
