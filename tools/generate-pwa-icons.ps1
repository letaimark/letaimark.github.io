$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDirectory = Join-Path $projectRoot "icons"
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null

function New-RoundedPath {
  param(
    [System.Drawing.RectangleF]$Bounds,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Bounds.Left, $Bounds.Top, $diameter, $diameter, 180, 90)
  $path.AddArc($Bounds.Right - $diameter, $Bounds.Top, $diameter, $diameter, 270, 90)
  $path.AddArc($Bounds.Right - $diameter, $Bounds.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Bounds.Left, $Bounds.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-RitmusIcon {
  param(
    [int]$Size,
    [string]$FileName,
    [bool]$Maskable = $false
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#B7ED55"))

    $cardRatio = if ($Maskable) { 0.48 } else { 0.60 }
    $cardSize = [float]($Size * $cardRatio)
    $cardOffset = [float](($Size - $cardSize) / 2)
    $cardBounds = [System.Drawing.RectangleF]::new($cardOffset, $cardOffset, $cardSize, $cardSize)
    $cardPath = New-RoundedPath -Bounds $cardBounds -Radius ([float]($cardSize * 0.24))
    $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#FBFAF6"))
    $cardPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#17211B"), [float]([Math]::Max(2, $Size * 0.018)))

    $graphics.FillPath($cardBrush, $cardPath)
    $graphics.DrawPath($cardPen, $cardPath)

    $barWidth = [float]($cardSize * 0.13)
    $gap = [float]($cardSize * 0.055)
    $barBottom = [float]($cardOffset + $cardSize * 0.77)
    $totalWidth = ($barWidth * 3) + ($gap * 2)
    $barStart = [float](($Size - $totalWidth) / 2)
    $barHeights = @(($cardSize * 0.27), ($cardSize * 0.48), ($cardSize * 0.36))
    $barColors = @("#17211B", "#669535", "#17211B")

    for ($index = 0; $index -lt 3; $index++) {
      $height = [float]$barHeights[$index]
      $barBounds = [System.Drawing.RectangleF]::new(
        [float]($barStart + (($barWidth + $gap) * $index)),
        [float]($barBottom - $height),
        $barWidth,
        $height
      )
      $barPath = New-RoundedPath -Bounds $barBounds -Radius ([float]($barWidth / 2))
      $barBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($barColors[$index]))
      $graphics.FillPath($barBrush, $barPath)
      $barBrush.Dispose()
      $barPath.Dispose()
    }

    $outputPath = Join-Path $iconDirectory $FileName
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    if ($null -ne $cardPen) { $cardPen.Dispose() }
    if ($null -ne $cardBrush) { $cardBrush.Dispose() }
    if ($null -ne $cardPath) { $cardPath.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

New-RitmusIcon -Size 192 -FileName "icon-192.png"
New-RitmusIcon -Size 512 -FileName "icon-512.png"
New-RitmusIcon -Size 512 -FileName "icon-maskable-512.png" -Maskable $true
New-RitmusIcon -Size 180 -FileName "apple-touch-icon.png"

Write-Output "Generated PWA icons in $iconDirectory"
