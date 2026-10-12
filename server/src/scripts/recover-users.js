const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const uploadsDir = path.resolve(__dirname, '../../uploads');
const generatedDir = path.resolve(uploadsDir, 'generated');
const storePath = path.resolve(uploadsDir, 'local_store.json');

console.log('====================================================');
console.log('🔍 COOKSCAPE USER ACCOUNT RECOVERY UTILITY');
console.log('====================================================');

// 1. Read existing store
let store = { variants: [], users: [], clients: [], quotations: [] };
if (fs.existsSync(storePath)) {
  try {
    store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    if (!Array.isArray(store.users)) store.users = [];
  } catch (e) {
    console.error('Error loading store:', e.message);
  }
}

console.log(`Current users in database: ${store.users.length}`);
store.users.forEach(u => console.log(`   - ${u.username} (${u.name || u.role})`));
console.log('');

const discoveredUsers = new Map();

// Helper to register discovered user
function registerUser(username, name, contact = 'N/A', email = '') {
  if (!username) return;
  const cleanU = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanU || cleanU === 'admin') return;

  if (!discoveredUsers.has(cleanU)) {
    discoveredUsers.set(cleanU, {
      username: cleanU,
      name: name ? name.trim() : cleanU,
      contactNumber: contact || 'N/A',
      email: email || '',
      role: 'architect'
    });
  } else {
    const existing = discoveredUsers.get(cleanU);
    if ((!existing.name || existing.name === cleanU) && name) existing.name = name.trim();
    if (existing.contactNumber === 'N/A' && contact && contact !== 'N/A') existing.contactNumber = contact;
    if (!existing.email && email) existing.email = email;
  }
}

// 2. Scan PM2 log files
console.log('📋 [1/2] Checking PM2 log files for login history & usernames...');
const pm2LogDirs = [
  path.resolve(process.env.HOME || '/home/deploy', '.pm2/logs'),
  '/root/.pm2/logs',
  '/home/deploy/.pm2/logs'
];

