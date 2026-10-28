function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds an OOXML shape (<p:sp>) for specification remarks / notes
 */
function buildNotesShapeXml({ id, name, text, x, y, cx, cy, title = 'UNIT SPECIFICATION REMARKS' }) {
  if (!text || !text.trim()) return '';

  const cleanText = text.trim();
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const paragraphsXml = lines.map(line => `
    <a:p>
      <a:pPr algn="l">
        <a:defRPr sz="1000">
          <a:solidFill><a:srgbClr val="1E293B"/></a:solidFill>
          <a:latin typeface="Inter"/>
        </a:defRPr>
      </a:pPr>
      <a:r>
        <a:rPr lang="en-IN" sz="1000">
          <a:solidFill><a:srgbClr val="1E293B"/></a:solidFill>
          <a:latin typeface="Inter"/>
        </a:rPr>
        <a:t>${escapeXml(line)}</a:t>
      </a:r>
    </a:p>
  `.trim()).join('');

  return `
    <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:nvSpPr>
        <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="${x}" y="${y}"/>
          <a:ext cx="${cx}" cy="${cy}"/>
        </a:xfrm>
        <a:prstGeom prst="roundRect">
          <a:avLst>
            <a:gd name="adj" fmla="val 2000"/>
          </a:avLst>
        </a:prstGeom>
        <a:solidFill>
          <a:srgbClr val="FFFBEB"/>
        </a:solidFill>
        <a:ln w="19050">
          <a:solidFill>
            <a:srgbClr val="FCD34D"/>
          </a:solidFill>
        </a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr vert="horz" lIns="228600" tIns="152400" rIns="228600" bIns="152400" anchor="top" wrap="square"/>
        <a:lstStyle/>
        <a:p>
          <a:pPr algn="l">
            <a:defRPr sz="900" b="1">
              <a:solidFill><a:srgbClr val="92400E"/></a:solidFill>
              <a:latin typeface="Inter"/>
            </a:defRPr>
          </a:pPr>
          <a:r>
            <a:rPr lang="en-IN" sz="900" b="1">
              <a:solidFill><a:srgbClr val="92400E"/></a:solidFill>
              <a:latin typeface="Inter"/>
            </a:rPr>
            <a:t>${escapeXml(title)}</a:t>
          </a:r>
        </a:p>
        ${paragraphsXml}
      </p:txBody>
    </p:sp>
  `.trim();
}

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { resolveMasterTemplatePath } = require('./templateResolver');

/**
 * Extracts image width and height from PNG, JPEG, WebP, GIF buffers without external dependencies
 */
function getImageDimensions(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 24) return null;

  try {
    // 1. PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20)
      };
    }

    // 2. JPEG
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let offset = 2;
      while (offset < buf.length - 8) {
        if (buf[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buf[offset + 1];
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7)
          };
        }
        const len = buf.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    }

    // 3. WebP
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunkType = buf.toString('ascii', 12, 16);
      if (chunkType === 'VP8 ' && buf.length >= 30) {
        return {
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff
        };
      }
      if (chunkType === 'VP8L' && buf.length >= 25) {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        return {
          width: 1 + (((b1 & 0x3f) << 8) | b0),
          height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
        };
      }
      if (chunkType === 'VP8X' && buf.length >= 30) {
        return {
          width: 1 + buf.readUIntLE(24, 3),
          height: 1 + buf.readUIntLE(27, 3)
        };
      }
    }

    // 4. GIF
    if (buf.toString('ascii', 0, 3) === 'GIF') {
      return {
        width: buf.readUInt16LE(6),
        height: buf.readUInt16LE(8)
      };
    }
  } catch (e) {
    console.warn('[PptxEngine] Error reading image dimensions from buffer:', e.message);
  }

  return null;
}

/**
 * Detects image file extension from magic bytes so OOXML [Content_Types].xml always matches
 */
