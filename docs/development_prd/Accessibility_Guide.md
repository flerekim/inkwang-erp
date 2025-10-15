# 접근성 가이드 (Accessibility Guide)

## ♿ 접근성(Accessibility)이란?

웹 접근성은 모든 사용자(장애가 있는 사용자 포함)가 웹 사이트와 애플리케이션을 사용할 수 있도록 하는 것입니다.

## 🎯 인광 ERP 접근성 목표

**WCAG 2.1 AA 수준 준수**를 목표로 합니다.

### 주요 원칙 (POUR)
1. **Perceivable (인식 가능)**: 모든 사용자가 콘텐츠를 인식할 수 있어야 함
2. **Operable (조작 가능)**: 모든 사용자가 인터페이스를 조작할 수 있어야 함
3. **Understandable (이해 가능)**: 콘텐츠와 인터페이스가 이해하기 쉬워야 함
4. **Robust (견고함)**: 다양한 보조 기술과 호환되어야 함

---

## ✅ 구현된 접근성 기능

### 1. ARIA 레이블 (이미 적용됨)

#### Header 컴포넌트
```tsx
// 메뉴 버튼
<Button aria-label="메뉴 열기" />

// 검색 버튼
<Button aria-label="검색" />

// 알림 버튼
<Button aria-label="알림" />
```

#### InstallPrompt 컴포넌트
```tsx
// 닫기 버튼
<Button aria-label="설치 프롬프트 닫기" />
```

### 2. 시맨틱 HTML

모든 컴포넌트가 의미 있는 HTML 태그 사용:
- `<header>`: 헤더 영역
- `<nav>`: 네비게이션 (사이드바)
- `<main>`: 메인 콘텐츠
- `<button>`: 버튼 요소
- `<table>`: 테이블 데이터

### 3. 키보드 네비게이션

#### 이미 지원되는 단축키
- **F5**: 조회/새로고침
- **F6**: 행 추가
- **F7**: 선택행 삭제
- **F8**: 인쇄
- **Enter**: 편집 완료 및 저장
- **Escape**: 편집 취소
- **Tab**: 다음 셀로 이동
- **Shift+Tab**: 이전 셀로 이동

