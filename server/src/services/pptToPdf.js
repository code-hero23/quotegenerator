const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Converts a PPTX presentation directly to PDF.
 * - On Windows: Uses PowerPoint COM (native Office export) with fallback to LibreOffice.
 * - On Linux (Ubuntu): Uses headless LibreOffice (`soffice` / `libreoffice`).
 * 
 * @param {string} pptxPath - Absolute path to source .pptx file
 * @param {string} pdfPath - Destination absolute path for .pdf file
 * @returns {Promise<{ success: boolean, fileSize: number, error?: string }>}
 */
async function convertPptxToPdf(pptxPath, pdfPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(pptxPath)) {
      return resolve({ success: false, error: `PPTX source file does not exist: ${pptxPath}` });
    }

    const destDir = path.dirname(pdfPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Windows PowerPoint COM converter
    if (process.platform === 'win32') {
      convertWithPowerPointCom(pptxPath, pdfPath)
        .then(res => {
          if (res.success) return resolve(res);
          console.warn('⚠️ PowerPoint COM failed, attempting LibreOffice fallback on Windows...');
          convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
        })
        .catch(() => {
          convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
        });
    } else {
      // Linux / Ubuntu: Headless LibreOffice
      convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
    }
  });
}

/**
 * Converts PPTX to PDF using PowerPoint COM (Windows only)
 */
function convertWithPowerPointCom(pptxPath, pdfPath) {
  return new Promise((resolve) => {
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
  $pres = $ppt.Presentations.Open($SourcePath, -1, 0, 0)
  Write-Output "Presentation opened successfully. Slide count: $($pres.Slides.Count)"

  $destDir = Split-Path -Path $DestinationPath -Parent
  if (-not (Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }

  Write-Output "Exporting to PDF: $DestinationPath"
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
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null } catch {}
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

    execFile('powershell.exe', args, { timeout: 120000 }, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      } catch (e) {}

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

/**
 * Converts PPTX to PDF using LibreOffice Headless (Linux & Windows)
 */
function convertWithLibreOffice(pptxPath, pdfPath) {
  return new Promise((resolve) => {
    const destDir = path.dirname(pdfPath);
    const absPptx = path.resolve(pptxPath);
    const baseName = path.basename(absPptx, path.extname(absPptx));
    const expectedOutput = path.join(destDir, `${baseName}.pdf`);

    // Commands to try in order
    const commands = process.platform === 'win32'
      ? ['soffice', 'libreoffice', '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"']
      : ['libreoffice', 'soffice'];

    console.log(`🔄 Launching LibreOffice headless conversion for: ${path.basename(pptxPath)}...`);

    function tryCommand(index) {
      if (index >= commands.length) {
        return resolve({ 
          success: false, 
          error: 'Neither PowerPoint COM nor LibreOffice (soffice) could convert PPTX to PDF. Install LibreOffice on your VPS: sudo apt install -y libreoffice-impress' 
        });
      }

      const bin = commands[index];
      const cmd = `${bin} --headless --convert-to pdf --outdir "${destDir}" "${absPptx}"`;

      exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
        // If LibreOffice produced the PDF
        let foundPath = fs.existsSync(pdfPath) ? pdfPath : (fs.existsSync(expectedOutput) ? expectedOutput : null);

        if (foundPath && fs.statSync(foundPath).size > 0) {
          if (foundPath !== pdfPath) {
            try {
              fs.renameSync(foundPath, pdfPath);
            } catch (rErr) {
              fs.copyFileSync(foundPath, pdfPath);
            }
          }
          const size = fs.statSync(pdfPath).size;
          console.log(`✅ LibreOffice converted PPTX to PDF successfully (${(size / (1024 * 1024)).toFixed(2)} MB)`);
          return resolve({ success: true, fileSize: size });
        } else {
          // Try next command
          tryCommand(index + 1);
        }
      });
    }

    tryCommand(0);
  });
}

module.exports = { convertPptxToPdf };
