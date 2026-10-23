const fs = require('fs');
const path = require('path');

/**
 * Robust resolver for the Cookscape Master Presentation Template PPTX.
 * Checks environment variable, standard paths, and falls back to matching
 * any file variant such as 'Master-Template.pptx' or 'Master-Template----.pptx'.
 */
function resolveMasterTemplatePath() {
  const candidates = [];

  // 1. Explicit environment variable configured
  if (process.env.MASTER_TEMPLATE_PATH) {
    candidates.push(path.resolve(process.env.MASTER_TEMPLATE_PATH));
    candidates.push(path.resolve(__dirname, '../../..', process.env.MASTER_TEMPLATE_PATH));
    candidates.push(path.resolve(__dirname, '../..', process.env.MASTER_TEMPLATE_PATH));
  }

  // 2. Standard convention locations
  candidates.push(path.resolve(__dirname, '../../../Master-Template.pptx'));
  candidates.push(path.resolve(__dirname, '../../Master-Template.pptx'));
  candidates.push(path.resolve(process.cwd(), 'Master-Template.pptx'));
  candidates.push(path.resolve(process.cwd(), '../Master-Template.pptx'));

  // Return first candidate that physically exists
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. Resilient fallback: search parent & root directories for any Master-Template*.pptx
  const searchDirs = [
    process.env.MASTER_TEMPLATE_PATH ? path.dirname(path.resolve(process.env.MASTER_TEMPLATE_PATH)) : null,
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../..'),
    process.cwd(),
    path.resolve(process.cwd(), '..')
  ].filter(Boolean);

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const match = files.find(f => {
          const lower = f.toLowerCase();
          return lower.startsWith('master-template') && lower.endsWith('.pptx');
        });
        if (match) {
          return path.resolve(dir, match);
        }
      } catch (err) {
        // continue search
      }
    }
  }

  // Default fallback if not found anywhere
  return process.env.MASTER_TEMPLATE_PATH
    ? path.resolve(process.env.MASTER_TEMPLATE_PATH)
    : path.resolve(__dirname, '../../../Master-Template.pptx');
}

module.exports = { resolveMasterTemplatePath };
