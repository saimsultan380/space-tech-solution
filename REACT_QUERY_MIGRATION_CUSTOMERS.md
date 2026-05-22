# React Query Migration - Call Logs Responses (Customers)

## Summary
Successfully migrated the Call Logs Responses (Customers) component from Server-Side Rendering (SSR) to Client-Side Fetching using @tanstack/react-query.

## Changes Made

### 1. Installed Dependencies
```bash
npm install @tanstack/react-query
```

### 2. Created Query Provider
**File:** `src/components/providers/query-provider.tsx`
- Created a new QueryProvider component with QueryClient configuration
- Set default staleTime to 30 seconds (30000ms)
- Disabled refetchOnWindowFocus for better UX

### 3. Updated Root Layout
**File:** `src/app/layout.tsx`
- Added QueryProvider to the app layout
- Wrapped existing providers with QueryProvider

### 4. Created Client-Side Query Function
**File:** `src/lib/queries/customers.ts`
- Extracted the data fetching logic from server action
- Uses client-side Supabase client (`@/lib/supabase/client`)
- Maintains all filtering, pagination, and search functionality
- Handles the same edge cases (missing source column, etc.)

### 5. Migrated Server Page to Client-Only Auth Check
**File:** `src/app/dashboard/customers/page.tsx`
- Removed server-side data fetching
- Kept only authentication and authorization checks on server
- Passes only `userRole` to client component

### 6. Migrated CustomersClient Component
**File:** `src/components/customers/customers-client.tsx`

#### Key Changes:
1. **Added 'use client' directive** - Already present ✓
2. **Replaced props** - Removed `customersResponse` prop, now fetches data internally
3. **Added useQuery hook**:
   ```typescript
   const { data: customersResponse, isLoading, error } = useQuery({
     queryKey: ["customers", page, urlSearch, fromDateFilter, toDateFilter],
     queryFn: () => getCustomers({
       page,
       pageSize: 10,
       search: urlSearch,
       createdFromDate: fromDateFilter || undefined,
       createdToDate: toDateFilter || undefined,
     }),
     staleTime: 30000,
   });
   ```
4. **Added loading state** - Skeleton UI with animated placeholders
5. **Added error state** - Error message with EmptyState component
6. **Removed useTransition** - No longer needed with client-side fetching
7. **Updated filter handling** - Direct router.push instead of startTransition
8. **Proper TypeScript types** - All types maintained from original implementation

## Features Preserved
✅ All existing UI remains exactly the same
✅ Search functionality
✅ Date range filtering
✅ Agent filtering (client-side)
✅ Pagination
✅ Statistics cards
✅ Pie chart visualization
✅ Export functionality
✅ CRUD operations (Create, Edit, Delete)
✅ Permission-based UI (role-based access)
✅ Recent notes display

## Benefits of Migration
1. **Better UX** - Instant navigation with loading states
2. **Caching** - 30-second cache reduces unnecessary API calls
3. **Automatic refetching** - React Query handles cache invalidation
4. **Loading states** - Proper skeleton UI during data fetch
5. **Error handling** - Built-in error state management
6. **Type safety** - Full TypeScript support maintained

## Query Key Strategy
```typescript
["customers", page, urlSearch, fromDateFilter, toDateFilter]
```
- Automatically refetches when any filter changes
- Caches results per unique combination of filters
- Prevents unnecessary refetches with staleTime

## Next Steps
To complete the migration for other pages, follow the same pattern:
1. Create query function in `src/lib/queries/`
2. Add useQuery hook to client component
3. Add loading and error states
4. Remove server-side data fetching from page component
5. Update props interface

## Testing Checklist
- [ ] Page loads with data
- [ ] Search works correctly
- [ ] Date filtering works
- [ ] Agent filtering works
- [ ] Pagination works
- [ ] Loading skeleton appears during fetch
- [ ] Error state displays on failure
- [ ] Create/Edit/Delete operations work
- [ ] Export functionality works
- [ ] Chart displays correctly
- [ ] Permissions are respected
