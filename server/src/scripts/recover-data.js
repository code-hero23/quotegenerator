const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '../../uploads');
const generatedDir = path.resolve(uploadsDir, 'generated');
const storePath = path.resolve(uploadsDir, 'local_store.json');
const gitDir = path.resolve(__dirname, '../../../.git');

console.log('====================================================');
console.log('🔄 COOKSCAPE DATA RECOVERY UTILITY');
console.log('====================================================');
console.log(`📁 Uploads Directory:   ${uploadsDir}`);
console.log(`📁 Generated Directory: ${generatedDir}`);
console.log(`📄 Target Store File:   ${storePath}`);
console.log('====================================================\n');

// 1. Check for any Git dangling blobs (if git fsck was run)
function searchGitDanglingBlobs() {
  const lostFoundDir = path.resolve(gitDir, 'lost-found/other');
  if (!fs.existsSync(lostFoundDir)) {
    return null;
  }

  console.log('🔍 Checking .git/lost-found/other for recovered database blobs...');
  const files = fs.readdirSync(lostFoundDir);
  let bestCandidate = null;
  let maxQuotes = 0;

  for (const f of files) {
    const fPath = path.resolve(lostFoundDir, f);
    try {
      const content = fs.readFileSync(fPath, 'utf-8');
      if (content.includes('"quotations"') || content.includes('"variants"') || content.includes('"clients"')) {
        const parsed = JSON.parse(content);
        const qCount = Array.isArray(parsed.quotations) ? parsed.quotations.length : 0;
        console.log(`   Found potential database blob [${f}] with ${qCount} quotations.`);
        if (qCount > maxQuotes) {
          maxQuotes = qCount;
          bestCandidate = parsed;
        }
      }
    } catch {
      // not a JSON or invalid
    }
  }

  return bestCandidate;
}

// 2. Load current store or start with base
let currentStore = {
  variants: [],
  users: [],
  clients: [],
  quotations: []
};

