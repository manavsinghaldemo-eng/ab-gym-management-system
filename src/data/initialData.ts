import {
  MembershipPlan,
  Trainer,
  GalleryItem,
  GymSettings,
  Member,
  RegistrationRequest,
  FeePaymentRecord,
  ActivityLogRecord,
} from '../types';

export const INITIAL_PLANS: MembershipPlan[] = [
  {
    id: 'plan-basic',
    name: 'Basic Plan',
    price: 999,
    durationMonths: 1,
    description: 'Perfect for beginners starting their fitness journey.',
    features: [
      'Full Gym Floor Access',
      'Cardio & Strength Equipment',
      'Locker & Shower Facility',
      'Free Fitness Assessment',
      'General Trainer Support',
    ],
  },
  {
    id: 'plan-standard',
    name: 'Standard Plan',
    price: 2499,
    durationMonths: 3,
    popular: true,
    badge: 'MOST POPULAR',
    description: 'Our most sought-after plan for consistent results.',
    features: [
      'Everything in Basic Plan',
      'CrossFit Arena Access',
      'Group Fitness Classes (Zumba/HIIT)',
      '1 Personalized Diet Plan Consultation',
      'Steam & Sauna Bath (1x/week)',
    ],
  },
  {
    id: 'plan-premium',
    name: 'Premium Plan',
    price: 4499,
    durationMonths: 6,
    badge: 'BEST VALUE',
    description: 'Designed for dedicated athletes seeking transformation.',
    features: [
      'Everything in Standard Plan',
      'Dedicated Personal Trainer (2 sessions/mo)',
      'Customized Workout & Diet Charts',
      'Unlimited Steam & Sauna Bath',
      'Free Supplement Consultation',
      '2 Guest Passes per month',
    ],
  },
  {
    id: 'plan-annual',
    name: 'Annual VIP Plan',
    price: 7999,
    durationMonths: 12,
    badge: 'MAX SAVINGS',
    description: 'Ultimate 365-day commitment with VIP privileges.',
    features: [
      'All Premium Plan Features for 1 Full Year',
      '4 Personal Trainer Sessions/mo',
      'Free AB Gym Branded T-Shirt & Shaker',
      'Priority Locker Allocation',
      'Free Body Composition Analysis monthly',
      '5 Guest Passes per month',
    ],
  },
];

export const INITIAL_TRAINERS: Trainer[] = [
  {
    id: 'tr-1',
    name: 'Vikram Singh',
    role: 'Head Fitness Coach & Powerlifter',
    specialty: 'Heavy Strength & Bodybuilding',
    experience: '9+ Years',
    certifications: ['ACE Certified Personal Trainer', 'K11 Master Trainer', 'CPR/AED'],
    bio: 'Former State Bodybuilding Champion specializing in hyper-trophy training, posture correction, and contest preparation.',
    imageUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=800&auto=format&fit=crop',
    phone: '9868400688',
    availableSlots: ['06:00 AM - 09:00 AM', '05:00 PM - 09:00 PM'],
    rating: 4.9,
  },
  {
    id: 'tr-2',
    name: 'Ananya Sharma',
    role: 'Functional & Weight Loss Specialist',
    specialty: 'CrossFit, HIIT & Weight Loss',
    experience: '6+ Years',
    certifications: ['CrossFit Level 2 Coach', 'ISSA Nutritionist'],
    bio: 'Expert in high-intensity metabolic conditioning, body fat reduction, and pre/post-natal fitness routines.',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop',
    phone: '9871234567',
    availableSlots: ['07:00 AM - 11:00 AM', '04:00 PM - 08:00 PM'],
    rating: 4.8,
  },
  {
    id: 'tr-3',
    name: 'Rahul Verma',
    role: 'Zumba & Cardio Master',
    specialty: 'Zumba, Functional Movement & Mobility',
    experience: '5+ Years',
    certifications: ['ZIN Certified Zumba Instructor', 'REPs Level 3'],
    bio: 'Passionate about energetic group fitness, stamina building, flexibility, and making workouts fun and sustainable.',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop',
    phone: '9811223344',
    availableSlots: ['08:00 AM - 10:00 AM', '06:00 PM - 08:00 PM'],
    rating: 4.9,
  },
  {
    id: 'tr-4',
    name: 'Priya Nair',
    role: 'Clinical Dietitian & Wellness Coach',
    specialty: 'Diet Consultation & Caloric Management',
    experience: '7+ Years',
    certifications: ['M.Sc. Clinical Nutrition', 'Certified Sports Nutritionist'],
    bio: 'Crafts tailored meal blueprints for fat loss, muscle growth, diabetic health, and metabolic enhancement.',
    imageUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=800&auto=format&fit=crop',
    phone: '9955443322',
    availableSlots: ['10:00 AM - 02:00 PM', '05:00 PM - 07:00 PM'],
    rating: 5.0,
  },
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Heavy Strength Arena',
    category: 'Equipment',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    description: 'Top-tier Rogue dumbbells, Olympic barbells, power racks, and plate-loaded machines.',
  },
  {
    id: 'gal-2',
    title: 'High-Tech Cardio Zone',
    category: 'Cardio',
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop',
    description: 'Commercial treadmills, ellipticals, stairmaster, and spin bikes with heart rate tracking.',
  },
  {
    id: 'gal-3',
    title: 'CrossFit & Functional Rig',
    category: 'CrossFit',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    description: 'Bumper plates, kettlebells, battle ropes, plyo boxes, and TRX suspension systems.',
  },
  {
    id: 'gal-4',
    title: '12-Week Transformation',
    category: 'Transformations',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop',
    description: 'Member Rohan lost 14 kg fat and gained lean muscular definition in 90 days.',
  },
  {
    id: 'gal-5',
    title: 'Energetic Zumba Class',
    category: 'Classes',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    description: 'Daily group cardio rhythm workouts guided by certified instructors.',
  },
  {
    id: 'gal-6',
    title: 'Hydration & Nutrition Bar',
    category: 'Equipment',
    imageUrl: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=800&auto=format&fit=crop',
    description: 'Fresh protein shakes, BCAA drinks, espresso, and healthy pre-workout snacks.',
  },
];

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_REGISTRATIONS: RegistrationRequest[] = [];

export const INITIAL_PAYMENTS: FeePaymentRecord[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLogRecord[] = [];


export const AB_FITNESS_UPI_ID = "8587882431@nyes";

export const INITIAL_SETTINGS: GymSettings = {
  gymName: 'AB GYM',
  tagline: 'Transform Your Body. Elevate Your Life.',
  phone: '8587882431',
  altPhone: '',
  email: 'support@manav.sbs',
  address: 'AB Gym Complex, Plot 14, Main Commercial Belt, Sector 18, New Delhi - 110075',
  upiId: AB_FITNESS_UPI_ID,
  upiName: 'AB Fitness',
  qrCodeUrl: '',
  registrationFeeDefault: 100,
  operatingHours: {
    monSat: '05:00 AM - 10:00 PM',
    sun: '06:00 AM - 12:00 PM (Special Sunday Sessions)',
  },
  announcement: '🔥 Monsoon Fitness Blast! Get 20% flat discount on 6-Month & Annual VIP Plans. Limited seats!',
  adminPasscode: 'admin123',
};