function detectImageExtension(buf, fallbackPath = '') {
  if (buf && Buffer.isBuffer(buf) && buf.length >= 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpeg';
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    if (buf.toString('ascii', 0, 3) === 'GIF') return 'gif';
  }
  const ext = String(path.extname(String(fallbackPath || '')).replace('.', '')).toLowerCase();
  if (ext === 'jpg') return 'jpeg';
  return ext || 'png';
}

function normalizeVariantKey(id) {
  if (!id) return '';
  const s = String(id).trim();
  if (s === 'var-surabhi-ll-elite' || s.toUpperCase() === 'SURABHI - LL ELITE' || s.toUpperCase() === 'LL ELITE') {
    return 'var-ll-elite';
  }
  if (s === 'var-capricoast-glossy') {
    return 'var-capricost-glossy';
  }
  return s;
}

/**
 * Calculates optimal shape transform coordinates (EMU) so snips never shrink or distort.
 * Slide dimensions: 10045700 x 14198600 EMUs (Portrait)
 * Content area: width up to 8800000, height up to 10400000, top 2500000
 */
function calculateImageBounds(buf, customMaxHeight = 10400000, customTop = 2500000) {
  const slideWidth = 10045700;
  const maxWidth = 8800000;
  const maxHeight = customMaxHeight;
  const contentTop = customTop;

  const dims = getImageDimensions(buf);
  if (!dims || !dims.width || !dims.height) {
    return {
      x: 622850,
      y: contentTop,
      cx: maxWidth,
      cy: maxHeight
    };
  }

  const imgAspect = dims.width / dims.height;
  const boxAspect = maxWidth / maxHeight; // ~0.846

  let cx, cy;
  if (imgAspect >= boxAspect) {
    // Wide image (Excel table or widescreen snip): expand to full available width
    cx = maxWidth;
    cy = Math.round(maxWidth / imgAspect);
    if (cy > maxHeight) {
      cy = maxHeight;
      cx = Math.round(maxHeight * imgAspect);
    }
  } else {
    // Tall portrait image: expand to full available height
    cy = maxHeight;
    cx = Math.round(maxHeight * imgAspect);
    if (cx > maxWidth) {
      cx = maxWidth;
      cy = Math.round(maxWidth / imgAspect);
    }
  }

  // Horizontally center on the slide:
  const x = Math.max(0, Math.round((slideWidth - cx) / 2));
  // Top-aligned in the content area beneath slide title:
  const y = contentTop;

  return { x, y, cx, cy };
}

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
    this.masterTemplatePath = (masterTemplatePath && fs.existsSync(masterTemplatePath))
      ? masterTemplatePath
      : resolveMasterTemplatePath();
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
    quotationPagesMetadata = {},
    outputPath
  }) {
    if (!fs.existsSync(this.masterTemplatePath)) {
      this.masterTemplatePath = resolveMasterTemplatePath();
    }
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

    // Cache base quotation template XML BEFORE any slides are purged from the zip
    let baseQuotationTemplateXml = '';
    const slide9Ref = sldIdList.find(s => s.displayIndex === 9);
    const slide9Entry = zip.file('ppt/slides/slide9.xml') || (slide9Ref ? zip.file(slide9Ref.fullZipPath) : null);
    if (slide9Entry) {
      baseQuotationTemplateXml = await slide9Entry.async('text');
    } else {
      const anyQuoteRef = sldIdList.find(s => s.displayIndex >= 7 && s.displayIndex <= 18);
      const anyEntry = anyQuoteRef ? zip.file(anyQuoteRef.fullZipPath) : null;
      if (anyEntry) {
        baseQuotationTemplateXml = await anyEntry.async('text');
      }
    }

    // 2. Determine which slide display indices to DELETE
    const slidesToDeleteIndices = new Set();
    const selectedVariantIdSet = new Set(selectedVariantIds.map(id => normalizeVariantKey(id)));

    for (const variant of allVariants) {
      const variantIdStr = normalizeVariantKey(variant.id);
      const isSelected = selectedVariantIdSet.has(variantIdStr) || selectedVariantIds.map(String).includes(String(variant.id));
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

    // Ensure [Content_Types].xml supports all common image extensions (jpg, jpeg, png, webp, gif, bmp)
    const requiredImageDefaults = [
      { ext: 'jpg', type: 'image/jpeg' },
      { ext: 'jpeg', type: 'image/jpeg' },
      { ext: 'png', type: 'image/png' },
      { ext: 'webp', type: 'image/webp' },
      { ext: 'gif', type: 'image/gif' },
      { ext: 'bmp', type: 'image/bmp' }
    ];
    for (const { ext, type } of requiredImageDefaults) {
      if (!new RegExp(`Extension="${ext}"`, 'i').test(updatedContentTypes)) {
        updatedContentTypes = updatedContentTypes.replace(
          /<Types([^>]*)>/,
          `<Types$1><Default Extension="${ext}" ContentType="${type}"/>`
        );
      }
    }

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

    // 2.5 Insert Unit Snips Slides per Variant (reflects on each variant after specification and before quotation)
    if (Array.isArray(unitSnips) && unitSnips.length > 0) {
      const templateSlideXml = baseQuotationTemplateXml;
      let globalUnitCounter = 0;

      // Group unit snips by variantId:
      // If a unit snip has variantId === 'all' or no variantId, it applies to all selected variants.
      // If it has a specific variantId, it applies only to that variant.
      for (let vIdx = 0; vIdx < allVariants.length; vIdx++) {
        const v = allVariants[vIdx];
        const vId = normalizeVariantKey(v.id);
        if (!selectedVariantIdSet.has(vId)) continue;

        let indices = v.slideIndices;
        if (typeof indices === 'string') {
          try { indices = JSON.parse(indices); } catch (e) { indices = []; }
        }
        if (!Array.isArray(indices) || indices.length < 2) continue;

        // The quotation slide is the last slide of the variant (e.g. slide 9 for LL Elite, slide 12 for Capricoast)
        const quoteSlideNum = Number(indices[indices.length - 1]);

        // Find matching unit snips for this variant
        const matchingUnitSnips = unitSnips.filter(u => {
          if (!u.variantId || u.variantId === 'all') return true;
          return normalizeVariantKey(u.variantId) === vId;
        });

        if (matchingUnitSnips.length === 0) continue;

        // Locate the quotation slide in keptSlides to insert right before it
        let insertPos = keptSlides.findIndex(s => s.displayIndex === quoteSlideNum);
        if (insertPos === -1) {
          insertPos = keptSlides.findIndex(s => s.displayIndex >= quoteSlideNum);
          if (insertPos === -1) insertPos = keptSlides.length;
        }

        for (let uIdx = 0; uIdx < matchingUnitSnips.length; uIdx++) {
          globalUnitCounter++;
          const u = matchingUnitSnips[uIdx];
          const safeVId = vId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const unitSlideTarget = `slides/slide_unit_${safeVId}_${uIdx + 1}_${globalUnitCounter}.xml`;
          const unitFullZipPath = `ppt/${unitSlideTarget}`;
          const unitSlideRelsZipPath = `ppt/slides/_rels/${path.basename(unitSlideTarget)}.rels`;
          const unitRId = `rIdUnit_${globalUnitCounter}`;
          const unitSldId = String(30000 + globalUnitCounter);

          const uTitle = escapeXml(u.title || `Unit ${uIdx + 1} Breakdown`);
          const vName = escapeXml(v.name || 'Variant');
          const uCat = escapeXml(u.category ? `${vName} • ${u.category}` : vName);

          let unitXml = templateSlideXml;
          unitXml = unitXml.replace(
            /<a:t>[\s\S]*?<\/a:t>[\s\S]*?<a:t>Quotation<\/a:t>/i,
            `<a:t>${uTitle}</a:t></a:r><a:br/><a:r><a:rPr lang="en-IN" sz="2000" dirty="0"><a:latin typeface="Baskerville Display PT"/></a:rPr><a:t>${uCat}</a:t>`
          );

          let unitRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>`;

          const uFilePath = u.filePath || u.path;
          let uBuffer = null;
          let uExt = 'png';
          if (Buffer.isBuffer(uFilePath)) {
            uBuffer = uFilePath;
            uExt = detectImageExtension(uBuffer);
          } else if (typeof uFilePath === 'string' && fs.existsSync(uFilePath)) {
            uBuffer = fs.readFileSync(uFilePath);
            uExt = detectImageExtension(uBuffer, uFilePath);
          }

          const uNotes = u.notes && u.notes.trim() ? u.notes.trim() : '';
          const hasNotes = Boolean(uNotes);
          const hasImage = Boolean(uBuffer);

          let picXml = '';
          let notesXml = '';

          if (hasImage) {
            const mediaFileName = `unit_snip_${safeVId}_${uIdx + 1}_${Date.now()}.${uExt}`;
            zip.file(`ppt/media/${mediaFileName}`, uBuffer);

            const snipRelId = `rIdUnitImg_${globalUnitCounter}`;
            const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
            unitRelsXml = unitRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);

            if (hasNotes) {
              const notesHeight = 1500000;
              const notesY = 12900000 - notesHeight;
              const availImgHeight = notesY - 2500000 - 150000;
              const bounds = calculateImageBounds(uBuffer, availImgHeight, 2500000);

              picXml = `
                <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <p:nvPicPr>
                    <p:cNvPr id="${12000 + globalUnitCounter}" name="UnitSnip_${safeVId}_${uIdx + 1}"/>
                    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                    <p:nvPr/>
                  </p:nvPicPr>
                  <p:blipFill>
                    <a:blip r:embed="${snipRelId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </p:blipFill>
                  <p:spPr>
                    <a:xfrm>
                      <a:off x="${bounds.x}" y="${bounds.y}"/>
                      <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </p:spPr>
                </p:pic>
              `.trim();

              notesXml = buildNotesShapeXml({
                id: 13000 + globalUnitCounter,
                name: `UnitNotes_${safeVId}_${uIdx + 1}`,
                text: uNotes,
                x: 622850,
                y: notesY,
                cx: 8800000,
                cy: notesHeight,
                title: `SPECIFICATION REMARKS: ${u.category || u.title || 'Unit'}`
              });
            } else {
              const bounds = calculateImageBounds(uBuffer, 10400000, 2500000);
              picXml = `
                <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <p:nvPicPr>
                    <p:cNvPr id="${12000 + globalUnitCounter}" name="UnitSnip_${safeVId}_${uIdx + 1}"/>
                    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                    <p:nvPr/>
                  </p:nvPicPr>
                  <p:blipFill>
                    <a:blip r:embed="${snipRelId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </p:blipFill>
                  <p:spPr>
                    <a:xfrm>
                      <a:off x="${bounds.x}" y="${bounds.y}"/>
                      <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </p:spPr>
                </p:pic>
              `.trim();
            }
          } else if (hasNotes) {
            notesXml = buildNotesShapeXml({
              id: 13000 + globalUnitCounter,
              name: `UnitNotes_${safeVId}_${uIdx + 1}`,
              text: uNotes,
              x: 622850,
              y: 3500000,
              cx: 8800000,
              cy: 5000000,
              title: `SPECIFICATION REMARKS: ${u.category || u.title || 'Unit'}`
            });
          }

          if (picXml) unitXml = unitXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
          if (notesXml) unitXml = unitXml.replace('</p:spTree>', `${notesXml}</p:spTree>`);

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

          // Insert right before quotation slide
          keptSlides.splice(insertPos + uIdx, 0, {
            displayIndex: quoteSlideNum - 0.5 + (uIdx * 0.01),
            baseSlideNum: quoteSlideNum,
            id: unitSldId,
            rId: unitRId,
            target: unitSlideTarget,
            fullZipPath: unitFullZipPath
          });
        }
      }
    }

    // 2.6 Insert Accessory Snips Slides (if any accessory pages are uploaded)
    if (Array.isArray(accessorySnips) && accessorySnips.length > 0) {
      const templateSlideXml = baseQuotationTemplateXml;
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
          /<a:t>[\s\S]*?<\/a:t>[\s\S]*?<a:t>Quotation<\/a:t>/i,
          `<a:t>${aTitle}</a:t></a:r><a:br/><a:r><a:rPr lang="en-IN" sz="2000" dirty="0"><a:latin typeface="Baskerville Display PT" panose="020B0604020202020204" charset="0"/><a:ea typeface="Baskerville Display PT" panose="020B0604020202020204" charset="0"/></a:rPr><a:t>${aCat}</a:t>`
        );

        let accRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>`;

        const aFilePath = a.filePath || a.path;
        let aBuffer = null;
        let aExt = 'png';
        if (Buffer.isBuffer(aFilePath)) {
          aBuffer = aFilePath;
          aExt = detectImageExtension(aBuffer);
        } else if (typeof aFilePath === 'string' && fs.existsSync(aFilePath)) {
          aBuffer = fs.readFileSync(aFilePath);
          aExt = detectImageExtension(aBuffer, aFilePath);
        }

        const aNotes = a.notes && a.notes.trim() ? a.notes.trim() : '';
        const hasNotes = Boolean(aNotes);
        const hasImage = Boolean(aBuffer);

        let picXml = '';
        let notesXml = '';

        if (hasImage) {
          const mediaFileName = `acc_snip_${aIdx + 1}_${Date.now()}.${aExt}`;
          zip.file(`ppt/media/${mediaFileName}`, aBuffer);

          const snipRelId = `rIdAccImg_${aIdx + 1}`;
          const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
          accRelsXml = accRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);

          if (hasNotes) {
            const notesHeight = 1500000;
            const notesY = 12900000 - notesHeight;
            const availImgHeight = notesY - 2500000 - 150000;
            const bounds = calculateImageBounds(aBuffer, availImgHeight, 2500000);

            picXml = `
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
                    <a:off x="${bounds.x}" y="${bounds.y}"/>
                    <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </p:spPr>
              </p:pic>
            `.trim();

            notesXml = buildNotesShapeXml({
              id: 16000 + aIdx,
              name: `AccessoryNotes_${aIdx + 1}`,
              text: aNotes,
              x: 622850,
              y: notesY,
              cx: 8800000,
              cy: notesHeight,
              title: `HARDWARE SPECIFICATION REMARKS: ${a.category || a.title || 'Accessory'}`
            });
          } else {
            const bounds = calculateImageBounds(aBuffer, 10400000, 2500000);
            picXml = `
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
                    <a:off x="${bounds.x}" y="${bounds.y}"/>
                    <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </p:spPr>
              </p:pic>
            `.trim();
          }
        } else if (hasNotes) {
          notesXml = buildNotesShapeXml({
            id: 16000 + aIdx,
            name: `AccessoryNotes_${aIdx + 1}`,
            text: aNotes,
            x: 622850,
            y: 3500000,
            cx: 8800000,
            cy: 5000000,
            title: `HARDWARE SPECIFICATION REMARKS: ${a.category || a.title || 'Accessory'}`
          });
        }

        if (picXml) accXml = accXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
        if (notesXml) accXml = accXml.replace('</p:spTree>', `${notesXml}</p:spTree>`);

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
          baseSlideNum: 9,
          id: accSldId,
          rId: accRId,
          target: accSlideTarget,
          fullZipPath: accFullZipPath
        });
      }
    }

    // Normalize snips: ensure each variant maps to an array of file paths or Buffers
    const normalizedSnips = {};
    if (snips && typeof snips === 'object') {
      for (const [k, v] of Object.entries(snips)) {
        const normK = normalizeVariantKey(k);
        const list = Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
        if (list.length > 0) {
          normalizedSnips[normK] = list;
          normalizedSnips[String(k)] = list;
        }
      }
    }

    // 2.7 Insert Additional Quotation Snip Slides for variants with multiple snips
    for (let vIdx = 0; vIdx < allVariants.length; vIdx++) {
      const v = allVariants[vIdx];
      const vId = normalizeVariantKey(v.id);
      if (!selectedVariantIdSet.has(vId)) continue;

      let indices = v.slideIndices;
      if (typeof indices === 'string') {
        try { indices = JSON.parse(indices); } catch (e) { indices = []; }
      }
      if (!Array.isArray(indices) || indices.length < 3) continue;

      const quoteSlideNum = Number(indices[2]);
      const variantSnipList = normalizedSnips[vId] || normalizedSnips[String(v.id)] || [];

      if (variantSnipList.length > 1) {
        // Find position of the variant's quotation slide in keptSlides
        const baseKeptIdx = keptSlides.findIndex(s => s.displayIndex === quoteSlideNum);
        if (baseKeptIdx === -1) continue;

        const baseSlide = keptSlides[baseKeptIdx];
        const baseSlidePath = baseSlide ? baseSlide.fullZipPath : `ppt/slides/slide${quoteSlideNum}.xml`;
        const baseSlideEntry = zip.file(baseSlidePath);
        if (!baseSlideEntry) {
          console.warn(`[PptxEngine] Base slide ${baseSlidePath} not found in zip, skipping extra snips.`);
          continue;
        }
        const baseSlideXml = await baseSlideEntry.async('text');

        for (let sIdx = 1; sIdx < variantSnipList.length; sIdx++) {
          const extraSnipFile = variantSnipList[sIdx];
          const safeVId = vId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const extraSlideTarget = `slides/slide_var_${safeVId}_snip_${sIdx + 1}.xml`;
          const extraFullZipPath = `ppt/${extraSlideTarget}`;
          const extraSlideRelsZipPath = `ppt/slides/_rels/${path.basename(extraSlideTarget)}.rels`;
          const extraRId = `rIdVarSnip_${vIdx}_${sIdx + 1}`;
          const extraSldId = String(60000 + vIdx * 100 + sIdx);

          let extraXml = baseSlideXml;
          const metaForVar = quotationPagesMetadata && (quotationPagesMetadata[vId] || quotationPagesMetadata[String(v.id)]);
          const customTitle = (metaForVar && metaForVar[sIdx]?.title) 
            || `Quotation (Page ${sIdx + 1})`;
          extraXml = extraXml.replace(
            /<a:t>Quotation<\/a:t>/,
            `<a:t>${escapeXml(customTitle)}</a:t>`
          );

          let extraBuffer = null;
          let extraExt = 'png';
          if (Buffer.isBuffer(extraSnipFile)) {
            extraBuffer = extraSnipFile;
            extraExt = detectImageExtension(extraBuffer);
          } else if (typeof extraSnipFile === 'string' && fs.existsSync(extraSnipFile)) {
            extraBuffer = fs.readFileSync(extraSnipFile);
            extraExt = detectImageExtension(extraBuffer, extraSnipFile);
          }

          let extraRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>`;

          if (extraBuffer) {
            const mediaFileName = `snip_var_${safeVId}_${sIdx + 1}_${Date.now()}.${extraExt}`;
            zip.file(`ppt/media/${mediaFileName}`, extraBuffer);

            const snipRelId = `rIdVarSnipImg_${vIdx}_${sIdx + 1}`;
            const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
            extraRelsXml = extraRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);

            const bounds = calculateImageBounds(extraBuffer);
            const picXml = `
              <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                <p:nvPicPr>
                  <p:cNvPr id="${18000 + vIdx * 100 + sIdx}" name="QuotationSnip_${safeVId}_${sIdx + 1}"/>
                  <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                  <p:nvPr/>
                </p:nvPicPr>
                <p:blipFill>
                  <a:blip r:embed="${snipRelId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </p:blipFill>
                <p:spPr>
                  <a:xfrm>
                    <a:off x="${bounds.x}" y="${bounds.y}"/>
                    <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </p:spPr>
              </p:pic>
            `.trim();
            extraXml = extraXml.replace('</p:spTree>', `${picXml}</p:spTree>`);
          }

          zip.file(extraFullZipPath, extraXml);
          zip.file(extraSlideRelsZipPath, extraRelsXml);

          updatedContentTypes = updatedContentTypes.replace(
            '</Types>',
            `<Override PartName="/ppt/${extraSlideTarget}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
          );

          updatedPresRelsXml = updatedPresRelsXml.replace(
            '</Relationships>',
            `<Relationship Id="${extraRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${extraSlideTarget}"/></Relationships>`
          );

          keptSlides.splice(baseKeptIdx + sIdx, 0, {
            displayIndex: quoteSlideNum + (sIdx * 0.01),
            baseSlideNum: quoteSlideNum,
            id: extraSldId,
            rId: extraRId,
            target: extraSlideTarget,
            fullZipPath: extraFullZipPath
          });
        }
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
    const clientName = escapeXml(String(clientInfo.name || '').trim());
    const clientContact = escapeXml(String(clientInfo.contact || clientInfo.contactNumber || '').trim());
    const clientEmail = escapeXml(String(clientInfo.email || '').trim());
    const location = escapeXml(String(clientInfo.location || '').trim());
    const dateStr = escapeXml(String(clientInfo.date ? (typeof clientInfo.date === 'string' ? clientInfo.date : new Date(clientInfo.date).toLocaleDateString('en-GB')) : new Date().toLocaleDateString('en-GB')).trim());

    const repName = escapeXml(String(repInfo.name || '').trim());
    const repContact = escapeXml(String(repInfo.contact || repInfo.contactNumber || '').trim());
    const repEmail = escapeXml(String(repInfo.email || '').trim());

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

    // Align Client Details & Architect Details card shapes precisely
    const shapeAlignments = [
      // Client Details: Labels (x = 1140000)
      { id: '60', off: { x: 1140000, y: 8168341 } },
      { id: '51', off: { x: 1140000, y: 8667320 } },
      { id: '62', off: { x: 1140000, y: 9156700 } },
      { id: '64', off: { x: 1140000, y: 9613900 } },
      // Client Details: Colons (x = 2266527)
      { id: '65', off: { x: 2266527, y: 8168341 } },
      { id: '66', off: { x: 2266527, y: 8667320 } },
      { id: '69', off: { x: 2266527, y: 9156700 } },
      { id: '68', off: { x: 2266527, y: 9613900 } },
      // Client Details: Values (x = 2420000, width = 3600000)
      { id: '73', off: { x: 2420000, y: 8095502 }, ext: { cx: 3600000, cy: 369332 } },
      { id: '74', off: { x: 2420000, y: 8594481 }, ext: { cx: 3600000, cy: 369332 } },
      { id: '76', off: { x: 2420000, y: 9083861 }, ext: { cx: 3600000, cy: 369332 } },
      { id: '77', off: { x: 2420000, y: 9541061 }, ext: { cx: 3600000, cy: 369332 } },
      // Architect Details: Icons
      { id: '27', off: { x: 4248150, y: 11456931 } },
      // Architect Details: Labels (x = 4850877)
      { id: '59', off: { x: 4850877, y: 10693847 } },
      { id: '61', off: { x: 4850877, y: 11182762 } },
      { id: '53', off: { x: 4850877, y: 11605675 } },
      // Architect Details: Colons (x = 6150000)
      { id: '71', off: { x: 6150000, y: 10693847 } },
      { id: '70', off: { x: 6150000, y: 11182762 } },
      { id: '72', off: { x: 6150000, y: 11605675 } },
      // Architect Details: Values (x = 6300000, width = 2750000)
      { id: '80', off: { x: 6300000, y: 10684772 }, ext: { cx: 2750000, cy: 307777 } },
      { id: '79', off: { x: 6300000, y: 11173687 }, ext: { cx: 2750000, cy: 307777 } },
      { id: '78', off: { x: 6300000, y: 11596600 }, ext: { cx: 2750000, cy: 307777 } }
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
          variantQuotationSlideMap.set(Number(indices[2]), normalizeVariantKey(v.id));
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
      const originalNum = slide.baseSlideNum || slide.displayIndex;
      const numRegex = new RegExp(`<a:t>\\s*${originalNum}\\s*<\\/a:t>`, 'g');
      slideXml = slideXml.replace(numRegex, `<a:t>${newSlideNumber}</a:t>`);

      // Update footer on all slides
      if (slideXml.includes(originalFooter)) {
        slideXml = slideXml.replaceAll(originalFooter, newFooter);
      } else {
        // Handle variations in whitespace or client name
        slideXml = slideXml.replaceAll('Mr. Aravindan | Individual Villa Adyar | 7418414780', newFooter);
      }

      // Normalize any legacy presentation slide text to "LL ELITE"
      slideXml = slideXml.replace(/SURABHI\s*-?\s*LL ELITE/gi, 'LL ELITE');

      // If Cover Slide (slide 1), apply all client & rep tag replacements and enforce perfect alignment
      if (slide.displayIndex === 1) {
        for (const item of coverReplacements) {
          if (item.replace !== undefined && item.replace !== null) {
            slideXml = slideXml.replace(item.search, item.replace);
          }
        }

        // Apply precise alignment and geometry transforms for Client & Architect cards
        for (const item of shapeAlignments) {
          const spRegex = new RegExp(`(<p:sp>(?:(?!<\\/p:sp>)[\\s\\S])*?id="${item.id}"[\\s\\S]*?<\\/p:sp>)`, 'g');
          slideXml = slideXml.replace(spRegex, (fullSp) => {
            let updatedSp = fullSp;
            if (item.off) {
              updatedSp = updatedSp.replace(/<a:off\s+x="\d+"\s+y="\d+"\s*\/>/, `<a:off x="${item.off.x}" y="${item.off.y}"/>`);
            }
            if (item.ext) {
              updatedSp = updatedSp.replace(/<a:ext\s+cx="\d+"\s+cy="\d+"\s*\/>/, `<a:ext cx="${item.ext.cx}" cy="${item.ext.cy}"/>`);
            }
            return updatedSp;
          });
        }
      }

      // Check if this slide is a variant quotation slide and has an uploaded snip
      const variantIdForSlide = variantQuotationSlideMap.get(slide.displayIndex);
      if (variantIdForSlide && normalizedSnips[variantIdForSlide] && normalizedSnips[variantIdForSlide].length > 0) {
        const snipFile = normalizedSnips[variantIdForSlide][0];
        let snipBuffer = null;
        let snipExt = 'png';

        if (Buffer.isBuffer(snipFile)) {
          snipBuffer = snipFile;
          snipExt = detectImageExtension(snipBuffer);
        } else if (typeof snipFile === 'string' && fs.existsSync(snipFile)) {
          snipBuffer = fs.readFileSync(snipFile);
          snipExt = detectImageExtension(snipBuffer, snipFile);
        }

        if (snipBuffer) {
          const safeVId = variantIdForSlide.replace(/[^a-zA-Z0-9_-]/g, '_');
          const mediaFileName = `snip_var_${safeVId}_1_${Date.now()}.${snipExt}`;
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

          const snipRelId = `rIdSnip_${safeVId}_1`;
          const newRel = `<Relationship Id="${snipRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaFileName}"/>`;
          slideRelsXml = slideRelsXml.replace('</Relationships>', `${newRel}</Relationships>`);
          zip.file(slideRelsPath, slideRelsXml);

          const bounds = calculateImageBounds(snipBuffer);
          const picXml = `
            <p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <p:nvPicPr>
                <p:cNvPr id="${9000 + newSlideNumber}" name="QuotationSnip_${safeVId}_1"/>
                <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
                <p:nvPr/>
              </p:nvPicPr>
              <p:blipFill>
                <a:blip r:embed="${snipRelId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="${bounds.x}" y="${bounds.y}"/>
                  <a:ext cx="${bounds.cx}" cy="${bounds.cy}"/>
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
