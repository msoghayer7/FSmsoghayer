import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/data-source';
import { Account } from '../../accounting/entities/account.entity';
import { User } from '../../users/user.entity';
import { Department } from '../../organization/entities/department.entity';
import { BusinessPartner } from '../../organization/entities/business-partner.entity';
import { AssetCategory } from '../../assets/entities/asset-category.entity';
import { AccountType, PartnerType, UserRole } from '../../common/enums';

const CHART_OF_ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: '1000', name: 'Cash', type: AccountType.ASSET },
  { code: '1010', name: 'Bank', type: AccountType.ASSET },
  { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET },
  { code: '1200', name: 'Prepaid Expenses', type: AccountType.ASSET },
  { code: '1500', name: 'Fixed Assets', type: AccountType.ASSET },
  { code: '1590', name: 'Accumulated Depreciation', type: AccountType.ASSET },
  { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
  { code: '3000', name: "Owner's Equity", type: AccountType.EQUITY },
  { code: '4000', name: 'Revenue', type: AccountType.REVENUE },
  { code: '4900', name: 'Gain on Disposal of Assets', type: AccountType.REVENUE },
  { code: '5000', name: 'General & Administrative Expenses', type: AccountType.EXPENSE },
  { code: '5100', name: 'Rent Expense', type: AccountType.EXPENSE },
  { code: '5200', name: 'Depreciation Expense', type: AccountType.EXPENSE },
  { code: '5900', name: 'Loss on Disposal of Assets', type: AccountType.EXPENSE },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database, seeding...');

  const accountRepo = AppDataSource.getRepository(Account);
  const accountsByCode = new Map<string, Account>();
  for (const def of CHART_OF_ACCOUNTS) {
    let account = await accountRepo.findOneBy({ code: def.code });
    if (!account) {
      account = await accountRepo.save(accountRepo.create(def));
      console.log(`  created account ${def.code} ${def.name}`);
    }
    accountsByCode.set(def.code, account);
  }

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
    finance = await deptRepo.save(deptRepo.create({ code: 'FIN', name: 'Finance' }));
    console.log('  created department FIN - Finance');
  }
  let it = await deptRepo.findOneBy({ code: 'IT' });
  if (!it) {
    it = await deptRepo.save(deptRepo.create({ code: 'IT', name: 'Information Technology' }));
    console.log('  created department IT - Information Technology');
  }

  const partnerRepo = AppDataSource.getRepository(BusinessPartner);
  let vendor = await partnerRepo.findOneBy({ code: 'V-0001' });
  if (!vendor) {
    vendor = await partnerRepo.save(
      partnerRepo.create({
        code: 'V-0001',
        name: 'Al Riyadh Office Solutions Co.',
        type: PartnerType.VENDOR,
        taxNumber: '300000000000003',
        email: 'billing@example-vendor.test',
        phone: '+966-11-000-0000',
      }),
    );
    console.log('  created business partner V-0001');
  }

  const categoryRepo = AppDataSource.getRepository(AssetCategory);
  let itEquipment = await categoryRepo.findOneBy({ name: 'IT Equipment' });
  if (!itEquipment) {
    itEquipment = await categoryRepo.save(
      categoryRepo.create({
        name: 'IT Equipment',
        defaultUsefulLifeMonths: 36,
        assetAccountId: accountsByCode.get('1500')!.id,
        depreciationExpenseAccountId: accountsByCode.get('5200')!.id,
        accumulatedDepreciationAccountId: accountsByCode.get('1590')!.id,
      }),
    );
    console.log('  created asset category IT Equipment (36 months)');
  }

  console.log('\nSeed complete.');
  console.log('Login with: admin@fsm-erp.local / Admin@12345');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
