const Product = require('../models/Product');

const defaultProducts = [
  // Currency Packages
  {
    productId: 'coins_starter',
    name: 'Starter Coin Pack',
    description: 'Perfect for getting started with Speed Rivals premium content',
    category: 'currency',
    pricing: {
      basePrice: 99, // $0.99
      regionalPricing: [
        { currency: 'EUR', price: 89 },
        { currency: 'GBP', price: 79 },
        { currency: 'JPY', price: 110 },
        { currency: 'CAD', price: 129 },
        { currency: 'AUD', price: 139 }
      ]
    },
    currencyPackage: {
      speedCoins: 100,
      bonusCoins: 10,
      bonusPercentage: 10,
      firstTimeBonusCoins: 25
    },
    media: {
      icon: '/assets/currency/starter_pack.png',
      thumbnail: '/assets/currency/starter_pack_thumb.png'
    },
    promotions: {
      isPopular: true
    }
  },

  {
    productId: 'coins_premium',
    name: 'Premium Coin Pack',
    description: 'Great value pack for serious racers',
    category: 'currency',
    pricing: {
      basePrice: 499, // $4.99
      regionalPricing: [
        { currency: 'EUR', price: 449 },
        { currency: 'GBP', price: 399 },
        { currency: 'JPY', price: 550 },
        { currency: 'CAD', price: 649 },
        { currency: 'AUD', price: 699 }
      ]
    },
    currencyPackage: {
      speedCoins: 600,
      bonusCoins: 100,
      bonusPercentage: 16,
      firstTimeBonusCoins: 150
    },
    media: {
      icon: '/assets/currency/premium_pack.png',
      thumbnail: '/assets/currency/premium_pack_thumb.png'
    },
    promotions: {
      isBestSeller: true
    }
  },

  {
    productId: 'coins_ultimate',
    name: 'Ultimate Coin Pack',
    description: 'Maximum value for the ultimate racing experience',
    category: 'currency',
    pricing: {
      basePrice: 2999, // $29.99
      regionalPricing: [
        { currency: 'EUR', price: 2699 },
        { currency: 'GBP', price: 2399 },
        { currency: 'JPY', price: 3300 },
        { currency: 'CAD', price: 3899 },
        { currency: 'AUD', price: 4199 }
      ]
    },
    currencyPackage: {
      speedCoins: 4000,
      bonusCoins: 1000,
      bonusPercentage: 25,
      firstTimeBonusCoins: 1000
    },
    media: {
      icon: '/assets/currency/ultimate_pack.png',
      thumbnail: '/assets/currency/ultimate_pack_thumb.png'
    },
    promotions: {
      isFeatured: true
    }
  },

  // Sport Car Pack
  {
    productId: 'ferrari_f8',
    name: 'Ferrari F8 Tributo',
    description: 'Iconic Italian supercar with incredible speed and handling',
    category: 'car',
    subcategory: 'sport',
    pricing: {
      basePrice: 599, // $5.99
    },
    carDetails: {
      manufacturer: 'Ferrari',
      model: 'F8 Tributo',
      year: 2020,
      category: 'sport',
      rarity: 'epic',
      stats: {
        speed: 95,
        acceleration: 88,
        handling: 85,
        braking: 90
      }
    },
    media: {
      icon: '/assets/cars/ferrari_f8_icon.png',
      thumbnail: '/assets/cars/ferrari_f8_thumb.png',
      images: ['/assets/cars/ferrari_f8_1.png', '/assets/cars/ferrari_f8_2.png'],
      preview3D: '/assets/cars/ferrari_f8_3d.glb'
    },
    tags: ['ferrari', 'sport', 'supercar', 'italy'],
    promotions: {
      isFeatured: true
    }
  },

  {
    productId: 'lamborghini_huracan',
    name: 'Lamborghini Huracán',
    description: 'Raw power and aggressive styling from Sant\'Agata',
    category: 'car',
    subcategory: 'sport',
    pricing: {
      basePrice: 649, // $6.49
    },
    carDetails: {
      manufacturer: 'Lamborghini',
      model: 'Huracán',
      year: 2021,
      category: 'sport',
      rarity: 'epic',
      stats: {
        speed: 93,
        acceleration: 92,
        handling: 82,
        braking: 88
      }
    },
    media: {
      icon: '/assets/cars/lamborghini_huracan_icon.png',
      thumbnail: '/assets/cars/lamborghini_huracan_thumb.png',
      images: ['/assets/cars/lamborghini_huracan_1.png'],
      preview3D: '/assets/cars/lamborghini_huracan_3d.glb'
    },
    tags: ['lamborghini', 'sport', 'supercar', 'italy']
  },

  {
    productId: 'mclaren_720s',
    name: 'McLaren 720S',
    description: 'British engineering excellence with track-focused performance',
    category: 'car',
    subcategory: 'sport',
    pricing: {
      basePrice: 699, // $6.99
    },
    carDetails: {
      manufacturer: 'McLaren',
      model: '720S',
      year: 2021,
      category: 'sport',
      rarity: 'legendary',
      stats: {
        speed: 97,
        acceleration: 94,
        handling: 89,
        braking: 92
      }
    },
    media: {
      icon: '/assets/cars/mclaren_720s_icon.png',
      thumbnail: '/assets/cars/mclaren_720s_thumb.png',
      images: ['/assets/cars/mclaren_720s_1.png'],
      preview3D: '/assets/cars/mclaren_720s_3d.glb'
    },
    tags: ['mclaren', 'sport', 'supercar', 'uk']
  },

  // Electric Pack
  {
    productId: 'tesla_roadster',
    name: 'Tesla Roadster',
    description: 'The future of electric performance',
    category: 'car',
    subcategory: 'electric',
    pricing: {
      basePrice: 799, // $7.99
    },
    carDetails: {
      manufacturer: 'Tesla',
      model: 'Roadster',
      year: 2023,
      category: 'electric',
      rarity: 'legendary',
      stats: {
        speed: 100,
        acceleration: 100,
        handling: 78,
        braking: 85
      }
    },
    media: {
      icon: '/assets/cars/tesla_roadster_icon.png',
      thumbnail: '/assets/cars/tesla_roadster_thumb.png',
      images: ['/assets/cars/tesla_roadster_1.png'],
      preview3D: '/assets/cars/tesla_roadster_3d.glb'
    },
    tags: ['tesla', 'electric', 'future', 'usa'],
    promotions: {
      isFeatured: true
    }
  },

  // Classic Pack
  {
    productId: 'ford_mustang_69',
    name: '1969 Ford Mustang Boss 429',
    description: 'American muscle car legend with raw power',
    category: 'car',
    subcategory: 'classic',
    pricing: {
      basePrice: 449, // $4.49
    },
    carDetails: {
      manufacturer: 'Ford',
      model: 'Mustang Boss 429',
      year: 1969,
      category: 'classic',
      rarity: 'rare',
      stats: {
        speed: 82,
        acceleration: 85,
        handling: 65,
        braking: 70
      }
    },
    media: {
      icon: '/assets/cars/ford_mustang_69_icon.png',
      thumbnail: '/assets/cars/ford_mustang_69_thumb.png',
      images: ['/assets/cars/ford_mustang_69_1.png'],
      preview3D: '/assets/cars/ford_mustang_69_3d.glb'
    },
    tags: ['ford', 'mustang', 'classic', 'muscle', 'usa']
  },

  // Cosmetic Items
  {
    productId: 'paint_carbon_fiber',
    name: 'Carbon Fiber Paint',
    description: 'Premium carbon fiber finish for the ultimate racing look',
    category: 'cosmetic',
    pricing: {
      basePrice: 199, // $1.99
    },
    cosmeticDetails: {
      type: 'paint',
      rarity: 'epic',
      applicableTo: ['all'],
      animated: false
    },
    media: {
      icon: '/assets/cosmetics/carbon_fiber_icon.png',
      thumbnail: '/assets/cosmetics/carbon_fiber_thumb.png'
    },
    tags: ['paint', 'carbon', 'premium']
  },

  {
    productId: 'underglow_neon',
    name: 'Neon Underglow Kit',
    description: 'Customizable neon underglow lighting system',
    category: 'cosmetic',
    pricing: {
      basePrice: 299, // $2.99
    },
    cosmeticDetails: {
      type: 'effect',
      rarity: 'rare',
      applicableTo: ['all'],
      animated: true
    },
    media: {
      icon: '/assets/cosmetics/neon_underglow_icon.png',
      thumbnail: '/assets/cosmetics/neon_underglow_thumb.png'
    },
    tags: ['effect', 'neon', 'underglow', 'lights']
  },

  // Battle Pass
  {
    productId: 'battle_pass_s1',
    name: 'Season 1 Battle Pass',
    description: 'Unlock exclusive rewards as you race and level up',
    category: 'battlepass',
    pricing: {
      basePrice: 999, // $9.99
    },
    battlePassDetails: {
      season: 'season_1',
      duration: 90, // 90 days
      totalTiers: 100,
      rewards: [
        // Free tier rewards
        { tier: 1, type: 'currency', amount: 100, isPremium: false },
        { tier: 5, type: 'cosmetic', itemId: 'decal_basic_flames', isPremium: false },
        { tier: 10, type: 'currency', amount: 200, isPremium: false },
        { tier: 15, type: 'car', itemId: 'honda_civic_type_r', isPremium: false },
        { tier: 20, type: 'currency', amount: 300, isPremium: false },

        // Premium tier rewards
        { tier: 2, type: 'currency', amount: 150, isPremium: true },
        { tier: 7, type: 'cosmetic', itemId: 'paint_metallic_gold', isPremium: true },
        { tier: 12, type: 'currency', amount: 250, isPremium: true },
        { tier: 18, type: 'car', itemId: 'porsche_911_gt3', isPremium: true },
        { tier: 25, type: 'cosmetic', itemId: 'underglow_rainbow', isPremium: true },
        { tier: 100, type: 'car', itemId: 'exclusive_season_1_car', isPremium: true }
      ]
    },
    media: {
      icon: '/assets/battlepass/season_1_icon.png',
      thumbnail: '/assets/battlepass/season_1_thumb.png',
      images: ['/assets/battlepass/season_1_banner.png']
    },
    promotions: {
      isFeatured: true,
      isNew: true
    }
  },

  // Premium Subscription
  {
    productId: 'premium_monthly',
    name: 'Premium Membership',
    description: 'Unlock exclusive benefits and enhanced gameplay',
    category: 'subscription',
    pricing: {
      basePrice: 499, // $4.99/month
    },
    subscriptionDetails: {
      type: 'premium',
      duration: 'monthly',
      benefits: [
        {
          type: 'ad_free',
          description: 'Ad-free racing experience',
          value: 'No interruptions'
        },
        {
          type: 'currency',
          description: 'Monthly speed coins',
          value: '500 coins'
        },
        {
          type: 'early_access',
          description: 'Early access to new content',
          value: '24-48 hours early'
        },
        {
          type: 'analytics',
          description: 'Advanced performance analytics',
          value: 'Detailed statistics'
        },
        {
          type: 'tournaments',
          description: 'VIP tournament access',
          value: 'Exclusive events'
        }
      ],
      stripeProductId: 'prod_premium_monthly',
      stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID
    },
    media: {
      icon: '/assets/subscription/premium_icon.png',
      thumbnail: '/assets/subscription/premium_thumb.png'
    },
    promotions: {
      isFeatured: true
    }
  }
];

const initializeProducts = async () => {
  try {
    for (const productData of defaultProducts) {
      const existingProduct = await Product.findOne({ productId: productData.productId });

      if (!existingProduct) {
        // Set default values for new products
        const product = new Product({
          ...productData,
          availability: {
            isActive: true,
            releaseDate: new Date(),
            platforms: ['web', 'ios', 'android', 'windows', 'mac'],
            regions: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'JP'],
            ageRating: 'all'
          },
          seo: {
            slug: productData.productId.replace(/_/g, '-'),
            metaTitle: productData.name,
            metaDescription: productData.description,
            keywords: productData.tags || []
          }
        });

        await product.save();
        console.log(`✅ Created product: ${product.name}`);
      }
    }

    console.log('📦 Products initialization completed');
  } catch (error) {
    console.error('❌ Error initializing products:', error);
  }
};

module.exports = {
  initializeProducts,
  defaultProducts
};