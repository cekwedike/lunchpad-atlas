$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function New-AtlasNotificationIcon {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][bool]$Colored
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $gold = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
  $goldBrush = if ($Colored) { $gold } else { $white }

  $font = New-Object System.Drawing.Font 'Arial Black', 64, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  # Main "A"
  $rect = New-Object System.Drawing.RectangleF 0, -2, $Size, $Size
  $g.DrawString('A', $font, $white, $rect, $fmt)

  # Underline
  $uW = [int]($Size * 0.62)
  $uH = [int]([Math]::Max(6, $Size * 0.08))
  $uX = [int](($Size - $uW) / 2)
  $uY = [int]($Size * 0.78)
  $g.FillRectangle($goldBrush, $uX, $uY, $uW, $uH)

  # 5-point star (10 vertices alternating radii)
  $cx = [double]($Size * 0.74)
  $cy = [double]($Size * 0.23)
  $r1 = [double]($Size * 0.16)
  $r2 = [double]($Size * 0.07)

  $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($i = 0; $i -lt 10; $i++) {
    $ang = (-90 + $i * 36) * [Math]::PI / 180
    $r = if (($i % 2) -eq 0) { $r1 } else { $r2 }
    $x = [single]($cx + $r * [Math]::Cos($ang))
    $y = [single]($cy + $r * [Math]::Sin($ang))
    [void]$pts.Add([System.Drawing.PointF]::new($x, $y))
  }
  $g.FillPolygon($goldBrush, $pts.ToArray())

  $outDir = Split-Path -Parent $Path
  if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
  }

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-AtlasNotificationIcon -Path 'frontend/public/icons/notification-icon-96.png' -Size 96 -Colored $true
New-AtlasNotificationIcon -Path 'frontend/public/icons/notification-badge-96.png' -Size 96 -Colored $false

Write-Host 'Generated notification icon assets.'

