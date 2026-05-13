# Code Refactoring & Reusability Framework
## Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS

**Context:** Project with code duplication, oversized component files, inconsistent CSS patterns, and inline styling. Goal: Extract reusable components and utilities without UI changes.

---

## 🎯 Senior Dev Code Review Checklist

### Phase 1: Component Architecture Audit
When analyzing code, evaluate:

```
1. Component Size Check
   ├─ If index file > 200 lines → Break into smaller components
   ├─ If > 400 lines → Critical refactoring needed
   └─ Target: 80-150 lines per component file

2. Duplication Detection
   ├─ Search for repeated JSX patterns across modules
   ├─ Identify reused logic (hooks, data transformation)
   └─ Flag identical conditional rendering patterns

3. Prop Drilling Analysis
   ├─ Count props passed through 3+ levels
   ├─ Assess if Context API or custom hooks would help
   └─ Evaluate composition patterns

4. Type Safety Review
   ├─ Ensure all props have TypeScript interfaces
   ├─ Check for 'any' types and replace with specific types
   └─ Validate API response types
```

---

## 📂 Recommended Folder Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── [feature]/
│       ├── page.tsx
│       └── layout.tsx
│
├── components/
│   ├── common/                    # Reusable across entire app
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   └── Button.module.css (optional)
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Sidebar/
│   │   └── Navigation/
│   │
│   ├── layout/                    # Layout-specific components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── PageContainer.tsx
│   │
│   ├── features/                  # Feature-specific (Portal A, B, etc)
│   │   ├── PortalA/
│   │   │   ├── components/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── UserTable.tsx
│   │   │   │   └── StatsCard.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePortalData.ts
│   │   │   └── types/
│   │   │       └── portal.types.ts
│   │   │
│   │   └── PortalB/
│   │       └── ...
│   │
│   └── ui/                        # Atomic components (inputs, labels, etc)
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Badge.tsx
│       └── Loading.tsx
│
├── hooks/                         # Custom hooks (shared logic)
│   ├── useApi.ts
│   ├── useForm.ts
│   ├── useAuth.ts
│   └── usePagination.ts
│
├── utils/                         # Utility functions
│   ├── classNames.ts              # Tailwind class merging
│   ├── formatters.ts              # Date, currency formatting
│   ├── validators.ts              # Form validation
│   └── api.ts                     # API client wrapper
│
├── types/                         # Shared TypeScript types
│   ├── api.types.ts
│   ├── common.types.ts
│   └── index.ts
│
├── constants/                     # Constants
│   ├── config.ts
│   ├── messages.ts
│   └── colors.ts
│
└── styles/                        # Global styles
    ├── globals.css
    ├── variables.css              # CSS variables for theming
    └── tailwind.config.ts
```

---

## 🔍 Refactoring Patterns

### Pattern 1: Extract Reusable Components

**BEFORE (550 lines in index.tsx):**
```typescript
// pages/dashboard/index.tsx
export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    // ... fetch logic
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900">Users</h2>
      <table>
        {/* 200 lines of table rendering */}
      </table>
    </div>
  );
}
```

**AFTER (split into smaller components):**

```typescript
// components/common/Card/Card.tsx
import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      {title && <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>}
      {children}
    </div>
  );
}
```

```typescript
// components/features/Dashboard/UserTable.tsx
import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card/Card';
import { useApi } from '@/hooks/useApi';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserTable() {
  const { data: users, loading, error, fetchData } = useApi<User[]>();
  
  useEffect(() => {
    fetchData('/api/users');
  }, []);
  
  if (loading) return <Card title="Users"><LoadingSpinner /></Card>;
  if (error) return <Card title="Users"><ErrorMessage message={error} /></Card>;
  
  return (
    <Card title="Users">
      <UserTableContent users={users} />
    </Card>
  );
}
```

```typescript
// components/features/Dashboard/UserTableContent.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserTableContentProps {
  users: User[];
}

