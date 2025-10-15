'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * 첨부파일 메타데이터 타입
 */
export interface AttachmentMetadata {
  name: string;
  size: number;
  path: string;
  uploadedAt: string;
}

/**
 * 파일 업로드 (Supabase Storage)
 *
 * @param orderId - 수주 ID
 * @param file - 업로드할 파일 (FormData)
 * @returns 업로드된 파일 정보 또는 에러
 */
export async function uploadOrderAttachment(orderId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: '인증이 필요합니다.' };
    }

    // 2. 파일 추출
    const file = formData.get('file') as File;
    if (!file) {
      return { error: '파일을 선택해주세요.' };
    }

    // 3. 파일 크기 제한 (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      return { error: '파일 크기는 20MB 이하여야 합니다.' };
    }

    // 4. 파일명 생성 (중복 방지를 위해 timestamp 추가)
    // 한글 및 특수문자 파일명 처리: 원본 파일명은 메타데이터에 저장하고, Storage에는 안전한 이름 사용
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const safeFileName = `${timestamp}.${fileExt}`; // Storage에는 timestamp만 사용
    const storagePath = `${orderId}/${safeFileName}`;

    // 5. Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return { error: '파일 업로드에 실패했습니다.' };
    }

    // 6. 파일 메타데이터 생성 (원본 파일명 보존)
    const metadata: AttachmentMetadata = {
      name: file.name, // 원본 파일명 (한글 포함)
      size: file.size,
      path: uploadData.path, // Storage 경로 (안전한 이름)
      uploadedAt: new Date().toISOString(),
    };

    // 7. orders 테이블의 attachments JSONB 배열에 추가
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('attachments')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      // 업로드된 파일 삭제 (롤백)
      await supabase.storage.from('order-attachments').remove([uploadData.path]);
      return { error: '수주 정보를 가져오는데 실패했습니다.' };
    }

    // JSONB 타입을 AttachmentMetadata[]로 변환
    const existingAttachments: AttachmentMetadata[] = Array.isArray(order.attachments)
      ? (order.attachments as unknown as AttachmentMetadata[])
      : [];
    const updatedAttachments = [...existingAttachments, metadata];

    // 8. attachments 필드 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        attachments: updatedAttachments as unknown as string[],
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', orderId);

    if (updateError) {
      // 업로드된 파일 삭제 (롤백)
      await supabase.storage.from('order-attachments').remove([uploadData.path]);
      return { error: '첨부파일 정보 저장에 실패했습니다.' };
    }

    // 9. 캐시 갱신
    revalidatePath('/inkwang-es/sales/orders');

    return { success: true, data: metadata };
  } catch (error) {
    console.error('Upload attachment error:', error);
    return { error: '파일 업로드 중 오류가 발생했습니다.' };
  }
}

/**
 * 파일 다운로드 URL 생성
 *
 * @param path - 파일 경로
 * @returns 다운로드 URL 또는 에러
 */
export async function getAttachmentDownloadUrl(path: string) {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: '인증이 필요합니다.' };
    }

    // 2. 서명된 URL 생성 (1시간 유효)
    const { data, error } = await supabase.storage
      .from('order-attachments')
      .createSignedUrl(path, 3600); // 1 hour

    if (error) {
      console.error('Get download URL error:', error);
      return { error: '다운로드 URL 생성에 실패했습니다.' };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error('Get download URL error:', error);
    return { error: '다운로드 URL 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * 파일 삭제
 *
 * @param orderId - 수주 ID
 * @param path - 파일 경로
 * @returns 성공 여부 또는 에러
 */
export async function deleteOrderAttachment(orderId: string, path: string) {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: '인증이 필요합니다.' };
    }

    // 2. Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('order-attachments')
      .remove([path]);

    if (storageError) {
      console.error('File delete error:', storageError);
      return { error: '파일 삭제에 실패했습니다.' };
    }

    // 3. orders 테이블의 attachments 배열에서 제거
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('attachments')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return { error: '수주 정보를 가져오는데 실패했습니다.' };
    }

    // JSONB 타입을 AttachmentMetadata[]로 변환
    const existingAttachments: AttachmentMetadata[] = Array.isArray(order.attachments)
      ? (order.attachments as unknown as AttachmentMetadata[])
      : [];
    const updatedAttachments = existingAttachments.filter(
      (attachment) => attachment.path !== path
    );

    // 4. attachments 필드 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        attachments: updatedAttachments as unknown as string[],
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', orderId);

    if (updateError) {
      return { error: '첨부파일 정보 업데이트에 실패했습니다.' };
    }

    // 5. 캐시 갱신
    revalidatePath('/inkwang-es/sales/orders');

    return { success: true };
  } catch (error) {
    console.error('Delete attachment error:', error);
    return { error: '파일 삭제 중 오류가 발생했습니다.' };
  }
}

/**
 * 특정 수주의 모든 첨부파일 조회
 *
 * @param orderId - 수주 ID
 * @returns 첨부파일 목록 또는 에러
 */
export async function getOrderAttachments(orderId: string) {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: '인증이 필요합니다.' };
    }

    // 2. attachments 필드 조회
    const { data: order, error } = await supabase
      .from('orders')
      .select('attachments')
      .eq('id', orderId)
      .single();

    if (error) {
      return { error: '첨부파일 조회에 실패했습니다.' };
    }

    // JSONB 타입을 AttachmentMetadata[]로 변환
    const attachments: AttachmentMetadata[] = Array.isArray(order.attachments)
      ? (order.attachments as unknown as AttachmentMetadata[])
      : [];

    return { success: true, data: attachments };
  } catch (error) {
    console.error('Get attachments error:', error);
    return { error: '첨부파일 조회 중 오류가 발생했습니다.' };
  }
}
