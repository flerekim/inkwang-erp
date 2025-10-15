import { Wallet, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { getBankAccounts } from '@/actions/bank-accounts';
import { getCompanies } from '@/actions/companies';
import { BankAccountsTable } from './bank-accounts-table';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';

export default async function BankAccountsPage() {
  const [bankAccounts, companies] = await Promise.all([
    getBankAccounts(),
    getCompanies(),
  ]);

  const stats = {
    total: bankAccounts.length,
    totalBalance: bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0),
    averageBalance: bankAccounts.length > 0
      ? Math.round(bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0) / bankAccounts.length)
      : 0,
    companies: new Set(bankAccounts.map((acc) => acc.company_id)).size,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="은행계좌 관리"
          description="회사별 은행계좌를 관리합니다"
        />

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="전체 계좌"
            value={stats.total}
            description="등록된 전체 계좌 수"
            icon={CreditCard}
          />
          <StatsCard
            title="총 잔액"
            value={`₩${stats.totalBalance.toLocaleString()}`}
            description="모든 계좌 잔액 합계"
            icon={Wallet}
          />
          <StatsCard
            title="평균 잔액"
            value={`₩${stats.averageBalance.toLocaleString()}`}
            description="계좌당 평균 잔액"
            icon={DollarSign}
          />
          <StatsCard
            title="소속 회사"
            value={stats.companies}
            description="계좌 등록 회사 수"
            icon={TrendingUp}
          />
        </div>

        <BankAccountsTable data={bankAccounts} companies={companies} />
      </div>
    </PageTransition>
  );
}
