<#
pad_to_size.ps1 - Pad an input file to an exact size.
Usage:
  .\pad_to_size.ps1 -InputPath "index.html" -OutputPath "index_30mb.html" -Size 30M

Size suffixes: K, M, G (powers of 1024)
#>

param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][string]$Size
)

function Parse-Size([string]$s) {
  if (-not $s) { return $null }
  $s = $s.Trim()
  if ($s.Length -eq 0) { return $null }
  $last = $s[-1].ToString().ToUpper()
  $mul = 1
  $num = $s
  switch ($last) {
    'K' { $mul = 1024; $num = $s.Substring(0, $s.Length - 1); break }
    'M' { $mul = 1024 * 1024; $num = $s.Substring(0, $s.Length - 1); break }
    'G' { $mul = 1024 * 1024 * 1024; $num = $s.Substring(0, $s.Length - 1); break }
    default { $mul = 1; $num = $s; break }
  }
  try {
    $n = [double]$num
  } catch {
    return $null
  }
  return [int64]([Math]::Floor($n * $mul))
}

try {
  if (-not (Test-Path -Path $InputPath)) {
    Write-Error "Input file not found: $InputPath"
    exit 2
  }
  $targetBytes = Parse-Size $Size
  if ($null -eq $targetBytes) {
    Write-Error "Invalid size: $Size"
    exit 3
  }

  $enc = [System.Text.Encoding]::UTF8
  $inputBytes = [System.IO.File]::ReadAllBytes($InputPath)
  $curSize = $inputBytes.Length

  Write-Output "Source: $InputPath ($curSize bytes). Target: $targetBytes bytes."

  if ($curSize -ge $targetBytes) {
    Copy-Item -Path $InputPath -Destination $OutputPath -Force
    Write-Output "Source >= target. Copied to $OutputPath."
    exit 0
  }

  $header = "<!-- PADDING START (do not remove) -->`n"
  $footer = "`n<!-- PADDING END -->`n"
  $headerB = $enc.GetBytes($header)
  $footerB = $enc.GetBytes($footer)
  $overhead = $headerB.Length + $footerB.Length

  # try to decode as UTF8 to insert before </body>
  $inserted = $false
  try {
    $inputStr = $enc.GetString($inputBytes)
    $lower = $inputStr.ToLower()
    $bodyIndex = $lower.LastIndexOf("</body>")
    $innerPadSize = $targetBytes - $curSize - $overhead
    if ($innerPadSize -lt 0) { $innerPadSize = 0 }

    if ($bodyIndex -ge 0) {
      $before = $inputStr.Substring(0, $bodyIndex)
      $after = $inputStr.Substring($bodyIndex)
      # build filler as string of spaces (OK for ~30MB)
      $filler = " " * [int]$innerPadSize
      $newContent = $before + $header + $filler + $footer + $after
      $newBytes = $enc.GetBytes($newContent)
      $newLen = $newBytes.Length

      if ($newLen -eq $targetBytes) {
        [System.IO.File]::WriteAllBytes($OutputPath, $newBytes)
        Write-Output "Wrote $newLen bytes (exact)."
        exit 0
      } elseif ($newLen -lt $targetBytes) {
        $need = $targetBytes - $newLen
        $pad = New-Object byte[] $need
        for ($i=0; $i -lt $need; $i++) { $pad[$i] = 0x20 }
        $outMS = New-Object System.IO.MemoryStream
        $outMS.Write($newBytes, 0, $newBytes.Length)
        $outMS.Write($pad, 0, $pad.Length)
        [System.IO.File]::WriteAllBytes($OutputPath, $outMS.ToArray())
        Write-Output "Wrote $($outMS.Length) bytes (padded)."
        exit 0
      } else {
        # too big; fallback to append-only below
        Write-Warning "Insertion produced $newLen bytes (> target). Falling back to append mode."
      }
    }
  } catch {
    Write-Warning "Input seems binary or not UTF8; using append fallback."
  }

  # Append-only fallback: header + spaces + footer appended to original then extra pad if needed
  $inner = $targetBytes - $curSize - $overhead
  if ($inner -lt 0) { $inner = 0 }
  $padBytes = New-Object byte[] $inner
  for ($i=0; $i -lt $padBytes.Length; $i++) { $padBytes[$i] = 0x20 }
  $outMS2 = New-Object System.IO.MemoryStream
  $outMS2.Write($inputBytes, 0, $inputBytes.Length)
  $outMS2.Write($headerB, 0, $headerB.Length)
  $outMS2.Write($padBytes, 0, $padBytes.Length)
  $outMS2.Write($footerB, 0, $footerB.Length)
  $final = $outMS2.ToArray()
  if ($final.Length -lt $targetBytes) {
    $need = $targetBytes - $final.Length
    $more = New-Object byte[] $need
    for ($i=0; $i -lt $need; $i++) { $more[$i] = 0x20 }
    $outMS2.Write($more, 0, $more.Length)
    $final = $outMS2.ToArray()
  } elseif ($final.Length -gt $targetBytes) {
    # truncate (last resort)
    $trunc = New-Object byte[] $targetBytes
    [System.Array]::Copy($final, 0, $trunc, 0, $targetBytes)
    $final = $trunc
  }
  [System.IO.File]::WriteAllBytes($OutputPath, $final)
  Write-Output "Wrote $($final.Length) bytes (append fallback)."
  exit 0

} catch {
  Write-Error "Unexpected error: $_"
  exit 10
}