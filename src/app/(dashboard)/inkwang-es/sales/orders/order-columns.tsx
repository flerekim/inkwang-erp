'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableNotesCell } from '@/components/common/editable-notes-cell';
import { ChevronRight, ChevronDown, Link2, Pencil, Paperclip } from 'lucide-react';
import { calculateTotalAmount, getContractTypeLabel, getAllAttachments } from '@/lib/order-utils';
import type { OrderWithDetails, Customer, UserSelectOption, ExpandableRow, AttachmentMetadata } from '@/types';

interface OrderColumnsProps {
  customers: Customer[];
  verificationCompanies: Customer[];
  users: UserSelectOption[];
  newOrders: Array<{ id: string; order_number: string; contract_name: string }>;
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  onEditPollutants?: (order: OrderWithDetails) => void;
  onEditMethods?: (order: OrderWithDetails) => void;
  onSelectParentOrder?: (order: OrderWithDetails) => void;
  onManageAttachments?: (order: OrderWithDetails) => void;
}

/**
 * 수주 관리 테이블 컬럼 정의 (인라인 편집 지원)
 *
 * 인라인 편집 가능 필드:
 * - 기본 정보: 계약명, 계약일, 계약금액
 * - Select: 계약구분, 계약상태, 구분, 계약유형, 반출여부
 * - Combobox: 고객명, 검증업체, 담당자
 *
 * Dialog 편집 필드:
 * - 오염물질 (복잡한 배열)
 * - 정화방법 (다중 선택)
 * - 비고 (긴 텍스트)
 */