if (fs.existsSync(storePath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    currentStore = {
      variants: Array.isArray(existing.variants) ? existing.variants : [],
      users: Array.isArray(existing.users) ? existing.users : [],
      clients: Array.isArray(existing.clients) ? existing.clients : [],
      quotations: Array.isArray(existing.quotations) ? existing.quotations : []
    };
    console.log(` Loaded existing store: ${currentStore.quotations.length} quotes, ${currentStore.clients.length} clients, ${currentStore.users.length} users.`);
    
    // Save immediate safety backup before recovery
    const backupPath = path.resolve(uploadsDir, `local_store.pre_recovery_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(currentStore, null, 2), 'utf-8');
    console.log(`💾 Created safety backup at: ${backupPath}\n`);
  } catch (err) {
    console.warn(`⚠️ Warning reading existing store: ${err.message}`);
  }
}

// 3. If a Git dangling blob has more data, merge it in
const gitBlob = searchGitDanglingBlobs();
if (gitBlob) {
  console.log('🔄 Merging records from Git dangling blob...');
  if (Array.isArray(gitBlob.quotations)) {
    gitBlob.quotations.forEach(q => {
      if (!currentStore.quotations.some(cq => cq.quotationNumber === q.quotationNumber || cq.id === q.id)) {
        currentStore.quotations.push(q);
        console.log(`   + Recovered quote from Git blob: ${q.quotationNumber || q.id} (${q.client?.name || 'Client'})`);
      }
    });
  }
  if (Array.isArray(gitBlob.clients)) {
    gitBlob.clients.forEach(c => {
      if (!currentStore.clients.some(cc => cc.id === c.id || (cc.name === c.name && cc.contactNumber === c.contactNumber))) {
        currentStore.clients.push(c);
        console.log(`   + Recovered client from Git blob: ${c.name}`);
      }
    });
  }
  if (Array.isArray(gitBlob.users)) {
    gitBlob.users.forEach(u => {
      if (!currentStore.users.some(cu => cu.username === u.username || cu.id === u.id)) {
        currentStore.users.push(u);
        console.log(`   + Recovered user from Git blob: ${u.username} (${u.name})`);
      }
    });
  }
}

// 4. Scan physical files in server/uploads/generated
console.log('🔍 Scanning physical files in uploads/generated for unindexed quotations...');
if (fs.existsSync(generatedDir)) {
  const generatedFiles = fs.readdirSync(generatedDir);
  const pptxFiles = generatedFiles.filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('test_'));

  let recoveredCount = 0;

  for (const pptxName of pptxFiles) {
    const pptxPath = path.resolve(generatedDir, pptxName);
    const pdfName = pptxName.replace(/\.pptx$/i, '.pdf');
    const pdfPath = path.resolve(generatedDir, pdfName);
    const hasPdf = fs.existsSync(pdfPath);

    // Extract quote number e.g. QT-123456
    const qtMatch = pptxName.match(/QT-\d+/i);
    const quoteNo = qtMatch ? qtMatch[0].toUpperCase() : `QT-${Math.floor(100000 + Math.random() * 900000)}`;

    // Check if this quotation is already in currentStore
    const existingQuote = currentStore.quotations.find(q => 
      (q.quotationNumber && q.quotationNumber.toUpperCase() === quoteNo) ||
      (q.filePath && q.filePath.includes(pptxName))
    );

    if (!existingQuote) {
      // Parse client name and date from filename: Quote_Client_Name_10_10_2026_QT-123456.pptx
      let rawClient = 'Valued Client';
      let rawDate = new Date().toISOString();

      const nameParts = pptxName.replace(/\.pptx$/i, '').split('_');
      // Format usually: Quote_[NameParts...]_[DateParts...]_[QT-xxx]
      if (nameParts.length >= 3) {
        const qtIdx = nameParts.findIndex(p => /QT-\d+/i.test(p));
        if (qtIdx > 1) {
          const clientParts = nameParts.slice(1, qtIdx - 3 > 1 ? qtIdx - 3 : 2);
          rawClient = clientParts.join(' ').replace(/_+/g, ' ').trim() || 'Valued Client';
        }
      }

      const pptxStat = fs.statSync(pptxPath);
      const pdfStat = hasPdf ? fs.statSync(pdfPath) : { size: 0 };
      const creationDate = pptxStat.mtime || new Date();

      // Ensure client exists
      let clientObj = currentStore.clients.find(c => c.name.toLowerCase() === rawClient.toLowerCase());
      if (!clientObj) {
        clientObj = {
          id: `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: rawClient,
          contactNumber: 'N/A',
          location: 'N/A',
          email: null,
          createdAt: creationDate.toISOString()
        };
        currentStore.clients.push(clientObj);
        console.log(`   + Reconstructed client: ${rawClient}`);
      }

      // Reconstruct quotation record
      const recoveredQuote = {
        id: `quote-recovered-${Date.now()}-${recoveredCount}`,
        quotationNumber: quoteNo,
        clientId: clientObj.id,
        userId: 'user-admin-1',
        date: creationDate.toISOString(),
        selectedVariants: currentStore.variants || [],
        filePath: pptxPath,
        fileSize: pptxStat.size,
        downloadUrl: `/api/quotations/download/${pptxName}`,
        pdfPath: hasPdf ? pdfPath : '',
        pdfFileSize: pdfStat.size || 0,
        pdfDownloadUrl: hasPdf ? `/api/quotations/download/${pdfName}` : '',
        createdAt: creationDate.toISOString(),
        client: clientObj,
        architect: 'Feasibility Architect'
      };

      currentStore.quotations.push(recoveredQuote);
      recoveredCount++;
      console.log(`   + Reconstructed quotation [${quoteNo}] for "${rawClient}" from physical file (${pptxName})`);
    }
  }

  console.log(`\n🎉 Total physical quotations recovered: ${recoveredCount}`);
}

// 5. Ensure core users exist so login never fails
const defaultCoreUsers = [
  {
    id: 'user-admin-1',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator',
    contactNumber: '94444 88888',
    email: 'admin@cookscape.in',
    role: 'admin',
    title: 'System Administrator'
  },
  {
    id: 'user-sales-rep-1',
    username: 'abishek',
    password: 'arch123',
    name: 'Mr. Abishek',
    contactNumber: '93611 84787',
    email: 'designs.cookscape@gmail.com',
    role: 'architect',
    title: 'Feasibility Architect'
  },
  {
    id: 'user-arch-aravindan',
    username: 'aravindan',
    password: 'arch123',
    name: 'Aravindan',
    contactNumber: '7418414780',
    email: 'aravind@cookscape.in',
    role: 'architect',
    title: 'Feasibility Architect'
  }
];

defaultCoreUsers.forEach(coreUser => {
  const existing = currentStore.users.find(u => u.username === coreUser.username);
  if (!existing) {
    currentStore.users.push(coreUser);
    console.log(`   + Restored core user: ${coreUser.username} (${coreUser.role})`);
  } else {
    // Ensure password is set
    if (!existing.password) existing.password = coreUser.password;
  }
});

// 6. Save recovered store
fs.writeFileSync(storePath, JSON.stringify(currentStore, null, 2), 'utf-8');
console.log(`\n💾 Successfully updated ${storePath}!`);
console.log(`📊 Final Status:`);
console.log(`   - Quotations: ${currentStore.quotations.length}`);
console.log(`   - Clients:    ${currentStore.clients.length}`);
console.log(`   - Users:      ${currentStore.users.length}`);
console.log('\n✅ Recovery complete! You can restart the server or PM2 now.\n');
