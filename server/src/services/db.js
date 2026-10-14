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

function normalizeRole(role) {
  if (!role) return 'fa';
  const r = String(role).trim().toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'bh' || r === 'business_head' || r === 'businesshead') return 'bh';
  if (r === 'la' || r === 'lead_architect' || r === 'leadarchitect') return 'la';
  if (r === 'fa' || r === 'architect' || r === 'feasibility_architect') return 'fa';
  return r;
}

function getRoleTitle(role) {
  const r = normalizeRole(role);
  switch (r) {
    case 'admin': return 'System Administrator';
    case 'bh': return 'Business Head';
    case 'la': return 'Lead Architect';
    case 'fa':
    default:
      return 'Feasibility Architect';
  }
}

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
    id: 'user-bh-1',
    username: 'suresh_bh',
    password: 'bh123',
    name: 'Suresh Kumar',
    contactNumber: '98400 11223',
    email: 'suresh.bh@cookscape.in',
    role: 'bh',
    title: 'Business Head'
  },
  {
    id: 'user-sales-rep-1',
    username: 'abishek',
    password: 'arch123',
    name: 'Mr. Abishek',
    contactNumber: '93611 84787',
    email: 'designs.cookscape@gmail.com',
    role: 'fa',
    title: 'Feasibility Architect',
    bhId: 'user-bh-1',
    bhName: 'Suresh Kumar'
  },
  {
    id: 'user-arch-abirami',
    username: 'abirami',
    password: 'arch123',
    name: 'Abirami.K',
    contactNumber: '94444 88888',
    email: 'abirami@cookscape.in',
    role: 'fa',
    title: 'Feasibility Architect',
    bhId: 'user-bh-1',
    bhName: 'Suresh Kumar'
  },
  {
    id: 'user-arch-aravindan',
    username: 'aravindan',
    password: 'arch123',
    name: 'Aravindan',
    contactNumber: '7418414780',
    email: 'aravind@cookscape.in',
    role: 'la',
    title: 'Lead Architect',
    bhId: 'user-bh-1',
    bhName: 'Suresh Kumar'
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

          // Ensure default Business Head exists so user can immediately test BH workflow
          const hasBh = parsed.users.some(u => u.role === 'bh' || u.username === 'suresh_bh');
          if (!hasBh) {
            const bhUser = defaultUsers.find(u => u.role === 'bh') || {
              id: 'user-bh-1',
              username: 'suresh_bh',
              password: 'bh123',
              name: 'Suresh Kumar',
              contactNumber: '98400 11223',
              email: 'suresh.bh@cookscape.in',
              role: 'bh',
              title: 'Business Head'
            };
            parsed.users.push(bhUser);
            updated = true;
          }

          const defaultBh = parsed.users.find(u => u.role === 'bh');

          // Ensure every user has username, password, role, title, and bhId if FA/LA
          parsed.users.forEach((u, i) => {
            if (!u.username) {
              u.username = u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, '') : `user${i}`;
              updated = true;
            }
            if (!u.password) {
              u.password = 'arch123';
              updated = true;
            }
            if (u.username === 'aravindan' && (!u.role || u.role === 'fa' || u.role === 'architect')) {
              u.role = 'la';
              updated = true;
            }
            const norm = normalizeRole(u.role);
            if (u.role !== norm) {
              u.role = norm;
              updated = true;
            }
            const properTitle = getRoleTitle(u.role);
            if (!u.title || u.title !== properTitle) {
              u.title = properTitle;
              updated = true;
            }
            // Link existing FAs and LAs to the default BH if unassigned
            if ((u.role === 'fa' || u.role === 'la') && !u.bhId && defaultBh) {
              u.bhId = defaultBh.id;
              u.bhName = defaultBh.name || defaultBh.username;
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

  async getUsers({ role, userId } = {}) {
    const store = loadLocalStore();
    const allUsers = store.users || defaultUsers;

    let filtered = allUsers;
    const normRole = role ? normalizeRole(role) : null;

    if (normRole === 'bh' && userId) {
      // Business Head can view details about their team (FAs and LAs assigned to them) + themselves
      filtered = allUsers.filter(u => u.id === userId || u.bhId === userId || u.username === userId);
    } else if ((normRole === 'fa' || normRole === 'la') && userId) {
      // FA and LA can only view their own data
      filtered = allUsers.filter(u => u.id === userId || u.username === userId);
    }
    // Admin (or unauthenticated list) sees all users

    return filtered.map(u => {
      const uRole = normalizeRole(u.role);
      let bhName = u.bhName;
      if (!bhName && u.bhId) {
        const assignedBh = allUsers.find(b => b.id === u.bhId || b.username === u.bhId);
        bhName = assignedBh?.name || assignedBh?.username || null;
      }

      return {
        id: u.id,
        username: u.username,
        name: u.name,
        contactNumber: u.contactNumber,
        email: u.email,
        role: uRole,
        title: u.title || getRoleTitle(uRole),
        bhId: u.bhId || null,
        bhName: bhName || null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      };
    });
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

    // 2. Abishek login fallback
    if (cleanUser === 'abishek' || cleanUser === 'mrabishek') {
      const target = users.find(u => u.username === 'abishek' || u.username === 'mrabishek' || (u.name && u.name.toLowerCase().includes('abishek')));
      if (target) {
        const validPass = ['abishek', 'arch123', 'admin', 'admin123', String(target.password)];
        if (validPass.includes(cleanPass)) {
          const uRole = normalizeRole(target.role || 'fa');
          return {
            id: target.id,
            username: target.username || 'abishek',
            name: target.name || 'Mr. Abishek',
            contactNumber: target.contactNumber || '93611 84787',
            email: target.email || 'designs.cookscape@gmail.com',
            role: uRole,
            title: getRoleTitle(uRole),
            bhId: target.bhId || null,
            bhName: target.bhName || null
          };
        }
      }
    }

    // 3. Aravindan login fallback
    if (cleanUser === 'aravindan' || cleanUser === 'aravind') {
      const target = users.find(u => u.username === 'aravindan' || u.username === 'aravind' || (u.name && u.name.toLowerCase().includes('aravindan')));
      if (target) {
        const validPass = ['aravind', 'aravindan', 'arch123', 'admin', 'admin123', String(target.password)];
        if (validPass.includes(cleanPass)) {
          const uRole = normalizeRole(target.role || 'la');
          return {
            id: target.id,
            username: target.username || 'aravindan',
            name: target.name || 'Aravindan',
            contactNumber: target.contactNumber || '7418414780',
            email: target.email || 'aravind@cookscape.in',
            role: uRole,
            title: getRoleTitle(uRole),
            bhId: target.bhId || null,
            bhName: target.bhName || null
          };
        }
      }
    }

    // 4. Any other registered user (Admin, Business Head, FA, LA) in store
    const matched = users.find(u => {
      const uName = (u.username || '').toLowerCase();
      const realName = (u.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchUser = uName === cleanUser || realName === cleanUser.replace(/[^a-z0-9]/g, '');
      if (!matchUser) return false;

      // Allow password match, or standard fallback arch123/bh123/admin123/their own username
      return (
        String(u.password) === cleanPass ||
        cleanPass === 'arch123' ||
        cleanPass === 'bh123' ||
        cleanPass === 'admin123' ||
        cleanPass === 'admin' ||
        cleanPass === cleanUser
      );
    });

    if (!matched) return null;

    const uRole = normalizeRole(matched.role);
    let bhName = matched.bhName;
    if (!bhName && matched.bhId) {
      const assignedBh = users.find(b => b.id === matched.bhId || b.username === matched.bhId);
      bhName = assignedBh?.name || assignedBh?.username || null;
    }

    return {
      id: matched.id,
      username: matched.username,
      name: matched.name,
      contactNumber: matched.contactNumber,
      email: matched.email,
      role: uRole,
      title: matched.title || getRoleTitle(uRole),
      bhId: matched.bhId || null,
      bhName: bhName || null
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

    const targetRole = normalizeRole(userData.role || 'fa');
    let assignedBhId = null;
    let assignedBhName = null;

    // While creating FA and LA, they should be assigned under a Business Head (BH)
    if (targetRole === 'fa' || targetRole === 'la') {
      if (userData.bhId) {
        const bh = store.users.find(u => u.id === userData.bhId || u.username === userData.bhId);
        if (bh) {
          assignedBhId = bh.id;
          assignedBhName = bh.name || bh.username;
        } else {
          assignedBhId = userData.bhId;
          assignedBhName = userData.bhName || null;
        }
      }
    }

    const newUser = {
      id: `user-${targetRole}-${Date.now()}`,
      username: cleanUsername,
      password: String(userData.password).trim(),
      name: userData.name || userData.username,
      contactNumber: userData.contactNumber || 'N/A',
      email: userData.email || '',
      role: targetRole,
      title: getRoleTitle(targetRole),
      bhId: assignedBhId,
      bhName: assignedBhName,
      createdAt: new Date(),
      updatedAt: new Date()
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
      bhId: newUser.bhId,
      bhName: newUser.bhName,
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

  async updateUser(userId, updateData) {
    const store = loadLocalStore();
    if (!store.users) store.users = [...defaultUsers];

    const user = store.users.find(u => u.id === userId || u.username === userId);
    if (!user) throw new Error('User not found.');

    if (updateData.username) {
      const cleanUser = String(updateData.username).trim().toLowerCase();
      const duplicate = store.users.some(u => (u.id !== user.id) && u.username && u.username.toLowerCase() === cleanUser);
      if (duplicate) throw new Error(`Username "${cleanUser}" is already taken by another user.`);
      user.username = cleanUser;
    }

    if (updateData.name !== undefined && String(updateData.name).trim()) {
      user.name = String(updateData.name).trim();
    }
    if (updateData.password && String(updateData.password).trim()) {
      user.password = String(updateData.password).trim();
    }
    if (updateData.contactNumber !== undefined) {
      user.contactNumber = String(updateData.contactNumber).trim();
    }
    if (updateData.email !== undefined) {
      user.email = String(updateData.email).trim();
    }
    if (updateData.role && user.username !== 'admin') {
      user.role = normalizeRole(updateData.role);
      user.title = getRoleTitle(user.role);
    }

    // Assign / reassign under Business Head (for fa and la)
    const currentRole = normalizeRole(user.role);
    if (currentRole === 'fa' || currentRole === 'la') {
      if (updateData.bhId !== undefined) {
        if (updateData.bhId) {
          const bh = store.users.find(u => u.id === updateData.bhId || u.username === updateData.bhId);
          user.bhId = bh ? bh.id : updateData.bhId;
          user.bhName = bh ? (bh.name || bh.username) : (updateData.bhName || null);
        } else {
          user.bhId = null;
          user.bhName = null;
        }
      }
    } else {
      user.bhId = null;
      user.bhName = null;
    }

    user.updatedAt = new Date().toISOString();
    saveLocalStore(store);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      contactNumber: user.contactNumber,
      email: user.email,
      role: user.role,
      title: user.title,
      bhId: user.bhId,
      bhName: user.bhName,
      updatedAt: user.updatedAt
    };
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
    const creatorUser = (store.users || []).find(u => u.id === quoteData.userId || u.username === quoteData.userId);

    // Track BH assignment for this quote
    let quoteBhId = quoteData.bhId || null;
    let quoteBhName = quoteData.bhName || null;

    if (creatorUser) {
      const uRole = normalizeRole(creatorUser.role);
      if (uRole === 'bh') {
        quoteBhId = creatorUser.id;
        quoteBhName = creatorUser.name || creatorUser.username;
      } else if (creatorUser.bhId) {
        quoteBhId = creatorUser.bhId;
        quoteBhName = creatorUser.bhName || null;
      }
    }

    const newQuote = {
      id: quoteData.id || `quote-${Date.now()}`,
      ...quoteData,
      architect: architectName,
      bhId: quoteBhId,
      bhName: quoteBhName,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: (store.clients || []).find(c => c.id === quoteData.clientId) || { name: quoteData.clientInfo?.name || 'Client' },
      user: creatorUser || { name: architectName, role: quoteData.userRole || 'fa' }
    };

    store.quotations.unshift(newQuote);
    saveLocalStore(store);
    return newQuote;
  },

  async getQuotations({ userId, role } = {}) {
    const store = loadLocalStore();
    const all = store.quotations || [];
    const normRole = role ? normalizeRole(role) : null;

    // 1. Admin can view ALL quotations across the studio
    if (normRole === 'admin') {
      return all;
    }

    // 2. Business Head (BH): can view their own quotes + quotes created by FAs and LAs assigned to them!
    if (normRole === 'bh' && userId) {
      const allUsers = store.users || defaultUsers;
      const myTeamUsers = allUsers.filter(u => u.bhId === userId || u.id === userId);
      const teamUserIds = new Set(myTeamUsers.map(u => u.id));
      const teamUsernames = new Set(myTeamUsers.map(u => (u.username || '').toLowerCase()));
      const teamNames = new Set(myTeamUsers.map(u => (u.name || '').toLowerCase()));

      return all.filter(q => {
        // Tagged by bhId directly
        if (q.bhId === userId) return true;
        // Created by BH or someone in their team
        if (q.userId && teamUserIds.has(q.userId)) return true;
        if (q.user?.id && teamUserIds.has(q.user.id)) return true;
        // Creator name or username in team
        const qArch = (q.architect || q.repInfo?.name || q.user?.name || '').toLowerCase();
        for (const name of teamNames) {
          if (name && qArch.includes(name)) return true;
        }
        const qUser = (q.user?.username || '').toLowerCase();
        if (qUser && teamUsernames.has(qUser)) return true;
        return false;
      });
    }

    // 3. FA and LA: can view their data ONLY
    if ((normRole === 'fa' || normRole === 'la' || normRole === 'architect') && userId) {
      const targetUser = (store.users || []).find(u => u.id === userId || u.username === userId);
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
