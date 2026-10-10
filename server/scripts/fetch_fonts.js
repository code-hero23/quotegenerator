const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.resolve(__dirname, '../fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fontsToDownload = [
  // Caudex (Google Fonts)
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caudex/Caudex-Bold.ttf',
    targets: ['Caudex-Bold.ttf', 'Caudex_Bold.ttf', 'Caudex Bold.ttf']
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caudex/Caudex-Regular.ttf',
    targets: ['Caudex-Regular.ttf', 'Caudex_Regular.ttf', 'Caudex.ttf']
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caudex/Caudex-Italic.ttf',
    targets: ['Caudex-Italic.ttf', 'Caudex_Italic.ttf']
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caudex/Caudex-BoldItalic.ttf',
    targets: ['Caudex-BoldItalic.ttf', 'Caudex_BoldItalic.ttf']
  },
  // Inter (Fontsource CDN - complete Latin subsets)
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-400-normal.ttf',
    targets: ['Inter-Regular.ttf', 'Inter_Regular.ttf', 'Inter.ttf', 'inter-regular.ttf', 'inter.ttf']
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-700-normal.ttf',
    targets: ['Inter-Bold.ttf', 'Inter_Bold.ttf', 'Inter Bold.ttf', 'inter-bold.ttf']
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-600-normal.ttf',
    targets: ['Inter-SemiBold.ttf', 'Inter_SemiBold.ttf', 'Inter SemiBold.ttf']
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-500-normal.ttf',
    targets: ['Inter-Medium.ttf', 'Inter_Medium.ttf', 'Inter Medium.ttf']
  }
];

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading fonts...');
  for (const item of fontsToDownload) {
    try {
      console.log(`Fetching ${item.url}...`);
      const buffer = await download(item.url);
      for (const target of item.targets) {
        const dest = path.join(fontsDir, target);
        fs.writeFileSync(dest, buffer);
        console.log(`  Saved: ${target} (${(buffer.length / 1024).toFixed(1)} KB)`);
      }
    } catch (e) {
      console.warn(`Error downloading ${item.url}:`, e.message);
    }
  }
  console.log('All font downloads completed.');
}

main().catch(console.error);
