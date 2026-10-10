const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Converts a PPTX presentation to PDF using PowerPoint COM (Office)
 * 
 * @param {string} pptxPath - Absolute path to .pptx file
 * @param {string} pdfPath - Destination absolute path for .pdf file
 * @returns {Promise<{ success: boolean, fileSize: number, error?: string }>}
 */
async function convertPptxToPdf(pptxPath, pdfPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Platform is not Windows' });
    }

    if (!fs.existsSync(pptxPath)) {
      return resolve({ success: false, error: `PPTX source file does not exist: ${pptxPath}` });
    }

    // Temporary ps1 script to eliminate any cmd/quoting/escaping issues
    const scriptPath = path.join(os.tmpdir(), `ppt2pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.ps1`);
    const scriptContent = `
param(
  [Parameter(Mandatory=$true)][string]$SourcePath,
  [Parameter(Mandatory=$true)][string]$DestinationPath
)

$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null

try {
  Write-Output "Initializing PowerPoint COM..."
  $ppt = New-Object -ComObject PowerPoint.Application

  Write-Output "Opening presentation: $SourcePath"
  # Presentations.Open(FileName, ReadOnly, Untitled, WithWindow)
  # -1 = msoTrue, 0 = msoFalse
  $pres = $ppt.Presentations.Open($SourcePath, -1, 0, 0)
  Write-Output "Presentation opened successfully. Slide count: $($pres.Slides.Count)"

  # Ensure destination directory exists
  $destDir = Split-Path -Path $DestinationPath -Parent
  if (-not (Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }

  Write-Output "Exporting to PDF: $DestinationPath"
  # 32 = ppSaveAsPDF
  $pres.SaveAs($DestinationPath, 32)
  Write-Output "PDF export completed."

  $pres.Close()
  $pres = $null
  $ppt.Quit()
  $ppt = $null
  Write-Output "SUCCESS"
} catch {
  Write-Error "PowerPoint Error: $($_.Exception.Message)"
  exit 1
} finally {
  if ($pres -ne $null) {
    try { $pres.Close() } catch {}
  }
  if ($ppt -ne $null) {
    try { $ppt.Quit() } catch {}
    try { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null } catch {}
  }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
`.trim();

    try {
      fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    } catch (writeErr) {
      return resolve({ success: false, error: `Failed to write conversion script: ${writeErr.message}` });
    }

    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-SourcePath', path.resolve(pptxPath),
      '-DestinationPath', path.resolve(pdfPath)
    ];

    console.log(`🔄 Launching PowerPoint COM export for: ${path.basename(pptxPath)}...`);

    execFile('powershell.exe', args, { timeout: 60000 }, (error, stdout, stderr) => {
      // Clean up temp script
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      } catch (e) {}

      if (stdout) console.log(`[PowerPoint COM]:\n${stdout.trim()}`);
      if (stderr) console.warn(`[PowerPoint COM Stderr]:\n${stderr.trim()}`);

      if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
        const size = fs.statSync(pdfPath).size;
        console.log(`✅ PowerPoint converted PPTX to PDF successfully (${(size / (1024 * 1024)).toFixed(2)} MB)`);
        resolve({ success: true, fileSize: size });
      } else {
        const errDetail = stderr || stdout || error?.message || 'Unknown PowerPoint conversion error';
        console.warn(`⚠️ PowerPoint COM conversion failed: ${errDetail}`);
        resolve({ success: false, error: errDetail });
      }
    });
  });
}

module.exports = { convertPptxToPdf };
