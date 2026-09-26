param(
    [string]$KbIndexPath,
    [switch]$Check
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$websiteRoot = Split-Path -Parent $PSScriptRoot

if (-not $KbIndexPath) {
    $brainRoot = (Resolve-Path -LiteralPath (Join-Path $websiteRoot '..\..\..')).Path
    $KbIndexPath = Join-Path $brainRoot 'Projects\Active\Knowledge Base - Modrn Mind\index.md'
}

$kbIndex = [IO.File]::ReadAllText(
    (Resolve-Path -LiteralPath $KbIndexPath).Path,
    [Text.Encoding]::UTF8
)

$countMatch = [regex]::Match(
    $kbIndex,
    '\*\*Total entries:\*\*\s+(\d+)\s+\((\d+)\s+sources,\s+(\d+)\s+concepts,\s+(\d+)\s+methods\)'
)

$dateMatch = [regex]::Match($kbIndex, 'Generated\s+(\d{4}-\d{2}-\d{2})\.')

if (-not $countMatch.Success -or -not $dateMatch.Success) {
    throw 'Could not read counts or generated date from the KB index.'
}

$total = $countMatch.Groups[1].Value
$sources = $countMatch.Groups[2].Value
$concepts = $countMatch.Groups[3].Value
$methods = $countMatch.Groups[4].Value
$releaseDate = $dateMatch.Groups[1].Value
$releaseMonth = [datetime]::ParseExact(
    $releaseDate,
    'yyyy-MM-dd',
    [Globalization.CultureInfo]::InvariantCulture
).ToString('MMMM yyyy', [Globalization.CultureInfo]::InvariantCulture)

$htmlPath = Join-Path $websiteRoot 'index.html'
$html = [IO.File]::ReadAllText($htmlPath, [Text.Encoding]::UTF8)
$updatedHtml = $html
$heroCounts = @{ entries = $total; sources = $sources; concepts = $concepts; methods = $methods }
foreach ($name in $heroCounts.Keys) {
    $pattern = '(<dd data-kb-count="' + $name + '">)\d+(</dd>)'
    if ([regex]::Matches($updatedHtml, $pattern).Count -ne 1) {
        throw "Expected exactly one hero count for $name."
    }
    $value = $heroCounts[$name]
    $updatedHtml = [regex]::Replace(
        $updatedHtml,
        $pattern,
        { param($match) $match.Groups[1].Value + $value + $match.Groups[2].Value }
    )
}
$updatedHtml = [regex]::Replace($updatedHtml, '\b\d+\+? sources from cognitive science', "$sources sources from cognitive science")
$updatedHtml = [regex]::Replace($updatedHtml, 'containing \d+\+? entries \(concepts, methods, sources\)', "containing $total entries (concepts, methods, sources)")
$updatedHtml = [regex]::Replace($updatedHtml, 'with all \d+\+? entries', "with all $total entries")
$updatedHtml = [regex]::Replace(
    $updatedHtml,
    '\b\d+\+? entries: \d+ concepts, \d+ methods, and \d+ sources\.',
    "$total entries: $concepts concepts, $methods methods, and $sources sources."
)
$updatedHtml = [regex]::Replace(
    $updatedHtml,
    '("dateModified": ")\d{4}-\d{2}-\d{2}(")',
    { param($match) $match.Groups[1].Value + $releaseDate + $match.Groups[2].Value }
)
$updatedHtml = [regex]::Replace($updatedHtml, 'Current release: [A-Za-z]+ \d{4}\.', "Current release: $releaseMonth.")

$sitemapPath = Join-Path $websiteRoot 'sitemap.xml'
$sitemap = [IO.File]::ReadAllText($sitemapPath, [Text.Encoding]::UTF8)
$updatedSitemap = [regex]::Replace($sitemap, '<lastmod>\d{4}-\d{2}-\d{2}</lastmod>', "<lastmod>$releaseDate</lastmod>")

if ($Check) {
    if ($updatedHtml -cne $html -or $updatedSitemap -cne $sitemap) {
        throw 'Website counts or release date are out of sync with the KB index.'
    }

    Write-Output "Website is in sync: $total entries ($sources sources, $concepts concepts, $methods methods), $releaseDate."
    exit 0
}

$utf8NoBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($htmlPath, $updatedHtml, $utf8NoBom)
[IO.File]::WriteAllText($sitemapPath, $updatedSitemap, $utf8NoBom)

Write-Output "Updated website: $total entries ($sources sources, $concepts concepts, $methods methods), $releaseDate."
