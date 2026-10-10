const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PptxEngine = require('../services/pptxEngine');
const PythonPptxEngine = require('../services/pythonPptxEngine');
const PdfEngine = require('../services/pdfEngine');
const { convertPptxToPdf } = require('../services/pptToPdf');
const dbService = require('../services/db');

// Ensure uploads directories exist
const uploadsDir = path.resolve(__dirname, '../../uploads');
const generatedDir = path.resolve(uploadsDir, 'generated');
const snipsDir = path.resolve(uploadsDir, 'snips');
[uploadsDir, generatedDir, snipsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Configure Multer storage for quotation snips
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, snipsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `snip_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  }
});

const pdfEngine = new PdfEngine();

// GET /api/quotations - List quotation history
router.get('/', async (req, res) => {
  try {
    const quotations = await dbService.getQuotations();
    res.json({ success: true, count: quotations.length, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/quotations/view/:filename - Preview PDF inline in browser
router.get('/view/:filename', async (req, res) => {
  try {
    const rawParam = req.params.filename;
    let decodedFilename = decodeURIComponent(rawParam);
    let targetFilename = path.basename(decodedFilename);

    let filePath = path.resolve(generatedDir, targetFilename);

    // If missing, check raw param
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(generatedDir, path.basename(rawParam));
    }

    // On-the-fly PDF generation if missing
    if (!fs.existsSync(filePath) && targetFilename.toLowerCase().endsWith('.pdf')) {
      const quotations = await dbService.getQuotations();
      const qtMatch = targetFilename.match(/QT-\d+/i)?.[0];
      const baseSearch = targetFilename.replace(/\.pdf$/i, '');

      const matchingQuote = quotations.find(q => {
        if (qtMatch && q.quotationNumber && q.quotationNumber.toLowerCase() === qtMatch.toLowerCase()) return true;
        if (q.filePath && q.filePath.includes(baseSearch)) return true;
        return false;
      });

      // 1. Convert directly from matching PPTX file
      let matchingPptx = path.resolve(generatedDir, targetFilename.replace(/\.pdf$/i, '.pptx'));
      if (!fs.existsSync(matchingPptx) && matchingQuote?.filePath && fs.existsSync(matchingQuote.filePath)) {
        matchingPptx = matchingQuote.filePath;
      }

      if (fs.existsSync(matchingPptx)) {
        const convRes = await convertPptxToPdf(matchingPptx, filePath);
        if (convRes.success) {
          console.log(`✅ Converted PPTX to PDF directly for view: ${targetFilename}`);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quotations/download/:filename - Download PPTX or PDF with on-the-fly regeneration
router.get('/download/:filename', async (req, res) => {
  try {
    const rawParam = req.params.filename;
    let decodedFilename = decodeURIComponent(rawParam);
    let targetFilename = path.basename(decodedFilename);

    let filePath = path.resolve(generatedDir, targetFilename);

    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(generatedDir, path.basename(rawParam));
    }

    // If PDF is requested and missing, generate on the fly
    if (!fs.existsSync(filePath) && targetFilename.toLowerCase().endsWith('.pdf')) {
      console.log(`🔍 PDF missing for ${targetFilename}, generating on the fly...`);
      const quotations = await dbService.getQuotations();
      const baseSearch = targetFilename.replace(/\.pdf$/i, '');
      const qtMatch = targetFilename.match(/QT-\d+/i)?.[0];

      const matchingQuote = quotations.find(q => {
        if (qtMatch && q.quotationNumber && q.quotationNumber.toLowerCase() === qtMatch.toLowerCase()) return true;
        if (q.filePath && q.filePath.includes(baseSearch)) return true;
        return false;
      });

      if (matchingQuote) {
        const variants = Array.isArray(matchingQuote.selectedVariants)
          ? matchingQuote.selectedVariants
          : JSON.parse(matchingQuote.selectedVariants || '[]');

        const genPdfPath = path.resolve(generatedDir, targetFilename);
        
        // Convert matching PPTX directly to PDF
        if (matchingQuote.filePath && fs.existsSync(matchingQuote.filePath)) {
          const convRes = await convertPptxToPdf(matchingQuote.filePath, genPdfPath);
          if (convRes.success) {
            filePath = genPdfPath;
          }
        }
      }
    }

    // Match by quotation number in directory if still not found
    if (!fs.existsSync(filePath)) {
      const files = fs.readdirSync(generatedDir);
      const isPdfReq = targetFilename.toLowerCase().endsWith('.pdf');
      const qtMatch = targetFilename.match(/QT-\d+/i)?.[0];

      const matchedFile = files.find(f => {
        if (isPdfReq && !f.toLowerCase().endsWith('.pdf')) return false;
        if (!isPdfReq && !f.toLowerCase().endsWith('.pptx')) return false;
        if (f.toLowerCase() === targetFilename.toLowerCase()) return true;
        if (qtMatch && f.includes(qtMatch)) return true;
        return false;
      });

      if (matchedFile) {
        filePath = path.resolve(generatedDir, matchedFile);
      }
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`❌ Download failed: file not found on disk: ${filePath}`);
      return res.status(404).json({ success: false, error: 'Quotation file not found' });
    }

    const actualName = path.basename(filePath);
    const isPdf = actualName.toLowerCase().endsWith('.pdf');
    const contentType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    // Support ?view=1 query parameter to view inline
    const isInline = req.query.view === '1' || req.query.view === 'true';
    const disposition = isInline ? 'inline' : 'attachment';

    res.setHeader('Content-Disposition', `${disposition}; filename="${actualName}"`);
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);

  } catch (err) {
    console.error('Error in download handler:', err);
    res.status(500).json({ success: false, error: 'Failed to process file download' });
  }
});

// POST /api/generate-quote
router.post('/generate-quote', upload.any(), async (req, res) => {
  try {
    let body = req.body;

    let clientInfo = {};
    let repInfo = {};
    let selectedVariantIds = [];
    let engineType = body.engineType || 'node';

    try {
      clientInfo = typeof body.clientInfo === 'string' ? JSON.parse(body.clientInfo) : (body.clientInfo || {});
    } catch (e) {
      clientInfo = {
        name: body.clientName,
        contact: body.clientContact,
        email: body.clientEmail,
        location: body.clientLocation,
        date: body.clientDate
      };
    }

    try {
      repInfo = typeof body.repInfo === 'string' ? JSON.parse(body.repInfo) : (body.repInfo || {});
    } catch (e) {
      repInfo = {
        name: body.repName,
        contact: body.repContact,
        email: body.repEmail
      };
    }

    try {
      selectedVariantIds = typeof body.selectedVariantIds === 'string' 
        ? JSON.parse(body.selectedVariantIds) 
        : (Array.isArray(body.selectedVariantIds) ? body.selectedVariantIds : [body.selectedVariantIds].filter(Boolean));
    } catch (e) {
      selectedVariantIds = [];
    }

    if (!selectedVariantIds || selectedVariantIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one variant must be selected.' });
    }

    const snips = {};
    const unitSnips = [];
    const accessorySnips = [];

    let unitPagesMetadata = [];
    try {
      unitPagesMetadata = typeof body.unitPagesMetadata === 'string'
        ? JSON.parse(body.unitPagesMetadata)
        : (body.unitPagesMetadata || []);
    } catch (e) {
      unitPagesMetadata = [];
    }

    let accessoryPagesMetadata = [];
    try {
      accessoryPagesMetadata = typeof body.accessoryPagesMetadata === 'string'
        ? JSON.parse(body.accessoryPagesMetadata)
        : (body.accessoryPagesMetadata || []);
    } catch (e) {
      accessoryPagesMetadata = [];
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Check if unit snip
        const unitMatch = file.fieldname.match(/^unit_snip_(.+)$/);
        if (unitMatch) {
          const unitId = unitMatch[1];
          const meta = unitPagesMetadata.find(m => String(m.id) === String(unitId)) || {};
          unitSnips.push({
            id: unitId,
            title: meta.title || 'Unit Breakdown',
            category: meta.category || 'Unit Specification',
            notes: meta.notes || '',
            filePath: file.path
          });
          continue;
        }

        // Check if accessory snip
        const accMatch = file.fieldname.match(/^accessory_snip_(.+)$/);
        if (accMatch) {
          const accId = accMatch[1];
          const meta = accessoryPagesMetadata.find(m => String(m.id) === String(accId)) || {};
          accessorySnips.push({
            id: accId,
            title: meta.title || 'Accessories & Hardware',
            category: meta.category || 'Hardware Specifications',
            notes: meta.notes || '',
            filePath: file.path
          });
          continue;
        }

        const match = file.fieldname.match(/^snip_(.+)$/);
        if (match) {
          const rawId = match[1];
          // Match selected variant ID (handling possible _<index> suffix e.g. snip_var_1_0)
          let matchedVid = selectedVariantIds.find(vid => rawId === vid || rawId.startsWith(`${vid}_`));
          const targetVid = matchedVid || rawId.replace(/_\d+$/, '');

          if (!snips[targetVid]) {
            snips[targetVid] = [];
          } else if (!Array.isArray(snips[targetVid])) {
            snips[targetVid] = [snips[targetVid]];
          }
          snips[targetVid].push(file.path);
        } else {
          for (const vid of selectedVariantIds) {
            if (file.originalname.includes(vid) || file.fieldname.includes(vid)) {
              if (!snips[vid]) snips[vid] = [];
              else if (!Array.isArray(snips[vid])) snips[vid] = [snips[vid]];
              snips[vid].push(file.path);
            }
          }
        }
      }
    }

    const allVariants = await dbService.getVariants();
    const selectedVariantDetails = allVariants.filter(v => selectedVariantIds.includes(v.id));

    const masterTemplatePath = process.env.MASTER_TEMPLATE_PATH 
      ? path.resolve(process.env.MASTER_TEMPLATE_PATH)
      : path.resolve(__dirname, '../../../Master-Template.pptx');

    if (!fs.existsSync(masterTemplatePath)) {
      return res.status(500).json({ 
        success: false, 
        error: `Master template PPTX not found at path: ${masterTemplatePath}` 
      });
    }

    const cleanClientName = (clientInfo.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const quoteDate = (clientInfo.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '_');
    const quoteNo = `QT-${Date.now().toString().slice(-6)}`;
    
    const pptxFileName = `Quote_${cleanClientName}_${quoteDate}_${quoteNo}.pptx`;
    const pptxOutputPath = path.resolve(generatedDir, pptxFileName);

    const pdfFileName = `Quote_${cleanClientName}_${quoteDate}_${quoteNo}.pdf`;
    const pdfOutputPath = path.resolve(generatedDir, pdfFileName);

    console.log(`🚀 Generating dual formats (PPTX & PDF) for ${cleanClientName} (${quoteNo})...`);
    const startTime = Date.now();

    // 1. Generate PPTX via Template Subtraction
    let pptxEngine = engineType === 'python'
      ? new PythonPptxEngine(masterTemplatePath)
      : new PptxEngine(masterTemplatePath);

    const pptxResult = await pptxEngine.generate({
      selectedVariantIds,
      allVariants,
      clientInfo,
      repInfo,
      snips,
      unitSnips,
      accessorySnips,
      outputPath: pptxOutputPath
    });

    // 2. Generate PDF Document: Export the generated PPTX directly to PDF
    let pdfResult = { filePath: pdfOutputPath, fileSize: 0 };
    const pptToPdfRes = await convertPptxToPdf(pptxOutputPath, pdfOutputPath);
    
    if (pptToPdfRes.success) {
      pdfResult.fileSize = pptToPdfRes.fileSize;
    } else {
      console.warn(`⚠️ Direct PPTX export to PDF notice: ${pptToPdfRes.error}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Presentation & PDF exported in ${duration}ms! PPTX: ${(pptxResult.fileSize / (1024*1024)).toFixed(1)}MB, PDF: ${(pdfResult.fileSize / 1024).toFixed(1)}KB`);

    // Upsert Client in database
    const savedClient = await dbService.upsertClient({
      name: clientInfo.name || 'Valued Client',
      contactNumber: clientInfo.contact || clientInfo.contactNumber || 'N/A',
      location: clientInfo.location || 'N/A',
      email: clientInfo.email || null
    });

    const architectName = repInfo.name || 'Cookscape Representative';

    const pptxDownloadUrl = `/api/quotations/download/${pptxFileName}`;
    const pdfDownloadUrl = `/api/quotations/download/${pdfFileName}`;
    const pdfViewUrl = `/api/quotations/view/${pdfFileName}`;

    const savedQuote = await dbService.createQuotation({
      quotationNumber: quoteNo,
      clientId: savedClient.id,
      architect: architectName,
      repInfo,
      clientInfo,
      date: new Date(),
      selectedVariants: selectedVariantDetails,
      filePath: pptxOutputPath,
      fileSize: pptxResult.fileSize,
      downloadUrl: pptxDownloadUrl,
      pdfPath: pdfOutputPath,
      pdfFileSize: pdfResult.fileSize,
      pdfDownloadUrl: pdfDownloadUrl
    });

    res.json({
      success: true,
      data: {
        quotationId: savedQuote.id,
        quotationNumber: quoteNo,
        pptxFileName,
        pptxDownloadUrl,
        pptxFileSize: pptxResult.fileSize,
        pdfFileName,
        pdfDownloadUrl,
        pdfViewUrl,
        pdfFileSize: pdfResult.fileSize,
        fileName: pptxFileName,
        downloadUrl: pptxDownloadUrl,
        fileSize: pptxResult.fileSize,
        slideCount: pptxResult.slideCount,
        durationMs: duration,
        client: savedClient,
        variants: selectedVariantDetails
      }
    });

  } catch (error) {
    console.error('❌ Error generating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
