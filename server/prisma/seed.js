const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const defaultVariants = [
  {
    id: 'var-ll-elite',
    name: 'LL ELITE',
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
  },
  {
    id: 'client-aravindan-1',
    name: 'Mr. Aravindan',
    contactNumber: '7418414780',
    location: 'Individual Villa Adyar',
    email: 'webapp.cookscape@gmail.com'
  }
];

async function ensureSchemaBeforeSeed() {
  const ddlStatements = [
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "username" TEXT`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT 'arch123'`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "contact_number" TEXT`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "email" TEXT`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'fa'`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "title" TEXT DEFAULT 'Feasibility Architect'`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "bh_id" TEXT`,
    `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "bh_name" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "user_id" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "architect" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "bh_id" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "bh_name" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "rep_info" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "client_info" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "selected_variants" JSONB NOT NULL DEFAULT '[]'`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "selected_variant_ids" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "unit_pages_metadata" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "accessory_pages_metadata" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "snips_metadata" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "quotation_pages_metadata" JSONB`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "file_path" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "file_size" INTEGER`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "download_url" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "pdf_path" TEXT`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "pdf_file_size" INTEGER`,
    `ALTER TABLE IF EXISTS "quotations" ADD COLUMN IF NOT EXISTS "pdf_download_url" TEXT`
  ];

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (_) {
      // Table may not exist yet if prisma db push hasn't created it
    }
  }

  try {
    const existingRows = await prisma.$queryRawUnsafe(`SELECT "id", "username", "name" FROM "users"`);
    const usedUsernames = new Set(
      existingRows
        .map(r => (r.username ? String(r.username).trim().toLowerCase() : ''))
        .filter(Boolean)
    );

    for (const row of existingRows) {
      if (!row.username || !String(row.username).trim()) {
        const lowerName = String(row.name || '').toLowerCase();
        let base = 'user';
        if (row.id === 'user-admin-1' || lowerName === 'administrator') base = 'admin';
        else if (row.id === 'user-bh-1' || lowerName.includes('suresh')) base = 'suresh_bh';
        else if (row.id === 'user-sales-rep-1' || lowerName.includes('abishek')) base = 'abishek';
        else if (row.id === 'user-arch-abirami' || lowerName.includes('abirami')) base = 'abirami';
        else if (row.id === 'user-arch-aravindan' || lowerName.includes('aravind')) base = 'aravindan';
        else base = lowerName.replace(/[^a-z0-9]/g, '') || 'user';

        let candidate = base;
        if (usedUsernames.has(candidate)) {
          candidate = `${base}_${String(row.id).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase()}`;
        }
        usedUsernames.add(candidate);
        await prisma.$executeRaw`UPDATE "users" SET "username" = ${candidate} WHERE "id" = ${row.id}`;
      }
    }

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`);
  } catch (_) {
    // Ignore if table doesn't exist yet
  }
}