export function UserTableContent({ users }: UserTableContentProps) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left py-2">Name</th>
          <th className="text-left py-2">Email</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td className="py-2">{user.name}</td>
            <td className="py-2">{user.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```typescript
// app/dashboard/page.tsx
import { UserTable } from '@/components/features/Dashboard/UserTable';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <UserTable />
    </div>
  );
}
```

---

### Pattern 2: Extract Tailwind Classes as Constants

**BEFORE (Inline, repeated classes):**
```typescript
<div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
  <h2 className="text-lg font-bold text-gray-900">Title</h2>
</div>

<div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
  <h3 className="text-lg font-bold text-gray-900">Another Title</h3>
</div>
```

**AFTER (Extracted as constants):**

```typescript
// constants/tailwind.ts
export const CARD_STYLES = {
  container: 'p-4 bg-white rounded-lg shadow-md border border-gray-200',
  title: 'text-lg font-bold text-gray-900',
  subtitle: 'text-sm font-semibold text-gray-700',
} as const;

export const BUTTON_STYLES = {
  primary: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition',
  secondary: 'px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition',
} as const;

export const TABLE_STYLES = {
  container: 'w-full border-collapse',
  headerCell: 'text-left py-3 px-4 bg-gray-50 font-semibold border-b',
  bodyCell: 'py-3 px-4 border-b',
} as const;
```

```typescript
// utils/classNames.ts
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage: merges Tailwind classes without conflicts
// cn('px-4 py-2', 'px-2') → 'py-2 px-2' (px-4 overridden correctly)
```

```typescript
// components/common/Card/Card.tsx
import { CARD_STYLES } from '@/constants/tailwind';

interface CardProps {
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'elevated';
}

export function Card({ title, children, variant = 'default' }: CardProps) {
  const containerClass = variant === 'elevated' 
    ? cn(CARD_STYLES.container, 'shadow-lg')
    : CARD_STYLES.container;
    
  return (
    <div className={containerClass}>
      {title && <h2 className={CARD_STYLES.title}>{title}</h2>}
      {children}
    </div>
  );
}
```

---

### Pattern 3: Extract Custom Hooks for Logic Reuse

**BEFORE (Logic in component):**
```typescript
export function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users?page=${page}&size=${pageSize}`);
        const data = await response.json();
        setUsers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [page, pageSize]);
  
  return (
    // JSX
  );
}
```

**AFTER (Hook + Component separation):**

```typescript
// hooks/useApi.ts
import { useState, useCallback } from 'react';

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result);
      options?.onSuccess?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
      options?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [options]);
  
  return { data, loading, error, fetchData };
}
```

```typescript
// hooks/usePagination.ts
import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination({ initialPage = 1, initialPageSize = 10 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToPage = useCallback((p: number) => setPage(p), []);
  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page
  }, []);
  
  return { page, pageSize, nextPage, prevPage, goToPage, changePageSize };
}
```

```typescript
// components/features/Users/UserList.tsx
import { useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { usePagination } from '@/hooks/usePagination';
import { Card } from '@/components/common/Card/Card';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserList() {
  const { data: users, loading, error, fetchData } = useApi<User[]>();
  const { page, pageSize, nextPage, prevPage } = usePagination();
  
  useEffect(() => {
    fetchData(`/api/users?page=${page}&size=${pageSize}`);
  }, [page, pageSize, fetchData]);
  
  if (loading) return <Card title="Users"><LoadingSpinner /></Card>;
  if (error) return <Card title="Users"><ErrorMessage message={error} /></Card>;
  
  return (
    <Card title="Users">
      <UserTableContent users={users || []} />
      <Pagination page={page} onNext={nextPage} onPrev={prevPage} />
    </Card>
  );
}
```

---

### Pattern 4: Shared Types & Interfaces

**BEFORE (Types scattered, duplicated):**
```typescript
// components/UserProfile.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

// components/UserCard.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

// pages/users.tsx
interface User {
  id: string;
  name: string;
  email: string;
}
```

**AFTER (Single source of truth):**

```typescript
// types/user.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  name: string;
  email: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
}

export type UserResponse = {
  success: boolean;
  data: User;
  message: string;
};
```

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}
```

```typescript
// types/index.ts
export * from './user.types';
export * from './api.types';
export * from './common.types';
```

---

### Pattern 5: Generic Reusable Components

**Table Component:**
```typescript
// components/common/Table/Table.tsx
import { ReactNode } from 'react';
import { TABLE_STYLES } from '@/constants/tailwind';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  className?: string;
}

export function Table<T>({ 
  data, 
  columns, 
  keyExtractor,
  className = '' 
}: TableProps<T>) {
  return (
    <table className={`${TABLE_STYLES.container} ${className}`}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)} className={TABLE_STYLES.headerCell} style={{ width: col.width }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={keyExtractor(item)}>
            {columns.map(col => (
              <td key={String(col.key)} className={TABLE_STYLES.bodyCell}>
                {col.render ? col.render(item[col.key], item) : String(item[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Usage:**
```typescript
// components/features/Users/UserList.tsx
import { Table, type Column } from '@/components/common/Table/Table';
import { User } from '@/types';

