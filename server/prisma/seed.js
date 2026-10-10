const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const variants = [
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

async function seed() {
  console.log('--- Seeding Database ---');

  // Seed Sales Rep
  const rep = await prisma.user.upsert({
    where: { id: 'user-sales-rep-1' },
    update: {},
    create: {
      id: 'user-sales-rep-1',
      name: 'Mr. Abishek',
      contactNumber: '93611 84787',
      email: 'designs.cookscape@gmail.com',
      role: 'Senior Design Consultant'
    }
  });
  console.log(`👤 Seeded User: ${rep.name}`);

  // Seed Client
  const client = await prisma.client.upsert({
    where: { id: 'client-aravindan-1' },
    update: {},
    create: {
      id: 'client-aravindan-1',
      name: 'Mr. Aravindan',
      contactNumber: '7418414780',
      location: 'Individual Villa Adyar',
      email: 'webapp.cookscape@gmail.com'
    }
  });
  console.log(`🏢 Seeded Client: ${client.name}`);

  // Seed Variants
  for (const v of variants) {
    await prisma.variant.upsert({
      where: { id: v.id },
      update: {
        name: v.name,
        category: v.category,
        description: v.description,
        price: v.price,
        specs: v.specs,
        slideIndices: v.slideIndices,
        isDefault: v.isDefault
      },
      create: {
        id: v.id,
        name: v.name,
        category: v.category,
        description: v.description,
        price: v.price,
        specs: v.specs,
        slideIndices: v.slideIndices,
        isDefault: v.isDefault
      }
    });
    console.log(`📦 Seeded Variant: ${v.name}`);
  }

  console.log('✅ Seeding complete!');
}

seed()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