async function seed() {
  console.log('--- Seeding & Syncing PostgreSQL Database Safely ---');
  await ensureSchemaBeforeSeed();

  const localStorePath = path.resolve(__dirname, '../uploads/local_store.json');
  let localData = null;
  if (fs.existsSync(localStorePath)) {
    try {
      localData = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    } catch (e) {
      console.warn('Notice: Could not parse local_store.json:', e.message);
    }
  }

  // 1. Sync Users from local_store.json first (preserves all custom/edited team users on server)
  if (localData && Array.isArray(localData.users)) {
    for (const lu of localData.users) {
      if (!lu || (!lu.username && !lu.id)) continue;
      const cleanUsername = String(lu.username || lu.name || lu.id).trim().toLowerCase().replace(/\s+/g, '_');
      const existing = await prisma.user.findFirst({
        where: { OR: [{ id: lu.id || '' }, { username: cleanUsername }] }
      });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            username: existing.username || cleanUsername,
            password: lu.password || existing.password || 'arch123',
            name: lu.name || existing.name,
            contactNumber: lu.contactNumber || existing.contactNumber || 'N/A',
            email: lu.email !== undefined ? lu.email : existing.email,
            role: lu.role || existing.role || 'fa',
            title: lu.title || existing.title || 'Feasibility Architect',
            bhId: lu.bhId !== undefined ? lu.bhId : existing.bhId,
            bhName: lu.bhName !== undefined ? lu.bhName : existing.bhName
          }
        });
      } else {
        await prisma.user.create({
          data: {
            id: lu.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            username: cleanUsername,
            password: lu.password || 'arch123',
            name: lu.name || cleanUsername,
            contactNumber: lu.contactNumber || 'N/A',
            email: lu.email || '',
            role: lu.role || 'fa',
            title: lu.title || 'Feasibility Architect',
            bhId: lu.bhId || null,
            bhName: lu.bhName || null
          }
        });
      }
    }
  }

  // Seed default users ONLY if they don't already exist (never overwrite existing user details)
  for (const u of defaultUsers) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: u.id }, { username: u.username }] }
    });
    if (!existing) {
      await prisma.user.create({ data: u });
      console.log(`👤 Created Default User: ${u.name} (${u.username})`);
    }
  }

  // 2. Seed Clients without overwriting existing client details
  const clientsToSync = [
    ...(localData && Array.isArray(localData.clients) ? localData.clients : []),
    ...defaultClients
  ];
  for (const c of clientsToSync) {
    if (!c || !c.id) continue;
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name || 'Valued Client',
        contactNumber: c.contactNumber || c.contact || 'N/A',
        location: c.location || 'N/A',
        email: c.email || null
      }
    });
  }

  // 3. Seed Variants without overwriting existing variant details
  for (const v of defaultVariants) {
    await prisma.variant.upsert({
      where: { id: v.id },
      update: {},
      create: v
    });
  }

  // 4. Migrate any local store quotations if local_store.json exists (never overwrite existing quotes)
  if (localData && Array.isArray(localData.quotations) && localData.quotations.length > 0) {
    try {
      const data = localData;
      if (Array.isArray(data.quotations) && data.quotations.length > 0) {
        console.log(`📥 Migrating ${data.quotations.length} quotations from local store...`);
        for (const q of data.quotations) {
          if (!q.quotationNumber) continue;

          // Ensure client exists
          let cId = q.clientId;
          if (cId) {
            const clientExists = await prisma.client.findUnique({ where: { id: cId } });
            if (!clientExists) {
              const clientInfo = q.clientInfo || q.client || {};
              const createdClient = await prisma.client.create({
                data: {
                  id: cId,
                  name: clientInfo.name || 'Valued Client',
                  contactNumber: clientInfo.contact || clientInfo.contactNumber || 'N/A',
                  location: clientInfo.location || 'N/A',
                  email: clientInfo.email || null
                }
              });
              cId = createdClient.id;
            }
          } else {
            // Find or create default client
            const firstClient = await prisma.client.findFirst();
            cId = firstClient ? firstClient.id : defaultClients[0].id;
          }

          // Check user exists if userId given
          let uId = q.userId;
          if (uId) {
            const userExists = await prisma.user.findFirst({
              where: {
                OR: [{ id: uId }, { username: uId }]
              }
            });
            uId = userExists ? userExists.id : null;
          }

          await prisma.quotation.upsert({
            where: { quotationNumber: q.quotationNumber },
            update: {},
            create: {
              id: q.id || `quote-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              quotationNumber: q.quotationNumber,
              clientId: cId,
              userId: uId,
              architect: q.architect || q.repInfo?.name || 'Cookscape Representative',
              bhId: q.bhId || null,
              bhName: q.bhName || null,
              repInfo: q.repInfo || null,
              clientInfo: q.clientInfo || null,
              selectedVariants: q.selectedVariants || [],
              selectedVariantIds: q.selectedVariantIds || null,
              unitPagesMetadata: q.unitPagesMetadata || null,
              accessoryPagesMetadata: q.accessoryPagesMetadata || null,
              snipsMetadata: q.snipsMetadata || null,
              quotationPagesMetadata: q.quotationPagesMetadata || null,
              filePath: q.filePath || '',
              fileSize: q.fileSize || 0,
              downloadUrl: q.downloadUrl || null,
              pdfPath: q.pdfPath || null,
              pdfFileSize: q.pdfFileSize || 0,
              pdfDownloadUrl: q.pdfDownloadUrl || null,
              date: q.date ? new Date(q.date) : new Date()
            }
          });
        }
        console.log(`✅ Quotation records migrated to PostgreSQL successfully!`);
      }
    } catch (e) {
      console.warn('Notice: Local store migration warning:', e.message);
    }
  }

  console.log('✅ PostgreSQL database seeding completed successfully!');
}

seed()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