export function createOrderColumns({
  customers,
  verificationCompanies,
  users,
  newOrders,
  onUpdateCell,
  onEditPollutants,
  onEditMethods,
  onSelectParentOrder,
  onManageAttachments,
}: OrderColumnsProps): ColumnDef<OrderWithDetails>[] {
  // 계약구분 옵션
  const contractTypeOptions = [
    { id: 'new', name: '신규' },
    { id: 'change', name: '변경' },
  ];

  // 계약상태 옵션
  const contractStatusOptions = [
    { id: 'quotation', name: '견적' },
    { id: 'contract', name: '계약완료' },
    { id: 'in_progress', name: '정화진행' },
    { id: 'completed', name: '정화완료' },
  ];

  // 구분 옵션
  const businessTypeOptions = [
    { id: 'civilian', name: '민수' },
    { id: 'government', name: '관수' },
  ];

  // 계약유형 옵션
  const pricingTypeOptions = [
    { id: 'total', name: '총액계약' },
    { id: 'unit_price', name: '단가계약' },
  ];

  // 반출여부 옵션
  const exportTypeOptions = [
    { id: 'on_site', name: '부지내' },
    { id: 'export', name: '반출' },
    { id: 'new_business', name: '신규사업' },
  ];
  return [
    // 확장/축소 버튼 컬럼
    {
      id: 'expander',
      header: '',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const canExpand = row.getCanExpand();
        const isExpanded = row.getIsExpanded();
        const expandableRow = row.original as ExpandableRow<OrderWithDetails>;
        const childrenCount = expandableRow.children?.length || 0;

        // 새 행이거나 확장할 수 없는 행
        if (isNewRow || !canExpand) {
          return <div className="w-6" />;
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={row.getToggleExpandedHandler()}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <div className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">+{childrenCount}</span>
              </div>
            )}
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
      minSize: 50,
      maxSize: 50,
    },
    // 체크박스 컬럼
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const isSelected = row.getIsSelected();

        // 새 행은 선택 불가 - 빈 div 반환
        if (isNewRow) {
          return <div className="w-5" />;
        }

        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="행 선택"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
      minSize: 50,
      maxSize: 50,
    },
    // 계약구분
    {
      accessorKey: 'contract_type',
      header: '계약구분',
      cell: ({ row }) => {
        const contractType = row.getValue('contract_type') as string;

        // 집계 로직: 자식 행이 있으면 "신규 + 변경(n)" 표시
        const orderWithChildren = row.original as ExpandableRow<OrderWithDetails>;
        const label = getContractTypeLabel(orderWithChildren);

        return (
          <EditableSelectCell
            value={contractType}
            rowIndex={row.index}
            columnId="contract_type"
            onUpdate={onUpdateCell}
            options={contractTypeOptions}
            type="select"
            placeholder="계약구분"
            displayValue={
              <Badge variant={contractType === 'new' ? 'default' : 'secondary'}>
                {label}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 120,
      minSize: 120,
      maxSize: 120,
    },
    // 연동 신규계약 (parent_order_id)
    {
      accessorKey: 'parent_order_id',
      header: '연동 계약',
      cell: ({ row }) => {
        const contractType = row.original.contract_type;

        // 신규 계약은 부모가 없으므로 표시하지 않음
        if (contractType !== 'change') {
          return <span className="text-xs text-muted-foreground">-</span>;
        }

        // 연동된 신규 계약 정보 찾기
        const parentOrderId = row.original.parent_order_id;
        const parentOrder = parentOrderId
          ? newOrders.find(order => order.id === parentOrderId)
          : null;

        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onSelectParentOrder?.(row.original)}
          >
            <Link2 className="h-3 w-3" />
            <span className={parentOrder ? '' : 'text-muted-foreground'}>
              {parentOrder ? parentOrder.contract_name : '미연결'}
            </span>
          </Button>
        );
      },
      enableSorting: false,
      size: 100,
      minSize: 100,
      maxSize: 100,
    },
    // 구분
    {
      accessorKey: 'business_type',
      header: '구분',
      cell: ({ row }) => {
        const businessType = row.getValue('business_type') as string;
        return (
          <EditableSelectCell
            value={businessType}
            rowIndex={row.index}
            columnId="business_type"
            onUpdate={onUpdateCell}
            options={businessTypeOptions}
            type="select"
            placeholder="구분"
            displayValue={
              <Badge variant={businessType === 'civilian' ? 'default' : 'secondary'}>
                {businessType === 'civilian' ? '민수' : '관수'}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 80,
      minSize: 80,
      maxSize: 80,
    },
    // 계약유형
    {
      accessorKey: 'pricing_type',
      header: '계약유형',
      cell: ({ row }) => {
        const pricingType = row.getValue('pricing_type') as string;
        return (
          <EditableSelectCell
            value={pricingType}
            rowIndex={row.index}
            columnId="pricing_type"
            onUpdate={onUpdateCell}
            options={pricingTypeOptions}
            type="select"
            placeholder="계약유형"
            displayValue={
              <Badge variant={pricingType === 'total' ? 'default' : 'secondary'}>
                {pricingType === 'total' ? '총액계약' : '단가계약'}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 120,
      minSize: 120,
      maxSize: 120,
    },
    // 계약상태
    {
      accessorKey: 'contract_status',
      header: '계약상태',
      cell: ({ row }) => {
        const status = row.getValue('contract_status') as string;

        const statusBadgeVariant = (s: string) => {
          switch (s) {
            case 'quotation': return 'outline' as const;      // 견적: 회색 테두리
            case 'contract': return 'secondary' as const;     // 계약: 회색 배경
            case 'in_progress': return 'default' as const;    // 진행: 파란색 배경
            case 'completed': return 'default' as const;      // 완료: 파란색 배경
            default: return 'outline' as const;
          }
        };

        const statusBadgeClass = (s: string) => {
          switch (s) {
            case 'quotation': return 'border-slate-300 text-slate-700';                    // 견적: 회색
            case 'contract': return 'bg-blue-100 text-blue-700 hover:bg-blue-100/80';      // 계약: 파란색
            case 'in_progress': return 'bg-green-100 text-green-700 hover:bg-green-100/80'; // 진행: 초록색
            case 'completed': return 'bg-gray-100 text-gray-700 hover:bg-gray-100/80';     // 완료: 회색
            default: return '';
          }
        };

        const statusLabel = (s: string) => {
          switch (s) {
            case 'quotation': return '견적';
            case 'contract': return '계약완료';
            case 'in_progress': return '정화진행';
            case 'completed': return '정화완료';
            default: return s;
          }
        };

        return (
          <EditableSelectCell
            value={status}
            rowIndex={row.index}
            columnId="contract_status"
            onUpdate={onUpdateCell}
            options={contractStatusOptions}
            type="select"
            placeholder="계약상태"
            displayValue={
              <Badge variant={statusBadgeVariant(status)} className={statusBadgeClass(status)}>
                {statusLabel(status)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 120,
      minSize: 120,
      maxSize: 120,
    },
    // 계약명
    {
      accessorKey: 'contract_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약명" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="contract_name"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
      size: 300,
      minSize: 300,
      maxSize: 300,
    },
    // 고객명
    {
      accessorKey: 'customer_id',
      header: '고객명',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.customer_id}
            rowIndex={row.index}
            columnId="customer_id"
            onUpdate={onUpdateCell}
            options={customers}
            type="combobox"
            placeholder="고객 선택"
            searchPlaceholder="고객 검색..."
            displayValue={row.original.customer?.name ||
              (isNewRow && customers.find(c => c.id === row.original.customer_id)?.name)}
          />
        );
      },
      enableSorting: false,
      size: 200,
      minSize: 200,
      maxSize: 200,
    },
    // 계약일
    {
      accessorKey: 'contract_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="contract_date"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    // 계약금액
    {
      accessorKey: 'contract_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약금액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const amount = getValue<number>();
        const pricingType = row.original.pricing_type;
        const contractUnit = row.original.contract_unit;

        // 집계 로직: 자식 행이 있으면 총합계 표시
        const orderWithChildren = row.original as ExpandableRow<OrderWithDetails>;
        const totalAmount = calculateTotalAmount(orderWithChildren);
        const hasChildren = orderWithChildren.children && orderWithChildren.children.length > 0;

        return (
          <EditableCell
            value={amount?.toString() || '0'}
            rowIndex={row.index}
            columnId="contract_amount"
            type="number"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const displayAmount = hasChildren ? totalAmount : Number(value || 0);
              const formattedAmount = displayAmount.toLocaleString();

              // 단가계약인 경우 단위 표시
              if (pricingType === 'unit_price' && contractUnit) {
                const unitLabels: Record<string, string> = {
                  ton: 'Ton',
                  unit: '대',
                  m3: '㎥',
                };
                return `${formattedAmount} ${unitLabels[contractUnit] || contractUnit}/원`;
              }

              // 총액계약인 경우 원만 표시
              return formattedAmount + '원';
            }}
          />
        );
      },
      enableSorting: true,
      size: 160,
      minSize: 160,
      maxSize: 160,
    },
    // 계약단위 (단가계약 시에만 표시)
    {
      accessorKey: 'contract_unit',
      header: '단위',
      cell: ({ row }) => {
        const pricingType = row.original.pricing_type;
        const contractUnit = row.original.contract_unit;

        // 총액계약인 경우 단위 컬럼 숨김
        if (pricingType !== 'unit_price') {
          return <span className="text-xs text-muted-foreground">-</span>;
        }

        const unitOptions = [
          { id: 'ton', name: 'Ton' },
          { id: 'unit', name: '대' },
          { id: 'm3', name: '㎥' },
        ];

        const unitLabels: Record<string, string> = {
          ton: 'Ton',
          unit: '대',
          m3: '㎥',
        };

        return (
          <EditableSelectCell
            value={contractUnit || 'ton'}
            rowIndex={row.index}
            columnId="contract_unit"
            onUpdate={onUpdateCell}
            options={unitOptions}
            type="select"
            placeholder="단위 선택"
            displayValue={contractUnit ? unitLabels[contractUnit] : '미선택'}
          />
        );
      },
      enableSorting: false,
      size: 60,
      minSize: 60,
      maxSize: 60,
    },
    // 담당자
    {
      accessorKey: 'manager_id',
      header: '담당자',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.manager_id}
            rowIndex={row.index}
            columnId="manager_id"
            onUpdate={onUpdateCell}
            options={users}
            type="combobox"
            placeholder="담당자 선택"
            searchPlaceholder="담당자 검색..."
            displayValue={row.original.manager?.name ||
              (isNewRow && row.original.manager_id && users.find(u => u.id === row.original.manager_id)?.name)}
          />
        );
      },
      enableSorting: false,
      size: 120,
      minSize: 120,
      maxSize: 120,
    },
    // 반출여부
    {
      accessorKey: 'export_type',
      header: '반출여부',
      cell: ({ row }) => {
        const exportType = row.getValue('export_type') as string;
        const labelMap: Record<string, string> = {
          on_site: '부지내',
          export: '반출',
          new_business: '신규사업',
        };
        return (
          <EditableSelectCell
            value={exportType}
            rowIndex={row.index}
            columnId="export_type"
            onUpdate={onUpdateCell}
            options={exportTypeOptions}
            type="select"
            placeholder="반출여부"
            displayValue={labelMap[exportType] || exportType}
          />
        );
      },
      enableSorting: false,
      size: 100,
      minSize: 100,
      maxSize: 100,
    },
    // 오염물질 (요약 정보 + 상세편집 버튼)
    {
      accessorKey: 'pollutants',
      header: '오염물질',
      cell: ({ row }) => {
        const pollutants = row.original.pollutants || [];

        // 오염물질이 없는 경우
        if (pollutants.length === 0) {
          return (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">미선택</span>
              {onEditPollutants && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => onEditPollutants(row.original)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }

        // 오염물질이 1개인 경우: 오염물질명 + 농도 + 단위 표시
        if (pollutants.length === 1) {
          const p = pollutants[0];
          const displayText = `${p.pollutant?.name} (${p.concentration} mg/kg)`;
          return (
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span
                className="text-sm truncate flex-1"
                title={displayText}
              >
                {displayText}
              </span>
              {onEditPollutants && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => onEditPollutants(row.original)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }

        // 오염물질이 2개 이상인 경우: 그룹명 Badge 표시 + Popover
        const groupName = pollutants[0]?.group_name || '기타';
        return (
          <div className="flex items-center justify-between gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {groupName}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">등록된 오염물질</h4>
                  <div className="space-y-1">
                    {pollutants.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{p.pollutant?.name}</span>
                        <span className="text-muted-foreground">{p.concentration} mg/kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {onEditPollutants && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={() => onEditPollutants(row.original)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 180,
      minSize: 180,
      maxSize: 180,
    },
    // 정화방법 (요약 정보 + 상세편집 버튼)
    {
      accessorKey: 'methods',
      header: '정화방법',
      cell: ({ row }) => {
        const methods = row.original.methods || [];

        // 정화방법이 없는 경우
        if (methods.length === 0) {
          return (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">미선택</span>
              {onEditMethods && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => onEditMethods(row.original)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }

        // 정화방법이 1개인 경우: 정화방법명 표시
        if (methods.length === 1) {
          const m = methods[0];
          const displayText = m.method?.name || '';
          return (
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span
                className="text-sm truncate flex-1"
                title={displayText}
              >
                {displayText}
              </span>
              {onEditMethods && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => onEditMethods(row.original)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }

        // 정화방법이 2개 이상인 경우: 개수 Badge 표시 + Popover
        return (
          <div className="flex items-center justify-between gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {methods.length}개
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">등록된 정화방법</h4>
                  <div className="space-y-1">
                    {methods.map((m, idx) => (
                      <div key={idx} className="text-sm py-1 border-b last:border-0">
                        {m.method?.name}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {onEditMethods && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={() => onEditMethods(row.original)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 180,
      minSize: 180,
      maxSize: 180,
    },
    // 검증업체
    {
      accessorKey: 'verification_company_id',
      header: '검증업체',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.verification_company_id}
            rowIndex={row.index}
            columnId="verification_company_id"
            onUpdate={onUpdateCell}
            options={verificationCompanies}
            type="combobox"
            placeholder="검증업체 선택"
            searchPlaceholder="검증업체 검색..."
            displayValue={row.original.verification_company?.name ||
              (isNewRow && row.original.verification_company_id && verificationCompanies.find(c => c.id === row.original.verification_company_id)?.name)}
          />
        );
      },
      enableSorting: false,
      size: 180,
      minSize: 180,
      maxSize: 180,
    },
    // 첨부파일
    {
      accessorKey: 'attachments',
      header: '첨부파일',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const orderWithChildren = row.original as ExpandableRow<OrderWithDetails>;
        const hasChildren = orderWithChildren.children && orderWithChildren.children.length > 0;

        // 확장 가능한 부모 행인 경우: 집계된 첨부파일 표시 (관리 버튼 숨김)
        if (hasChildren) {
          const allAttachments = getAllAttachments(orderWithChildren);

          // 첨부파일이 없는 경우
          if (allAttachments.length === 0) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                파일없음
              </Badge>
            );
          }

          // 첨부파일이 있는 경우: 개수 표시 + Popover (관리 버튼 없음)
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="default"
                  className="cursor-pointer hover:bg-primary/80"
                >
                  {allAttachments.length}개
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="start">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">첨부 파일</h4>
                  <div className="space-y-2">
                    {allAttachments.map((file: AttachmentMetadata, idx: number) => (
                      <div key={idx} className="space-y-1 pb-2 border-b last:border-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {file.contractInfo && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={file.contractInfo.type === 'new' ? 'default' : 'secondary'}
                              className="text-xs h-5"
                            >
                              {file.contractInfo.type === 'new' ? '신규' : '변경'}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {file.contractInfo.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        // 일반 행 (자식 행 또는 단독 행): 자신의 첨부파일만 표시 + 관리 버튼
        const attachments = (row.original.attachments as unknown as AttachmentMetadata[]) || [];

        // 첨부파일이 없는 경우
        if (attachments.length === 0) {
          return (
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                파일없음
              </Badge>
              {!isNewRow && onManageAttachments && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => onManageAttachments(row.original)}
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }

        // 첨부파일이 있는 경우: 개수 표시 + Popover + 관리 버튼
        return (
          <div className="flex items-center justify-between gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="default"
                  className="cursor-pointer hover:bg-primary/80"
                >
                  {attachments.length}개
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">첨부 파일</h4>
                  <div className="space-y-1">
                    {attachments.map((file: AttachmentMetadata, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {!isNewRow && onManageAttachments && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={() => onManageAttachments(row.original)}
              >
                <Paperclip className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    // 비고 (더블클릭 편집 + Badge + Popover)
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;

        return (
          <EditableNotesCell
            notes={notes}
            onSave={async (value) => {
              await onUpdateCell(row.index, 'notes', value);
            }}
          />
        );
      },
      enableSorting: false,
    },
  ];
}
