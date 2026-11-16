import {
  DiscountType,
  Gender,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ProductStatus,
  SurveyAudienceType,
  SurveyQuestionType,
  SurveyResponseStatus,
  SurveyScope,
  SurveyStatus,
  SurveyTriggerType,
  UserStatus,
  VoucherScope,
  VoucherStatus,
} from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function uuid(group: number, index: number): string {
  const g = String(group).padStart(4, '0');
  const idx = String(index).padStart(12, '0');
  return `${g}0000-0000-4000-8000-${idx}`;
}

function isoDate(value: string): Date {
  return new Date(value);
}

interface SeedProductSpec {
  name: string;
  slug: string;
  categorySlug: string;
  status: ProductStatus;
  description: string;
  basePrice: number;
  sizes: string[];
  colors: Array<{ color: string; images: string[] }>;
}

async function clearAllTables() {
  // Delete in strict reverse foreign-key dependency order across all 23 tables
  await prisma.notification.deleteMany();
  await prisma.surveyAnswer.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.surveyOption.deleteMany();
  await prisma.surveyQuestion.deleteMany();
  await prisma.survey.deleteMany();

  await prisma.review.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.voucherDetail.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderDetail.deleteMany();
  await prisma.order.deleteMany();

  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productFavorite.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.category.deleteMany();

  await prisma.clientAddress.deleteMany();
  await prisma.client.deleteMany();
  await prisma.admin.deleteMany();
}

