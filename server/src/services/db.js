const fs = require('fs');
const path = require('path');

// Initial seed dataset without pricing
const defaultVariants = [
  {
    id: 'var-surabhi-ll-elite',
    name: 'SURABHI - LL ELITE',
    category: 'Premium Marine Interior',
    description: 'High-end Marine Ply BWR construction with frosty white carcass and solid laminate finish.',
    specs: {
      carcassMaterial: 'Marine Ply, BSL - BWR / Prelam Aqua Shield MDF-R',
      carcassFinish: 'Frosty White',
      shutterFinish: 'Laminate Solid Colors, Prelam Aqua Shield-MDF-Clr-BSL',
      shutterMaterial: 'Hydroguard Plus HDF, Prelam Aqua Shield-MDF-Clr-BSL, Commercial Ply',
      hardware: 'Dual Switch EBCO, Tyrox Nickel Brush handles & accessories',
      warranty: '10 Years Warranty'
    },
    slideIndices: [7, 8, 9],
    isDefault: true
  },
  {
    id: 'var-capricoast-matte',
    name: 'CAPRICOAST MATTE',
    category: 'Ultra Matte Contemporary',
    description: 'Greenply BWP 710 Grade carcass with ultra-smooth matte laminate shutters and Ebco fittings.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White / Grey Linum',
      shutterFinish: 'Matte Finish Laminate (Catch / New Mica)',
      shutterMaterial: 'HDHMR / GREENPLY BWP 710 Grade',
      hardware: 'EBCO Soft-Close Hinges, CNR Sliding Tracks, Hettich/Blum 15kg Lifters',
      warranty: '12 Years Warranty'
    },
    slideIndices: [10, 11, 12],
    isDefault: true
  },
  {
    id: 'var-capricost-glossy',
    name: 'CAPRICOST GLOSSY',
    category: 'High Gloss Elegance',
    description: 'High-density moisture-resistant boards with reflective high-gloss finish and precision edge-banding.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White',
      shutterFinish: 'GLOSSY Finish Laminate (HGL)',
      shutterMaterial: 'High Density High Moisture Resistant Boards (HDHMR)',
      hardware: 'EBCO 12kg Hinges, CNR 2-way track, BLUM/HETTICH 15kg lifters',
      warranty: '12 Years Warranty'
    },
    slideIndices: [13, 14, 15],
    isDefault: false
  },
  {
    id: 'var-elegant-surabhi',
    name: 'ELEGANT SURABHI',
    category: 'Architectural Grade Luxury',
    description: 'BWP 710 Gurjan Ply with super matte 1mm branded laminate and Grade 1 soft-closing hardware.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade with both side Laminate',
      carcassFinish: 'Premium Frosty Linum',
      shutterFinish: 'SUPER Matte Finish Laminate - 1mm (Merino LAM SF / RH)',
      shutterMaterial: 'BWP 710 Grade GURJAN Ply / GREENPLY HDHMR',
      hardware: 'HETTICH | EBCO Soft-Close, Anabond Hot Melt Bonding, E3/Rehau edge-banding',
      warranty: '15 Years Comprehensive Warranty'
    },
    slideIndices: [16, 17, 18],
    isDefault: false
  },
  {
    id: 'var-4x-tuff-gloss',
    name: '4X TUFF GLOSS',
    category: 'Scratch & Stain Proof Signature',
    description: 'Engineered Merino MR+ / Royal Touche gloss shutters with anti-scratch and anti-stain shield.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White Deluxe',
      shutterFinish: 'GLOSSY - SCRATCH & STAIN PROOF (Merino MR+ / Royal Touche)',
      shutterMaterial: 'BWP 710 Grade GURJAN Ply / GREENPLY HDHMR',
      hardware: 'Grade 1 Soft closing, HETTICH Kitchen Accessories, EBCO 12kg hinges',
      warranty: '15 Years Scratch-Proof Warranty'
    },
    slideIndices: [19, 20, 21],
    isDefault: false
  }
];

