const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfEngine {
  /**
   * Generate an official, client-ready PDF Quotation Document
   * 
   * @param {Object} options
   * @param {Object} options.clientInfo - { name, contact, email, location, date }
   * @param {Object} options.repInfo - { name, contact, email }
   * @param {Array} options.selectedVariants - Array of variant objects with specs and price
   * @param {string} options.quotationNumber - e.g. "QT-101847"
   * @param {Object} [options.snips] - Map of variantId -> imageFilePath
   * @param {string} options.outputPath - Destination path for generated PDF
   * @returns {Promise<{ filePath: string, fileSize: number }>}
   */
  async generate({
    clientInfo = {},
    repInfo = {},
    selectedVariants = [],
    quotationNumber = 'QT-000000',
    snips = {},
    outputPath
  }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Quotation ${quotationNumber} - ${clientInfo.name || 'Client'}`,
            Author: 'Cookscape Studio',
            Subject: 'Interior Quotation & Architectural Specification',
            Keywords: 'Quotation, Interior, Cookscape, Architecture'
          }
        });

        const targetDir = path.dirname(outputPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Formatting Helpers
        const primaryColor = '#0f172a'; // Slate 900
        const goldColor = '#b45309';    // Amber 700 / Gold
        const textMuted = '#64748b';    // Slate 500
        const cardBg = '#f8fafc';       // Slate 50
        const borderColor = '#e2e8f0';  // Slate 200

        const formatINR = (val) => {
          if (!val) return 'Custom Quote';
          return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
        };

        const drawHeader = () => {
          doc.rect(40, 40, 515, 60).fill('#0f172a');
          
          doc.fillColor('#fbbf24').fontSize(16).font('Helvetica-Bold')
             .text('COOKSCAPE STUDIO', 55, 52);
          doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
             .text('PERSONALIZED INTERIOR ARCHITECTURE & MODULAR SPECIFICATION', 55, 72);

          doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
             .text(quotationNumber, 420, 52, { align: 'right', width: 120 });
          doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica')
             .text(`Date: ${clientInfo.date || new Date().toLocaleDateString('en-GB')}`, 420, 68, { align: 'right', width: 120 });
        };

        // ================= PAGE 1: COVER & EXECUTIVE SUMMARY =================
        drawHeader();

        let y = 120;

        // Title Block
        doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold')
           .text('OFFICIAL DESIGN QUOTATION & SPECIFICATION', 40, y);
        y += 24;
        doc.fillColor(textMuted).fontSize(9).font('Helvetica')
           .text('Customized estimate prepared according to site architectural drawings and materials selection.', 40, y);
        y += 22;

        // Two Cards: Client Details & Sales Representative
        const cardWidth = 248;
        const cardHeight = 110;

        // Client Card
        doc.roundedRect(40, y, cardWidth, cardHeight, 6).fillAndStroke(cardBg, borderColor);
        doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold').text('CLIENT & SITE DETAILS', 52, y + 12);
        
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Client Name:', 52, y + 30);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(clientInfo.name || 'Valued Client', 115, y + 30);

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Contact Phone:', 52, y + 46);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(clientInfo.contact || clientInfo.contactNumber || 'N/A', 115, y + 46);

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Site Location:', 52, y + 62);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(clientInfo.location || 'N/A', 115, y + 62, { width: 160 });

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Quotation Date:', 52, y + 84);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(clientInfo.date || new Date().toLocaleDateString('en-GB'), 115, y + 84, { width: 160 });

        // Sales Rep Card
        doc.roundedRect(307, y, cardWidth, cardHeight, 6).fillAndStroke(cardBg, borderColor);
        doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold').text('DESIGN CONSULTANT', 319, y + 12);

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Consultant:', 319, y + 30);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(repInfo.name || 'Cookscape Design Team', 385, y + 30);

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Direct Contact:', 319, y + 46);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(repInfo.contact || repInfo.contactNumber || 'N/A', 385, y + 46);

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Email ID:', 319, y + 62);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(repInfo.email || 'designs.cookscape@gmail.com', 385, y + 62, { width: 160 });

        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Studio Ref:', 319, y + 84);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text('Adyar Design Studio, Chennai', 385, y + 84);

        y += cardHeight + 25;

        // Commercial Overview Table
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('SELECTED VARIANTS OVERVIEW', 40, y);
        y += 18;

        // Table Header
        doc.rect(40, y, 515, 22).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('#', 50, y + 6);
        doc.text('VARIANT & CONFIGURATION', 80, y + 6);
        doc.text('CATEGORY / FINISH', 260, y + 6);
        doc.text('WARRANTY', 390, y + 6);
        doc.text('ESTIMATED PRICE', 460, y + 6, { align: 'right', width: 85 });
        y += 22;

        let totalPrice = 0;
        selectedVariants.forEach((v, index) => {
          const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(40, y, 515, 26).fillAndStroke(rowBg, borderColor);
          
          doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(String(index + 1), 50, y + 8);
          doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(v.name, 80, y + 8);
          doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(v.category || 'Interior Specification', 260, y + 8, { width: 120 });
          doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text(v.specs?.warranty || '10+ Years', 390, y + 8);
          
          const price = v.price || 0;
          totalPrice += price;
          doc.fillColor(goldColor).fontSize(9).font('Helvetica-Bold').text(formatINR(price), 460, y + 8, { align: 'right', width: 85 });

          y += 26;
        });

        // Total Row
        doc.rect(40, y, 515, 28).fill('#f1f5f9');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('TOTAL ESTIMATED VALUE (EXCL. GST)', 80, y + 8);
        doc.fillColor(goldColor).fontSize(11).font('Helvetica-Bold').text(formatINR(totalPrice), 440, y + 8, { align: 'right', width: 105 });
        y += 45;

        // Payment Milestones
        doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('STANDARD PAYMENT MILESTONES', 40, y);
        y += 14;

        const milestones = [
          { stage: '1. Onboarding & Design Sign-Off', pct: '10%', desc: 'Commencement of concept 3D visualization' },
          { stage: '2. Production Release', pct: '50%', desc: 'Factory manufacturing & material procurement' },
          { stage: '3. Material Dispatch to Site', pct: '35%', desc: 'Safe delivery and on-site assembly' },
          { stage: '4. Final Handover & Quality QC', pct: '5%', desc: 'Client joint walkthrough & warranty issuance' }
        ];

        milestones.forEach(m => {
          doc.roundedRect(40, y, 515, 20, 3).fillAndStroke('#f8fafc', '#e2e8f0');
          doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(m.stage, 50, y + 5);
          doc.fillColor('#0284c7').fontSize(8).font('Helvetica-Bold').text(m.pct, 260, y + 5);
          doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(m.desc, 320, y + 5);
          y += 24;
        });

        // ================= PAGE 2+: DETAILED VARIANT SPECIFICATIONS & SNIPS =================
        selectedVariants.forEach((v) => {
          doc.addPage();
          drawHeader();

          let vy = 120;
          doc.fillColor(goldColor).fontSize(9).font('Helvetica-Bold').text('VARIANT TECHNICAL SPECIFICATION SHEET', 40, vy);
          vy += 16;
          doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(v.name, 40, vy);
          vy += 22;

          doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(v.description || '', 40, vy, { width: 515 });
          vy += 30;

          // Technical Specs Grid
          const specs = v.specs || {};
          const specRows = [
            ['Carcass Material', specs.carcassMaterial || 'Marine Grade / GREENPLY BWP 710'],
            ['Carcass Finish', specs.carcassFinish || 'Frosty White / Linum'],
            ['Shutter Material', specs.shutterMaterial || 'HDHMR / Marine Ply'],
            ['Shutter Finish', specs.shutterFinish || 'Solid Matte / High Gloss'],
            ['Hardware & Hinges', specs.hardware || 'EBCO Soft-Close / Hettich / Blum'],
            ['Warranty Assurance', specs.warranty || '10+ Years Comprehensive Warranty'],
            ['Production Lead Time', '4 to 6 Weeks from physical drawing sign-off']
          ];

          doc.rect(40, vy, 515, 22).fill('#1e293b');
          doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('SPECIFICATION DETAIL', 50, vy + 6);
          doc.text('APPROVED ARCHITECTURAL GRADE', 220, vy + 6);
          vy += 22;

          specRows.forEach((row, i) => {
            const rbg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(40, vy, 515, 22).fillAndStroke(rbg, borderColor);
            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(row[0], 50, vy + 6);
            doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(row[1], 220, vy + 6, { width: 325 });
            vy += 22;
          });

          vy += 25;

          // Check if an uploaded quotation snip image exists for this variant
          const snipPath = snips[v.id];
          if (snipPath && fs.existsSync(snipPath)) {
            doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('ITEMIZED PRICING SNIP & BREAKDOWN', 40, vy);
            vy += 16;

            try {
              // Embed image with max width/height constraint
              const maxWidth = 515;
              const maxHeight = 280;
              doc.image(snipPath, 40, vy, {
                fit: [maxWidth, maxHeight],
                align: 'center',
                valign: 'center'
              });
            } catch (imgErr) {
              doc.fillColor(textMuted).fontSize(8).font('Helvetica')
                 .text(`[Quotation Snip attached: ${path.basename(snipPath)}]`, 40, vy);
            }
          }
        });

        // ================= FINAL PAGE: TERMS & CONDITIONS =================
        doc.addPage();
        drawHeader();

        let ty = 120;
        doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('TERMS & CONDITIONS AND INCLUSIONS', 40, ty);
        ty += 22;

        const terms = [
          '1. Inclusions: Supply, factory precision finishing, packing, transportation, and skilled installation as per approved 2D drawings.',
          '2. Taxes: GST is applicable as per prevailing government statutory regulations and clearly itemized on final tax invoice.',
          '3. Site Readiness: Installation timeline commences once flooring, base tiling, and electrical wiring rough-ins are 100% complete.',
          '4. Exclusions: Loose mirrors, civil alterations, decorative wall panelling unless explicitly itemized in scope of work.',
          '5. Alterations: Material finishes and hardware cannot be changed once drawings are approved and released for factory machining.',
          '6. Handover & QC: Comprehensive joint inspection conducted by Cookscape Quality Lead prior to project handover and warranty card handover.'
        ];

        terms.forEach(t => {
          doc.fillColor(textMuted).fontSize(8.5).font('Helvetica').text(t, 40, ty, { width: 515 });
          ty += 28;
        });

        ty += 30;

        // Signature Sign-off Box
        doc.roundedRect(40, ty, 515, 90, 6).fillAndStroke('#f8fafc', borderColor);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('ACCEPTANCE & DESIGN SIGN-OFF', 55, ty + 12);
        
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Client Signature: ____________________________', 55, ty + 50);
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Cookscape Authorized: _______________________', 320, ty + 50);
        
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text(`Date: ${clientInfo.date || '___/___/2026'}`, 55, ty + 70);
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text(`Quotation Ref: ${quotationNumber}`, 320, ty + 70);

        // Footers on all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.rect(40, 790, 515, 0.5).fill('#cbd5e1');
          
          const footerStr = `${clientInfo.name || 'Client'} | ${clientInfo.location || 'Location'} | ${clientInfo.contact || ''}`;
          doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
             .text(footerStr, 40, 798, { width: 400 });
          doc.text(`Page ${i + 1} of ${pages.count}`, 450, 798, { align: 'right', width: 105 });
        }

        doc.end();

        writeStream.on('finish', () => {
          const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
          resolve({ filePath: outputPath, fileSize });
        });

        writeStream.on('error', (err) => {
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PdfEngine;
