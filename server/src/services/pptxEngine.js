const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * PPTX Template Subtraction Engine
 * 
 * Takes a Master PPTX template containing all possible variant slides,
 * deletes the slides belonging to unselected variants,
 * replaces client and sales representative variables,
 * replaces footers across all slides,
 * optionally inserts uploaded quotation snips (images) into the quotation slides,
 * and renumbers slides sequentially.
 */
class PptxEngine {
  constructor(masterTemplatePath) {
    this.masterTemplatePath = masterTemplatePath;
  }

  /**
   * Generate customized quotation presentation
   * 
   * @param {Object} options
   * @param {string[]} options.selectedVariantIds - Array of selected variant IDs
   * @param {Array} options.allVariants - All variant objects with slideIndices (1-based)
   * @param {Object} options.clientInfo - { name, contact, email, location, date }
   * @param {Object} options.repInfo - { name, contact, email }
   * @param {Object} [options.snips] - Map of variantId -> imageFilePath or Buffer
   * @param {string} options.outputPath - Destination path for generated PPTX
   * @returns {Promise<{ filePath: string, slideCount: number, fileSize: number }>}
   */
  async generate({
    selectedVariantIds = [],
    allVariants = [],
    clientInfo = {},
    repInfo = {},
    snips = {},
    unitSnips = [],
    accessorySnips = [],
    outputPath
  }) {
    if (!fs.existsSync(this.masterTemplatePath)) {
      throw new Error(`Master template not found at: ${this.masterTemplatePath}`);
    }

    // Helper to escape XML entities
    const escapeXml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const templateBuffer = fs.readFileSync(this.masterTemplatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    // 1. Read presentation.xml and presentation.xml.rels
    const presXmlStr = await zip.file('ppt/presentation.xml').async('text');
    const presRelsXmlStr = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
    const contentTypesXmlStr = await zip.file('[Content_Types].xml').async('text');

    // Parse relationship mappings: rId -> target slide (e.g. slides/slide1.xml)
    const relMap = new Map(); // rId -> target
    const relRegex = /<Relationship\s+[^>]*?Id="([^"]+)"[^>]*?Type="[^"]*?slide"[^>]*?Target="([^"]+)"[^>]*?\/>/g;
    let relMatch;
    while ((relMatch = relRegex.exec(presRelsXmlStr)) !== null) {
      relMap.set(relMatch[1], relMatch[2]);
    }

    // Parse slide order from presentation.xml: <p:sldId id="256" r:id="rId2"/>
    const sldIdList = [];
    const sldIdRegex = /<p:sldId\s+[^>]*?id="([^"]+)"[^>]*?r:id="([^"]+)"[^>]*?\/>/g;
    let sldMatch;
    let slideDisplayIndex = 1;
    while ((sldMatch = sldIdRegex.exec(presXmlStr)) !== null) {
      const id = sldMatch[1];
      const rId = sldMatch[2];
      const target = relMap.get(rId);
      const filename = target ? path.basename(target) : `slide${slideDisplayIndex}.xml`;
      sldIdList.push({
        displayIndex: slideDisplayIndex, // 1-based original position
        id,
        rId,
        target,
        fullZipPath: target ? `ppt/${target.replace(/^\//, '')}` : `ppt/slides/${filename}`
      });
      slideDisplayIndex++;
    }

    // 2. Determine which slide display indices to DELETE
    const slidesToDeleteIndices = new Set();
    const selectedVariantIdSet = new Set(selectedVariantIds.map(String));

    for (const variant of allVariants) {
      const variantIdStr = String(variant.id);
      const isSelected = selectedVariantIdSet.has(variantIdStr);
      if (!isSelected && variant.slideIndices) {
        let indices = variant.slideIndices;
        if (typeof indices === 'string') {
          try { indices = JSON.parse(indices); } catch (e) { indices = []; }
        }
        if (Array.isArray(indices)) {
          for (const idx of indices) {
            slidesToDeleteIndices.add(Number(idx));
          }
        }
      }
    }

    // Slides to keep and delete
    const keptSlides = sldIdList.filter(s => !slidesToDeleteIndices.has(s.displayIndex));
    const deletedSlides = sldIdList.filter(s => slidesToDeleteIndices.has(s.displayIndex));

    let updatedContentTypes = contentTypesXmlStr;
    let updatedPresRelsXml = presRelsXmlStr;

    // Purge unselected variant slides
    for (const del of deletedSlides) {
      if (del.target) {
        const slidePartName = `/ppt/${del.target.replace(/^\//, '')}`;
        const overrideRegex = new RegExp(`<Override\\s+PartName="${slidePartName.replace('/', '\\/')}"[^>]*?\\/>`, 'g');
        updatedContentTypes = updatedContentTypes.replace(overrideRegex, '');

        const relRegex = new RegExp(`<Relationship\\s+[^>]*?Id="${del.rId}"[^>]*?\\/>`, 'g');
        updatedPresRelsXml = updatedPresRelsXml.replace(relRegex, '');

        zip.remove(del.fullZipPath);
        const slideRelsPath = `ppt/slides/_rels/${path.basename(del.target)}.rels`;
        zip.remove(slideRelsPath);
      }
    }

    // 2.5 Insert Unit Snips Slides (if any unit pages are uploaded)
    if (Array.isArray(unitSnips) && unitSnips.length > 0) {
      const templateSlideXml = await zip.file('ppt/slides/slide9.xml').async('text');
      let insertIndex = keptSlides.findIndex(s => s.displayIndex > 6);
      if (insertIndex === -1) insertIndex = keptSlides.length;

      for (let uIdx = 0; uIdx < unitSnips.length; uIdx++) {
        const u = unitSnips[uIdx];
        const unitSlideTarget = `slides/slide_unit_${uIdx + 1}.xml`;
        const unitFullZipPath = `ppt/${unitSlideTarget}`;
        const unitSlideRelsZipPath = `ppt/slides/_rels/slide_unit_${uIdx + 1}.xml.rels`;
        const unitRId = `rIdUnit_${uIdx + 1}`;
        const unitSldId = String(30000 + uIdx);

        const uTitle = escapeXml(u.title || `Unit ${uIdx + 1} Breakdown`);
        const uCat = escapeXml(u.category || 'Unit Specification');

        let unitXml = templateSlideXml;
        unitXml = unitXml.replace(
          /<a:t>SURABHI - LL ELITE<\/a:t>[\s\S]*?<a:t>Quotation<\/a:t>/,
          `<a:t>${uTitle}</a:t></a:r><a:br/><a:r><a:rPr lang="en-IN" sz="2000" dirty="0"><a:latin typeface="Baskerville Display PT"/></a:rPr><a:t>${uCat}</a:t>`
        );

        let unitRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>`;

        const uFilePath = u.filePath || u.path;
        let uBuffer = null;
        let uExt = 'png';
        if (Buffer.isBuffer(uFilePath)) {
          uBuffer = uFilePath;
        } else if (typeof uFilePath === 'string' && fs.existsSync(uFilePath)) {
          uBuffer = fs.readFileSync(uFilePath);
          uExt = path.extname(uFilePath).replace('.', '') || 'png';
        }

        if (uBuffer) {
          const mediaFileName = `unit_snip_${uIdx + 1}_${Date.now()}.${uExt}`;
          zip.file(`ppt/media/${mediaFileName}`, uBuffer);

          const snipRelId = `rIdUnitImg_${uIdx + 1}`;
          const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
          unitRelsXml = unitRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);

          const picXml = `
            <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <p:nvPicPr>
                <p:cNvPr id="${12000 + uIdx}" name="UnitSnip_${uIdx + 1}"/>
                <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                <p:nvPr/>
              </p:nvPicPr>
              <p:blipFill>
                <a:blip r:embed="${snipRelId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="750000" y="2600000"/>
                  <a:ext cx="8500000" cy="9500000"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </p:spPr>
            </p:pic>
          `.trim();
          unitXml = unitXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
        }

        zip.file(unitFullZipPath, unitXml);
        zip.file(unitSlideRelsZipPath, unitRelsXml);

        updatedContentTypes = updatedContentTypes.replace(
          '</Types>',
          `<Override PartName="/ppt/${unitSlideTarget}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
        );

        updatedPresRelsXml = updatedPresRelsXml.replace(
          '</Relationships>',
          `<Relationship Id="${unitRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${unitSlideTarget}"/></Relationships>`
        );

        keptSlides.splice(insertIndex + uIdx, 0, {
          displayIndex: 6.1 + uIdx,
          id: unitSldId,
          rId: unitRId,
          target: unitSlideTarget,
          fullZipPath: unitFullZipPath
        });
      }
    }

    // 2.6 Insert Accessory Snips Slides (if any accessory pages are uploaded)
    if (Array.isArray(accessorySnips) && accessorySnips.length > 0) {
      const templateSlideXml = await zip.file('ppt/slides/slide9.xml').async('text');
      // Place accessory slides before timeline & terms slides (around displayIndex 22)
      let accInsertIndex = keptSlides.findIndex(s => s.displayIndex >= 22);
      if (accInsertIndex === -1) accInsertIndex = keptSlides.length;

      for (let aIdx = 0; aIdx < accessorySnips.length; aIdx++) {
        const a = accessorySnips[aIdx];
        const accSlideTarget = `slides/slide_acc_${aIdx + 1}.xml`;
        const accFullZipPath = `ppt/${accSlideTarget}`;
        const accSlideRelsZipPath = `ppt/slides/_rels/slide_acc_${aIdx + 1}.xml.rels`;
        const accRId = `rIdAcc_${aIdx + 1}`;
        const accSldId = String(40000 + aIdx);

        const aTitle = escapeXml(a.title || `Accessory Specification ${aIdx + 1}`);
        const aCat = escapeXml(a.category || 'Hardware & Fittings');

        let accXml = templateSlideXml;
        accXml = accXml.replace(
          /<a:t>SURABHI - LL ELITE<\/a:t>[\s\S]*?<a:t>Quotation<\/a:t>/,
          `<a:t>${aTitle}</a:t></a:r><a:br/><a:r><a:rPr lang="en-IN" sz="2000" dirty="0"><a:latin typeface="Baskerville Display PT" panose="020B0604020202020204" charset="0"/><a:ea typeface="Baskerville Display PT" panose="020B0604020202020204" charset="0"/></a:rPr><a:t>${aCat}</a:t>`
        );

        let accRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>`;

        const aFilePath = a.filePath || a.path;
        let aBuffer = null;
        let aExt = 'png';
        if (Buffer.isBuffer(aFilePath)) {
          aBuffer = aFilePath;
        } else if (typeof aFilePath === 'string' && fs.existsSync(aFilePath)) {
          aBuffer = fs.readFileSync(aFilePath);
          aExt = path.extname(aFilePath).replace('.', '') || 'png';
        }

        if (aBuffer) {
          const mediaFileName = `acc_snip_${aIdx + 1}_${Date.now()}.${aExt}`;
          zip.file(`ppt/media/${mediaFileName}`, aBuffer);

          const snipRelId = `rIdAccImg_${aIdx + 1}`;
          const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
          accRelsXml = accRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);

          const picXml = `
            <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <p:nvPicPr>
                <p:cNvPr id="${15000 + aIdx}" name="AccessorySnip_${aIdx + 1}"/>
                <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                <p:nvPr/>
              </p:nvPicPr>
              <p:blipFill>
                <a:blip r:embed="${snipRelId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="750000" y="2600000"/>
                  <a:ext cx="8500000" cy="9500000"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </p:spPr>
            </p:pic>
          `.trim();
          accXml = accXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
        }

        zip.file(accFullZipPath, accXml);
        zip.file(accSlideRelsZipPath, accRelsXml);

        updatedContentTypes = updatedContentTypes.replace(
          '</Types>',
          `<Override PartName="/ppt/${accSlideTarget}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
        );

        updatedPresRelsXml = updatedPresRelsXml.replace(
          '</Relationships>',
          `<Relationship Id="${accRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${accSlideTarget}"/></Relationships>`
        );

        keptSlides.splice(accInsertIndex + aIdx, 0, {
          displayIndex: 21.1 + aIdx,
          id: accSldId,
          rId: accRId,
          target: accSlideTarget,
          fullZipPath: accFullZipPath
        });
      }
    }

    // 3. Update ppt/presentation.xml: keep only kept & inserted slides in <p:sldIdLst>
    const newSldIdXml = keptSlides.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
    const updatedPresXml = presXmlStr.replace(
      /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
      `<p:sldIdLst>${newSldIdXml}</p:sldIdLst>`
    );
    zip.file('ppt/presentation.xml', updatedPresXml);

    zip.file('[Content_Types].xml', updatedContentTypes);
    zip.file('ppt/_rels/presentation.xml.rels', updatedPresRelsXml);

    // 5. Build dynamic footer string (properly XML escaped)
    // Master template footer: "Mr. Aravindan | Individual Villa Adyar | 7418414780"
    const originalFooter = 'Mr. Aravindan | Individual Villa Adyar | 7418414780';
    const newFooter = `${escapeXml(clientInfo.name || 'Client')} | ${escapeXml(clientInfo.location || 'Site Location')} | ${escapeXml(clientInfo.contact || clientInfo.contactNumber || '')}`;

    // 6. Template Variables for Cover Slide (Slide 1 - XML escaped)
    const clientName = escapeXml(clientInfo.name || '');
    const clientContact = escapeXml(clientInfo.contact || clientInfo.contactNumber || '');
    const clientEmail = escapeXml(clientInfo.email || '');
    const location = escapeXml(clientInfo.location || '');
    const dateStr = escapeXml(clientInfo.date ? (typeof clientInfo.date === 'string' ? clientInfo.date : new Date(clientInfo.date).toLocaleDateString('en-GB')) : new Date().toLocaleDateString('en-GB'));

    const repName = escapeXml(repInfo.name || '');
    const repContact = escapeXml(repInfo.contact || repInfo.contactNumber || '');
    const repEmail = escapeXml(repInfo.email || '');

    // Map of specific replacements
    const coverReplacements = [
      // Standard {{TAGS}}
      { search: /\{\{CLIENT_NAME\}\}/g, replace: clientName },
      { search: /\{\{CLIENT_CONTACT\}\}/g, replace: clientContact },
      { search: /\{\{CLIENT_EMAIL\}\}/g, replace: clientEmail },
      { search: /\{\{LOCATION\}\}/g, replace: location },
      { search: /\{\{DATE\}\}/g, replace: dateStr },
      { search: /\{\{REP_NAME\}\}/g, replace: repName },
      { search: /\{\{REP_CONTACT\}\}/g, replace: repContact },
      { search: /\{\{REP_EMAIL\}\}/g, replace: repEmail },
      // Original Master-Template values
      { search: /Mr\.\s*Aravindan/g, replace: clientName },
      { search: /7418414780/g, replace: clientContact },
      { search: /Webapp\.cookscape@gmail\.com/g, replace: clientEmail },
      { search: /Individual Villa Adyar/g, replace: location },
      { search: /10\/10\/2026/g, replace: dateStr },
      { search: /Mr\.\s*Abishek/g, replace: repName },
      { search: /93611\s*84787/g, replace: repContact },
      { search: /designs\.cookscape@gmail\.com/g, replace: repEmail }
    ];

    // Map quotation slide numbers to variant IDs
    // In Master template:
    // Variant 1 -> Slide 9
    // Variant 2 -> Slide 12
    // Variant 3 -> Slide 15
    // Variant 4 -> Slide 18
    // Variant 5 -> Slide 21
    const variantQuotationSlideMap = new Map();
    for (const v of allVariants) {
      if (v.slideIndices) {
        let indices = v.slideIndices;
        if (typeof indices === 'string') {
          try { indices = JSON.parse(indices); } catch (e) { indices = []; }
        }
        if (Array.isArray(indices) && indices.length >= 3) {
          // The 3rd slide is the quotation slide
          variantQuotationSlideMap.set(Number(indices[2]), String(v.id));
        }
      }
    }

    // 7. Process each kept slide: update text, footer, slide numbers, snip images
    let newSlideNumber = 1;
    for (const slide of keptSlides) {
      const slideEntry = zip.file(slide.fullZipPath);
      if (!slideEntry) continue;

      let slideXml = await slideEntry.async('text');

      // Update slide number if this slide has a slide number tag
      // Master template has <a:t>X</a:t> where X is slide.displayIndex
      const originalNum = slide.displayIndex;
      const numRegex = new RegExp(`<a:t>\\s*${originalNum}\\s*<\\/a:t>`, 'g');
      slideXml = slideXml.replace(numRegex, `<a:t>${newSlideNumber}</a:t>`);

      // Update footer on all slides
      if (slideXml.includes(originalFooter)) {
        slideXml = slideXml.replaceAll(originalFooter, newFooter);
      } else {
        // Handle variations in whitespace or client name
        slideXml = slideXml.replaceAll('Mr. Aravindan | Individual Villa Adyar | 7418414780', newFooter);
      }

      // If Cover Slide (slide 1), apply all client & rep tag replacements
      if (slide.displayIndex === 1) {
        for (const item of coverReplacements) {
          if (item.replace) {
            slideXml = slideXml.replace(item.search, item.replace);
          }
        }
      }

      // Check if this slide is a variant quotation slide and has an uploaded snip
      const variantIdForSlide = variantQuotationSlideMap.get(slide.displayIndex);
      if (variantIdForSlide && snips[variantIdForSlide]) {
        const snipFile = snips[variantIdForSlide];
        let snipBuffer = null;
        let snipExt = 'png';

        if (Buffer.isBuffer(snipFile)) {
          snipBuffer = snipFile;
        } else if (typeof snipFile === 'string' && fs.existsSync(snipFile)) {
          snipBuffer = fs.readFileSync(snipFile);
          snipExt = path.extname(snipFile).replace('.', '') || 'png';
        }

        if (snipBuffer) {
          const mediaFileName = `snip_var_${variantIdForSlide}_${Date.now()}.${snipExt}`;
          const mediaZipPath = `ppt/media/${mediaFileName}`;
          zip.file(mediaZipPath, snipBuffer);

          // Add relationship to slide rels file
          const slideRelsPath = `ppt/slides/_rels/${path.basename(slide.target)}.rels`;
          let slideRelsXml = '';
          const existingRels = zip.file(slideRelsPath);
          if (existingRels) {
            slideRelsXml = await existingRels.async('text');
          } else {
            slideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
          }

          const snipRelId = `rIdSnip_${variantIdForSlide}`;
          const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
          slideRelsXml = slideRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);
          zip.file(slideRelsPath, slideRelsXml);

          // Add image shape to slide XML inside <p:spTree>
          // Coordinates in portrait slide:
          // x: 750000 (0.82 in), y: 2600000 (2.84 in), width: 8500000 (9.3 in), height: 9500000 (10.4 in)
          const picXml = `
            <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <p:nvPicPr>
                <p:cNvPr id="${9000 + newSlideNumber}" name="QuotationSnip_${variantIdForSlide}"/>
                <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                <p:nvPr/>
              </p:nvPicPr>
              <p:blipFill>
                <a:blip r:embed="${snipRelId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="750000" y="2600000"/>
                  <a:ext cx="8500000" cy="9500000"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </p:spPr>
            </p:pic>
          `.trim();

          slideXml = slideXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
        }
      }

      zip.file(slide.fullZipPath, slideXml);
      newSlideNumber++;
    }

    // 8. Generate and save the modified PPTX
    const outBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const targetDir = path.dirname(outputPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, outBuffer);

    return {
      filePath: outputPath,
      slideCount: keptSlides.length,
      fileSize: outBuffer.length
    };
  }
}

module.exports = PptxEngine;
