import { PageTransition } from '@/components/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Plus } from 'lucide-react';

export default function HomePage() {
  // 통계 데이터 (추후 실제 데이터베이스에서 가져올 예정)
  const stats = [
    { title: 'Total Projects', value: '24', trend: 'Increased from last month', primary: true },
    { title: 'Ended Projects', value: '10', trend: 'Increased from last month' },
    { title: 'Running Projects', value: '12', trend: 'Increased from last month' },
    { title: 'Pending Project', value: '2', trend: 'On Discuss' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Plan, prioritize, and accomplish your tasks with ease.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Import Data
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className={
                stat.primary
                  ? 'bg-gradient-to-br from-[#3F72AF] to-[#112D4E] text-white border-0'
                  : 'bg-[#DBE2EF]/30 dark:bg-[#DBE2EF]/10 border-[#DBE2EF]/50'
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle
                  className={`text-sm font-medium ${stat.primary ? 'text-white/90' : 'text-foreground'}`}
                >
                  {stat.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-full ${stat.primary ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stat.value}</div>
                <p
                  className={`text-xs mt-2 flex items-center gap-1 ${stat.primary ? 'text-white/80' : 'text-muted-foreground'}`}
                >
                  <span className={stat.primary ? 'text-white/90' : ''}>📈</span>
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 메인 콘텐츠 그리드 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Project Analytics */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                차트 영역
              </div>
            </CardContent>
          </Card>

          {/* Team Collaboration & Project Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    A
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Alexandra Deff</p>
                    <p className="text-xs text-muted-foreground">Working on Github Project Repository</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Completed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