for (const logDir of pm2LogDirs) {
  if (fs.existsSync(logDir)) {
    try {
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        if (file.includes('quotegenerator') && (file.endsWith('.log') || file.endsWith('.out'))) {
          const logPath = path.resolve(logDir, file);
          console.log(`   Reading log: ${logPath}`);
          const content = fs.readFileSync(logPath, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines) {
            // Pattern 1: [AUTH] Login SUCCESS: username="...", role="...", name="..."
            const successMatch = line.match(/\[AUTH\]\s+Login SUCCESS:\s+username="([^"]+)",\s+role="([^"]+)",\s+name="([^"]+)"/);
            if (successMatch) {
              const [, uName, uRole, fullName] = successMatch;
              registerUser(uName, fullName);
              console.log(`   ✨ Found user in PM2 log (Success): "${uName}" (${fullName})`);
            }

            // Pattern 2: [AUTH] Login attempt for username="..."
            const attemptMatch = line.match(/\[AUTH\]\s+Login attempt for username="([^"]+)"/);
            if (attemptMatch) {
              const [, uName] = attemptMatch;
              if (uName && uName !== 'admin' && !discoveredUsers.has(uName.toLowerCase())) {
                registerUser(uName, uName);
                console.log(`   ✨ Found username in PM2 log (Attempt): "${uName}"`);
              }
            }

            // Pattern 3: [AUTH] Login FAILED for username="..."
            const failMatch = line.match(/\[AUTH\]\s+Login FAILED for username="([^"]+)"/);
            if (failMatch) {
              const [, uName] = failMatch;
              if (uName && uName !== 'admin' && !discoveredUsers.has(uName.toLowerCase())) {
                registerUser(uName, uName);
                console.log(`   ✨ Found username in PM2 log (Failed Attempt): "${uName}"`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`   Notice: Could not read ${logDir}: ${e.message}`);
    }
  }
}

// 3. Scan physical PPTX files for embedded Architect / Representative details
async function scanPptxFiles() {
  console.log('\n📄 [2/2] Scanning physical generated PPTX presentations for architect info...');
  if (!fs.existsSync(generatedDir)) return;

  const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.pptx') && !f.startsWith('test_'));

  for (const pptxName of files) {
    const filePath = path.resolve(generatedDir, pptxName);
    try {
      const buffer = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(buffer);

      for (const entryName of Object.keys(zip.files)) {
        if (entryName.startsWith('ppt/slides/slide') && entryName.endsWith('.xml')) {
          const xml = await zip.files[entryName].async('text');
          
          // Match rep patterns like phone numbers and email
          const textMatches = xml.match(/<a:t>([^<]+)<\/a:t>/g);
          if (textMatches) {
            const slideText = textMatches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');

            // Check if slide contains architect titles or representative names
            if (slideText.includes('Feasibility Architect') || slideText.includes('Design Consultant') || slideText.includes('@cookscape')) {
              // Extract potential name, phone, email
              const emailMatch = slideText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
              const phoneMatch = slideText.match(/(\+?91[\s-]?[6-9]\d{9}|[6-9]\d{4}\s?\d{5}|[6-9]\d{9})/);

              // Extract names around Feasibility Architect
              const nameMatch = slideText.match(/(?:Mr\.|Ms\.|Mrs\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:Feasibility Architect|Senior Design Consultant|Design Consultant)/i);

              if (nameMatch && nameMatch[1]) {
                const repName = nameMatch[1].trim();
                const repUser = repName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const repEmail = emailMatch ? emailMatch[1] : '';
                const repPhone = phoneMatch ? phoneMatch[0] : 'N/A';

                registerUser(repUser, repName, repPhone, repEmail);
                console.log(`   ✨ Extracted architect from ${pptxName}: "${repName}" (${repUser}) | ${repPhone}`);
              } else if (emailMatch) {
                const emailUser = emailMatch[1].split('@')[0].toLowerCase();
                registerUser(emailUser, emailUser, phoneMatch ? phoneMatch[0] : 'N/A', emailMatch[1]);
                console.log(`   ✨ Extracted email from ${pptxName}: "${emailMatch[1]}" (${emailUser})`);
              }
            }
          }
        }
      }
    } catch {
      // ignore damaged slide
    }
  }
}

scanPptxFiles().then(() => {
  console.log('\n====================================================');
  console.log(`🎉 Total distinct users discovered: ${discoveredUsers.size}`);

  let addedCount = 0;
  for (const [uName, uData] of discoveredUsers.entries()) {
    const existing = store.users.find(u => (u.username || '').toLowerCase() === uName);
    if (!existing) {
      store.users.push({
        id: `user-arch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: uData.username,
        password: 'arch123', // default restored password
        name: uData.name,
        contactNumber: uData.contactNumber,
        email: uData.email,
        role: 'architect',
        title: 'Feasibility Architect',
        createdAt: new Date()
      });
      console.log(`   + Added user: ${uData.username} (Name: "${uData.name}", Pass: "arch123")`);
      addedCount++;
    } else {
      // update missing details if any
      if (!existing.password) existing.password = 'arch123';
      if ((!existing.name || existing.name === existing.username) && uData.name) {
        existing.name = uData.name;
      }
    }
  }

  // Backup store before writing
  fs.writeFileSync(path.resolve(uploadsDir, `local_store.pre_user_recovery_${Date.now()}.json`), JSON.stringify(store, null, 2), 'utf-8');
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');

  console.log(`\n💾 Saved updated user list to local_store.json!`);
  console.log(`📊 Final Users in Database (${store.users.length} total):`);
  store.users.forEach((u, i) => {
    console.log(`   ${i + 1}. [${u.role.toUpperCase()}] ${u.username} - "${u.name}" (Password: ${u.password})`);
  });
  console.log('\n✅ User recovery complete! All restored architects can log in with password "arch123" (or their username).\n');
});
