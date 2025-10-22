'use client';

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  getReceivableDetail,
  createReceivableActivity,
  deleteReceivableActivity,
} from '@/actions/receivables';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar,
  User,
  Building2,
  CreditCard,
  Activity,
  Trash2,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileX,
} from 'lucide-react';
import type { ReceivableWithDetails, ReceivableDetailData } from '@/types';

interface ReceivableDetailDialogProps {
  receivable: ReceivableWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivableDetailDialog({
  receivable,
  open,
  onOpenChange,
}: ReceivableDetailDialogProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [detailData, setDetailData] = useState<ReceivableDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 회수활동 추가 폼
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityContent, setActivityContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 채권 상세 정보 로드
  const loadDetailData = useCallback(async () => {
    if (!receivable?.id) {
      setDetailData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setDetailData(null);

    try {
      const result = await getReceivableDetail(receivable.id);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '상세 정보 조회 실패',
          description: result.error,
        });
        setDetailData(null);
        return;
      }

      if (result.data) {
        setDetailData(result.data);
      }
    } catch (error) {
      console.error('Detail data loading error:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
      setDetailData(null);
    } finally {
      setIsLoading(false);
    }
  }, [receivable?.id, toast]);

  // 채권 상세 정보 로드 효과
  useEffect(() => {
    if (open && receivable?.id) {
      loadDetailData();
    }
  }, [open, receivable?.id, loadDetailData]);

  // 회수활동 추가
  const handleAddActivity = async () => {
    if (!receivable?.id || !activityContent.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '회수활동 내용을 입력하세요.',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await createReceivableActivity({
      receivable_id: receivable.id,
      activity_date: activityDate,
      activity_content: activityContent.trim(),
    });

    setIsSubmitting(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: '회수활동 추가 실패',
        description: result.error,
      });
      return;
    }

    toast({
      title: '회수활동 추가 완료',
      description: '회수활동이 등록되었습니다.',
    });

    // 폼 초기화
    setActivityContent('');
    setShowActivityForm(false);

    // 데이터 새로고침
    await loadDetailData();
    router.refresh();
  };

  // 회수활동 삭제
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('이 회수활동을 삭제하시겠습니까?')) {
      return;
    }

    const result = await deleteReceivableActivity(activityId);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: '회수활동 삭제 실패',
        description: result.error,
      });
      return;
    }

    toast({
      title: '회수활동 삭제 완료',
      description: '회수활동이 삭제되었습니다.',
    });

    // 데이터 새로고침
    await loadDetailData();
    router.refresh();
  };

  if (!receivable) {
    return null;
  }

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            미수
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            부분수금
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            수금완료
          </Badge>
        );
      default:
        return null;
    }
  };

  // 분류 뱃지
  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'normal':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            정상
          </Badge>
        );
      case 'overdue_long':
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            장기
          </Badge>
        );
      case 'bad_debt':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            부실
          </Badge>
        );
      case 'written_off':
        return (
          <Badge variant="secondary" className="gap-1">
            <FileX className="h-3 w-3" />
            대손
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">채권 상세 정보</DialogTitle>
          <DialogDescription>
            계약명: {detailData?.contract_name || '로딩 중...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">상세 정보를 불러오는 중...</div>
          </div>
        ) : !detailData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">데이터를 찾을 수 없습니다.</div>
          </div>
        ) : (
          <>
            {/* 기본 정보 */}
            <div className="space-y-6">
          {/* 계약 및 고객 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                계약명
              </Label>
              <div className="text-sm font-medium">{detailData.contract_name}</div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                고객명
              </Label>
              <div className="text-sm font-medium">{detailData.customer_name}</div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                채권금액
              </Label>
              <div className="text-sm font-mono font-semibold">
                {formatCurrency(detailData.billing_amount || 0)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                잔액
              </Label>
              <div className={`text-sm font-mono font-semibold ${
                (detailData.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(detailData.remaining_amount || 0)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              <div>{getStatusBadge(detailData.status || 'pending')}</div>
            </div>

            <div className="space-y-2">
              <Label>분류</Label>
              <div>{getClassificationBadge(detailData.classification || 'normal')}</div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                경과일
              </Label>
              <div className={`text-sm font-mono font-semibold ${
                (detailData.days_overdue || 0) > 180
                  ? 'text-red-600'
                  : (detailData.days_overdue || 0) > 90
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}>
                {detailData.days_overdue || 0}일
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                담당자
              </Label>
              <div className="text-sm font-medium">{detailData.manager_name || '-'}</div>
            </div>

            <div className="space-y-2">
              <Label>청구일</Label>
              <div className="text-sm font-mono">{detailData.billing_date || '-'}</div>
            </div>

            <div className="space-y-2">
              <Label>최종수금일</Label>
              <div className="text-sm font-mono">{detailData.last_collection_date || '-'}</div>
            </div>
          </div>

          <Separator />

          {/* 수금 이력 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              수금 이력 ({detailData.collections?.length || 0}건)
            </h3>

            {detailData.collections && detailData.collections.length > 0 ? (
              <div className="space-y-2">
                {detailData.collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatCurrency(collection.collection_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {collection.collection_date} ({collection.collection_method === 'bank_transfer' ? '계좌이체' : '기타'})
                        </div>
                        {collection.bank_account && (
                          <div className="text-xs text-muted-foreground">
                            {collection.bank_account.bank_name} {collection.bank_account.account_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                수금 이력이 없습니다
              </div>
            )}
          </div>

          <Separator />

          {/* 회수활동 내역 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                회수활동 내역 ({detailData.activities?.length || 0}건)
              </h3>
              <Button
                size="sm"
                onClick={() => setShowActivityForm(!showActivityForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                회수활동 추가
              </Button>
            </div>

            {/* 회수활동 추가 폼 */}
            {showActivityForm && (
              <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="activity-date">날짜</Label>
                  <Input
                    id="activity-date"
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-content">내용</Label>
                  <Textarea
                    id="activity-content"
                    placeholder="예: 채권자 방문하였으나 만나지 못함"
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowActivityForm(false);
                      setActivityContent('');
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddActivity}
                    disabled={isSubmitting || !activityContent.trim()}
                  >
                    {isSubmitting ? '추가 중...' : '추가'}
                  </Button>
                </div>
              </div>
            )}

            {/* 회수활동 목록 */}
            {detailData.activities && detailData.activities.length > 0 ? (
              <div className="space-y-2">
                {detailData.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="font-mono">{activity.activity_date}</span>
                          <span>•</span>
                          <User className="h-3 w-3" />
                          <span>{activity.user?.name || '알 수 없음'}</span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {activity.activity_content}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                회수활동 내역이 없습니다
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
