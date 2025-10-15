import type { OrderWithDetails, AttachmentMetadata } from '@/types';

/**
 * 계층적 데이터 구조로 변환
 *
 * 플랫한 수주 목록을 부모-자식 관계를 가진 계층 구조로 변환합니다.
 * - 신규 계약이 부모 노드
 * - 변경 계약이 children 배열에 추가
 *
 * @param flatOrders - 플랫한 수주 목록
 * @returns 계층적 구조의 수주 목록
 */
export function transformToHierarchical(flatOrders: OrderWithDetails[]): OrderWithDetails[] {
  // 1. 모든 수주를 id로 매핑
  const orderMap = new Map<string, OrderWithDetails & { children?: OrderWithDetails[] }>();

  flatOrders.forEach((order) => {
    orderMap.set(order.id, { ...order, children: [] });
  });

  // 2. 부모-자식 관계 설정
  const rootOrders: (OrderWithDetails & { children?: OrderWithDetails[] })[] = [];

  flatOrders.forEach((order) => {
    const mappedOrder = orderMap.get(order.id);
    if (!mappedOrder) return;

    // parent_order_id가 있으면 자식으로 추가 (계약 유형 무관)
    if (order.parent_order_id) {
      const parent = orderMap.get(order.parent_order_id);
      if (parent && parent.children) {
        parent.children.push(mappedOrder);
      } else {
        // 부모를 찾지 못한 경우 루트에 추가 (고아 노드 방지)
        rootOrders.push(mappedOrder);
      }
    } else {
      // parent_order_id가 없는 경우: 루트에 추가
      rootOrders.push(mappedOrder);
    }
  });

  // 2.5. 자식이 있는 부모는 자기 자신을 첫 번째 자식으로 추가
  rootOrders.forEach((parent) => {
    if (parent.children && parent.children.length > 0) {
      // 부모 자신의 복사본을 만들어 children 제거 (무한 재귀 방지)
      const parentCopy = { ...parent };
      delete parentCopy.children;

      // 부모를 맨 앞에 삽입
      parent.children.unshift(parentCopy);
    }
  });

  // 3. children이 빈 배열인 경우 undefined로 변경 (TanStack Table 최적화)
  const cleanChildren = (orders: (OrderWithDetails & { children?: OrderWithDetails[] })[]) => {
    orders.forEach((order) => {
      if (order.children && order.children.length === 0) {
        delete order.children;
      } else if (order.children && order.children.length > 0) {
        cleanChildren(order.children);
      }
    });
  };

  cleanChildren(rootOrders);

  return rootOrders as OrderWithDetails[];
}

/**
 * 계층 구조에서 총 계약금액 계산 (부모 + 모든 자식)
 *
 * @param order - 계산할 수주
 * @returns 총 계약금액
 */
export function calculateTotalAmount(order: OrderWithDetails & { children?: OrderWithDetails[] }): number {
  let total = Number(order.contract_amount) || 0;

  if (order.children && order.children.length > 0) {
    // 첫 번째 자식은 부모 자신의 복사본이므로 제외하고 합계
    order.children.slice(1).forEach((child) => {
      total += Number(child.contract_amount) || 0;
    });
  }

  return total;
}

/**
 * 계약구분 라벨 생성 (신규 + 변경)
 *
 * @param order - 수주 데이터
 * @returns 계약구분 라벨
 */
export function getContractTypeLabel(order: OrderWithDetails & { children?: OrderWithDetails[] }): string {
  if (order.contract_type === 'change') {
    return '변경';
  }

  if (order.children && order.children.length > 0) {
    // 첫 번째 자식은 부모 자신의 복사본이므로 실제 변경 개수는 -1
    const changeCount = order.children.length - 1;
    return `신규 + 변경 (${changeCount})`;
  }

  return '신규';
}

/**
 * 모든 첨부파일 가져오기 (부모 + 모든 자식, 계약 정보 포함)
 *
 * @param order - 수주 데이터
 * @returns 모든 첨부파일 배열 (각 파일에 contractInfo 추가)
 */
export function getAllAttachments(order: OrderWithDetails & { children?: OrderWithDetails[] }): AttachmentMetadata[] {
  const attachments: AttachmentMetadata[] = [];

  // 부모의 첨부파일 추가
  if (order.attachments && Array.isArray(order.attachments)) {
    attachments.push(
      ...order.attachments.map((file): AttachmentMetadata => {
        const baseFile = typeof file === 'string'
          ? { name: file, size: 0, path: file, uploadedAt: '' }
          : file;

        return {
          ...baseFile,
          contractInfo: {
            type: order.contract_type as 'new' | 'change',
            name: order.contract_name,
            orderNumber: order.order_number,
          },
        };
      })
    );
  }

  // 자식들의 첨부파일 추가
  if (order.children && order.children.length > 0) {
    // 첫 번째 자식은 부모 자신의 복사본이므로 제외
    order.children.slice(1).forEach((child) => {
      if (child.attachments && Array.isArray(child.attachments)) {
        attachments.push(
          ...child.attachments.map((file): AttachmentMetadata => {
            const baseFile = typeof file === 'string'
              ? { name: file, size: 0, path: file, uploadedAt: '' }
              : file;

            return {
              ...baseFile,
              contractInfo: {
                type: child.contract_type as 'new' | 'change',
                name: child.contract_name,
                orderNumber: child.order_number,
              },
            };
          })
        );
      }
    });
  }

  return attachments;
}
