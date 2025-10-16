'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getUserModuleAccessAction,
  toggleModuleAccessAction,
  getUserPageAccessAction,
  togglePageAccessAction,
} from '@/actions/module-access';
import type { User } from '@/types';
import type { UserModuleWithAccess, UserPageWithAccess } from '@/lib/modules/types';

interface ModuleAccessDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleAccessDialog({
  user,
  open,
  onOpenChange,
}: ModuleAccessDialogProps) {
  const [modules, setModules] = React.useState<UserModuleWithAccess[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // 페이지 관련 상태
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());
  const [modulePages, setModulePages] = React.useState<Record<string, UserPageWithAccess[]>>({});
  const [loadingPages, setLoadingPages] = React.useState<Set<string>>(new Set());

  // 사용자가 변경되면 모듈 접근 권한 가져오기
  React.useEffect(() => {
    if (open && user) {
      loadModuleAccess();
    }
    // loadModuleAccess는 내부에서 setState만 호출하는 안정적인 함수
    // Server Action과 setState는 안정적이므로 의존성 배열에서 안전하게 제외 가능
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const loadModuleAccess = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getUserModuleAccessAction(user.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setModules(result.data || []);
    } catch (error) {
      console.error('Failed to load module access:', error);
      toast.error('모듈 접근 권한을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadModulePages = async (moduleId: string) => {
    if (!user) return;

    setLoadingPages((prev) => new Set(prev).add(moduleId));
    try {
      const result = await getUserPageAccessAction(user.id, moduleId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setModulePages((prev) => ({
        ...prev,
        [moduleId]: result.data || [],
      }));
    } catch (error) {
      console.error('Failed to load module pages:', error);
      toast.error('페이지 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoadingPages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  const handleModuleToggle = async (moduleId: string, isEnabled: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await toggleModuleAccessAction(
        user.id,
        moduleId,
        isEnabled
      );

      if (!result.success) {
        toast.error(result.error || '권한 변경 실패');
        return;
      }

      // 로컬 상태 업데이트
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, is_enabled: isEnabled } : m
        )
      );

      toast.success(`모듈 ${isEnabled ? '활성화' : '비활성화'}되었습니다`);
    } catch (error) {
      console.error('Failed to toggle module access:', error);
      toast.error('권한 변경 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePageToggle = async (moduleId: string, pageId: string, isEnabled: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await togglePageAccessAction(
        user.id,
        pageId,
        isEnabled
      );

      if (!result.success) {
        toast.error(result.error || '페이지 권한 변경 실패');
        return;
      }

      // 로컬 상태 업데이트
      setModulePages((prev) => ({
        ...prev,
        [moduleId]: prev[moduleId]?.map((p) =>
          p.id === pageId ? { ...p, is_enabled: isEnabled } : p
        ) || [],
      }));

      toast.success(`페이지 ${isEnabled ? '활성화' : '비활성화'}되었습니다`);
    } catch (error) {
      console.error('Failed to toggle page access:', error);
      toast.error('페이지 권한 변경 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // expandedModules 변경 시 페이지 로드 (렌더링 사이클 외부에서 실행)
  React.useEffect(() => {
    expandedModules.forEach((moduleId) => {
      // 아직 로드되지 않았고 로딩 중이 아닌 경우에만 로드
      if (!modulePages[moduleId] && !loadingPages.has(moduleId)) {
        loadModulePages(moduleId);
      }
    });
    // loadModulePages는 내부에서 setState와 Server Action만 호출하는 안정적인 함수
    // Server Action과 setState는 안정적이므로 의존성 배열에서 안전하게 제외 가능
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedModules, modulePages, loadingPages]);

  // 페이지를 계층 구조로 정리하는 함수
  const organizePages = (pages: UserPageWithAccess[]) => {
    const parentPages = pages.filter((p) => !p.parent_id);
    const childPages = pages.filter((p) => p.parent_id);

    return parentPages.map((parent) => ({
      ...parent,
      children: childPages.filter((c) => c.parent_id === parent.id),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>모듈 접근 권한 관리</DialogTitle>
          <DialogDescription>
            {user?.name}님의 모듈 및 페이지 접근 권한을 설정합니다.
            {user?.role === 'admin' && (
              <span className="block mt-1 text-yellow-600">
                ⚠️ 관리자는 모든 모듈과 페이지에 자동으로 접근할 수 있습니다.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module) => {
                const isExpanded = expandedModules.has(module.id);
                const pages = modulePages[module.id] || [];
                const isLoadingPages = loadingPages.has(module.id);
                const organizedPages = organizePages(pages);

                return (
                  <div
                    key={module.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* 모듈 헤더 */}
                    <div className="flex items-start space-x-3 p-3 bg-accent/20 hover:bg-accent/30 transition-colors">
                      <Checkbox
                        id={`module-${module.id}`}
                        checked={module.is_enabled}
                        onCheckedChange={(checked) => {
                          handleModuleToggle(module.id, checked as boolean);
                        }}
                        disabled={saving || user?.role === 'admin'}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={`module-${module.id}`}
                            className="text-sm font-semibold leading-none cursor-pointer"
                          >
                            {module.name}
                            {module.is_enabled && user?.role !== 'admin' && (
                              <span className="ml-2 text-xs text-green-600 font-normal">
                                ✓ 활성화
                              </span>
                            )}
                          </label>
                          {module.is_enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => toggleModuleExpand(module.id)}
                              disabled={user?.role === 'admin'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="ml-1 text-xs">페이지</span>
                            </Button>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 페이지 목록 (확장 시) */}
                    {isExpanded && module.is_enabled && (
                      <div className="border-t bg-background">
                        {isLoadingPages ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : pages.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-4">
                            이 모듈에는 페이지가 없습니다
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            <div className="text-xs text-muted-foreground px-2 py-1">
                              💡 페이지를 선택하지 않으면 모든 페이지에 접근할 수 있습니다.
                            </div>
                            {organizedPages.map((parentPage) => (
                              <div key={parentPage.id}>
                                {/* 부모 페이지 */}
                                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50 transition-colors">
                                  <Checkbox
                                    id={`page-${parentPage.id}`}
                                    checked={parentPage.is_enabled}
                                    onCheckedChange={(checked) => {
                                      handlePageToggle(module.id, parentPage.id, checked as boolean);
                                    }}
                                    disabled={saving}
                                  />
                                  <label
                                    htmlFor={`page-${parentPage.id}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {parentPage.name}
                                    {parentPage.is_enabled && (
                                      <span className="ml-2 text-xs text-green-600">✓</span>
                                    )}
                                  </label>
                                </div>

                                {/* 자식 페이지 */}
                                {parentPage.children && parentPage.children.length > 0 && (
                                  <div className="ml-6 space-y-1">
                                    {parentPage.children.map((childPage) => (
                                      <div
                                        key={childPage.id}
                                        className="flex items-center space-x-2 p-2 rounded hover:bg-accent/50 transition-colors"
                                      >
                                        <Checkbox
                                          id={`page-${childPage.id}`}
                                          checked={childPage.is_enabled}
                                          onCheckedChange={(checked) => {
                                            handlePageToggle(module.id, childPage.id, checked as boolean);
                                          }}
                                          disabled={saving}
                                        />
                                        <label
                                          htmlFor={`page-${childPage.id}`}
                                          className="text-sm cursor-pointer flex-1"
                                        >
                                          {childPage.name}
                                          {childPage.is_enabled && (
                                            <span className="ml-2 text-xs text-green-600">✓</span>
                                          )}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {modules.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  사용 가능한 모듈이 없습니다
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
