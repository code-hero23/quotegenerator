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
const { resolveMasterTemplatePath } = require('../services/templateResolver');

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

// GET /api/quotations - List quotation history (scoped by role & user)
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const quotations = await dbService.getQuotations({ userId, role });
    res.json({ success: true, count: quotations.length, data: quotations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/quotations/:id - Delete quotation & physical files (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query;

    if (role && role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only administrators have permission to delete quotations.' });
    }

    const allQuotes = await dbService.getQuotations({ role: 'admin' });
    const target = allQuotes.find(q => q.id === id);

    if (!target) {
      return res.status(404).json({ success: false, error: 'Quotation record not found.' });
    }

    // Safely delete associated files from disk
    if (target.filePath && fs.existsSync(target.filePath)) {
      try {
        fs.unlinkSync(target.filePath);
        console.log(`🗑️ Deleted PPTX file: ${target.filePath}`);
      } catch (e) {
        console.warn(`Could not remove PPTX file: ${e.message}`);
      }
    }

    if (target.pdfPath && fs.existsSync(target.pdfPath)) {
      try {
        fs.unlinkSync(target.pdfPath);
        console.log(`🗑️ Deleted PDF file: ${target.pdfPath}`);
      } catch (e) {
        console.warn(`Could not remove PDF file: ${e.message}`);
      }
    }

    const removed = await dbService.deleteQuotation(id);
    res.json({
      success: true,
      message: `Quotation ${target.quotationNumber || id} deleted successfully.`,
      data: removed
    });
  } catch (error) {
    console.error('Error deleting quotation:', error);
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

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

    let quotationPagesMetadata = {};
    try {
      quotationPagesMetadata = typeof body.quotationPagesMetadata === 'string'
        ? JSON.parse(body.quotationPagesMetadata)
        : (body.quotationPagesMetadata || {});
    } catch (e) {
      quotationPagesMetadata = {};
    }

    // Organize uploaded files by field name for exact index lookup
    const uploadedFilesByField = {};
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        uploadedFilesByField[file.fieldname] = file;
      }
    }

    // Map unitSnips strictly preserving unitPagesMetadata order
    if (unitPagesMetadata.length > 0) {
      unitPagesMetadata.forEach(meta => {
        const fileKey = `unit_snip_${meta.id}`;
        let filePath = null;

        if (uploadedFilesByField[fileKey]) {
          filePath = uploadedFilesByField[fileKey].path;
        } else {
          // Check if existing file path is valid on this machine
          if (meta.filePath && fs.existsSync(meta.filePath)) {
            filePath = meta.filePath;
          } else {
            const rawRef = meta.previewUrl || meta.filePath;
            if (rawRef) {
              const basename = path.basename(rawRef);
              const candidate = path.resolve(snipsDir, basename);
              if (fs.existsSync(candidate)) filePath = candidate;
            }
          }
        }

        const hasValidFile = Boolean(filePath && fs.existsSync(filePath));
        const hasValidNotes = Boolean(meta.notes && String(meta.notes).trim().length > 0);

        if (hasValidFile || hasValidNotes) {
          unitSnips.push({
            id: meta.id,
            variantId: meta.variantId || 'all',
            title: meta.title || 'Unit Breakdown',
            category: meta.category || 'Unit Specification',
            notes: meta.notes || '',
            filePath: hasValidFile ? filePath : null
          });
        }
      });
    }

    // Map accessorySnips strictly preserving accessoryPagesMetadata order
    if (accessoryPagesMetadata.length > 0) {
      accessoryPagesMetadata.forEach(meta => {
        const fileKey = `accessory_snip_${meta.id}`;
        let filePath = null;

        if (uploadedFilesByField[fileKey]) {
          filePath = uploadedFilesByField[fileKey].path;
        } else {
          if (meta.filePath && fs.existsSync(meta.filePath)) {
            filePath = meta.filePath;
          } else {
            const rawRef = meta.previewUrl || meta.filePath;
            if (rawRef) {
              const basename = path.basename(rawRef);
              const candidate = path.resolve(snipsDir, basename);
              if (fs.existsSync(candidate)) filePath = candidate;
            }
          }
        }

        if (filePath && fs.existsSync(filePath)) {
          accessorySnips.push({
            id: meta.id,
            title: meta.title || 'Accessories & Hardware',
            category: meta.category || 'Hardware Specifications',
            notes: meta.notes || '',
            filePath
          });
        }
      });
    }

    // Map variant quotation snips preserving exact page order
    let parsedExistingSnips = {};
    if (body.existingSnips) {
      try {
        parsedExistingSnips = typeof body.existingSnips === 'string' ? JSON.parse(body.existingSnips) : body.existingSnips;
      } catch (e) {
        console.warn('Could not parse existingSnips:', e.message);
      }
    }

    for (const vid of selectedVariantIds) {
      snips[vid] = [];
      const vMeta = quotationPagesMetadata?.[vid];

      if (Array.isArray(vMeta) && vMeta.length > 0) {
        // Ordered pages according to quotationPagesMetadata
        vMeta.forEach((pageMeta, idx) => {
          let foundPath = null;
          // 1. Check direct fieldname `snip_${vid}_${idx}`
          const directFile = uploadedFilesByField[`snip_${vid}_${idx}`] || uploadedFilesByField[`snip_${vid}_page_${idx}`];
          if (directFile) {
            foundPath = directFile.path;
          } else {
            // 2. Check existing previewUrl / filePath
            const rawRef = pageMeta.previewUrl || pageMeta.filePath;
            if (rawRef) {
              if (pageMeta.filePath && fs.existsSync(pageMeta.filePath)) {
                foundPath = pageMeta.filePath;
              } else {
                const basename = path.basename(rawRef);
                const candidate = path.resolve(snipsDir, basename);
                if (fs.existsSync(candidate)) foundPath = candidate;
              }
            }
          }
          if (foundPath && fs.existsSync(foundPath)) {
            snips[vid].push(foundPath);
          }
        });
      }

      // Fallback: If nothing added from metadata, fall back to uploaded files or existingSnips list
      if (snips[vid].length === 0) {
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            if (file.fieldname.startsWith(`snip_${vid}`)) {
              snips[vid].push(file.path);
            }
          }
        }
        if (snips[vid].length === 0 && parsedExistingSnips[vid]) {
          const list = Array.isArray(parsedExistingSnips[vid]) ? parsedExistingSnips[vid] : [parsedExistingSnips[vid]];
          list.forEach(item => {
            const rawRef = typeof item === 'string' ? item : (item.previewUrl || item.filePath);
            if (rawRef) {
              const basename = path.basename(rawRef);
              const candidate = path.resolve(snipsDir, basename);
              if (fs.existsSync(candidate)) snips[vid].push(candidate);
            }
          });
        }
      }
    }

    const allVariants = await dbService.getVariants();
    const selectedVariantDetails = allVariants.filter(v => selectedVariantIds.includes(v.id));

    const masterTemplatePath = resolveMasterTemplatePath();

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
      quotationPagesMetadata,
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
      userId: body.userId || null,
      userRole: body.userRole || 'architect',
      architect: architectName,
      repInfo,
      clientInfo,
      date: new Date(),
      selectedVariants: selectedVariantDetails,
      selectedVariantIds: selectedVariantIds,
      unitPagesMetadata: unitPagesMetadata.map(meta => {
        const matchingSnip = unitSnips.find(u => u.id === meta.id);
        const resolvedPath = matchingSnip?.filePath || (meta.filePath && fs.existsSync(meta.filePath) ? meta.filePath : null);
        return {
          id: meta.id,
          variantId: meta.variantId || 'all',
          title: meta.title || 'Unit Breakdown',
          category: meta.category || 'Unit Specification',
          notes: meta.notes || '',
          filePath: resolvedPath,
          previewUrl: resolvedPath ? `/uploads/snips/${path.basename(resolvedPath)}` : (meta.previewUrl || null)
        };
      }),
      accessoryPagesMetadata: accessorySnips.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        notes: a.notes,
        previewUrl: `/uploads/snips/${path.basename(a.filePath)}`,
        filePath: a.filePath
      })),
      snipsMetadata: Object.fromEntries(
        Object.entries(snips).map(([vid, files]) => [
          vid,
          (Array.isArray(files) ? files : [files]).map((f, fIdx) => ({
            filePath: f,
            previewUrl: `/uploads/snips/${path.basename(f)}`,
            title: quotationPagesMetadata?.[vid]?.[fIdx]?.title || (fIdx === 0 ? 'Main Quotation' : `Quotation Page ${fIdx + 1}`)
          }))
        ])
      ),
      quotationPagesMetadata,
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
