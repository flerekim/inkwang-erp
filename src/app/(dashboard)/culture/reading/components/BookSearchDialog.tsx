'use client';

import * as React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';
import { searchBooksFromAladin, saveAladinBook, searchBooksFromLocal } from '@/actions/aladin';
import { cn } from '@/lib/utils';
import type { AladinBookConverted } from '@/types/reading';

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookSelect: (book: { id: string; title: string; author: string | null; publisher: string | null; cover_url: string | null; page_count: number | null; category: string | null }) => void;
}

export function BookSearchDialog({
  open,
  onOpenChange,
  onBookSelect
}: BookSearchDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<AladinBookConverted[]>([]);
  const [selectedBook, setSelectedBook] = React.useState<AladinBookConverted | null>(null);
  const [showManualInput, setShowManualInput] = React.useState(false);
  const { toast } = useToast();

  // 알라딘 API 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '검색어를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setShowManualInput(false);

    try {
      // 먼저 알라딘 API에서 검색
      const aladinResults = await searchBooksFromAladin(searchQuery);

      if (aladinResults.length > 0) {
        setSearchResults(aladinResults);
      } else {
        // 알라딘에 없으면 로컬 DB 검색
        const localResults = await searchBooksFromLocal(searchQuery);

        if (localResults.length > 0) {
          // 로컬 결과를 알라딘 형식으로 변환 (isbn 정보는 없을 수 있음)
          const convertedLocalResults: AladinBookConverted[] = localResults.map(book => ({
            isbn: '',  // 로컬 검색 결과에는 ISBN 정보 없음
            isbn13: '',
            aladin_item_id: book.id,
            title: book.title,
            author: book.author || '',
            publisher: book.publisher || '',
            page_count: book.page_count,
            category: book.category,
            cover_url: book.cover_url || book.cover_image_path || '',
            description: '',
            pub_date: '',
            is_manual_entry: false
          }));
          setSearchResults(convertedLocalResults);
        } else {
          setShowManualInput(true);
          toast({
            title: '검색 결과가 없습니다',
            description: '수동으로 도서 정보를 입력할 수 있습니다.',
          });
        }
      }
    } catch (error) {
      console.error('검색 오류:', error);
      toast({
        title: '검색 실패',
        description: error instanceof Error ? error.message : '도서 검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setShowManualInput(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 도서 선택 및 저장
  const handleBookAdd = async () => {
    if (!selectedBook) {
      toast({
        title: '도서를 선택해주세요',
        variant: 'destructive',
      });
      return;
    }

    try {
      const savedBook = await saveAladinBook(selectedBook);
      onBookSelect(savedBook);
      onOpenChange(false);

      // 상태 초기화
      setSearchQuery('');
      setSearchResults([]);
      setSelectedBook(null);
      setShowManualInput(false);

      toast({
        title: '도서가 추가되었습니다',
      });
    } catch (error) {
      console.error('도서 저장 오류:', error);
      toast({
        title: '도서 추가 실패',
        description: error instanceof Error ? error.message : '도서 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Enter 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>도서 검색</DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="flex gap-2">
          <Input
            placeholder="도서명을 입력하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <ScrollArea className="flex-1 rounded-md border p-4">
            <div className="space-y-4">
              {searchResults.map((book, index) => (
                <div
                  key={`${book.isbn || book.aladin_item_id}-${index}`}
                  className={cn(
                    "flex gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors",
                    selectedBook?.isbn === book.isbn && selectedBook?.aladin_item_id === book.aladin_item_id && "bg-muted border-primary"
                  )}
                  onClick={() => setSelectedBook(book)}
                >
                  {/* 표지 이미지 */}
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      width={64}
                      height={80}
                      className="w-16 h-20 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                      표지 없음
                    </div>
                  )}

                  {/* 도서 정보 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{book.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {book.author} | {book.publisher}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {book.page_count ? `${book.page_count}쪽` : '-'}
                      {book.category && ` | ${book.category}`}
                    </p>
                  </div>

                  {/* 선택 체크박스 */}
                  <Checkbox
                    checked={selectedBook?.isbn === book.isbn && selectedBook?.aladin_item_id === book.aladin_item_id}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBook(book);
                      } else {
                        setSelectedBook(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 검색 결과 없음 */}
        {showManualInput && searchResults.length === 0 && !isSearching && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              검색 결과가 없습니다.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                // TODO: 수동 입력 다이얼로그 열기
                toast({
                  title: '수동 입력 기능',
                  description: '수동 입력 기능은 추후 추가될 예정입니다.',
                });
              }}
            >
              수동으로 도서 정보 입력
            </Button>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleBookAdd}
            disabled={!selectedBook}
          >
            선택한 도서 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
