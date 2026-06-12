Add-Type -AssemblyName System.IO.Compression.FileSystem

$apk = "c:\Users\ERKAN\Desktop\proje\android\app\build\outputs\apk\debug\app-debug.apk"
$zip = [System.IO.Compression.ZipFile]::OpenRead($apk)

Write-Host "============================================"
Write-Host "  APK ICINDEKI EN BUYUK 20 DOSYA"
Write-Host "============================================"
$zip.Entries | Sort-Object Length -Descending | Select-Object -First 20 | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 1)
    Write-Host ("{0,10} KB  {1}" -f $sizeKB, $_.FullName)
}

Write-Host ""
Write-Host "============================================"
Write-Host "  assets/public/ KLASORU - TUM DOSYALAR"
Write-Host "============================================"
$zip.Entries | Where-Object { $_.FullName -like "assets/public/*" -and -not $_.Name.EndsWith("/") } | Sort-Object Length -Descending | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 1)
    Write-Host ("{0,10} KB  {1}" -f $sizeKB, $_.FullName)
}

Write-Host ""
Write-Host "============================================"
Write-Host "  UZANTI BAZINDA TOPLAM BOYUTLAR"
Write-Host "============================================"
$zip.Entries | Where-Object { -not $_.Name.EndsWith("/") } | Group-Object { 
    $ext = [System.IO.Path]::GetExtension($_.Name)
    if ($ext -eq "") { "(uzantısız)" } else { $ext.ToLower() }
} | Sort-Object { ($_.Group | Measure-Object Length -Sum).Sum } -Descending | ForEach-Object {
    $totalKB = [math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1KB, 1)
    $totalMB = [math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1MB, 1)
    $count = $_.Count
    Write-Host ("{0,10} KB ({1,6} MB)  {2,5} dosya  {3}" -f $totalKB, $totalMB, $count, $_.Name)
}

$zip.Dispose()
