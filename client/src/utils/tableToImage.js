/**
 * Table-to-Image Utility for Excel (XLSX) Clipboard Data
 * 
 * Parses formatted HTML tables or tab-separated text copied from Microsoft Excel / Google Sheets
 * and renders high-DPI (Retina 2x) crisp PNG images suitable for presentation slides.
 */

/**
 * Checks if clipboard event data contains tabular data from Excel or spreadsheets.
 * @param {DataTransfer} clipboardData 
 * @returns {boolean}
 */
export function hasTableClipboardData(clipboardData) {
  if (!clipboardData) return false;

  const html = clipboardData.getData('text/html');
  if (html && (html.includes('<table') || html.includes('<TABLE'))) {
    return true;
  }

  const text = clipboardData.getData('text/plain');
  if (text && text.includes('\t') && text.trim().split('\n').length >= 1) {
    return true;
  }

  return false;
}

/**
 * Parses rows and cells from HTML or TSV text.
 * @param {DataTransfer} clipboardData 
 * @returns {{ headers: string[], rows: string[][], hasHeaders: boolean } | null}
 */
export function parseClipboardTable(clipboardData) {
  if (!clipboardData) return null;

  const html = clipboardData.getData('text/html');
  if (html && (html.includes('<table') || html.includes('<TABLE'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      if (table) {
        const rows = [];
        const trList = Array.from(table.querySelectorAll('tr'));

        for (const tr of trList) {
          const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => {
            // Clean up whitespace and non-breaking spaces
            return cell.innerText ? cell.innerText.replace(/\u00a0/g, ' ').trim() : '';
          });
          if (cells.length > 0 && cells.some(c => c.length > 0)) {
            rows.push(cells);
          }
        }

        if (rows.length > 0) {
          // Normalize column count across all rows
          const maxCols = Math.max(...rows.map(r => r.length));
          const normalizedRows = rows.map(r => {
            while (r.length < maxCols) r.push('');
            return r;
          });

          return {
            headers: normalizedRows[0],
            rows: normalizedRows.slice(1),
            allRows: normalizedRows,
            colCount: maxCols,
            rowCount: normalizedRows.length
          };
        }
      }
    } catch (e) {
      console.warn('[tableToImage] Error parsing HTML table from clipboard:', e);
    }
  }

  // Fallback to TSV (Tab Separated Values)
  const text = clipboardData.getData('text/plain');
  if (text && text.includes('\t')) {
    const rawLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rows = rawLines.map(line => line.split('\t').map(c => c.trim()));

    if (rows.length > 0) {
      const maxCols = Math.max(...rows.map(r => r.length));
      const normalizedRows = rows.map(r => {
        while (r.length < maxCols) r.push('');
        return r;
      });

      return {
        headers: normalizedRows[0],
        rows: normalizedRows.slice(1),
        allRows: normalizedRows,
        colCount: maxCols,
        rowCount: normalizedRows.length
      };
    }
  }

  return null;
}

/**
 * Determines if a string represents a number or monetary value (for right-alignment).
 */
function isNumericOrCurrency(val) {
  if (!val || typeof val !== 'string') return false;
  const clean = val.replace(/[\$₹€£,\s%]/g, '');
  return clean.length > 0 && !isNaN(Number(clean));
}

/**
 * Renders parsed table data onto a high-resolution Canvas and returns a PNG File.
 * 
 * @param {Object} tableData - Result from parseClipboardTable
 * @param {Object} [options]
 * @param {string} [options.title] - Optional title banner
 * @param {string} [options.filename] - Custom output filename
 * @returns {Promise<File>}
 */
