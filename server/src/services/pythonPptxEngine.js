const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const PptxEngine = require('./pptxEngine');

class PythonPptxEngine {
  constructor(masterTemplatePath) {
    this.masterTemplatePath = masterTemplatePath;
    this.nodeFallbackEngine = new PptxEngine(masterTemplatePath);
  }

  async generate(options) {
    const scriptPath = path.resolve(__dirname, '../scripts/generate_ppt.py');
    const tempPayloadPath = path.resolve(__dirname, `../../uploads/temp_payload_${Date.now()}.json`);

    const payload = {
      masterTemplatePath: this.masterTemplatePath,
      outputPath: options.outputPath,
      selectedVariantIds: options.selectedVariantIds,
      allVariants: options.allVariants,
      clientInfo: options.clientInfo,
      repInfo: options.repInfo,
      snips: options.snips || {}
    };

    fs.writeFileSync(tempPayloadPath, JSON.stringify(payload, null, 2));

    return new Promise((resolve, reject) => {
      const pythonBin = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
      const pythonProcess = spawn(pythonBin, [scriptPath, tempPayloadPath]);
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      pythonProcess.on('error', async (err) => {
        console.warn('⚠️ Python is not available or failed to spawn. Falling back to Node.js JSZip engine:', err.message);
        try {
          if (fs.existsSync(tempPayloadPath)) fs.unlinkSync(tempPayloadPath);
          const fallbackResult = await this.nodeFallbackEngine.generate(options);
          resolve(fallbackResult);
        } catch (fbErr) {
          reject(fbErr);
        }
      });

      pythonProcess.on('close', async (code) => {
        if (fs.existsSync(tempPayloadPath)) {
          fs.unlinkSync(tempPayloadPath);
        }

        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch (e) {
            resolve({
              filePath: options.outputPath,
              fileSize: fs.existsSync(options.outputPath) ? fs.statSync(options.outputPath).size : 0
            });
          }
        } else {
          console.warn(`⚠️ Python process exited with code ${code}. Stderr: ${stderr}. Falling back to Node.js JSZip engine...`);
          try {
            const fallbackResult = await this.nodeFallbackEngine.generate(options);
            resolve(fallbackResult);
          } catch (fbErr) {
            reject(new Error(`Python failed and fallback failed: ${fbErr.message}`));
          }
        }
      });
    });
  }
}

module.exports = PythonPptxEngine;
