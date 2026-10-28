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

    // Windows: PowerPoint COM -> ONLYOFFICE -> LibreOffice
    if (process.platform === 'win32') {
      convertWithPowerPointCom(pptxPath, pdfPath)
        .then(res => {
          if (res && res.success) return res;
          console.warn('⚠️ PowerPoint COM failed, attempting ONLYOFFICE fallback on Windows...');
          return convertWithOnlyOffice(pptxPath, pdfPath);
        })
        .then(res => {
          if (res && res.success) return res;
          console.warn('⚠️ ONLYOFFICE failed, attempting LibreOffice fallback on Windows...');
          return convertWithLibreOffice(pptxPath, pdfPath);
        })
        .then(resolve)
        .catch(() => {
          convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
        });
    } else {
      // Linux / Ubuntu: Use ONLYOFFICE Document Builder if installed, otherwise go directly to LibreOffice
      if (hasOnlyOfficeBuilder()) {
        convertWithOnlyOffice(pptxPath, pdfPath)
          .then(res => {
            if (res && res.success) return res;
            return convertWithLibreOffice(pptxPath, pdfPath);
          })
          .then(resolve)
          .catch(() => {
            convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
          });
      } else {
        convertWithLibreOffice(pptxPath, pdfPath).then(resolve);
      }
    }
  });
}

function hasOnlyOfficeBuilder() {
  const candidatePaths = process.platform === 'win32'
    ? ['C:\\Program Files\\ONLYOFFICE\\DocumentBuilder\\docbuilder.exe']
    : ['/usr/bin/docbuilder', '/opt/onlyoffice/documentbuilder/docbuilder'];
  return candidatePaths.some(p => fs.existsSync(p));
}

/**
 * Converts PPTX to PDF using ONLYOFFICE Document Builder (docbuilder)
 * Native OOXML engine provides exact 1:1 presentation layouts and font fidelity.
 */
function convertWithOnlyOffice(pptxPath, pdfPath) {
  return new Promise((resolve) => {
    const absPptx = path.resolve(pptxPath);
    const absPdf = path.resolve(pdfPath);
    const destDir = path.dirname(absPdf);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const builderCommands = process.platform === 'win32'
      ? ['docbuilder', '"C:\\Program Files\\ONLYOFFICE\\DocumentBuilder\\docbuilder.exe"']
      : ['docbuilder', '/usr/bin/docbuilder', '/opt/onlyoffice/documentbuilder/docbuilder'];

    const scriptPath = path.join(os.tmpdir(), `builder_${Date.now()}_${Math.random().toString(36).substring(7)}.docbuilder`);
    const scriptContent = [
      `builder.OpenFile("${absPptx.replace(/\\/g, '/')}");`,
      `builder.SaveFile("pdf", "${absPdf.replace(/\\/g, '/')}");`,
      `builder.CloseFile();`
    ].join('\n');

    try {
      fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    } catch (writeErr) {
      return resolve({ success: false, error: `Failed to write docbuilder script: ${writeErr.message}` });
    }

    console.log(`🔄 Launching ONLYOFFICE Document Builder for: ${path.basename(pptxPath)}...`);

    function tryBuilder(index) {
      if (index >= builderCommands.length) {
        try { if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath); } catch (e) {}
        return resolve({ success: false, error: 'ONLYOFFICE docbuilder binary not found on system.' });
      }

      const bin = builderCommands[index];
      const cmd = `${bin} "${scriptPath}"`;

      exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
        if (fs.existsSync(absPdf) && fs.statSync(absPdf).size > 0) {
          const size = fs.statSync(absPdf).size;
          console.log(`✅ ONLYOFFICE Document Builder converted PPTX to PDF successfully (${(size / (1024 * 1024)).toFixed(2)} MB)`);
          try { if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath); } catch (e) {}
          return resolve({ success: true, fileSize: size });
        } else {
          tryBuilder(index + 1);
        }
      });
    }

    tryBuilder(0);
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

    // Create an isolated UserInstallation profile to avoid process locking, crashed session recovery, or shared profile collisions
    const userProfileDir = path.join(os.tmpdir(), `lo_prof_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const normalizedProfilePath = userProfileDir.replace(/\\/g, '/');
    const profileUri = normalizedProfilePath.startsWith('/')
      ? `file://${normalizedProfilePath}`
      : `file:///${normalizedProfilePath}`;

    const cleanupProfile = () => {
      try {
        if (fs.existsSync(userProfileDir)) {
          fs.rmSync(userProfileDir, { recursive: true, force: true });
        }
      } catch (e) {}
    };

    function tryCommand(index) {
      if (index >= commands.length) {
        cleanupProfile();
        return resolve({ 
          success: false, 
          error: 'Neither PowerPoint COM nor LibreOffice (soffice) could convert PPTX to PDF. Ensure LibreOffice is installed: sudo apt install -y libreoffice-impress' 
        });
      }

      const bin = commands[index];
      // Use impress_pdf_Export to explicitly invoke the PowerPoint / Impress presentation export engine
      const baseFlags = `--headless --norestore --nodefault --nofirststartwizard -env:UserInstallation="${profileUri}"`;
      const cmd = `${bin} ${baseFlags} --convert-to "pdf:impress_pdf_Export" --outdir "${destDir}" "${absPptx}"`;

      exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
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
          console.log(`✅ LibreOffice converted PPTX to PDF successfully via Impress engine (${(size / (1024 * 1024)).toFixed(2)} MB)`);
          cleanupProfile();
          return resolve({ success: true, fileSize: size });
        } else {
          // Fallback to standard --convert-to pdf filter before trying next binary
          const fallbackCmd = `${bin} ${baseFlags} --convert-to pdf --outdir "${destDir}" "${absPptx}"`;
          exec(fallbackCmd, { timeout: 60000 }, (fErr, fStdout, fStderr) => {
            let fallbackFound = fs.existsSync(pdfPath) ? pdfPath : (fs.existsSync(expectedOutput) ? expectedOutput : null);
            if (fallbackFound && fs.statSync(fallbackFound).size > 0) {
              if (fallbackFound !== pdfPath) {
                try {
                  fs.renameSync(fallbackFound, pdfPath);
                } catch (e) {
                  fs.copyFileSync(fallbackFound, pdfPath);
                }
              }
              const size = fs.statSync(pdfPath).size;
              console.log(`✅ LibreOffice converted PPTX to PDF via fallback filter (${(size / (1024 * 1024)).toFixed(2)} MB)`);
              cleanupProfile();
              return resolve({ success: true, fileSize: size });
            }
            tryCommand(index + 1);
          });
        }
      });
    }

    tryCommand(0);
  });
}

module.exports = { convertPptxToPdf };