#### 전역 단축키 (추가 구현 권장)
- **Ctrl/Cmd + K**: 검색 포커스
- **Ctrl/Cmd + /**: 단축키 도움말

### 4. 색상 대비

shadcn/ui 기본 색상 팔레트는 WCAG AA 기준을 충족합니다:
- **텍스트 대비율**: 최소 4.5:1
- **UI 컴포넌트 대비율**: 최소 3:1

### 5. 포커스 인디케이터

모든 인터랙티브 요소에 포커스 스타일 적용:
```css
focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

---

## 📋 접근성 체크리스트

### ✅ 이미 구현됨
- [x] ARIA 레이블 (주요 버튼)
- [x] 시맨틱 HTML
- [x] 키보드 네비게이션 (F5-F8, Enter, Escape, Tab)
- [x] 색상 대비 (WCAG AA)
- [x] 포커스 인디케이터
- [x] 반응형 디자인
- [x] 다크 모드 지원

### 🔄 추가 권장 사항
- [ ] 스크린 리더 테스트 (NVDA, VoiceOver)
- [ ] Alt 텍스트 (이미지 추가 시)
- [ ] 랜드마크 역할 (`role="main"`, `role="navigation"`)
- [ ] Skip to Content 링크
- [ ] 폼 유효성 검사 메시지 (접근 가능한 에러 표시)
- [ ] ARIA Live Regions (동적 콘텐츠)
- [ ] 키보드 단축키 도움말 모달

---

## 🧪 접근성 테스트 방법

### 1. 자동화 테스트

#### Lighthouse (Chrome DevTools)
```bash
1. Chrome DevTools 열기 (F12)
2. Lighthouse 탭 선택
3. "Accessibility" 체크
4. "Analyze page load" 실행
5. 점수 90+ 목표
```

#### axe DevTools (브라우저 확장)
```bash
1. axe DevTools 설치 (Chrome/Firefox Extension)
2. 페이지에서 확장 실행
3. "Scan ALL of my page" 클릭
4. 이슈 확인 및 수정
```

### 2. 수동 테스트

#### 키보드 네비게이션 테스트
```
1. 마우스 사용 금지
2. Tab 키로 모든 인터랙티브 요소 접근 가능한지 확인
3. Enter/Space로 버튼 활성화 가능한지 확인
4. Escape로 모달/다이얼로그 닫기 가능한지 확인
```

#### 스크린 리더 테스트
```
Windows: NVDA (무료)
macOS: VoiceOver (내장)
iOS: VoiceOver (설정에서 활성화)
Android: TalkBack (설정에서 활성화)
```

#### 색상 대비 테스트
```bash
1. Chrome DevTools 열기
2. 요소 선택
3. Computed > Accessibility 확인
4. 대비율 확인 (4.5:1 이상)
```

### 3. 다양한 사용자 시나리오 테스트

#### 저시력 사용자
- 200% 확대 시 레이아웃 깨지지 않는지
- 고대비 모드에서 작동하는지

#### 색맹 사용자
- 색상만으로 정보 전달하지 않는지
- 텍스트 레이블이나 아이콘 병행 사용

#### 모터 장애 사용자
- 타겟 크기 충분한지 (최소 44x44px)
- 클릭 영역이 충분한지

---

## 🎓 ARIA 사용 가이드

### ARIA 레이블 추가 예시

#### 버튼
```tsx
// Bad ❌
<Button>
  <X />
</Button>

// Good ✅
<Button aria-label="닫기">
  <X />
</Button>
```

#### 링크
```tsx
// Bad ❌
<Link href="/admin">
  <Settings />
</Link>

// Good ✅
<Link href="/admin" aria-label="관리자 설정">
  <Settings />
</Link>
```

#### 입력 필드
```tsx
// Bad ❌
<Input type="text" />

// Good ✅
<Label htmlFor="email">이메일</Label>
<Input id="email" type="email" aria-required="true" />
```

#### 동적 콘텐츠
```tsx
// 토스트/알림
<div role="alert" aria-live="polite">
  저장되었습니다!
</div>

// 로딩 상태
<div role="status" aria-live="polite" aria-busy="true">
  로딩 중...
</div>
```

### ARIA 랜드마크

```tsx
// 메인 콘텐츠
<main role="main">
  {children}
</main>

// 네비게이션
<nav role="navigation" aria-label="메인 네비게이션">
  {/* 사이드바 메뉴 */}
</nav>

// 검색
<form role="search">
  <Input type="search" />
</form>
```

---

## 🛠️ 개발 중 접근성 체크

### 1. ESLint 플러그인
```bash
pnpm add -D eslint-plugin-jsx-a11y

# .eslintrc.json
{
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

### 2. TypeScript 타입 체크
```tsx
// ButtonProps에 aria-label 타입 포함
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label'?: string;
}
```

### 3. Storybook (선택사항)
```bash
pnpm add -D @storybook/addon-a11y

# 스토리에서 접근성 자동 체크
```

---

## 📝 추가 구현 권장 사항

### 1. Skip to Content 링크
```tsx
// layout.tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  메인 콘텐츠로 건너뛰기
</a>

<main id="main-content">
  {children}
</main>
```

### 2. 키보드 단축키 도움말
```tsx
// KeyboardShortcutsHelp.tsx (이미 구현됨)
// Ctrl+/ 또는 ? 키로 열기
```

### 3. 에러 메시지 접근성
```tsx
// 폼 에러
<Input
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && (
  <span id="email-error" role="alert">
    유효한 이메일을 입력해주세요
  </span>
)}
```

---

## 🔗 참고 자료

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility](https://react.dev/learn/accessibility)
- [shadcn/ui Accessibility](https://ui.shadcn.com/docs/accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

**작성일**: 2025년 10월 1일
**프로젝트**: 인광 토양정화 ERP
**Phase**: 5 - UI/UX 최적화 및 PWA 구현
**목표**: WCAG 2.1 AA 준수
