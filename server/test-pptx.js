const path = require('path');
const fs = require('fs');
const PptxEngine = require('./src/services/pptxEngine');

async function runTest() {
  console.log('--- Testing PPTX Template Subtraction Engine ---');
  const masterPath = path.resolve(__dirname, '../Master-Template.pptx');
  const outputPath = path.resolve(__dirname, './uploads/generated/test_quote_result.pptx');

  console.log('Master Template Path:', masterPath);
  console.log('Template exists?', fs.existsSync(masterPath));

  const engine = new PptxEngine(masterPath);

  // All 5 variants in Master-Template:
  const allVariants = [
    { id: 'var_1', name: 'SURABHI - LL ELITE', slideIndices: [7, 8, 9] },
    { id: 'var_2', name: 'CAPRICOAST MATTE', slideIndices: [10, 11, 12] },
    { id: 'var_3', name: 'CAPRICOST GLOSSY', slideIndices: [13, 14, 15] },
    { id: 'var_4', name: 'ELEGANT SURABHI', slideIndices: [16, 17, 18] },
    { id: 'var_5', name: '4X TUFF GLOSS', slideIndices: [19, 20, 21] }
  ];

  // Test selecting ONLY variant 2 (CAPRICOAST MATTE) and variant 5 (4X TUFF GLOSS)
  // This means variants 1, 3, 4 (slides 7,8,9, 13,14,15, 16,17,18 -> 9 slides) must be DELETED!
  // Original slides = 29. Kept slides = 29 - 9 = 20 slides!
  const selectedVariantIds = ['var_2', 'var_5'];

  const clientInfo = {
    name: 'Mr. Rajesh & Ananya Verma',
    contact: '+91 98450 12345',
    email: 'rajesh.verma@gmail.com',
    location: 'Sobha Dream Acres, Panathur',
    date: '10/10/2026'
  };

  const repInfo = {
    name: 'Karthik Ramanathan',
    contact: '+91 94444 88888',
    email: 'karthik@cookscape.in'
  };

  const startTime = Date.now();
  console.log('Starting generation...');
  const result = await engine.generate({
    selectedVariantIds,
    allVariants,
    clientInfo,
    repInfo,
    outputPath
  });

  const duration = Date.now() - startTime;
  console.log('✅ Generation SUCCESS!');
  console.log(`⏱️ Duration: ${duration}ms`);
  console.log(`📊 Output File: ${result.filePath}`);
  console.log(`📑 Slide Count: ${result.slideCount} (Expected: 20)`);
  console.log(`💾 File Size: ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB`);
}

runTest().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
