const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Initial seed dataset (mirrors Master-Template.pptx)
const defaultVariants = [
  {
    id: 'var-surabhi-ll-elite',
    name: 'SURABHI - LL ELITE',
    category: 'Premium Marine Interior',
    description: 'High-end Marine Ply BWR construction with frosty white carcass and solid laminate finish.',
    price: 345000,
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
    price: 395000,
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
    price: 430000,
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
    price: 520000,
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
    price: 580000,
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
    id: 'user-sales-rep-1',
    name: 'Mr. Abishek',
    contactNumber: '93611 84787',
    email: 'designs.cookscape@gmail.com',
    role: 'Senior Design Consultant'
  }
];

const defaultClients = [
  {
    id: 'client-aravindan-1',
    name: 'Mr. Aravindan',
    contactNumber: '7418414780',
    location: 'Individual Villa Adyar',
    email: 'webapp.cookscape@gmail.com'
  }
];

// Fallback in-memory storage file
const storagePath = path.resolve(__dirname, '../../uploads/local_store.json');

function loadLocalStore() {
  if (fs.existsSync(storagePath)) {
    try {
      return JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    } catch (e) {
      // Fallback
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
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving local store:', e.message);
  }
}

let isPgConnected = false;

// Check PostgreSQL connection
async function checkPgConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPgConnected = true;
    console.log('✅ Connected to PostgreSQL database via Prisma');
    return true;
  } catch (err) {
    isPgConnected = false;
    console.warn('ℹ️ PostgreSQL is not reachable yet. Using high-resilience local data store. Once DATABASE_URL is configured, PostgreSQL will be used automatically.');
    return false;
  }
}

// Data Access API
const dbService = {
  prisma,
  checkPgConnection,
  isPostgresReady: () => isPgConnected,

  async getVariants() {
    if (isPgConnected) {
      try {
        return await prisma.variant.findMany({ orderBy: { createdAt: 'asc' } });
      } catch (e) {
        console.warn('Prisma query failed, using local store:', e.message);
      }
    }
    const store = loadLocalStore();
    return store.variants;
  },

  async getVariantById(id) {
    if (isPgConnected) {
      try {
        return await prisma.variant.findUnique({ where: { id } });
      } catch (e) {}
    }
    const store = loadLocalStore();
    return store.variants.find(v => v.id === id);
  },

  async getUsers() {
    if (isPgConnected) {
      try {
        return await prisma.user.findMany();
      } catch (e) {}
    }
    const store = loadLocalStore();
    return store.users;
  },

  async getClients() {
    if (isPgConnected) {
      try {
        return await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
      } catch (e) {}
    }
    const store = loadLocalStore();
    return store.clients;
  },

  async upsertClient(clientData) {
    if (isPgConnected) {
      try {
        if (clientData.id) {
          return await prisma.client.upsert({
            where: { id: clientData.id },
            update: clientData,
            create: clientData
          });
        } else {
          return await prisma.client.create({ data: clientData });
        }
      } catch (e) {
        console.warn('Prisma client upsert failed:', e.message);
      }
    }
    const store = loadLocalStore();
    let existingIndex = store.clients.findIndex(c => c.name === clientData.name || c.contactNumber === clientData.contactNumber);
    if (existingIndex >= 0) {
      store.clients[existingIndex] = { ...store.clients[existingIndex], ...clientData };
      saveLocalStore(store);
      return store.clients[existingIndex];
    } else {
      const newClient = { id: clientData.id || `client-${Date.now()}`, ...clientData, createdAt: new Date() };
      store.clients.unshift(newClient);
      saveLocalStore(store);
      return newClient;
    }
  },

  async createQuotation(quoteData) {
    if (isPgConnected) {
      try {
        return await prisma.quotation.create({
          data: quoteData,
          include: { client: true, user: true }
        });
      } catch (e) {
        console.warn('Prisma quotation create failed:', e.message);
      }
    }
    const store = loadLocalStore();
    const newQuote = {
      id: quoteData.id || `quote-${Date.now()}`,
      ...quoteData,
      createdAt: new Date(),
      client: store.clients.find(c => c.id === quoteData.clientId) || { name: 'Client' },
      user: store.users.find(u => u.id === quoteData.userId) || { name: 'Sales Rep' }
    };
    store.quotations.unshift(newQuote);
    saveLocalStore(store);
    return newQuote;
  },

  async getQuotations() {
    if (isPgConnected) {
      try {
        return await prisma.quotation.findMany({
          orderBy: { createdAt: 'desc' },
          include: { client: true, user: true }
        });
      } catch (e) {}
    }
    const store = loadLocalStore();
    return store.quotations;
  }
};

module.exports = dbService;
