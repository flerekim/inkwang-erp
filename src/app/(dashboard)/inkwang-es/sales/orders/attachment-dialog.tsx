'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, Trash2, FileIcon } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { useRouter } from 'next/navigation';
import {
  uploadOrderAttachment,
  deleteOrderAttachment,
  getAttachmentDownloadUrl,
  type AttachmentMetadata,
} from '@/actions/attachments';
import type { OrderWithDetails } from '@/types';

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails | null;
  onAttachmentsChange?: (orderId: string, attachments: AttachmentMetadata[]) => void;
}

/**
 * 타입 가드: unknown을 AttachmentMetadata 배열로 검증
 */
function isAttachmentMetadataArray(value: unknown): value is AttachmentMetadata[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true; // 빈 배열은 유효

  const firstItem = value[0];
  return (
    typeof firstItem === 'object' &&
    firstItem !== null &&
    'name' in firstItem &&
    'path' in firstItem &&
    'size' in firstItem &&
    typeof firstItem.name === 'string' &&
    typeof firstItem.path === 'string' &&
    typeof firstItem.size === 'number'
  );
}

/**
 * 첨부파일 관리 Dialog
 *
 * 기능:
 * - 파일 업로드 (최대 20MB)
 * - 파일 목록 표시
 * - 파일 다운로드 (서명된 URL)
 * - 파일 삭제
 */
export function AttachmentDialog({ open, onOpenChange, order, onAttachmentsChange }: AttachmentDialogProps) {
  const router = useRouter();
  const [attachments, setAttachments] = React.useState<AttachmentMetadata[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = React.useState<AttachmentMetadata | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // order가 변경되면 attachments 동기화
  React.useEffect(() => {
    if (order?.attachments) {
      // 타입 가드를 사용하여 안전하게 변환
      if (isAttachmentMetadataArray(order.attachments)) {
        setAttachments(order.attachments);
      } else {
        console.warn('Invalid attachments format:', order.attachments);
        setAttachments([]);
      }
    } else {
      setAttachments([]);
    }
  }, [order]);

  // 파일 선택 버튼 클릭
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 파일 업로드 처리 (낙관적 업데이트)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !order) return;

    // 파일 크기 체크 (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('파일 크기는 20MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);

    // 낙관적 업데이트: 임시 메타데이터 생성
    const optimisticAttachment: AttachmentMetadata = {
      name: file.name,
      size: file.size,
      path: `temp-${Date.now()}`, // 임시 경로
      uploadedAt: new Date().toISOString(),
    };

    // 즉시 UI 업데이트
    setAttachments((prev) => [...prev, optimisticAttachment]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadOrderAttachment(order.id, formData);

      if (result.error) {
        // 실패 시 롤백
        setAttachments((prev) => prev.filter((a) => a.path !== optimisticAttachment.path));
        toast.error(result.error);
      } else if (result.data) {
        // 성공 시 실제 데이터로 교체
        setAttachments((prev) => {
          const newAttachments = prev.map((a) => (a.path === optimisticAttachment.path ? result.data! : a));

          // 부모 컴포넌트에 변경 알림 (비동기로 실행)
          if (onAttachmentsChange) {
            // setTimeout을 사용하여 현재 렌더 사이클 이후에 실행
            setTimeout(() => {
              onAttachmentsChange(order.id, newAttachments);
            }, 0);
          }

          return newAttachments;
        });

        toast.success('파일이 업로드되었습니다.');

        // 페이지 새로고침
        router.refresh();
      }
    } catch (error) {
      // 에러 시 롤백
      setAttachments((prev) => prev.filter((a) => a.path !== optimisticAttachment.path));
      console.error('Upload error:', error);
      toast.error('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      // Input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 파일 다운로드
  const handleDownload = async (attachment: AttachmentMetadata) => {
    try {
      const result = await getAttachmentDownloadUrl(attachment.path);

      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        // 새 탭에서 다운로드 URL 열기
        window.open(result.url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 삭제 확인 Dialog 열기
  const handleDeleteClick = (attachment: AttachmentMetadata) => {
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };

  // 파일 삭제 (낙관적 업데이트)
  const handleDeleteConfirm = async () => {
    if (!order || !attachmentToDelete) return;

    setDeletingPath(attachmentToDelete.path);

    // 낙관적 업데이트: 즉시 UI에서 제거
    const previousAttachments = [...attachments];
    const newAttachments = attachments.filter((a) => a.path !== attachmentToDelete.path);
    setAttachments(newAttachments);

    try {
      const result = await deleteOrderAttachment(order.id, attachmentToDelete.path);

      if (result.error) {
        // 실패 시 롤백
        setAttachments(previousAttachments);
        toast.error(result.error);
      } else {
        toast.success('파일이 삭제되었습니다.');

        // 부모 컴포넌트에 변경 알림 (비동기로 실행)
        if (onAttachmentsChange) {
          // setTimeout을 사용하여 현재 렌더 사이클 이후에 실행
          setTimeout(() => {
            onAttachmentsChange(order.id, newAttachments);
          }, 0);
        }

        // 페이지 새로고침
        router.refresh();
      }
    } catch (error) {
      // 에러 시 롤백
      setAttachments(previousAttachments);
      console.error('Delete error:', error);
      toast.error('파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingPath(null);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 업로드 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>첨부파일 관리</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {order.contract_name}
          </p>
        </DialogHeader>

        {/* 파일 업로드 영역 */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              파일을 선택하여 업로드하세요 (최대 20MB)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleFileSelect}
            disabled={isUploading}
          >
            {isUploading ? '업로드 중...' : '파일 선택'}
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="*/*"
          />
        </div>

        {/* 첨부파일 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {attachments.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">첨부된 파일이 없습니다.</p>
            </div>
          ) : (
            attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attachment.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.size)}</span>
                      <span>•</span>
                      <span>{formatDate(attachment.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(attachment)}
                    disabled={deletingPath === attachment.path}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 정보 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Badge variant="outline">
            총 {attachments.length}개 파일
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>

      {/* 삭제 확인 Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="첨부파일 삭제"
        description={`"${attachmentToDelete?.name}" 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={!!deletingPath}
      />
    </Dialog>
  );
}