export function UserList({ users }: { users: User[] }) {
  const columns: Column<User>[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, user) => (
        <button onClick={() => handleEdit(user.id)}>Edit</button>
      ),
    },
  ];
  
  return (
    <Table
      data={users}
      columns={columns}
      keyExtractor={user => user.id}
    />
  );
}
```

---

## ✅ Best Practices Checklist

### Component Design
- [ ] Components are < 200 lines (hard limit 300)
- [ ] Each component has a single responsibility
- [ ] Props are properly typed with TypeScript interfaces
- [ ] No inline CSS—use Tailwind or constants
- [ ] No hardcoded strings (use constants or i18n)
- [ ] Components are pure and deterministic

### Reusability
- [ ] Common patterns extracted to `components/common`
- [ ] Feature-specific components in `components/features`
- [ ] Shared logic in custom hooks (`hooks/`)
- [ ] Types are centralized (`types/`)
- [ ] Constants are centralized (`constants/`)
- [ ] Utilities are reusable functions (`utils/`)

### TypeScript
- [ ] No `any` types (use `unknown` with type guards if needed)
- [ ] All API responses are typed
- [ ] Props interfaces exported and reused
- [ ] Discriminated unions for complex state

### Tailwind CSS
- [ ] All color/sizing constants in `constants/tailwind.ts`
- [ ] Class composition via `cn()` utility
- [ ] No inline `style` attributes
- [ ] Use `@apply` for complex patterns (sparingly)

### Code Quality
- [ ] No duplicate code across modules
- [ ] Consistent naming conventions
  - Components: PascalCase (`UserCard.tsx`)
  - Hooks: camelCase starting with `use` (`useUsers.ts`)
  - Utils: camelCase (`formatDate.ts`)
  - Constants: UPPER_SNAKE_CASE (`USER_ROLES`)
- [ ] Error handling at component level
- [ ] Loading states consistently implemented

### Performance
- [ ] Server Components used by default (Next.js)
- [ ] Client Components marked with `'use client'`
- [ ] Memoization where needed (`memo`, `useMemo`, `useCallback`)
- [ ] Image optimization with `next/image`
- [ ] Code-splitting via dynamic imports where applicable

### Testing Readiness
- [ ] Components can be easily tested in isolation
- [ ] Hooks can be tested independently
- [ ] Clear prop interfaces make mocking easy
- [ ] No tight coupling to external services

---

## 📋 Refactoring Checklist Template

Use this for each file that needs refactoring:

```markdown
### File: [path/to/component/index.tsx]

**Current Stats:**
- Lines: [XXX]
- Duplicated patterns: [list]
- Inline styles: [count]
- Component responsibilities: [list]

**Refactoring Plan:**
- [ ] Extract [Component A] (lines X-Y)
- [ ] Extract [Component B] (lines Y-Z)
- [ ] Move logic to [Hook Name]
- [ ] Extract Tailwind classes to constants
- [ ] Create shared types in [types/xxx.types.ts]
- [ ] Add tests for new components

**Result:**
- Original file: XXX lines → XXX lines
- New files created: [list]
- Reusable components: [list]
- Reusable hooks: [list]
```

---

## 🚀 Implementation Strategy

### Week 1: Audit & Plan
1. Identify all files > 200 lines
2. Document duplicated patterns across modules
3. Create shared types and interfaces
4. Set up folder structure

### Week 2-3: Extract Common Components
1. Create `components/common` with Card, Button, Table, Modal
2. Move shared logic to `hooks/`
3. Extract Tailwind constants
4. Test all existing functionality still works

### Week 4: Feature Components
1. Break down large feature components
2. Replace duplicated code with reusable components
3. Add missing TypeScript types
4. Ensure no UI changes

### Week 5: Documentation & Finalization
1. Create component storybook or documentation
2. Update developer guidelines
3. Performance audit
4. Final QA

---

## 🔗 Quick Reference

**Ask Claude this when refactoring:**

> "I have a [Portal A/B] component that is [XXX] lines. It contains [describe patterns]. Using this stack (Next.js 14, React 18, TypeScript, Tailwind), help me:
> 1. Break this into smaller reusable components
> 2. Extract duplicate Tailwind classes
> 3. Move logic to custom hooks
> 4. Ensure proper TypeScript typing
> 5. Keep the UI identical"

**Provide Claude with:**
- Current component code
- Duplicated patterns you've noticed
- Current folder structure
- Any shared types/constants already in use

---

**Version:** 1.0  
**Last Updated:** May 2026  
**Maintained By:** Senior Dev Team