async function main() {
  console.log('============================================================');
  console.log(' KHOI TAO DU LIEU DEMO HE THONG MIVA CRM (23 BANG CSDL)');
  console.log('============================================================');

  await clearAllTables();
  const passwordHash = await bcrypt.hash('123456', 10);

  // =========================================================================
  // 1. ADMIN ACCOUNTS (SUPER_ADMIN & CRM_MANAGER)
  // =========================================================================
  const adminsData = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'Nguyễn Tuấn Hào (Admin Server)',
      email: 'admin@miva.vn',
      password: passwordHash,
      phone: '0901000001',
      department: 'SUPER_ADMIN',
      roleCode: 'SUPER_ADMIN',
      status: UserStatus.active,
      createdAt: isoDate('2026-09-01T08:00:00.000Z'),
    },
    {
      id: '11111111-1111-4111-8111-111111111112',
      fullName: 'Trương Nhật Long (Admin Dự phòng)',
      email: 'admin2@miva.vn',
      password: passwordHash,
      phone: '0901000002',
      department: 'SUPER_ADMIN',
      roleCode: 'SUPER_ADMIN',
      status: UserStatus.active,
      createdAt: isoDate('2026-09-02T08:30:00.000Z'),
    },
    {
      id: '22222222-2222-4222-8222-222222222221',
      fullName: 'Trần Minh Khoa (Trưởng phòng CRM)',
      email: 'crm@miva.vn',
      password: passwordHash,
      phone: '0902000001',
      department: 'CRM_MANAGER',
      roleCode: 'CRM_MANAGER',
      status: UserStatus.active,
      createdAt: isoDate('2026-09-03T09:00:00.000Z'),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Hà Nguyễn Thy Ân (Chuyên viên CRM)',
      email: 'crm2@miva.vn',
      password: passwordHash,
      phone: '0902000002',
      department: 'CRM_MANAGER',
      roleCode: 'CRM_MANAGER',
      status: UserStatus.active,
      createdAt: isoDate('2026-09-04T09:15:00.000Z'),
    },
    {
      id: '22222222-2222-4222-8222-222222222223',
      fullName: 'Mạc Anh Hào (CRM Tạm khóa Demo)',
      email: 'crm.locked@miva.vn',
      password: passwordHash,
      phone: '0902000003',
      department: 'CRM_MANAGER',
      roleCode: 'CRM_MANAGER',
      status: UserStatus.inactive,
      createdAt: isoDate('2026-09-10T10:00:00.000Z'),
    },
  ];

  for (const admin of adminsData) {
    await prisma.admin.create({ data: admin });
  }
  const crmMainId = adminsData[2].id;
  const crmSubId = adminsData[3].id;
  const adminMainId = adminsData[0].id;

  // =========================================================================
  // 2. CLIENT ACCOUNTS (18 KH phủ đủ 6 nhóm tuổi <18, 18-24, 25-34, 35-44, 45-54, 55+)
  // =========================================================================
  const clientsSpec = [
    // Demo Primary Test Clients
    {
      id: '33333333-3333-4333-8333-333333333331',
      fullName: 'Nguyễn Văn Minh',
      email: 'client1@miva.vn',
      phone: '0909111222',
      gender: Gender.male,
      dob: '2001-05-15', // 25t (25-34)
      loyaltyPoints: 520,
      status: UserStatus.active,
      createdAt: '2026-09-12T08:20:00.000Z',
    },
    {
      id: '33333333-3333-4333-8333-333333333332',
      fullName: 'Trần Thị Lan Anh',
      email: 'client2@miva.vn',
      phone: '0909222333',
      gender: Gender.female,
      dob: '2003-08-20', // 23t (18-24)
      loyaltyPoints: 380,
      status: UserStatus.active,
      createdAt: '2026-09-14T09:10:00.000Z',
    },
    // Nhóm <18 tuổi (sinh 2009 - 2010)
    {
      id: uuid(1002, 3),
      fullName: 'Lê Hoàng Gia Bảo',
      email: 'giabao.le09@gmail.com',
      phone: '0912300103',
      gender: Gender.male,
      dob: '2009-04-12',
      loyaltyPoints: 90,
      status: UserStatus.active,
      createdAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: uuid(1002, 4),
      fullName: 'Phạm Ngọc Bảo Trân',
      email: 'baotran.pham10@gmail.com',
      phone: '0912300104',
      gender: Gender.female,
      dob: '2010-02-18',
      loyaltyPoints: 110,
      status: UserStatus.active,
      createdAt: '2026-09-22T11:30:00.000Z',
    },
    // Nhóm 18-24 tuổi (sinh 2002 - 2006)
    {
      id: uuid(1002, 5),
      fullName: 'Võ Minh Thư',
      email: 'minhthu.vo@gmail.com',
      phone: '0912300105',
      gender: Gender.female,
      dob: '2004-11-05',
      loyaltyPoints: 290,
      status: UserStatus.active,
      createdAt: '2026-09-25T14:00:00.000Z',
    },
    {
      id: uuid(1002, 6),
      fullName: 'Đặng Quốc Khánh',
      email: 'quockhanh.dang@gmail.com',
      phone: '0912300106',
      gender: Gender.male,
      dob: '2005-03-22',
      loyaltyPoints: 210,
      status: UserStatus.active,
      createdAt: '2026-09-28T15:20:00.000Z',
    },
    {
      id: uuid(1002, 7),
      fullName: 'Bùi Khánh Linh',
      email: 'khanhlinh.bui@gmail.com',
      phone: '0912300107',
      gender: Gender.female,
      dob: '2002-07-19',
      loyaltyPoints: 430,
      status: UserStatus.active,
      createdAt: '2026-10-01T08:45:00.000Z',
    },
    // Nhóm 25-34 tuổi (sinh 1993 - 2000)
    {
      id: uuid(1002, 8),
      fullName: 'Hoàng Đức Thịnh',
      email: 'ducthinh.hoang@gmail.com',
      phone: '0912300108',
      gender: Gender.male,
      dob: '1997-09-10',
      loyaltyPoints: 610,
      status: UserStatus.active,
      createdAt: '2026-10-03T09:15:00.000Z',
    },
    {
      id: uuid(1002, 9),
      fullName: 'Ngô Thanh Hà',
      email: 'thanhha.ngo@gmail.com',
      phone: '0912300109',
      gender: Gender.female,
      dob: '1996-01-25',
      loyaltyPoints: 490,
      status: UserStatus.active,
      createdAt: '2026-10-05T10:40:00.000Z',
    },
    {
      id: uuid(1002, 10),
      fullName: 'Đỗ Tuấn Kiệt',
      email: 'tuankiet.do@gmail.com',
      phone: '0912300110',
      gender: Gender.male,
      dob: '1999-06-14',
      loyaltyPoints: 340,
      status: UserStatus.active,
      createdAt: '2026-10-08T13:10:00.000Z',
    },
    {
      id: uuid(1002, 11),
      fullName: 'Lý Phương Thảo',
      email: 'phuongthao.ly@gmail.com',
      phone: '0912300111',
      gender: Gender.other,
      dob: '1995-12-03',
      loyaltyPoints: 275,
      status: UserStatus.active,
      createdAt: '2026-10-10T16:00:00.000Z',
    },
    // Nhóm 35-44 tuổi (sinh 1983 - 1991)
    {
      id: uuid(1002, 12),
      fullName: 'Trịnh Quang Huy',
      email: 'quanghuy.trinh@gmail.com',
      phone: '0912300112',
      gender: Gender.male,
      dob: '1988-04-08',
      loyaltyPoints: 720,
      status: UserStatus.active,
      createdAt: '2026-10-12T08:30:00.000Z',
    },
    {
      id: uuid(1002, 13),
      fullName: 'Phan Mỹ Duyên',
      email: 'myduyen.phan@gmail.com',
      phone: '0912300113',
      gender: Gender.female,
      dob: '1990-10-28',
      loyaltyPoints: 560,
      status: UserStatus.active,
      createdAt: '2026-10-15T11:20:00.000Z',
    },
    {
      id: uuid(1002, 14),
      fullName: 'Vương Đình Nam',
      email: 'dinhnam.vuong@gmail.com',
      phone: '0912300114',
      gender: Gender.male,
      dob: '1985-02-17',
      loyaltyPoints: 410,
      status: UserStatus.active,
      createdAt: '2026-10-18T14:50:00.000Z',
    },
    // Nhóm 45-54 tuổi (sinh 1973 - 1981)
    {
      id: uuid(1002, 15),
      fullName: 'Đinh Thị Kim Chi',
      email: 'kimchi.dinh@gmail.com',
      phone: '0912300115',
      gender: Gender.female,
      dob: '1978-07-09',
      loyaltyPoints: 650,
      status: UserStatus.active,
      createdAt: '2026-10-22T09:00:00.000Z',
    },
    {
      id: uuid(1002, 16),
      fullName: 'Hồ Trọng Nghĩa',
      email: 'trongnghia.ho@gmail.com',
      phone: '0912300116',
      gender: Gender.male,
      dob: '1975-11-21',
      loyaltyPoints: 480,
      status: UserStatus.active,
      createdAt: '2026-10-26T10:15:00.000Z',
    },
    // Nhóm 55+ tuổi (sinh <= 1971)
    {
      id: uuid(1002, 17),
      fullName: 'Nguyễn Thị Thu Thủy',
      email: 'thuthuy.nguyen68@gmail.com',
      phone: '0912300117',
      gender: Gender.female,
      dob: '1968-05-30',
      loyaltyPoints: 390,
      status: UserStatus.active,
      createdAt: '2026-11-02T08:00:00.000Z',
    },
    // Khách hàng bị khóa tài khoản (Demo khóa/mở khóa ở CRM & Admin Server)
    {
      id: uuid(1002, 18),
      fullName: 'Lương Văn Tùng (Bom hàng - Đã khóa)',
      email: 'khach.vipham@miva.vn',
      phone: '0912300118',
      gender: Gender.male,
      dob: '1998-09-09',
      loyaltyPoints: 0,
      status: UserStatus.inactive,
      createdAt: '2026-10-20T13:00:00.000Z',
    },
  ];

  for (const c of clientsSpec) {
    await prisma.client.create({
      data: {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        password: passwordHash,
        phone: c.phone,
        gender: c.gender,
        dateOfBirth: isoDate(`${c.dob}T00:00:00.000Z`),
        loyaltyPoints: c.loyaltyPoints,
        status: c.status,
        createdAt: isoDate(c.createdAt),
      },
    });
  }

  const client1Id = clientsSpec[0].id;
  const client2Id = clientsSpec[1].id;
  const activeClients = clientsSpec.filter((c) => c.status === UserStatus.active);

  // =========================================================================
  // 3. CLIENT ADDRESSES (24 địa chỉ giao hàng thực tế)
  // =========================================================================
  const sampleLocations = [
    { line: '273 An Dương Vương', ward: 'Phường 3', district: 'Quận 5', province: 'TP. Hồ Chí Minh' },
    { line: '120 Nguyễn Huệ', ward: 'Phường Bến Nghé', district: 'Quận 1', province: 'TP. Hồ Chí Minh' },
    { line: '458 Nguyễn Thị Minh Khai', ward: 'Phường 2', district: 'Quận 3', province: 'TP. Hồ Chí Minh' },
    { line: '88 Cầu Giấy', ward: 'Phường Quan Hoa', district: 'Quận Cầu Giấy', province: 'Hà Nội' },
    { line: '25 Lý Thường Kiệt', ward: 'Phường Phan Chu Trinh', district: 'Quận Hoàn Kiếm', province: 'Hà Nội' },
    { line: '56 Nguyễn Văn Linh', ward: 'Phường Nam Dương', district: 'Quận Hải Châu', province: 'Đà Nẵng' },
    { line: '19 Đại lộ Hòa Bình', ward: 'Phường Tân An', district: 'Quận Ninh Kiều', province: 'Cần Thơ' },
    { line: '302 Võ Văn Ngân', ward: 'Phường Bình Thọ', district: 'TP. Thủ Đức', province: 'TP. Hồ Chí Minh' },
  ];

  let addrSeq = 1;
  const defaultAddressByClient = new Map<
    string,
    { receiverName: string; phone: string; fullAddress: string }
  >();

  for (let i = 0; i < clientsSpec.length; i++) {
    const c = clientsSpec[i];
    const loc = sampleLocations[i % sampleLocations.length];
    const fullAddr = `${loc.line}, ${loc.ward}, ${loc.district}, ${loc.province}`;
    await prisma.clientAddress.create({
      data: {
        id: uuid(1003, addrSeq++),
        clientId: c.id,
        receiverName: c.fullName.replace(' (Bom hàng - Đã khóa)', ''),
        phone: c.phone,
        addressLine: loc.line,
        ward: loc.ward,
        district: loc.district,
        province: loc.province,
        label: 'Nhà riêng',
        isDefault: true,
      },
    });
    defaultAddressByClient.set(c.id, {
      receiverName: c.fullName.replace(' (Bom hàng - Đã khóa)', ''),
      phone: c.phone,
      fullAddress: fullAddr,
    });

    // Thêm địa chỉ thứ 2 (Văn phòng) cho 6 khách hàng đầu (bao gồm client1 & client2)
    if (i < 6) {
      const officeLoc = sampleLocations[(i + 2) % sampleLocations.length];
      await prisma.clientAddress.create({
        data: {
          id: uuid(1003, addrSeq++),
          clientId: c.id,
          receiverName: c.fullName,
          phone: c.phone,
          addressLine: officeLoc.line,
          ward: officeLoc.ward,
          district: officeLoc.district,
          province: officeLoc.province,
          label: 'Văn phòng',
          isDefault: false,
        },
      });
    }
  }

  // =========================================================================
  // 4. CATEGORIES (7 danh mục Thời trang & Phụ kiện MIVA chuẩn hóa)
  // =========================================================================
  const categoriesSpec = [
    { id: uuid(1004, 1), name: 'Áo Thun & Áo Polo', slug: 'ao-thun-ao-polo' },
    { id: uuid(1004, 2), name: 'Áo Sơ Mi Công Sở', slug: 'ao-so-mi-cong-so' },
    { id: uuid(1004, 3), name: 'Áo Khoác & Blazer', slug: 'ao-khoac-blazer' },
    { id: uuid(1004, 4), name: 'Quần Jeans & Kaki', slug: 'quan-jeans-kaki' },
    { id: uuid(1004, 5), name: 'Đầm & Chân Váy Nữ', slug: 'dam-chan-vay-nu' },
    { id: uuid(1004, 6), name: 'Giày Sneaker & Loafer', slug: 'giay-sneaker-loafer' },
    { id: uuid(1004, 7), name: 'Túi Xách & Phụ Kiện', slug: 'tui-xach-phu-kien' },
  ];

  const categoryIdBySlug = new Map<string, string>();
  for (const cat of categoriesSpec) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        createdAt: isoDate('2026-09-05T08:00:00.000Z'),
      },
    });
    categoryIdBySlug.set(cat.slug, cat.id);
  }

  // =========================================================================
  // 5. PRODUCTS (21), PRODUCT COLORS (42) & PRODUCT VARIANTS (84)
  // =========================================================================
  const IMG = {
    tee1: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=640&q=80',
    tee2: 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=640&q=80',
    polo1: 'https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=640&q=80',
    shirt1: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=640&q=80',
    shirt2: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=640&q=80',
    jacket1: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=640&q=80',
    jacket2: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=640&q=80',
    jeans1: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=640&q=80',
    jeans2: 'https://images.unsplash.com/photo-1434389677669-e08b4cda3f95?w=640&q=80',
    dress1: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=640&q=80',
    dress2: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=640&q=80',
    dress3: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=640&q=80',
    shoe1: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&q=80',
    shoe2: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=640&q=80',
    shoe3: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=640&q=80',
    bag1: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=640&q=80',
    bag2: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=80',
    bag3: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=640&q=80',
  };

  const productsSpec: SeedProductSpec[] = [
    // 1. Áo Thun & Áo Polo
    {
      name: 'Áo Polo Nam Pique MIVA Signature',
      slug: 'ao-polo-nam-pique-miva-signature',
      categorySlug: 'ao-thun-ao-polo',
      status: ProductStatus.active,
      description: 'Chất vải cá sấu Cotton Pique thoáng khí 4 chiều, bo cổ dệt cao cấp giữ form chuẩn sau nhiều lần giặt.',
      basePrice: 299000,
      sizes: ['M', 'L', 'XL'],
      colors: [
        { color: 'Trắng Kem', images: [IMG.tee1, IMG.polo1] },
        { color: 'Xanh Navy', images: [IMG.polo1, IMG.tee2] },
      ],
    },
    {
      name: 'Áo Thun Unisex Cotton Compact 250gsm',
      slug: 'ao-thun-unisex-cotton-compact-250gsm',
      categorySlug: 'ao-thun-ao-polo',
      status: ProductStatus.active,
      description: 'Áo thun form Relaxed Fit trẻ trung, 100% Cotton Compact chống xù lông, thấm hút mồ hôi vượt trội.',
      basePrice: 229000,
      sizes: ['S', 'M', 'L'],
      colors: [
        { color: 'Đen Tuyền', images: [IMG.tee2, IMG.tee1] },
        { color: 'Xám Tiêu', images: [IMG.tee1, IMG.tee2] },
      ],
    },
    {
      name: 'Áo Polo Nữ Dệt Kim Cổ Phối Viền MIVA',
      slug: 'ao-polo-nu-det-kim-co-phoi-vien-miva',
      categorySlug: 'ao-thun-ao-polo',
      status: ProductStatus.active,
      description: 'Thiết kế dệt kim mềm mại tôn dáng thanh lịch, dễ phối cùng chân váy xếp ly hoặc quần ống suông.',
      basePrice: 319000,
      sizes: ['S', 'M'],
      colors: [
        { color: 'Be Sữa', images: [IMG.dress3, IMG.polo1] },
        { color: 'Đen Phối Trắng', images: [IMG.polo1, IMG.dress3] },
      ],
    },
    // 2. Áo Sơ Mi Công Sở
    {
      name: 'Áo Sơ Mi Oxford Nam Dài Tay Chống Nhăn',
      slug: 'ao-so-mi-oxford-nam-dai-tay-chong-nhan',
      categorySlug: 'ao-so-mi-cong-so',
      status: ProductStatus.active,
      description: 'Chất liệu sợi Bamboo pha Cotton chống nhăn tự nhiên, form Slim Fit lịch lãm cho môi trường công sở.',
      basePrice: 389000,
      sizes: ['M', 'L', 'XL'],
      colors: [
        { color: 'Trắng Tinh', images: [IMG.shirt1, IMG.shirt2] },
        { color: 'Xanh Pastel', images: [IMG.shirt2, IMG.shirt1] },
      ],
    },
    {
      name: 'Áo Sơ Mi Lụa Nữ Cổ Đức Thanh Lịch',
      slug: 'ao-so-mi-lua-nu-co-duc-thanh-lich',
      categorySlug: 'ao-so-mi-cong-so',
      status: ProductStatus.active,
      description: 'Lụa satin cao cấp có độ rủ tự nhiên, bề mặt mịn mát nhẹ nhàng, phù hợp hội họp và đi làm hàng ngày.',
      basePrice: 369000,
      sizes: ['S', 'M'],
      colors: [
        { color: 'Trắng Ngà', images: [IMG.dress3, IMG.shirt1] },
        { color: 'Hồng Phấn', images: [IMG.dress1, IMG.dress3] },
      ],
    },
    {
      name: 'Áo Sơ Mi Linen Cổ Tàu Phóng Khoáng',
      slug: 'ao-so-mi-linen-co-tau-phong-khoang',
      categorySlug: 'ao-so-mi-cong-so',
      status: ProductStatus.inactive,
      description: 'Sơ mi chất đũi Linen tự nhiên thoáng mát cho mùa hè (Tạm ngưng kinh doanh chờ nhập vụ mới).',
      basePrice: 340000,
      sizes: ['M', 'L'],
      colors: [
        { color: 'Trắng Tự Nhiên', images: [IMG.shirt1] },
        { color: 'Be Cát', images: [IMG.shirt2] },
      ],
    },
    // 3. Áo Khoác & Blazer
    {
      name: 'Áo Blazer Công Sở Hai Lớp MIVA Classic',
      slug: 'ao-blazer-cong-so-hai-lop-miva-classic',
      categorySlug: 'ao-khoac-blazer',
      status: ProductStatus.active,
      description: 'Blazer may 2 lớp lót lụa thoáng khí, đệm vai vừa vặn tạo phom đứng sang trọng cho cả nam và nữ.',
      basePrice: 690000,
      sizes: ['M', 'L'],
      colors: [
        { color: 'Đen Khói', images: [IMG.jacket1, IMG.shirt2] },
        { color: 'Nâu Espresso', images: [IMG.shirt2, IMG.jacket1] },
      ],
    },
    {
      name: 'Áo Khoác Gió Trượt Nước MIVA Pro-Shield',
      slug: 'ao-khoac-gio-truot-nuoc-miva-pro-shield',
      categorySlug: 'ao-khoac-blazer',
      status: ProductStatus.active,
      description: 'Vải dù Microfiber 2 lớp trượt nước nhẹ, cản gió và chống tia UV UPF50+, mũ tháo rời linh hoạt.',
      basePrice: 459000,
      sizes: ['M', 'L', 'XL'],
      colors: [
        { color: 'Xanh Rêu', images: [IMG.jacket2, IMG.jacket1] },
        { color: 'Đen Nhám', images: [IMG.jacket1, IMG.jacket2] },
      ],
    },
    {
      name: 'Áo Khoác Dạ Tweed Thu Đông MIVA Limited',
      slug: 'ao-khoac-da-tweed-thu-dong-miva-limited',
      categorySlug: 'ao-khoac-blazer',
      status: ProductStatus.draft,
      description: 'Thiết kế thuộc Bộ sưu tập Thu Đông 2026 sắp mở bán chính thức sau khi hoàn tất khảo sát khách hàng.',
      basePrice: 790000,
      sizes: ['S', 'M'],
      colors: [
        { color: 'Kem Phối Kim Tuyến', images: [IMG.jacket1] },
        { color: 'Đen Cổ Điển', images: [IMG.dress2] },
      ],
    },
    // 4. Quần Jeans & Kaki
    {
      name: 'Quần Jeans Nam Slim Fit Co Giãn MIVA',
      slug: 'quan-jeans-nam-slim-fit-co-gian-miva',
      categorySlug: 'quan-jeans-kaki',
      status: ProductStatus.active,
      description: 'Denim 12oz pha 2% Spandex co giãn thoải mái khi vận động, wash màu bền đẹp không phai.',
      basePrice: 449000,
      sizes: ['M', 'L', 'XL'],
      colors: [
        { color: 'Xanh Indigo Đậm', images: [IMG.jeans1, IMG.jeans2] },
        { color: 'Đen Wash Nhẹ', images: [IMG.jeans2, IMG.jeans1] },
      ],
    },
    {
      name: 'Quần Kaki Chinos Ống Đứng Không Nhăn',
      slug: 'quan-kaki-chinos-ong-dung-khong-nhan',
      categorySlug: 'quan-jeans-kaki',
      status: ProductStatus.active,
      description: 'Quần Chinos đứng phom tôn dáng, chất vải Kaki Cotton Twill dày dặn mềm mịn dễ phối cùng sơ mi & polo.',
      basePrice: 399000,
      sizes: ['M', 'L', 'XL'],
      colors: [
        { color: 'Kem Khaki', images: [IMG.jeans2, IMG.shirt2] },
        { color: 'Xanh Đen', images: [IMG.shirt2, IMG.jeans2] },
      ],
    },
    {
      name: 'Quần Tây Nữ Ống Suông Cạp Cao Tôn Dáng',
      slug: 'quan-tay-nu-ong-suong-cap-cao-ton-dang',
      categorySlug: 'quan-jeans-kaki',
      status: ProductStatus.active,
      description: 'Thiết kế lưng cao che khuyết điểm vòng eo, chất tuyết mưa cao cấp không nhăn nhàu suốt ngày dài.',
      basePrice: 379000,
      sizes: ['S', 'M', 'L'],
      colors: [
        { color: 'Đen Tuyền', images: [IMG.dress2, IMG.dress3] },
        { color: 'Nâu Tây', images: [IMG.dress3, IMG.dress2] },
      ],
    },
    // 5. Đầm & Chân Váy Nữ
    {
      name: 'Đầm Midi Hoa Nhí Dáng Xòe Thanh Lịch',
      slug: 'dam-midi-hoa-nhi-dang-xoe-thanh-lich',
      categorySlug: 'dam-chan-vay-nu',
      status: ProductStatus.active,
      description: 'Chất voan lụa 2 lớp mềm nhẹ bay bổng, chiết eo tinh tế phù hợp dạo phố, dự tiệc nhẹ và du lịch.',
      basePrice: 529000,
      sizes: ['S', 'M', 'L'],
      colors: [
        { color: 'Vàng Kem Hoa Nhí', images: [IMG.dress1, IMG.dress2] },
        { color: 'Xanh Bơ Dịu Nhẹ', images: [IMG.dress2, IMG.dress1] },
      ],
    },
    {
      name: 'Đầm Công Sở Cổ V Chiết Eo MIVA Muse',
      slug: 'dam-cong-so-co-v-chiet-eo-miva-muse',
      categorySlug: 'dam-chan-vay-nu',
      status: ProductStatus.active,
      description: 'Đầm liền chữ A thanh lịch tôn nét nữ tính hiện đại, đường may giấu chỉ tỉ mỉ chuẩn boutique.',
      basePrice: 569000,
      sizes: ['S', 'M'],
      colors: [
        { color: 'Đỏ Đô Ruby', images: [IMG.dress2, IMG.dress3] },
        { color: 'Đen Sang Trọng', images: [IMG.dress3, IMG.dress2] },
      ],
    },
    {
      name: 'Chân Váy Xếp Ly Dáng Dài Hàn Quốc',
      slug: 'chan-vay-xep-ly-dang-dai-han-quoc',
      categorySlug: 'dam-chan-vay-nu',
      status: ProductStatus.active,
      description: 'Nếp gấp ly sắc nét giữ nếp bền lâu, lưng thun ẩn co giãn linh hoạt dễ kết hợp áo sơ mi và áo len.',
      basePrice: 329000,
      sizes: ['S', 'M'],
      colors: [
        { color: 'Be Sáng', images: [IMG.dress3, IMG.dress1] },
        { color: 'Đen Cơ Bản', images: [IMG.dress1, IMG.dress3] },
      ],
    },
    // 6. Giày Sneaker & Loafer
    {
      name: 'Giày Sneaker Da Mềm MIVA Urban Court',
      slug: 'giay-sneaker-da-mem-miva-urban-court',
      categorySlug: 'giay-sneaker-loafer',
      status: ProductStatus.active,
      description: 'Sneaker da Microfiber êm chân, lót đệm Memory Foam kháng khuẩn chống mỏi khi di chuyển cả ngày.',
      basePrice: 649000,
      sizes: ['39', '41', '42'],
      colors: [
        { color: 'Trắng Gót Xanh', images: [IMG.shoe2, IMG.shoe3] },
        { color: 'Trắng Phối Xám', images: [IMG.shoe3, IMG.shoe2] },
      ],
    },
    {
      name: 'Giày Chạy Bộ Thể Thao MIVA AirFlow',
      slug: 'giay-chay-bo-the-thao-miva-airflow',
      categorySlug: 'giay-sneaker-loafer',
      status: ProductStatus.active,
      description: 'Thân giày vải dệt Flyknit siêu nhẹ thoáng khí, đế EVA đàn hồi giảm chấn tối ưu khi tập luyện.',
      basePrice: 720000,
      sizes: ['38', '40', '42'],
      colors: [
        { color: 'Đỏ Thể Thao', images: [IMG.shoe1, IMG.shoe2] },
        { color: 'Đen Phản Quang', images: [IMG.shoe3, IMG.shoe1] },
      ],
    },
    {
      name: 'Giày Loafer Da Bò Công Sở MIVA Gentleman',
      slug: 'giay-loafer-da-bo-cong-so-miva-gentleman',
      categorySlug: 'giay-sneaker-loafer',
      status: ProductStatus.active,
      description: 'Giày lười da bò thật nguyên tấm khâu đế chắc chắn, phong cách tối giản sang trọng cho quý ông.',
      basePrice: 850000,
      sizes: ['40', '41'],
      colors: [
        { color: 'Đen Bóng Mờ', images: [IMG.shoe2, IMG.shoe3] },
        { color: 'Nâu Cognac', images: [IMG.shoe3, IMG.shoe2] },
      ],
    },
    // 7. Túi Xách & Phụ Kiện
    {
      name: 'Túi Xách Nữ Đeo Chéo Da Vân MIVA Chic',
      slug: 'tui-xach-nu-deo-cheo-da-van-miva-chic',
      categorySlug: 'tui-xach-phu-kien',
      status: ProductStatus.active,
      description: 'Phom túi hộp hiện đại kèm dây đeo kim loại bọc da điều chỉnh độ dài, ngăn chứa rộng rãi tiện dụng.',
      basePrice: 490000,
      sizes: ['Tiêu chuẩn'],
      colors: [
        { color: 'Đen Khóa Vàng', images: [IMG.bag2, IMG.bag3] },
        { color: 'Trắng Kem', images: [IMG.bag3, IMG.bag2] },
      ],
    },
    {
      name: 'Túi Tote Da Công Sở Đựng Laptop 14 Inch',
      slug: 'tui-tote-da-cong-so-dung-laptop-14-inch',
      categorySlug: 'tui-xach-phu-kien',
      status: ProductStatus.active,
      description: 'Túi Tote da PU cao cấp chống thấm nhẹ, có ngăn chống sốc riêng cho laptop 14 inch và tài liệu A4.',
      basePrice: 540000,
      sizes: ['Cỡ lớn'],
      colors: [
        { color: 'Nâu Caramel', images: [IMG.bag1, IMG.bag2] },
        { color: 'Đen Thanh Lịch', images: [IMG.bag2, IMG.bag1] },
      ],
    },
    {
      name: 'Balo Đa Năng Chống Thấm MIVA Commuter',
      slug: 'balo-da-nang-chong-tham-miva-commuter',
      categorySlug: 'tui-xach-phu-kien',
      status: ProductStatus.active,
      description: 'Balo vải Oxford 900D trượt nước, tích hợp cổng sạc USB ngoài và đệm lưng thoáng khí êm ái.',
      basePrice: 480000,
      sizes: ['Tiêu chuẩn'],
      colors: [
        { color: 'Xám Than', images: [IMG.bag3, IMG.bag1] },
        { color: 'Đen Quân Đội', images: [IMG.bag1, IMG.bag3] },
      ],
    },
  ];

  interface CreatedVariantInfo {
    id: string;
    productId: string;
    productName: string;
    categorySlug: string;
    productStatus: ProductStatus;
    color: string;
    size: string;
    price: number;
    imageUrl: string;
  }

  const createdProducts: Array<{ id: string; name: string; categorySlug: string; status: ProductStatus }> = [];
  const activeVariants: CreatedVariantInfo[] = [];
  let prodSeq = 1;
  let colorSeq = 1;
  let varSeq = 1;

  for (const spec of productsSpec) {
    const productId = uuid(1005, prodSeq++);
    const categoryId = categoryIdBySlug.get(spec.categorySlug)!;

    await prisma.product.create({
      data: {
        id: productId,
        categoryId,
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        status: spec.status,
        createdAt: isoDate('2026-09-08T09:00:00.000Z'),
      },
    });
    createdProducts.push({
      id: productId,
      name: spec.name,
      categorySlug: spec.categorySlug,
      status: spec.status,
    });

    for (const cSpec of spec.colors) {
      const colorId = uuid(1006, colorSeq++);
      await prisma.productColor.create({
        data: {
          id: colorId,
          productId,
          color: cSpec.color,
          imageUrls: cSpec.images,
        },
      });

      for (let sIdx = 0; sIdx < spec.sizes.length; sIdx++) {
        const size = spec.sizes[sIdx];
        const variantId = uuid(1007, varSeq++);
        const price = spec.basePrice + sIdx * 10000;
        // 1 biến thể của sản phẩm nháp đặt stock = 0 để minh họa hết hàng, còn lại tồn kho dồi dào 25-55
        const stock = spec.status === ProductStatus.draft && sIdx === 1 ? 0 : 28 + ((varSeq * 7) % 30);

        await prisma.productVariant.create({
          data: {
            id: variantId,
            productColorId: colorId,
            size,
            stock,
            price,
          },
        });

        if (spec.status === ProductStatus.active) {
          activeVariants.push({
            id: variantId,
            productId,
            productName: spec.name,
            categorySlug: spec.categorySlug,
            productStatus: spec.status,
            color: cSpec.color,
            size,
            price,
            imageUrl: cSpec.images[0],
          });
        }
      }
    }
  }

  const activeProducts = createdProducts.filter((p) => p.status === ProductStatus.active);

  // =========================================================================
  // 6. PRODUCT FAVORITES (36 lượt thả tim phủ khắp 6 nhóm tuổi & danh mục)
  // =========================================================================
  const favoritePairs: Array<{ clientId: string; productId: string; createdAt: string }> = [
    // client1@miva.vn: 5 sản phẩm yêu thích
    { clientId: client1Id, productId: activeProducts[0].id, createdAt: '2026-10-12T09:00:00.000Z' },
    { clientId: client1Id, productId: activeProducts[3].id, createdAt: '2026-10-18T10:15:00.000Z' },
    { clientId: client1Id, productId: activeProducts[5].id, createdAt: '2026-10-25T14:30:00.000Z' },
    { clientId: client1Id, productId: activeProducts[7].id, createdAt: '2026-11-03T16:45:00.000Z' },
    { clientId: client1Id, productId: activeProducts[13].id, createdAt: '2026-11-11T08:20:00.000Z' },
    // client2@miva.vn: 4 sản phẩm yêu thích
    { clientId: client2Id, productId: activeProducts[2].id, createdAt: '2026-10-14T11:00:00.000Z' },
    { clientId: client2Id, productId: activeProducts[10].id, createdAt: '2026-10-22T15:00:00.000Z' },
    { clientId: client2Id, productId: activeProducts[11].id, createdAt: '2026-11-05T09:40:00.000Z' },
    { clientId: client2Id, productId: activeProducts[16].id, createdAt: '2026-11-12T19:10:00.000Z' },
  ];

  // Phân bổ thêm lượt yêu thích cho các khách hàng thuộc đủ 6 nhóm độ tuổi
  for (let i = 2; i < activeClients.length; i++) {
    const cl = activeClients[i];
    const p1 = activeProducts[(i * 2) % activeProducts.length];
    const p2 = activeProducts[(i * 2 + 5) % activeProducts.length];
    favoritePairs.push({
      clientId: cl.id,
      productId: p1.id,
      createdAt: '2026-10-28T10:00:00.000Z',
    });
    if (p2.id !== p1.id) {
      favoritePairs.push({
        clientId: cl.id,
        productId: p2.id,
        createdAt: '2026-11-08T14:00:00.000Z',
      });
    }
  }

  let favSeq = 1;
  for (const fav of favoritePairs) {
    await prisma.productFavorite.create({
      data: {
        id: uuid(1008, favSeq++),
        clientId: fav.clientId,
        productId: fav.productId,
        createdAt: isoDate(fav.createdAt),
      },
    });
  }

  // =========================================================================
  // 7. CARTS (16) & CART ITEMS (16) — client1 có 3 SP, client2 có 2 SP sẵn trong giỏ
  // =========================================================================
  let cartSeq = 1;
  let cartItemSeq = 1;

  for (let i = 0; i < 16; i++) {
    const cl = activeClients[i];
    const cartId = uuid(1009, cartSeq++);
    await prisma.cart.create({
      data: {
        id: cartId,
        clientId: cl.id,
        createdAt: isoDate('2026-10-01T08:00:00.000Z'),
      },
    });

    if (cl.id === client1Id) {
      for (const [vIdx, qty] of [
        [0, 2],
        [10, 1],
        [32, 1],
      ] as const) {
        await prisma.cartItem.create({
          data: {
            id: uuid(1010, cartItemSeq++),
            cartId,
            productVariantId: activeVariants[vIdx % activeVariants.length].id,
            quantity: qty,
          },
        });
      }
    } else if (cl.id === client2Id) {
      for (const [vIdx, qty] of [
        [22, 1],
        [40, 2],
      ] as const) {
        await prisma.cartItem.create({
          data: {
            id: uuid(1010, cartItemSeq++),
            cartId,
            productVariantId: activeVariants[vIdx % activeVariants.length].id,
            quantity: qty,
          },
        });
      }
    } else if (i < 13) {
      await prisma.cartItem.create({
        data: {
          id: uuid(1010, cartItemSeq++),
          cartId,
          productVariantId: activeVariants[(i * 3) % activeVariants.length].id,
          quantity: (i % 2) + 1,
        },
      });
    }
  }

  // =========================================================================
  // 8. VOUCHERS (6 chiến dịch mã giảm giá chuẩn platform)
  // =========================================================================
  const vouchersSpec = [
    {
      id: uuid(1011, 1),
      adminId: crmMainId,
      code: 'MIVA50K',
      name: 'Ưu đãi MIVA Giảm 50.000₫ cho đơn từ 399.000₫',
      scope: VoucherScope.platform,
      discountType: DiscountType.fixed_amount,
      discountValue: 50000,
      minOrderAmount: 399000,
      maxDiscountAmount: 50000,
      quantity: 100,
      usedQuantity: 4,
      perUserLimit: 3,
      startDate: isoDate('2026-10-01T00:00:00.000Z'),
      endDate: isoDate('2027-03-31T23:59:59.000Z'),
      status: VoucherStatus.active,
    },
    {
      id: uuid(1011, 2),
      adminId: crmMainId,
      code: 'MIVA10P',
      name: 'Giảm 10% tối đa 100.000₫ toàn sàn MIVA',
      scope: VoucherScope.platform,
      discountType: DiscountType.percentage,
      discountValue: 10,
      minOrderAmount: 299000,
      maxDiscountAmount: 100000,
      quantity: 150,
      usedQuantity: 3,
      perUserLimit: 2,
      startDate: isoDate('2026-10-01T00:00:00.000Z'),
      endDate: isoDate('2027-03-31T23:59:59.000Z'),
      status: VoucherStatus.active,
    },
    {
      id: uuid(1011, 3),
      adminId: crmSubId,
      code: 'MIVAVIP150K',
      name: 'Đặc quyền Hội viên VIP Giảm 150.000₫ đơn từ 999.000₫',
      scope: VoucherScope.platform,
      discountType: DiscountType.fixed_amount,
      discountValue: 150000,
      minOrderAmount: 999000,
      maxDiscountAmount: 150000,
      quantity: 50,
      usedQuantity: 2,
      perUserLimit: 1,
      startDate: isoDate('2026-10-15T00:00:00.000Z'),
      endDate: isoDate('2027-03-31T23:59:59.000Z'),
      status: VoucherStatus.active,
    },
    {
      id: uuid(1011, 4),
      adminId: crmSubId,
      code: 'MIVABLAZER40K',
      name: 'Ưu đãi Áo Khoác & Blazer Thu Đông Giảm 40.000₫',
      scope: VoucherScope.platform,
      discountType: DiscountType.fixed_amount,
      discountValue: 40000,
      minOrderAmount: 400000,
      maxDiscountAmount: 40000,
      quantity: 80,
      usedQuantity: 1,
      perUserLimit: 2,
      startDate: isoDate('2026-10-20T00:00:00.000Z'),
      endDate: isoDate('2027-03-31T23:59:59.000Z'),
      status: VoucherStatus.active,
    },
    {
      id: uuid(1011, 5),
      adminId: crmMainId,
      code: 'MIVA1212',
      name: 'Siêu Hội Mua Sắm 12.12 Giảm 15% (Bản nháp chờ kích hoạt)',
      scope: VoucherScope.platform,
      discountType: DiscountType.percentage,
      discountValue: 15,
      minOrderAmount: 499000,
      maxDiscountAmount: 150000,
      quantity: 200,
      usedQuantity: 0,
      perUserLimit: 1,
      startDate: isoDate('2026-12-01T00:00:00.000Z'),
      endDate: isoDate('2026-12-15T23:59:59.000Z'),
      status: VoucherStatus.draft,
    },
    {
      id: uuid(1011, 6),
      adminId: crmMainId,
      code: 'MIVA99SALE',
      name: 'Khuyến mãi Chào Thu 9.9 Giảm 30.000₫ (Đã kết thúc)',
      scope: VoucherScope.platform,
      discountType: DiscountType.fixed_amount,
      discountValue: 30000,
      minOrderAmount: 250000,
      maxDiscountAmount: 30000,
      quantity: 60,
      usedQuantity: 60,
      perUserLimit: 1,
      startDate: isoDate('2026-09-01T00:00:00.000Z'),
      endDate: isoDate('2026-09-15T23:59:59.000Z'),
      status: VoucherStatus.expired,
    },
  ];

  for (const v of vouchersSpec) {
    await prisma.voucher.create({ data: v });
  }

  // Liên kết Voucher MIVABLAZER40K với các sản phẩm thuộc danh mục Áo Khoác & Blazer
  let vDetailSeq = 1;
  const jacketProducts = createdProducts.filter((p) => p.categorySlug === 'ao-khoac-blazer');
  for (const jp of jacketProducts) {
    await prisma.voucherDetail.create({
      data: {
        id: uuid(1012, vDetailSeq++),
        voucherId: vouchersSpec[3].id,
        productId: jp.id,
      },
    });
  }

  // =========================================================================
  // 9. ORDERS (25), ORDER DETAILS, PAYMENTS, ORDER STATUS HISTORY & VOUCHER USAGES
  // =========================================================================
  interface OrderBlueprint {
    code: string;
    clientId: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    createdAt: string;
    paidAt?: string;
    refundedAt?: string;
    variantIndices: Array<{ idx: number; qty: number }>;
    voucherIdx?: number; // index in vouchersSpec (0..3)
    voucherReversed?: boolean;
    notes?: string;
  }

  const ordersBlueprint: OrderBlueprint[] = [
    // --- ĐƠN HÀNG CỦA client1@miva.vn (5 đơn đủ trạng thái để demo toàn diện) ---
    {
      code: 'MIVA-261015-001',
      clientId: client1Id,
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.vnpay,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-15T09:30:00.000Z',
      paidAt: '2026-10-15T09:32:00.000Z',
      variantIndices: [
        { idx: 0, qty: 2 },
        { idx: 8, qty: 1 },
      ],
      voucherIdx: 0, // MIVA50K
      notes: 'Giao giờ hành chính tại quầy lễ tân tòa nhà',
    },
    {
      code: 'MIVA-261113-002',
      clientId: client1Id,
      status: OrderStatus.completed, // Hoàn tất 3 ngày trước -> còn hạn 7 ngày Trả hàng & có 1 SP chưa đánh giá!
      paymentMethod: PaymentMethod.credit_card,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-12T10:15:00.000Z',
      paidAt: '2026-11-12T10:16:00.000Z',
      variantIndices: [
        { idx: 14, qty: 1 },
        { idx: 35, qty: 1 },
      ],
      voucherIdx: 2, // MIVAVIP150K
      notes: 'Đơn hàng mới nhận — sẵn sàng demo Đánh giá sao hoặc Trả hàng 7 ngày',
    },
    {
      code: 'MIVA-261115-003',
      clientId: client1Id,
      status: OrderStatus.shipping,
      paymentMethod: PaymentMethod.momo,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-14T14:20:00.000Z',
      paidAt: '2026-11-14T14:21:00.000Z',
      variantIndices: [{ idx: 18, qty: 1 }],
      voucherIdx: 3, // MIVABLAZER40K
      notes: 'Gọi điện trước khi giao 15 phút',
    },
    {
      code: 'MIVA-261116-004',
      clientId: client1Id,
      status: OrderStatus.pending,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.pending,
      createdAt: '2026-11-16T03:30:00.000Z',
      variantIndices: [{ idx: 4, qty: 2 }],
      notes: 'Đơn chờ xác nhận — có thể dùng để demo Duyệt đơn ở CRM hoặc Hủy đơn ở Client',
    },
    {
      code: 'MIVA-261105-005',
      clientId: client1Id,
      status: OrderStatus.cancelled,
      paymentMethod: PaymentMethod.pay_later,
      paymentStatus: PaymentStatus.refunded,
      createdAt: '2026-11-05T11:00:00.000Z',
      paidAt: '2026-11-05T11:00:30.000Z',
      refundedAt: '2026-11-05T15:10:00.000Z',
      variantIndices: [{ idx: 20, qty: 1 }],
      voucherIdx: 1,
      voucherReversed: true,
      notes: 'Khách đổi ý chọn lại màu khác nên hủy đơn trước khi giao',
    },

    // --- ĐƠN HÀNG CỦA client2@miva.vn (4 đơn: có đơn Returned & đơn Completed mới & đơn Pending) ---
    {
      code: 'MIVA-261111-006',
      clientId: client2Id,
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.bank_transfer,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-10T08:45:00.000Z',
      paidAt: '2026-11-10T08:50:00.000Z',
      variantIndices: [
        { idx: 26, qty: 1 },
        { idx: 42, qty: 1 },
      ],
      voucherIdx: 1, // MIVA10P
    },
    {
      code: 'MIVA-261108-007',
      clientId: client2Id,
      status: OrderStatus.returned,
      paymentMethod: PaymentMethod.vnpay,
      paymentStatus: PaymentStatus.refunded,
      createdAt: '2026-11-06T09:00:00.000Z',
      paidAt: '2026-11-06T09:02:00.000Z',
      refundedAt: '2026-11-09T16:20:00.000Z',
      variantIndices: [{ idx: 30, qty: 1 }],
      notes: 'Trả hàng & hoàn tiền: Muốn đổi sang kích cỡ nhỏ hơn',
    },
    {
      code: 'MIVA-261115-008',
      clientId: client2Id,
      status: OrderStatus.confirmed,
      paymentMethod: PaymentMethod.credit_card,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-15T07:20:00.000Z',
      paidAt: '2026-11-15T07:20:30.000Z',
      variantIndices: [{ idx: 12, qty: 1 }],
    },
    {
      code: 'MIVA-261116-009',
      clientId: client2Id,
      status: OrderStatus.pending,
      paymentMethod: PaymentMethod.pay_later,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-16T05:10:00.000Z',
      paidAt: '2026-11-16T05:10:10.000Z',
      variantIndices: [{ idx: 44, qty: 1 }],
    },

    // --- 16 ĐƠN HÀNG CỦA CÁC KHÁCH HÀNG THUỘC ĐỦ 6 NHÓM ĐỘ TUỔI (Tháng 10 & Tháng 11/2026) ---
    {
      code: 'MIVA-261004-010',
      clientId: activeClients[2].id, // <18
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-04T10:00:00.000Z',
      paidAt: '2026-10-07T15:00:00.000Z',
      variantIndices: [{ idx: 3, qty: 2 }],
    },
    {
      code: 'MIVA-261009-011',
      clientId: activeClients[3].id, // <18
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.momo,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-09T13:40:00.000Z',
      paidAt: '2026-10-09T13:42:00.000Z',
      variantIndices: [{ idx: 36, qty: 1 }],
      voucherIdx: 0,
    },
    {
      code: 'MIVA-261012-012',
      clientId: activeClients[4].id, // 18-24
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.zalopay,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-12T16:10:00.000Z',
      paidAt: '2026-10-12T16:12:00.000Z',
      variantIndices: [
        { idx: 28, qty: 1 },
        { idx: 43, qty: 1 },
      ],
      voucherIdx: 1,
    },
    {
      code: 'MIVA-261018-013',
      clientId: activeClients[5].id, // 18-24
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-18T09:25:00.000Z',
      paidAt: '2026-10-21T11:00:00.000Z',
      variantIndices: [{ idx: 19, qty: 1 }],
    },
    {
      code: 'MIVA-261021-014',
      clientId: activeClients[6].id, // 18-24
      status: OrderStatus.returned,
      paymentMethod: PaymentMethod.credit_card,
      paymentStatus: PaymentStatus.refunded,
      createdAt: '2026-10-21T14:00:00.000Z',
      paidAt: '2026-10-21T14:01:00.000Z',
      refundedAt: '2026-10-25T10:30:00.000Z',
      variantIndices: [{ idx: 33, qty: 1 }],
      notes: 'Trả hàng & hoàn tiền: Đổi sang dòng giày chạy bộ AirFlow',
    },
    {
      code: 'MIVA-261024-015',
      clientId: activeClients[7].id, // 25-34
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.vnpay,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-24T10:30:00.000Z',
      paidAt: '2026-10-24T10:32:00.000Z',
      variantIndices: [
        { idx: 9, qty: 2 },
        { idx: 21, qty: 1 },
      ],
      voucherIdx: 2, // MIVAVIP150K
    },
    {
      code: 'MIVA-261028-016',
      clientId: activeClients[8].id, // 25-34
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.bank_transfer,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-10-28T15:45:00.000Z',
      paidAt: '2026-10-28T15:50:00.000Z',
      variantIndices: [{ idx: 29, qty: 1 }],
      voucherIdx: 0,
    },
    {
      code: 'MIVA-261101-017',
      clientId: activeClients[9].id, // 25-34
      status: OrderStatus.cancelled,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.cancelled,
      createdAt: '2026-11-01T11:20:00.000Z',
      variantIndices: [{ idx: 5, qty: 1 }],
      notes: 'Khách đặt nhầm địa chỉ tỉnh nên hủy đặt lại',
    },
    {
      code: 'MIVA-261103-018',
      clientId: activeClients[11].id, // 35-44
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.credit_card,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-03T08:15:00.000Z',
      paidAt: '2026-11-03T08:16:00.000Z',
      variantIndices: [
        { idx: 15, qty: 1 },
        { idx: 39, qty: 1 },
      ],
      voucherIdx: 0,
    },
    {
      code: 'MIVA-261107-019',
      clientId: activeClients[12].id, // 35-44
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.vnpay,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-07T13:00:00.000Z',
      paidAt: '2026-11-07T13:02:00.000Z',
      variantIndices: [
        { idx: 11, qty: 1 },
        { idx: 45, qty: 1 },
      ],
      voucherIdx: 1,
    },
    {
      code: 'MIVA-261110-020',
      clientId: activeClients[14].id, // 45-54
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-10T09:50:00.000Z',
      paidAt: '2026-11-12T16:00:00.000Z',
      variantIndices: [
        { idx: 31, qty: 1 },
        { idx: 46, qty: 1 },
      ],
    },
    {
      code: 'MIVA-261112-021',
      clientId: activeClients[15].id, // 45-54
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.bank_transfer,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-12T14:30:00.000Z',
      paidAt: '2026-11-12T14:35:00.000Z',
      variantIndices: [{ idx: 40, qty: 1 }],
    },
    {
      code: 'MIVA-261113-022',
      clientId: activeClients[16].id, // 55+
      status: OrderStatus.completed,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-13T08:40:00.000Z',
      paidAt: '2026-11-15T10:30:00.000Z',
      variantIndices: [
        { idx: 12, qty: 1 },
        { idx: 45, qty: 1 },
      ],
    },
    {
      code: 'MIVA-261114-023',
      clientId: activeClients[13].id, // 35-44
      status: OrderStatus.processing,
      paymentMethod: PaymentMethod.momo,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-14T16:00:00.000Z',
      paidAt: '2026-11-14T16:02:00.000Z',
      variantIndices: [{ idx: 22, qty: 2 }],
    },
    {
      code: 'MIVA-261115-024',
      clientId: activeClients[10].id, // 25-34
      status: OrderStatus.shipping,
      paymentMethod: PaymentMethod.cod,
      paymentStatus: PaymentStatus.pending,
      createdAt: '2026-11-15T09:10:00.000Z',
      variantIndices: [{ idx: 47, qty: 1 }],
    },
    {
      code: 'MIVA-261116-025',
      clientId: activeClients[4].id, // 18-24
      status: OrderStatus.confirmed,
      paymentMethod: PaymentMethod.vnpay,
      paymentStatus: PaymentStatus.paid,
      createdAt: '2026-11-16T02:15:00.000Z',
      paidAt: '2026-11-16T02:16:00.000Z',
      variantIndices: [{ idx: 6, qty: 1 }],
    },
  ];

  interface CreatedOrderDetailInfo {
    id: string;
    orderId: string;
    orderCode: string;
    clientId: string;
    orderStatus: OrderStatus;
    orderCreatedAt: Date;
    productId: string;
    productName: string;
  }

  const completedOrderDetails: CreatedOrderDetailInfo[] = [];
  const completedOrdersByClient: Array<{ id: string; clientId: string; code: string; createdAt: Date }> = [];

  let orderSeq = 1;
  let orderDetailSeq = 1;
  let paymentSeq = 1;
  let historySeq = 1;

  for (const bp of ordersBlueprint) {
    const orderId = uuid(1013, orderSeq++);
    const addr = defaultAddressByClient.get(bp.clientId)!;
    const createdAt = isoDate(bp.createdAt);

    let subtotal = 0;
    const chosenItems = bp.variantIndices.map((entry) => {
      const variant = activeVariants[entry.idx % activeVariants.length];
      subtotal += variant.price * entry.qty;
      return { variant, qty: entry.qty };
    });

    let discount = 0;
    if (bp.voucherIdx !== undefined) {
      const v = vouchersSpec[bp.voucherIdx];
      if (v.discountType === DiscountType.fixed_amount) {
        discount = v.discountValue;
      } else {
        discount = Math.min(
          Math.round((subtotal * v.discountValue) / 100),
          v.maxDiscountAmount,
        );
      }
    }
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const totalAmount = Math.max(0, subtotal - discount + shippingFee);

    await prisma.order.create({
      data: {
        id: orderId,
        orderCode: bp.code,
        clientId: bp.clientId,
        subtotalAmount: subtotal,
        discountAmount: discount,
        shippingFee,
        totalAmount,
        status: bp.status,
        notes: bp.notes ?? null,
        receiverName: addr.receiverName,
        receiverPhone: addr.phone,
        shippingAddress: addr.fullAddress,
        createdAt,
        updatedAt: bp.refundedAt
          ? isoDate(bp.refundedAt)
          : bp.paidAt
            ? isoDate(bp.paidAt)
            : createdAt,
        cancelledAt:
          bp.status === OrderStatus.cancelled
            ? new Date(createdAt.getTime() + 3 * 3600 * 1000)
            : null,
      },
    });

    if (bp.status === OrderStatus.completed) {
      completedOrdersByClient.push({
        id: orderId,
        clientId: bp.clientId,
        code: bp.code,
        createdAt,
      });
    }

    for (const item of chosenItems) {
      const detailId = uuid(1014, orderDetailSeq++);
      await prisma.orderDetail.create({
        data: {
          id: detailId,
          orderId,
          productVariantId: item.variant.id,
          quantity: item.qty,
          price: item.variant.price,
          productName: item.variant.productName,
          colorName: item.variant.color,
          sizeName: item.variant.size,
          imageUrl: item.variant.imageUrl,
        },
      });

      if (bp.status === OrderStatus.completed) {
        completedOrderDetails.push({
          id: detailId,
          orderId,
          orderCode: bp.code,
          clientId: bp.clientId,
          orderStatus: bp.status,
          orderCreatedAt: createdAt,
          productId: item.variant.productId,
          productName: item.variant.productName,
        });
      }
    }

    // Payment record
    const gatewayMap: Record<PaymentMethod, string> = {
      cod: 'COD_DELIVERY',
      vnpay: 'VNPAY_QR',
      momo: 'MOMO_WALLET',
      zalopay: 'ZALOPAY_GATEWAY',
      bank_transfer: 'VIETQR_NAPAS',
      credit_card: 'VISA_MASTERCARD_DEMO',
      pay_later: 'MIVA_PAYLATER_DEMO',
    };

    await prisma.payment.create({
      data: {
        id: uuid(1015, paymentSeq),
        orderId,
        method: bp.paymentMethod,
        amount: totalAmount,
        status: bp.paymentStatus,
        transactionCode: `TXN-${bp.code}-${String(paymentSeq).padStart(3, '0')}`,
        gateway: gatewayMap[bp.paymentMethod],
        gatewayResponse: {
          demo: true,
          orderCode: bp.code,
          status: bp.paymentStatus,
        },
        paidAt: bp.paidAt ? isoDate(bp.paidAt) : null,
        refundedAt: bp.refundedAt ? isoDate(bp.refundedAt) : null,
        createdAt,
      },
    });
    paymentSeq++;

    // Voucher usage record if applied
    if (bp.voucherIdx !== undefined && discount > 0) {
      const voucher = vouchersSpec[bp.voucherIdx];
      await prisma.voucherDetail.create({
        data: {
          id: uuid(1012, vDetailSeq++),
          voucherId: voucher.id,
          orderId,
          eligibleAmount: subtotal,
          discountAmount: discount,
          sequence: 1,
          createdAt,
          reversedAt: bp.voucherReversed
            ? new Date(createdAt.getTime() + 3 * 3600 * 1000)
            : null,
        },
      });
    }

    // OrderStatusHistory progression
    const stepChain: Array<{
      from: OrderStatus | null;
      to: OrderStatus;
      offsetHours: number;
      byClient?: boolean;
      note: string;
    }> = [
      {
        from: null,
        to: OrderStatus.pending,
        offsetHours: 0,
        byClient: true,
        note: 'Khách hàng đặt đơn hàng mới trên hệ thống MIVA',
      },
    ];

    if (bp.status === OrderStatus.confirmed) {
      stepChain.push({
        from: OrderStatus.pending,
        to: OrderStatus.confirmed,
        offsetHours: 2,
        note: 'Người quản lý CRM đã xác nhận thông tin đơn hàng',
      });
    } else if (bp.status === OrderStatus.processing) {
      stepChain.push(
        {
          from: OrderStatus.pending,
          to: OrderStatus.confirmed,
          offsetHours: 1,
          note: 'Đã xác nhận đơn hàng',
        },
        {
          from: OrderStatus.confirmed,
          to: OrderStatus.processing,
          offsetHours: 4,
          note: 'Kho MIVA đang đóng gói sản phẩm',
        },
      );
    } else if (bp.status === OrderStatus.shipping) {
      stepChain.push(
        {
          from: OrderStatus.pending,
          to: OrderStatus.confirmed,
          offsetHours: 1,
          note: 'Đã xác nhận đơn hàng',
        },
        {
          from: OrderStatus.confirmed,
          to: OrderStatus.processing,
          offsetHours: 3,
          note: 'Đã đóng gói hoàn tất',
        },
        {
          from: OrderStatus.processing,
          to: OrderStatus.shipping,
          offsetHours: 8,
          note: 'Đã bàn giao cho đơn vị vận chuyển giao đến khách hàng',
        },
      );
    } else if (bp.status === OrderStatus.completed) {
      stepChain.push(
        {
          from: OrderStatus.pending,
          to: OrderStatus.confirmed,
          offsetHours: 1,
          note: 'Đã xác nhận đơn hàng',
        },
        {
          from: OrderStatus.confirmed,
          to: OrderStatus.processing,
          offsetHours: 4,
          note: 'Đã đóng gói xuất kho',
        },
        {
          from: OrderStatus.processing,
          to: OrderStatus.shipping,
          offsetHours: 12,
          note: 'Đang giao hàng tới địa chỉ người nhận',
        },
        {
          from: OrderStatus.shipping,
          to: OrderStatus.completed,
          offsetHours: 36,
          note: 'Giao hàng thành công — khách hàng đã nhận đủ sản phẩm',
        },
      );
    } else if (bp.status === OrderStatus.returned) {
      stepChain.push(
        {
          from: OrderStatus.pending,
          to: OrderStatus.confirmed,
          offsetHours: 1,
          note: 'Đã xác nhận đơn hàng',
        },
        {
          from: OrderStatus.confirmed,
          to: OrderStatus.processing,
          offsetHours: 4,
          note: 'Đã đóng gói xuất kho',
        },
        {
          from: OrderStatus.processing,
          to: OrderStatus.shipping,
          offsetHours: 10,
          note: 'Đang vận chuyển',
        },
        {
          from: OrderStatus.shipping,
          to: OrderStatus.completed,
          offsetHours: 30,
          note: 'Đã giao hàng thành công',
        },
        {
          from: OrderStatus.completed,
          to: OrderStatus.returned,
          offsetHours: 72,
          byClient: true,
          note: bp.notes || 'Khách hàng yêu cầu trả hàng & hoàn tiền trong thời hạn 7 ngày',
        },
      );
    } else if (bp.status === OrderStatus.cancelled) {
      stepChain.push({
        from: OrderStatus.pending,
        to: OrderStatus.cancelled,
        offsetHours: 3,
        byClient: true,
        note: bp.notes || 'Khách hàng hủy đơn trước khi giao vận chuyển',
      });
    }

    for (const step of stepChain) {
      await prisma.orderStatusHistory.create({
        data: {
          id: uuid(1016, historySeq++),
          orderId,
          adminId: step.byClient ? null : orderSeq % 2 === 0 ? crmMainId : crmSubId,
          clientId: step.byClient ? bp.clientId : null,
          fromStatus: step.from,
          toStatus: step.to,
          note: step.note,
          createdAt: new Date(createdAt.getTime() + step.offsetHours * 3600 * 1000),
        },
      });
    }
  }

  // Đồng bộ chính xác usedQuantity cho 4 voucher đang active theo số đơn thực tế chưa bị reverse
  for (let i = 0; i < 4; i++) {
    const activeUsages = await prisma.voucherDetail.count({
      where: {
        voucherId: vouchersSpec[i].id,
        orderId: { not: null },
        reversedAt: null,
      },
    });
    await prisma.voucher.update({
      where: { id: vouchersSpec[i].id },
      data: { usedQuantity: activeUsages },
    });
  }

  // =========================================================================
  // 10. REVIEWS (15 đánh giá sản phẩm: 9 đã trả lời bởi CRM, 6 chờ phản hồi)
  // =========================================================================
  // Bỏ trống 1 sản phẩm trong đơn MIVA-261113-002 của client1 để client1 có thể bấm "Đánh giá sản phẩm" trực tiếp khi demo!
  const reviewableDetails = completedOrderDetails.filter(
    (d, idx) => !(d.orderCode === 'MIVA-261113-002' && idx === 3),
  );

  const reviewTemplates = [
    {
      rating: 5,
      content: 'Chất vải Pique dày dặn, mặc rất thoáng mát, đường may cổ áo cực kỳ chắc chắn. Sẽ ủng hộ MIVA dài lâu!',
      reply: 'MIVA chân thành cảm ơn anh Minh đã tin tưởng lựa chọn sản phẩm! Chúc anh luôn thoải mái và tự tin cùng các thiết kế của MIVA ạ.',
    },
    {
      rating: 5,
      content: 'Form áo chuẩn đẹp đúng như bảng size tư vấn, đóng gói hộp giấy chỉn chu và giao hàng rất nhanh.',
      reply: 'Cảm ơn bạn đã dành lời khen cho MIVA! Đội ngũ CSKH rất vui khi bạn hài lòng với chất lượng đóng gói và sản phẩm.',
    },
    {
      rating: 4,
      content: 'Áo Blazer lên dáng sang trọng, lớp lót lụa mịn. Tuy nhiên giao hàng buổi chiều hơi trễ hơn dự kiến 1 tiếng.',
      reply: 'MIVA cảm ơn góp ý quý báu của bạn và xin ghi nhận phản ánh về khung giờ giao hàng để làm việc lại với đối tác vận chuyển tốt hơn!',
    },
    {
      rating: 5,
      content: 'Đầm mặc đi làm ai cũng khen thanh lịch, màu sắc bên ngoài còn đẹp và tôn da hơn cả trên ảnh.',
      reply: 'Cảm ơn chị Lan Anh rất nhiều! Rất mong tiếp tục được đồng hành cùng chị trong Bộ sưu tập Thu Đông sắp tới của MIVA.',
    },
    {
      rating: 5,
      content: 'Giày đi êm chân cả ngày không bị đau gót, da mềm dễ vệ sinh, rất đáng tiền trong tầm giá.',
      reply: 'Cảm ơn bạn đã đánh giá 5 sao! Đừng quên sử dụng mã MIVA50K cho đơn hàng tiếp theo trên sàn MIVA nhé.',
    },
    {
      rating: 4,
      content: 'Quần Chinos vải mịn không nhăn, mình cao 1m72 nặng 68kg mặc size L vừa đẹp, ống quần hơi dài một chút.',
      reply: 'MIVA cảm ơn anh đã chia sẻ thông số thực tế rất hữu ích cho các khách hàng khác! Chúc anh có trải nghiệm tuyệt vời cùng sản phẩm.',
    },
    {
      rating: 5,
      content: 'Túi Tote đựng vừa khít laptop 14 inch và sổ tay, khóa kéo mượt mà, da mềm đứng phom.',
      reply: 'Cảm ơn bạn đã yêu thích mẫu Túi Tote Công Sở của MIVA! Nếu cần hỗ trợ bảo dưỡng da túi bạn cứ nhắn CSKH nhé.',
    },
    {
      rating: 5,
      content: 'Sơ mi chống nhăn thực sự tiện lợi, giặt máy phơi khô là mặc đi họp được ngay không cần ủi nhiều.',
      reply: 'Dạ dòng Sơ mi Bamboo chống nhăn luôn là best-seller của MIVA, cảm ơn anh đã tin dùng và phản hồi tích cực ạ!',
    },
    {
      rating: 4,
      content: 'Chất lượng vải tốt, màu xanh navy trầm lịch sự, shop tư vấn chọn size nhiệt tình.',
      reply: 'MIVA cảm ơn bạn rất nhiều! Hẹn gặp lại bạn ở những đơn hàng tiếp theo trên hệ thống nhé.',
    },
    // 6 đánh giá ĐANG CHỜ PHẢN HỒI (adminReply = null) để CRM Manager demo bấm "Phản hồi" trực tiếp!
    {
      rating: 5,
      content: 'Mình vừa nhận đơn sáng nay, áo khoác trượt nước nhẹ mà ấm, rất hợp thời tiết se lạnh cuối năm!',
      reply: null,
    },
    {
      rating: 3,
      content: 'Chất vải đẹp nhưng form Slim Fit hơi ôm phần vai so với mình nghĩ, shop tư vấn giúp mình cách bảo quản để vải không co nhé?',
      reply: null,
    },
    {
      rating: 5,
      content: 'Mua tặng mẹ mẫu đầm công sở mà mẹ ưng ý lắm, đường chỉ may tỉ mỉ không có chỉ thừa.',
      reply: null,
    },
    {
      rating: 4,
      content: 'Sneaker nhẹ và thoáng khí, mong MIVA ra thêm phiên bản màu kem phối nâu cho nữ ở đợt tới.',
      reply: null,
    },
    {
      rating: 5,
      content: 'Áp mã giảm giá VIP tiết kiệm được 150k, hàng chính hãng MIVA đóng gói thơm tho lịch sự.',
      reply: null,
    },
    {
      rating: 4,
      content: 'Balo nhiều ngăn tiện lợi, đi công tác 2 ngày đựng đồ rất gọn. Cho shop 4 sao vì hộp ngoài hơi móp nhẹ khi vận chuyển.',
      reply: null,
    },
  ];

  let revSeq = 1;
  const selectedForReview = reviewableDetails.slice(0, 15);
  for (let i = 0; i < selectedForReview.length; i++) {
    const det = selectedForReview[i];
    const tpl = reviewTemplates[i % reviewTemplates.length];
    const createdTime = new Date(det.orderCreatedAt.getTime() + 48 * 3600 * 1000);
    const repliedTime = tpl.reply ? new Date(createdTime.getTime() + 6 * 3600 * 1000) : null;

    await prisma.review.create({
      data: {
        id: uuid(1017, revSeq++),
        clientId: det.clientId,
        productId: det.productId,
        orderDetailId: det.id,
        rating: tpl.rating,
        content: tpl.content,
        adminReply: tpl.reply,
        repliedAt: repliedTime,
        createdAt: createdTime,
        updatedAt: repliedTime ?? createdTime,
      },
    });
  }

  // =========================================================================
  // 11. CRM SURVEYS (5 chiến dịch: 3 active, 1 draft, 1 closed) + QUESTIONS + OPTIONS + RESPONSES + ANSWERS + NOTIFICATIONS
  // =========================================================================
  interface SurveySeedDef {
    id: string;
    adminId: string;
    title: string;
    description: string;
    imageUrl: string;
    audienceType: SurveyAudienceType;
    recipientIds: string[];
    triggerType: SurveyTriggerType;
    status: SurveyStatus;
    startDate: string;
    endDate: string;
    questions: Array<{
      question: string;
      type: SurveyQuestionType;
      required: boolean;
      options?: string[];
    }>;
    sampleTexts: string[];
  }

  const vipRecipientIds = [
    client1Id,
    client2Id,
    activeClients[6].id,
    activeClients[7].id,
    activeClients[11].id,
    activeClients[14].id,
  ];

  const surveysSeed: SurveySeedDef[] = [
    // 1. ACTIVE - MANUAL - ALL_USERS (client1 pending để làm bài trực tiếp, 11 KH đã nộp để xem biểu đồ)
    {
      id: uuid(1018, 1),
      adminId: crmMainId,
      title: 'Khảo sát thăm dò thị hiếu Bộ sưu tập Thời trang Thu Đông 2026',
      description: 'Ý kiến của bạn giúp MIVA hoàn thiện chất liệu, bảng màu và kích cỡ cho Bộ sưu tập Thu Đông sắp ra mắt.',
      imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80',
      audienceType: SurveyAudienceType.all_users,
      recipientIds: [],
      triggerType: SurveyTriggerType.manual,
      status: SurveyStatus.active,
      startDate: '2026-10-20T00:00:00.000Z',
      endDate: '2027-02-28T23:59:59.000Z',
      questions: [
        {
          question: 'Bạn đánh giá thế nào về các thiết kế thời trang hiện tại trên sàn MIVA?',
          type: SurveyQuestionType.rating,
          required: true,
        },
        {
          question: 'Dòng sản phẩm nào bạn mong chờ nhất trong Bộ sưu tập Thu Đông 2026?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Áo Blazer & Áo khoác dạ Tweed thanh lịch',
            'Áo khoác gió trượt nước & Hoodie năng động',
            'Sơ mi dài tay & Quần âu công sở giữ nhiệt',
            'Đầm dệt kim & Chân váy xếp ly mùa thu',
          ],
        },
        {
          question: 'Tông màu chủ đạo nào bạn yêu thích nhất cho mùa cuối năm?',
          type: SurveyQuestionType.multiple_choice,
          required: true,
          options: [
            'Đen tuyền & Trắng kem tối giản',
            'Nâu Espresso & Be Caramel ấm áp',
            'Xanh Navy & Xanh Rêu hiện đại',
            'Đỏ Đô Ruby nổi bật mùa lễ hội',
          ],
        },
        {
          question: 'Mức ngân sách bạn sẵn sàng chi trả cho một sản phẩm khoác ngoài chất lượng cao?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Từ 300.000₫ – 500.000₫',
            'Từ 500.000₫ – 800.000₫',
            'Trên 800.000₫ cho dòng Limited cao cấp',
          ],
        },
        {
          question: 'Đề xuất thêm của bạn về bảng kích cỡ (Size) hoặc chất liệu mong muốn:',
          type: SurveyQuestionType.text,
          required: false,
        },
      ],
      sampleTexts: [
        'Mong MIVA bổ sung thêm size XXL cho áo khoác nam và bảng gợi ý chiều cao cân nặng chi tiết.',
        'Rất thích tông màu Nâu Espresso và Be Sữa, dễ phối đồ đi làm lẫn đi chơi.',
        'Chất vải giữ ấm nhẹ nhưng thoáng khí cho thời tiết Sài Gòn buổi tối là tuyệt nhất!',
        'Hy vọng đợt ra mắt BST mới có kèm voucher giảm giá sớm cho khách hàng thân thiết.',
      ],
    },
    // 2. ACTIVE - AFTER_ORDER_COMPLETED (gắn trực tiếp với các đơn hàng đã hoàn tất)
    {
      id: uuid(1018, 2),
      adminId: crmMainId,
      title: 'Khảo sát mức độ hài lòng sau nhận hàng & độ chuẩn xác bảng Size MIVA',
      description: 'Cảm ơn bạn đã mua sắm tại MIVA! Hãy chia sẻ cảm nhận thực tế về đơn hàng vừa nhận để chúng tôi phục vụ bạn tốt hơn.',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&q=80',
      audienceType: SurveyAudienceType.all_users,
      recipientIds: [],
      triggerType: SurveyTriggerType.after_order_completed,
      status: SurveyStatus.active,
      startDate: '2026-10-10T00:00:00.000Z',
      endDate: '2027-02-28T23:59:59.000Z',
      questions: [
        {
          question: 'Mức độ hài lòng tổng thể của bạn đối với đơn hàng vừa nhận tại MIVA?',
          type: SurveyQuestionType.rating,
          required: true,
        },
        {
          question: 'Kích cỡ (Size) sản phẩm bạn nhận được có vừa vặn như mong đợi không?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Rất vừa vặn, chuẩn bảng size MIVA',
            'Hơi rộng nhẹ nhưng vẫn mặc thoải mái',
            'Hơi ôm hơn so với kỳ vọng',
          ],
        },
        {
          question: 'Điểm nào trong quy trình giao nhận khiến bạn hài lòng nhất?',
          type: SurveyQuestionType.multiple_choice,
          required: false,
          options: [
            'Hộp đóng gói chỉn chu, quần áo phẳng phiu',
            'Giao hàng đúng hẹn, shipper lịch sự',
            'Áp dụng Voucher giảm giá nhanh chóng',
            'Chính sách đổi trả hoàn tiền trong 7 ngày yên tâm',
          ],
        },
        {
          question: 'Góp ý thêm cho đội ngũ đóng gói và chăm sóc khách hàng MIVA:',
          type: SurveyQuestionType.text,
          required: false,
        },
      ],
      sampleTexts: [
        'Hộp đóng gói có giấy nến thơm rất dễ chịu, sản phẩm đúng mô tả 100%.',
        'Bảng size áo polo chuẩn, giao nội thành TP.HCM chỉ mất hơn 1 ngày.',
        'Rất yên tâm vì có chính sách hỗ trợ hoàn tiền minh bạch ngay trên web.',
      ],
    },
    // 3. ACTIVE - SELECTED_USERS (Chiến dịch chăm sóc tệp Khách hàng VIP chọn lọc)
    {
      id: uuid(1018, 3),
      adminId: crmSubId,
      title: 'Khảo sát đặc quyền Hội viên Thân thiết MIVA VIP Quý 4/2026',
      description: 'Dành riêng cho nhóm Khách hàng Thân thiết có điểm tích lũy cao nhằm thiết kế quà tặng tri ân cuối năm.',
      imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
      audienceType: SurveyAudienceType.selected_users,
      recipientIds: vipRecipientIds,
      triggerType: SurveyTriggerType.manual,
      status: SurveyStatus.active,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2027-01-31T23:59:59.000Z',
      questions: [
        {
          question: 'Bạn đánh giá thế nào về chương trình tích điểm & ưu đãi Voucher VIP hiện tại?',
          type: SurveyQuestionType.rating,
          required: true,
        },
        {
          question: 'Đặc quyền nào bạn mong muốn nhận nhất trong dịp tri ân cuối năm?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Phiếu mua hàng giảm trực tiếp 200.000₫ không điều kiện',
            'Quyền đặt trước Bộ sưu tập Giới hạn giảm 20%',
            'Quà tặng phụ kiện da khắc tên cá nhân hóa',
          ],
        },
        {
          question: 'Kênh nhận thông báo ưu đãi nào thuận tiện nhất với bạn?',
          type: SurveyQuestionType.multiple_choice,
          required: false,
          options: [
            'Chuông thông báo trực tiếp trên tài khoản MIVA',
            'Email bản tin thời trang hàng tháng',
            'Tin nhắn SMS / Zalo OA',
          ],
        },
        {
          question: 'Lời nhắn gửi của bạn tới đội ngũ chăm sóc khách hàng VIP MIVA:',
          type: SurveyQuestionType.text,
          required: false,
        },
      ],
      sampleTexts: [
        'Thích nhất là nhận thông báo trực tiếp trên web kèm mã giảm giá VIP riêng.',
        'Mong có thêm quà tặng sinh nhật theo tháng sinh của hội viên.',
      ],
    },
    // 4. DRAFT - BẢN NHÁP SẴN SÀNG ĐỂ CRM MANAGER BẤM "PHÁT HÀNH" LIVE KHI BẢO VỆ ĐỒ ÁN!
    {
      id: uuid(1018, 4),
      adminId: crmMainId,
      title: 'Khảo sát nhu cầu ưu đãi Siêu Hội Mua Sắm Cuối Năm 12.12',
      description: 'Bản khảo sát chuẩn bị phát hành toàn sàn để lấy ý kiến khung giờ Flash Sale và nhóm sản phẩm giảm sâu dịp 12.12.',
      imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80',
      audienceType: SurveyAudienceType.all_users,
      recipientIds: [],
      triggerType: SurveyTriggerType.manual,
      status: SurveyStatus.draft,
      startDate: '2026-11-16T00:00:00.000Z',
      endDate: '2027-01-15T23:59:59.000Z',
      questions: [
        {
          question: 'Mức độ quan tâm của bạn tới sự kiện Siêu Sale Thời Trang 12.12 trên MIVA?',
          type: SurveyQuestionType.rating,
          required: true,
        },
        {
          question: 'Hình thức khuyến mãi nào hấp dẫn bạn nhất?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Mua 2 giảm thêm 15% toàn bộ giỏ hàng',
            'Đồng giá Áo Polo & Sơ mi khung giờ vàng',
            'Tặng Voucher hoàn tiền cho đơn từ 500.000₫',
          ],
        },
        {
          question: 'Bạn dự định mua sắm nhóm sản phẩm nào trong dịp lễ cuối năm?',
          type: SurveyQuestionType.multiple_choice,
          required: false,
          options: [
            'Trang phục đi tiệc & Lễ hội',
            'Đồ công sở mặc hàng ngày',
            'Giày Sneaker & Túi xách làm quà tặng',
          ],
        },
        {
          question: 'Sản phẩm cụ thể nào bạn muốn MIVA đưa vào danh sách Flash Sale 12.12?',
          type: SurveyQuestionType.text,
          required: false,
        },
      ],
      sampleTexts: [],
    },
    // 5. CLOSED - CHIẾN DỊCH ĐÃ KẾT THÚC QUÝ 3/2026 VỚI BÁO CÁO HOÀN CHỈNH
    {
      id: uuid(1018, 5),
      adminId: crmSubId,
      title: 'Khảo sát trải nghiệm giao diện Website thương mại MIVA Quý 3/2026',
      description: 'Chiến dịch khảo sát định kỳ đánh giá tốc độ tìm kiếm, bộ lọc màu sắc/size và thanh toán trực tuyến.',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
      audienceType: SurveyAudienceType.all_users,
      recipientIds: [],
      triggerType: SurveyTriggerType.manual,
      status: SurveyStatus.closed,
      startDate: '2026-09-05T00:00:00.000Z',
      endDate: '2026-10-15T23:59:59.000Z',
      questions: [
        {
          question: 'Bạn chấm bao nhiêu sao cho tốc độ tải trang và giao diện mua sắm của MIVA?',
          type: SurveyQuestionType.rating,
          required: true,
        },
        {
          question: 'Tính năng nào trên trang chi tiết sản phẩm hữu ích nhất với bạn?',
          type: SurveyQuestionType.single_choice,
          required: true,
          options: [
            'Xem tồn kho thực tế theo từng Màu sắc & Size',
            'Đọc đánh giá thực tế kèm phản hồi của CRM',
            'Lưu sản phẩm vào danh sách Yêu thích',
          ],
        },
        {
          question: 'Phương thức thanh toán bạn thường sử dụng nhất trên MIVA?',
          type: SurveyQuestionType.multiple_choice,
          required: false,
          options: [
            'Thanh toán khi nhận hàng (COD)',
            'Ví điện tử VNPAY / MoMo / ZaloPay',
            'Thẻ tín dụng / Mua trước trả sau',
          ],
        },
      ],
      sampleTexts: [],
    },
  ];

  let qSeq = 1;
  let optSeq = 1;
  let respSeq = 1;
  let ansSeq = 1;
  let notiSeq = 1;

  for (let sIdx = 0; sIdx < surveysSeed.length; sIdx++) {
    const sDef = surveysSeed[sIdx];
    await prisma.survey.create({
      data: {
        id: sDef.id,
        adminId: sDef.adminId,
        title: sDef.title,
        description: sDef.description,
        imageUrl: sDef.imageUrl,
        scope: SurveyScope.platform,
        audienceType: sDef.audienceType,
        recipientIds: sDef.recipientIds,
        triggerType: sDef.triggerType,
        status: sDef.status,
        startDate: isoDate(sDef.startDate),
        endDate: isoDate(sDef.endDate),
        createdAt: isoDate(sDef.startDate),
      },
    });

    const createdQuestions: Array<{
      id: string;
      type: SurveyQuestionType;
      optionIds: string[];
    }> = [];

    for (let p = 0; p < sDef.questions.length; p++) {
      const qDef = sDef.questions[p];
      const qId = uuid(1019, qSeq++);
      await prisma.surveyQuestion.create({
        data: {
          id: qId,
          surveyId: sDef.id,
          question: qDef.question,
          type: qDef.type,
          required: qDef.required,
          position: p + 1,
        },
      });

      const optionIds: string[] = [];
      if (qDef.options) {
        for (let o = 0; o < qDef.options.length; o++) {
          const optId = uuid(1020, optSeq++);
          await prisma.surveyOption.create({
            data: {
              id: optId,
              questionId: qId,
              content: qDef.options[o],
              position: o + 1,
            },
          });
          optionIds.push(optId);
        }
      }
      createdQuestions.push({ id: qId, type: qDef.type, optionIds });
    }

    // Bản nháp (draft) chưa phát hành nên chưa tạo SurveyResponse
    if (sDef.status === SurveyStatus.draft) continue;

    // Xác định danh sách người nhận theo loại khảo sát
    interface RecipientPlan {
      clientId: string;
      orderId: string | null;
      status: SurveyResponseStatus;
      notifiedAt: Date;
    }
    const recipients: RecipientPlan[] = [];

    if (sIdx === 0) {
      // Survey 1 (BST Thu Đông): gửi cho toàn bộ 17 KH active
      // client1 & 2 KH khác ở trạng thái pending (chưa đọc thông báo để demo làm bài trực tiếp!)
      // 13 KH đã submitted (gồm client2), 1 KH skipped
      for (let i = 0; i < activeClients.length; i++) {
        const cl = activeClients[i];
        let st: SurveyResponseStatus = SurveyResponseStatus.submitted;
        if (cl.id === client1Id || i === 15 || i === 16) {
          st = SurveyResponseStatus.pending;
        } else if (i === 14) {
          st = SurveyResponseStatus.skipped;
        }
        recipients.push({
          clientId: cl.id,
          orderId: null,
          status: st,
          notifiedAt: isoDate('2026-10-22T09:00:00.000Z'),
        });
      }
    } else if (sIdx === 1) {
      // Survey 2 (After Order Completed): gắn với 10 đơn completed đầu tiên
      const targetCompleted = completedOrdersByClient.slice(0, 10);
      for (let i = 0; i < targetCompleted.length; i++) {
        const ord = targetCompleted[i];
        // Đơn MIVA-261113-002 mới nhất của client1 & đơn của client2 để pending để khách thấy khảo sát sau mua hàng!
        const isPendingDemo =
          ord.code === 'MIVA-261113-002' || ord.clientId === client2Id;
        recipients.push({
          clientId: ord.clientId,
          orderId: ord.id,
          status: isPendingDemo
            ? SurveyResponseStatus.pending
            : SurveyResponseStatus.submitted,
          notifiedAt: new Date(ord.createdAt.getTime() + 37 * 3600 * 1000),
        });
      }
    } else if (sIdx === 2) {
      // Survey 3 (VIP Selected Users): 6 KH VIP (client1 submitted, client2 pending, 3 submitted, 1 pending)
      for (let i = 0; i < vipRecipientIds.length; i++) {
        const cid = vipRecipientIds[i];
        const isPending = cid === client2Id || i === 5;
        recipients.push({
          clientId: cid,
          orderId: null,
          status: isPending
            ? SurveyResponseStatus.pending
            : SurveyResponseStatus.submitted,
          notifiedAt: isoDate('2026-11-02T08:30:00.000Z'),
        });
      }
    } else if (sIdx === 4) {
      // Survey 5 (Closed Q3): 12 KH (9 submitted, 1 skipped, 2 expired)
      for (let i = 0; i < 12; i++) {
        const cl = activeClients[i];
        const st =
          i < 9
            ? SurveyResponseStatus.submitted
            : i === 9
              ? SurveyResponseStatus.skipped
              : SurveyResponseStatus.expired;
        recipients.push({
          clientId: cl.id,
          orderId: null,
          status: st,
          notifiedAt: isoDate('2026-09-15T09:00:00.000Z'),
        });
      }
    }

    for (let rIdx = 0; rIdx < recipients.length; rIdx++) {
      const rec = recipients[rIdx];
      const responseId = uuid(1021, respSeq++);
      const deliveryKey = `${sDef.id}:${rec.clientId}:${rec.orderId ?? 'manual'}`;
      const openedAt =
        rec.status === SurveyResponseStatus.submitted ||
        rec.status === SurveyResponseStatus.skipped
          ? new Date(rec.notifiedAt.getTime() + 2 * 3600 * 1000)
          : null;
      const submittedAt =
        rec.status === SurveyResponseStatus.submitted
          ? new Date(rec.notifiedAt.getTime() + 3 * 3600 * 1000)
          : null;
      const skippedAt =
        rec.status === SurveyResponseStatus.skipped
          ? new Date(rec.notifiedAt.getTime() + 2.5 * 3600 * 1000)
          : null;

      await prisma.surveyResponse.create({
        data: {
          id: responseId,
          surveyId: sDef.id,
          clientId: rec.clientId,
          orderId: rec.orderId,
          deliveryKey,
          status: rec.status,
          notifiedAt: rec.notifiedAt,
          openedAt,
          submittedAt,
          skippedAt,
          expiresAt: isoDate(sDef.endDate),
          createdAt: rec.notifiedAt,
        },
      });

      // Tạo Notification mời khảo sát đúng chuẩn SurveysService
      const isUnread = rec.status === SurveyResponseStatus.pending;
      await prisma.notification.create({
        data: {
          id: uuid(1023, notiSeq++),
          clientId: rec.clientId,
          surveyId: sDef.id,
          surveyResponseId: responseId,
          type: NotificationType.survey_invitation,
          title: sDef.title,
          content: sDef.description,
          data: {
            responseId,
            surveyId: sDef.id,
            orderId: rec.orderId,
          },
          isRead: !isUnread,
          readAt: isUnread ? null : openedAt ?? rec.notifiedAt,
          expiresAt: isoDate(sDef.endDate),
          createdAt: rec.notifiedAt,
        },
      });

      // Sinh câu trả lời chi tiết cho các phiếu đã submitted
      if (rec.status === SurveyResponseStatus.submitted) {
        for (const q of createdQuestions) {
          if (q.type === SurveyQuestionType.rating) {
            const ratingVal = 4 + ((rIdx + sIdx) % 2); // 4 hoặc 5 sao chủ đạo, xen kẽ tự nhiên
            await prisma.surveyAnswer.create({
              data: {
                id: uuid(1022, ansSeq++),
                responseId,
                questionId: q.id,
                ratingValue: rIdx === 4 ? 3 : ratingVal,
              },
            });
          } else if (q.type === SurveyQuestionType.single_choice && q.optionIds.length > 0) {
            const chosenOpt = q.optionIds[(rIdx + sIdx) % q.optionIds.length];
            await prisma.surveyAnswer.create({
              data: {
                id: uuid(1022, ansSeq++),
                responseId,
                questionId: q.id,
                optionId: chosenOpt,
              },
            });
          } else if (q.type === SurveyQuestionType.multiple_choice && q.optionIds.length > 0) {
            const opt1 = q.optionIds[rIdx % q.optionIds.length];
            const opt2 = q.optionIds[(rIdx + 1) % q.optionIds.length];
            await prisma.surveyAnswer.create({
              data: {
                id: uuid(1022, ansSeq++),
                responseId,
                questionId: q.id,
                optionId: opt1,
              },
            });
            if (opt2 !== opt1) {
              await prisma.surveyAnswer.create({
                data: {
                  id: uuid(1022, ansSeq++),
                  responseId,
                  questionId: q.id,
                  optionId: opt2,
                },
              });
            }
          } else if (q.type === SurveyQuestionType.text && sDef.sampleTexts.length > 0 && rIdx < sDef.sampleTexts.length) {
            await prisma.surveyAnswer.create({
              data: {
                id: uuid(1022, ansSeq++),
                responseId,
                questionId: q.id,
                textAnswer: sDef.sampleTexts[rIdx],
              },
            });
          }
        }
      }
    }
  }

  // Bổ sung thông báo cập nhật đơn hàng & cảnh báo công việc CRM cho Client và Admin/CRM
  const extraNotifications = [
    {
      clientId: client1Id,
      adminId: null,
      type: NotificationType.order_update,
      title: 'Đơn hàng #MIVA-261115-003 đang trên đường giao đến bạn',
      content: 'Đơn vị vận chuyển đã nhận kiện hàng Áo Khoác Gió MIVA Pro-Shield và dự kiến giao trong hôm nay.',
      isRead: false,
      createdAt: isoDate('2026-11-15T08:00:00.000Z'),
    },
    {
      clientId: client1Id,
      adminId: null,
      type: NotificationType.system,
      title: 'MIVA đã phản hồi đánh giá sản phẩm của bạn',
      content: 'Người quản lý CRM vừa gửi lời cảm ơn dưới đánh giá sản phẩm Áo Polo Nam Pique MIVA Signature.',
      isRead: true,
      readAt: isoDate('2026-11-14T10:00:00.000Z'),
      createdAt: isoDate('2026-11-14T09:00:00.000Z'),
    },
    {
      clientId: client2Id,
      adminId: null,
      type: NotificationType.order_update,
      title: 'Hoàn tiền thành công đơn hàng #MIVA-261108-007',
      content: 'Yêu cầu trả hàng hoàn tiền của bạn đã được xử lý, số tiền thanh toán qua VNPAY đã được hoàn lại.',
      isRead: false,
      createdAt: isoDate('2026-11-09T16:25:00.000Z'),
    },
    {
      clientId: null,
      adminId: crmMainId,
      type: NotificationType.system,
      title: 'Có 6 đánh giá sản phẩm mới đang chờ phản hồi',
      content: 'Khách hàng vừa gửi nhận xét mới về sản phẩm, vui lòng kiểm tra mục Quản lý Đánh giá để phản hồi.',
      isRead: false,
      createdAt: isoDate('2026-11-16T04:00:00.000Z'),
    },
    {
      clientId: null,
      adminId: crmMainId,
      type: NotificationType.order_update,
      title: 'Có 2 đơn hàng mới đang chờ xác nhận (#MIVA-261116-004, #MIVA-261116-009)',
      content: 'Khách hàng Nguyễn Văn Minh và Trần Thị Lan Anh vừa đặt đơn hàng mới trên cổng MIVA.',
      isRead: false,
      createdAt: isoDate('2026-11-16T05:15:00.000Z'),
    },
    {
      clientId: null,
      adminId: adminMainId,
      type: NotificationType.system,
      title: 'Báo cáo Đối soát Doanh thu & Hoàn tiền tháng 11/2026 đã sẵn sàng',
      content: 'Hệ thống đã ghi nhận đầy đủ các giao dịch thanh toán và hoàn tiền phát sinh trong kỳ.',
      isRead: false,
      createdAt: isoDate('2026-11-16T06:00:00.000Z'),
    },
  ];

  for (const n of extraNotifications) {
    await prisma.notification.create({
      data: {
        id: uuid(1023, notiSeq++),
        clientId: n.clientId,
        adminId: n.adminId,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        readAt: n.readAt ?? null,
        createdAt: n.createdAt,
      },
    });
  }

  // =========================================================================
  // 12. VERIFY ALL 23 TABLES
  // =========================================================================
  const summary: Array<[string, number]> = [
    ['Admin', await prisma.admin.count()],
    ['Client', await prisma.client.count()],
    ['ClientAddress', await prisma.clientAddress.count()],
    ['Category', await prisma.category.count()],
    ['Product', await prisma.product.count()],
    ['ProductColor', await prisma.productColor.count()],
    ['ProductVariant', await prisma.productVariant.count()],
    ['ProductFavorite', await prisma.productFavorite.count()],
    ['Cart', await prisma.cart.count()],
    ['CartItem', await prisma.cartItem.count()],
    ['Voucher', await prisma.voucher.count()],
    ['VoucherDetail', await prisma.voucherDetail.count()],
    ['Order', await prisma.order.count()],
    ['OrderDetail', await prisma.orderDetail.count()],
    ['Payment', await prisma.payment.count()],
    ['OrderStatusHistory', await prisma.orderStatusHistory.count()],
    ['Review', await prisma.review.count()],
    ['Survey', await prisma.survey.count()],
    ['SurveyQuestion', await prisma.surveyQuestion.count()],
    ['SurveyOption', await prisma.surveyOption.count()],
    ['SurveyResponse', await prisma.surveyResponse.count()],
    ['SurveyAnswer', await prisma.surveyAnswer.count()],
    ['Notification', await prisma.notification.count()],
  ];

  let totalRows = 0;
  console.log('\n------------------------------------------------------------');
  console.log(' THONG KE SO BAN GHI TREN TOAN BO 23 BANG NGHIEP VU:');
  console.log('------------------------------------------------------------');
  for (const [table, count] of summary) {
    totalRows += count;
    console.log(` - ${table.padEnd(22)} : ${count}`);
    if (count === 0) {
      throw new Error(`Bang ${table} dang co 0 ban ghi!`);
    }
  }
  console.log('------------------------------------------------------------');
  console.log(` TONG CONG 23 BANG        : ${totalRows} ban ghi`);
  console.log(' MAT KHAU DEMO THONG NHAT : 123456');
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('Loi khi nap du lieu Demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
