const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { execSync } = require('child_process');

async function testCleanRels() {
  const masterPath = path.resolve(__dirname, '../Master-Template.pptx');
  const buf = fs.readFileSync(masterPath);
  const zip = await JSZip.loadAsync(buf);

  const presXml = await zip.file('ppt/presentation.xml').async('text');
  let presRelsXml = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
  let ctXml = await zip.file('[Content_Types].xml').async('text');

  // Parse sldId
  const sldIds = [];
  const regex = /<p:sldId\s+[^>]*?id="([^"]+)"[^>]*?r:id="([^"]+)"[^>]*?\/>/g;
  let m;
  let idx = 1;
  while ((m = regex.exec(presXml)) !== null) {
    sldIds.push({ idx: idx++, id: m[1], rId: m[2] });
  }

  // Delete slides 7, 8, 9 (Variant 1)
  const toDelete = new Set([7, 8, 9]);
  const kept = sldIds.filter(s => !toDelete.has(s.idx));
  const deleted = sldIds.filter(s => toDelete.has(s.idx));

  const newSldIdXml = kept.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  const updatedPresXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSldIdXml}</p:sldIdLst>`);
  zip.file('ppt/presentation.xml', updatedPresXml);

  // Parse rels
  for (const del of deleted) {
    const relRegex = new RegExp(`<Relationship\\s+[^>]*?Id="${del.rId}"[^>]*?\\/>`, 'g');
    presRelsXml = presRelsXml.replace(relRegex, '');
    zip.remove(`ppt/slides/slide${del.idx}.xml`);
    zip.remove(`ppt/slides/_rels/slide${del.idx}.xml.rels`);
    const ctRegex = new RegExp(`<Override\\s+PartName="\\/ppt\\/slides\\/slide${del.idx}\\.xml"[^>]*?\\/>`, 'g');
    ctXml = ctXml.replace(ctRegex, '');
  }

  zip.file('ppt/_rels/presentation.xml.rels', presRelsXml);
  zip.file('[Content_Types].xml', ctXml);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.resolve(__dirname, './uploads/generated/test_clean.pptx');
  fs.writeFileSync(outPath, outBuf);
  console.log('✅ Generated test_clean.pptx');

  const psScript = `
    $s = "${outPath.replace(/\\/g, '\\\\')}";
    try {
      $p = New-Object -ComObject PowerPoint.Application;
      $doc = $p.Presentations.Open($s, 1, 0, 0);
      Write-Output "PowerPoint Opened Cleanly! Slides: $($doc.Slides.Count)";
      $doc.Close();
      $p.Quit();
    } catch {
      Write-Output "COM Error: $($_.Exception.Message)";
    }
  `;
  const result = execSync('powershell -Command "' + psScript.replace(/\n/g, ' ') + '"').toString();
  console.log('PowerPoint Result:', result.trim());
}

testCleanRels().catch(console.error);