const defaultUsers = [
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

const defaultClients = [
  {
    id: 'client-sample-1',
    name: 'Dr. Siddharth & Meera Menon',
    contactNumber: '98401 23456',
    location: 'Skyline Waterfront Penthouse, ECR',
    email: 'client@sample.com'
  }
];

// Persistent file-based store
const storagePath = path.resolve(__dirname, '../../uploads/local_store.json');

function loadLocalStore() {
  if (fs.existsSync(storagePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      if (parsed && Array.isArray(parsed.variants)) {
        let updated = false;

        // Strip prices from all variants if present
        parsed.variants.forEach(v => {
          if ('price' in v) {
            delete v.price;
            updated = true;
          }
        });

        // Ensure users array exists with admin and proper roles
        if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = [...defaultUsers];
          updated = true;
        } else {
          // Ensure admin user exists
          const hasAdmin = parsed.users.some(u => u.role === 'admin' || u.username === 'admin');
          if (!hasAdmin) {
            parsed.users.unshift(defaultUsers[0]);
            updated = true;
          }

          // Ensure every user has username, password, role
          parsed.users.forEach((u, i) => {
            if (!u.username) {
              u.username = u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, '') : `user${i}`;
              updated = true;
            }
            if (!u.password) {
              u.password = 'arch123';
              updated = true;
            }
            if (!u.role || (u.username !== 'admin' && u.role !== 'architect')) {
              u.role = u.username === 'admin' ? 'admin' : 'architect';
              u.title = u.role === 'admin' ? 'Administrator' : 'Feasibility Architect';
              updated = true;
            }
          });
        }

        // Ensure each quotation has architect field populated
        if (Array.isArray(parsed.quotations)) {
          parsed.quotations.forEach(q => {
            if (!q.architect) {
              q.architect = q.user?.name || q.repInfo?.name || 'Cookscape Representative';
              updated = true;
            }
          });
        }

        if (updated) {
          saveLocalStore(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Warning: Could not parse local_store.json, re-initializing defaults.');
    }
  }
  const initial = {
    variants: defaultVariants,
    users: defaultUsers,
    clients: defaultClients,
    quotations: []
  };
  saveLocalStore(initial);
  return initial;
}

function saveLocalStore(data) {
  try {
    const dir = path.dirname(storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving local store:', e.message);
  }
}

// Data Access API
const dbService = {
  isPostgresReady: () => false,

  async getVariants() {
    const store = loadLocalStore();
    return store.variants || defaultVariants;
  },

  async getVariantById(id) {
    const store = loadLocalStore();
    return (store.variants || []).find(v => v.id === id);
  },

  async getUsers() {
    const store = loadLocalStore();
    // Return users without exposing raw passwords in public lists
    return (store.users || defaultUsers).map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      contactNumber: u.contactNumber,
      email: u.email,
      role: u.role || 'architect',
      title: u.title || (u.role === 'admin' ? 'Administrator' : 'Feasibility Architect'),
      createdAt: u.createdAt
    }));
  },

  async authenticateUser(username, password) {
    const store = loadLocalStore();
    const users = store.users || defaultUsers;
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanUser || !cleanPass) return null;

    // 1. Admin login: allow password 'admin' OR 'admin123' OR 'admin@123' OR matching in store
    if (cleanUser === 'admin') {
      const adminInStore = users.find(u => u.username && u.username.toLowerCase() === 'admin');
      const validAdminPass = ['admin', 'admin123', 'admin@123', 'password', String(adminInStore?.password)];
      if (validAdminPass.includes(cleanPass)) {
        return {
          id: adminInStore ? adminInStore.id : 'user-admin-1',
          username: 'admin',
          name: adminInStore?.name || 'Administrator',
          contactNumber: adminInStore?.contactNumber || '94444 88888',
          email: adminInStore?.email || 'admin@cookscape.in',
          role: 'admin',
          title: 'System Administrator'
        };
      }
    }

    // 2. Abishek login: allow password 'abishek', 'arch123', 'admin', 'admin123'
    if (cleanUser === 'abishek' || cleanUser === 'mrabishek') {
      const target = users.find(u => u.username === 'abishek' || u.username === 'mrabishek' || (u.name && u.name.toLowerCase().includes('abishek')));
      if (!target) return null;
      const validPass = ['abishek', 'arch123', 'admin', 'admin123', String(target.password)];
      if (validPass.includes(cleanPass)) {
        return {
          id: target.id,
          username: target.username || 'abishek',
          name: target.name || 'Mr. Abishek',
          contactNumber: target.contactNumber || '93611 84787',
          email: target.email || 'designs.cookscape@gmail.com',
          role: 'architect',
          title: 'Feasibility Architect'
        };
      }
    }

    // 3. Aravindan login: allow password 'aravind', 'aravindan', 'arch123', 'admin', 'admin123'
    if (cleanUser === 'aravindan' || cleanUser === 'aravind') {
      const target = users.find(u => u.username === 'aravindan' || u.username === 'aravind' || (u.name && u.name.toLowerCase().includes('aravindan')));
      if (!target) return null;
      const validPass = ['aravind', 'aravindan', 'arch123', 'admin', 'admin123', String(target.password)];
      if (validPass.includes(cleanPass)) {
        return {
          id: target.id,
          username: target.username || 'aravindan',
          name: target.name || 'Aravindan',
          contactNumber: target.contactNumber || '7418414780',
          email: target.email || 'aravind@cookscape.in',
          role: 'architect',
          title: 'Feasibility Architect'
        };
      }
    }

    // 4. Any other registered architect in store
    const matched = users.find(u => {
      const uName = (u.username || '').toLowerCase();
      const realName = (u.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchUser = uName === cleanUser || realName === cleanUser.replace(/[^a-z0-9]/g, '');
      if (!matchUser) return false;

      // Allow password match, or standard fallback arch123/admin123/their own username
      return (
        String(u.password) === cleanPass ||
        cleanPass === 'arch123' ||
        cleanPass === 'admin123' ||
        cleanPass === 'admin' ||
        cleanPass === cleanUser
      );
    });

    if (!matched) return null;

    return {
      id: matched.id,
      username: matched.username,
      name: matched.name,
      contactNumber: matched.contactNumber,
      email: matched.email,
      role: matched.role || 'architect',
      title: matched.title || (matched.role === 'admin' ? 'Administrator' : 'Feasibility Architect')
    };
  },

  async createUser(userData) {
    const store = loadLocalStore();
    if (!store.users) store.users = [...defaultUsers];

    const cleanUsername = String(userData.username || '').trim().toLowerCase();
    if (!cleanUsername) throw new Error('Username is required.');
    if (!userData.password) throw new Error('Password is required.');

    const exists = store.users.some(u => u.username && u.username.toLowerCase() === cleanUsername);
    if (exists) {
      throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
    }

    const newUser = {
      id: `user-arch-${Date.now()}`,
      username: cleanUsername,
      password: String(userData.password).trim(),
      name: userData.name || userData.username,
      contactNumber: userData.contactNumber || 'N/A',
      email: userData.email || '',
      role: userData.role || 'architect',
      title: userData.role === 'admin' ? 'Administrator' : 'Feasibility Architect',
      createdAt: new Date()
    };

    store.users.push(newUser);
    saveLocalStore(store);

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      contactNumber: newUser.contactNumber,
      email: newUser.email,
      role: newUser.role,
      title: newUser.title,
      createdAt: newUser.createdAt
    };
  },

  async deleteUser(userId) {
    const store = loadLocalStore();
    if (!store.users) return false;

    const targetIndex = store.users.findIndex(u => u.id === userId || u.username === userId);
    if (targetIndex === -1) return false;

    // Do not allow deleting the main admin account
    if (store.users[targetIndex].role === 'admin' && store.users[targetIndex].username === 'admin') {
      throw new Error('Default Administrator account cannot be deleted.');
    }

    store.users.splice(targetIndex, 1);
    saveLocalStore(store);
    return true;
  },

  async getClients() {
    const store = loadLocalStore();
    return store.clients || defaultClients;
  },

  async upsertClient(clientData) {
    const store = loadLocalStore();
    if (!store.clients) store.clients = [...defaultClients];

    let existingIndex = store.clients.findIndex(c => 
      (clientData.id && c.id === clientData.id) ||
      (c.name && clientData.name && c.name.toLowerCase() === clientData.name.toLowerCase()) || 
      (c.contactNumber && clientData.contactNumber && c.contactNumber === clientData.contactNumber)
    );

    if (existingIndex >= 0) {
      store.clients[existingIndex] = { ...store.clients[existingIndex], ...clientData, updatedAt: new Date() };
      saveLocalStore(store);
      return store.clients[existingIndex];
    } else {
      const newClient = { 
        id: clientData.id || `client-${Date.now()}`, 
        ...clientData, 
        createdAt: new Date(),
        updatedAt: new Date()
      };
      store.clients.unshift(newClient);
      saveLocalStore(store);
      return newClient;
    }
  },

  async createQuotation(quoteData) {
    const store = loadLocalStore();
    if (!store.quotations) store.quotations = [];

    const architectName = quoteData.architect || quoteData.repInfo?.name || quoteData.user?.name || 'Cookscape Representative';

    const newQuote = {
      id: quoteData.id || `quote-${Date.now()}`,
      ...quoteData,
      architect: architectName,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: (store.clients || []).find(c => c.id === quoteData.clientId) || { name: quoteData.clientInfo?.name || 'Client' },
      user: (store.users || []).find(u => u.id === quoteData.userId) || { name: architectName, role: quoteData.userRole || 'architect' }
    };

    store.quotations.unshift(newQuote);
    saveLocalStore(store);
    return newQuote;
  },

  async getQuotations({ userId, role } = {}) {
    const store = loadLocalStore();
    const all = store.quotations || [];

    // Admin can view all quotations
    if (role === 'admin') {
      return all;
    }

    // Feasibility Architect can only view quotations created by them
    if (role === 'architect' && userId) {
      const targetUser = (store.users || []).find(u => u.id === userId);
      const targetName = targetUser?.name?.toLowerCase();
      const targetEmail = targetUser?.email?.toLowerCase();
      const targetUsername = targetUser?.username?.toLowerCase();

      return all.filter(q => {
        if (q.userId === userId) return true;
        if (q.user?.id === userId) return true;
        const qArch = (q.architect || q.repInfo?.name || q.user?.name || '').toLowerCase();
        if (targetName && qArch.includes(targetName)) return true;
        if (targetUsername && qArch.includes(targetUsername)) return true;
        const qEmail = (q.repInfo?.email || q.user?.email || '').toLowerCase();
        if (targetEmail && qEmail && qEmail === targetEmail) return true;
        return false;
      });
    }

    return all;
  },

  async deleteQuotation(id) {
    const store = loadLocalStore();
    if (!store.quotations) return null;

    const index = store.quotations.findIndex(q => q.id === id);
    if (index === -1) return null;

    const removed = store.quotations.splice(index, 1)[0];
    saveLocalStore(store);
    return removed;
  }
};

module.exports = dbService;
