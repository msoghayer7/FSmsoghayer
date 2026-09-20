import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../../config/data-source';
import { Account } from '../../accounting/entities/account.entity';
import { FiscalYear } from '../../accounting/entities/fiscal-year.entity';
import { FIRST_FISCAL_YEAR } from '../../accounting/fiscal-years.service';
import { User } from '../../users/user.entity';
import { Department } from '../../organization/entities/department.entity';
import { BusinessPartner } from '../../organization/entities/business-partner.entity';
import { AssetCategory } from '../../assets/entities/asset-category.entity';
import { AccountBalanceSide, AccountType, PartnerType, UserRole } from '../../common/enums';
import { DEFAULT_ACCOUNT_CODES } from '../../common/constants/default-accounts';

interface ChartAccountRow {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  isPostable: boolean;
  nature: string;
  balanceSide: string;
  isActive: boolean;
  statementType: string | null;
}

const NATURE_TO_ACCOUNT_TYPE: Record<string, AccountType> = {
  REVENUE: AccountType.REVENUE,
  EXPENSE: AccountType.EXPENSE,
  ASSET: AccountType.ASSET,
  LIABILITY: AccountType.LIABILITY,
  NET_ASSETS: AccountType.EQUITY,
  MIXED: AccountType.MIXED,
  OFF_BALANCE: AccountType.OFF_BALANCE,
  OTHER: AccountType.OTHER,
};

const SIDE_TO_BALANCE_SIDE: Record<string, AccountBalanceSide> = {
  DEBIT: AccountBalanceSide.DEBIT,
  CREDIT: AccountBalanceSide.CREDIT,
  BOTH: AccountBalanceSide.BOTH,
  OFF_BALANCE: AccountBalanceSide.OFF_BALANCE,
  OTHER: AccountBalanceSide.OTHER,
};

/** يستورد دليل الحساب الحكومي الموحد كاملاً (2,589 حسابًا) من الملف المستخرج من ملف الإكسل الرسمي. */
async function importChartOfAccounts(): Promise<Map<string, string>> {
  const accountRepo = AppDataSource.getRepository(Account);
  const existing = await accountRepo.count();
  const codeToId = new Map<string, string>();

  if (existing > 0) {
    console.log(`  chart of accounts already has ${existing} rows, skipping import`);
    const all = await accountRepo.find({ select: ['id', 'code'] });
    all.forEach((a) => codeToId.set(a.code, a.id));
    return codeToId;
  }

  const dataPath = path.join(__dirname, 'data', 'chart-of-accounts.json');
  const rows: ChartAccountRow[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  rows.sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));

  rows.forEach((r) => codeToId.set(r.code, randomUUID()));

  const codeToRow = new Map(rows.map((r) => [r.code, r]));
  const pathCache = new Map<string, string[]>();
  const buildPath = (code: string): string[] => {
    if (pathCache.has(code)) return pathCache.get(code)!;
    const row = codeToRow.get(code)!;
    const path = row.parentCode ? [...buildPath(row.parentCode), code] : [code];
    pathCache.set(code, path);
    return path;
  };

  const entities = rows.map((r) =>
    accountRepo.create({
      id: codeToId.get(r.code),
      code: r.code,
      name: r.name,
      level: r.level,
      parentCode: r.parentCode,
      parentId: r.parentCode ? codeToId.get(r.parentCode) : null,
      path: buildPath(r.code),
      type: NATURE_TO_ACCOUNT_TYPE[r.nature] ?? AccountType.OTHER,
      balanceSide: SIDE_TO_BALANCE_SIDE[r.balanceSide] ?? AccountBalanceSide.OTHER,
      isPostable: r.isPostable,
      statementType: r.statementType,
      isActive: r.isActive,
      allowManualEntries: true,
    }),
  );

  const CHUNK = 400;
  for (let i = 0; i < entities.length; i += CHUNK) {
    await accountRepo.insert(entities.slice(i, i + CHUNK));
  }
  console.log(`  imported ${entities.length} accounts from the unified government chart of accounts`);

  return codeToId;
}

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database, seeding...');

  const codeToId = await importChartOfAccounts();
  const accountId = (code: string): string => {
    const id = codeToId.get(code);
    if (!id) {
      throw new Error(`Default account code ${code} not found in the imported chart of accounts`);
    }
    return id;
  };

  const userRepo = AppDataSource.getRepository(User);
  const adminEmail = 'admin@fsm-erp.local';
  let admin = await userRepo.findOneBy({ email: adminEmail });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        fullName: 'System Administrator',
        email: adminEmail,
        passwordHash: await bcrypt.hash('Admin@12345', 10),
        role: UserRole.ADMIN,
      }),
    );
    console.log(`  created admin user ${adminEmail} / Admin@12345`);
  }

  const deptRepo = AppDataSource.getRepository(Department);
  let finance = await deptRepo.findOneBy({ code: 'FIN' });
  if (!finance) {
    finance = await deptRepo.save(deptRepo.create({ code: 'FIN', name: 'الشؤون المالية' }));
    console.log('  created department FIN');
  }
  let it = await deptRepo.findOneBy({ code: 'IT' });
  if (!it) {
    it = await deptRepo.save(deptRepo.create({ code: 'IT', name: 'تقنية المعلومات' }));
    console.log('  created department IT');
  }

  const fiscalYearRepo = AppDataSource.getRepository(FiscalYear);
  const firstYear = await fiscalYearRepo.findOneBy({ yearNumber: FIRST_FISCAL_YEAR });
  if (!firstYear) {
    await fiscalYearRepo.save(
      fiscalYearRepo.create({
        yearNumber: FIRST_FISCAL_YEAR,
        startDate: `${FIRST_FISCAL_YEAR}-01-01`,
        endDate: `${FIRST_FISCAL_YEAR}-12-31`,
      }),
    );
    console.log(`  created fiscal year ${FIRST_FISCAL_YEAR} (open)`);
  }

  const partnerRepo = AppDataSource.getRepository(BusinessPartner);
  let vendor = await partnerRepo.findOneBy({ code: 'V-0001' });
  if (!vendor) {
    vendor = await partnerRepo.save(
      partnerRepo.create({
        code: 'V-0001',
        name: 'شركة الرياض لحلول المكاتب',
        type: PartnerType.VENDOR,
        taxNumber: '300000000000003',
        email: 'billing@example-vendor.test',
        phone: '+966-11-000-0000',
      }),
    );
    console.log('  created business partner V-0001');
  }

  const categoryRepo = AppDataSource.getRepository(AssetCategory);
  let itEquipment = await categoryRepo.findOneBy({ name: 'أجهزة ومعدات تقنية' });
  if (!itEquipment) {
    itEquipment = await categoryRepo.save(
      categoryRepo.create({
        name: 'أجهزة ومعدات تقنية',
        defaultUsefulLifeMonths: 36,
        assetAccountId: accountId(DEFAULT_ACCOUNT_CODES.FIXED_ASSETS),
        depreciationExpenseAccountId: accountId(DEFAULT_ACCOUNT_CODES.DEPRECIATION_EXPENSE),
        accumulatedDepreciationAccountId: accountId(DEFAULT_ACCOUNT_CODES.ACCUMULATED_DEPRECIATION),
      }),
    );
    console.log('  created asset category: أجهزة ومعدات تقنية (36 months)');
  }

  console.log('\nSeed complete.');
  console.log('Login with: admin@fsm-erp.local / Admin@12345');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