export function convertTableToImageFile(tableData, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { allRows } = tableData;
      if (!allRows || allRows.length === 0) {
        return reject(new Error('No table rows to render'));
      }

      const title = options.title || '';
      const scale = 2; // 2x Retina scale for crisp presentation fonts
      const paddingX = 18;
      const paddingY = 12;
      const headerHeight = 44;
      const rowHeight = 36;
      const titleHeight = title ? 48 : 0;
      const numCols = allRows[0].length;

      // Create an offscreen canvas for measuring text
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      const fontRegular = '13px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const fontHeader = 'bold 13px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const fontTitle = 'bold 15px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      measureCtx.font = fontRegular;

      // Calculate width for each column based on content
      const colWidths = new Array(numCols).fill(90); // minimum column width: 90px

      for (let r = 0; r < allRows.length; r++) {
        const isHeaderRow = r === 0;
        measureCtx.font = isHeaderRow ? fontHeader : fontRegular;

        for (let c = 0; c < numCols; c++) {
          const text = allRows[r][c] || '';
          const metrics = measureCtx.measureText(text);
          const requiredWidth = Math.ceil(metrics.width) + (paddingX * 2);
          if (requiredWidth > colWidths[c]) {
            colWidths[c] = Math.min(requiredWidth, 420); // max col width 420px
          }
        }
      }

      const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0);
      const totalTableHeight = titleHeight + headerHeight + ((allRows.length - 1) * rowHeight);

      // Create rendering canvas
      const canvas = document.createElement('canvas');
      canvas.width = totalTableWidth * scale;
      canvas.height = totalTableHeight * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Enable smooth text anti-aliasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Draw outer background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalTableWidth, totalTableHeight);

      let currentY = 0;

      // 2. Draw Title Banner if provided
      if (title) {
        ctx.fillStyle = '#0f172a'; // Slate-900
        ctx.fillRect(0, 0, totalTableWidth, titleHeight);

        // Gold accent bottom line
        ctx.fillStyle = '#d97706'; // Amber-600
        ctx.fillRect(0, titleHeight - 3, totalTableWidth, 3);

        ctx.font = fontTitle;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, paddingX, titleHeight / 2 - 1);

        currentY += titleHeight;
      }

      // 3. Draw Header Row
      const headerBg = title ? '#1e293b' : '#0f172a'; // Deep Navy / Slate
      ctx.fillStyle = headerBg;
      ctx.fillRect(0, currentY, totalTableWidth, headerHeight);

      ctx.font = fontHeader;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';

      let currentX = 0;
      for (let c = 0; c < numCols; c++) {
        const text = allRows[0][c] || '';
        const isNumeric = isNumericOrCurrency(text);
        const colW = colWidths[c];

        if (isNumeric) {
          ctx.textAlign = 'right';
          ctx.fillText(text, currentX + colW - paddingX, currentY + (headerHeight / 2));
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(text, currentX + paddingX, currentY + (headerHeight / 2));
        }

        // Header vertical divider
        if (c < numCols - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(currentX + colW, currentY + 6);
          ctx.lineTo(currentX + colW, currentY + headerHeight - 6);
          ctx.stroke();
        }

        currentX += colW;
      }

      currentY += headerHeight;

      // 4. Draw Data Rows
      ctx.font = fontRegular;

      for (let r = 1; r < allRows.length; r++) {
        const rowData = allRows[r];
        const isStripe = r % 2 === 1;

        // Background color (alternating row striping)
        ctx.fillStyle = isStripe ? '#ffffff' : '#f8fafc';
        ctx.fillRect(0, currentY, totalTableWidth, rowHeight);

        // Row bottom border
        ctx.strokeStyle = '#e2e8f0'; // Slate-200
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, currentY + rowHeight);
        ctx.lineTo(totalTableWidth, currentY + rowHeight);
        ctx.stroke();

        currentX = 0;
        for (let c = 0; c < numCols; c++) {
          const text = rowData[c] || '';
          const isNumeric = isNumericOrCurrency(text);
          const colW = colWidths[c];

          ctx.fillStyle = isNumeric ? '#0f172a' : '#1e293b';

          if (isNumeric) {
            ctx.textAlign = 'right';
            ctx.fillText(text, currentX + colW - paddingX, currentY + (rowHeight / 2));
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(text, currentX + paddingX, currentY + (rowHeight / 2));
          }

          // Column divider
          if (c < numCols - 1) {
            ctx.strokeStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(currentX + colW, currentY);
            ctx.lineTo(currentX + colW, currentY + rowHeight);
            ctx.stroke();
          }

          currentX += colW;
        }

        currentY += rowHeight;
      }

      // Outer border around whole table
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, totalTableWidth, totalTableHeight);

      // Convert canvas to PNG blob
      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error('Failed to create image blob from canvas'));
        }

        const filename = (options.filename || `Excel_Table_${Date.now()}`) + '.png';
        const file = new File([blob], filename, { type: 'image/png' });
        resolve(file);
      }, 'image/png', 1.0);

    } catch (err) {
      reject(err);
    }
  });
}
