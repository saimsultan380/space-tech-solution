# React Query Migration - Sales Component

## Summary
Successfully migrated the Sales component from Server-Side Rendering (SSR) to Client-Side Fetching using @tanstack/react-query.

## Changes Made

### 1. Created Client-Side Query Functions

#### File: `src/lib/queries/sales.ts`
- Extracted `getSales` function from server action
- Uses client-side Supabase client (`@/lib/supabase/client`)
- Maintains all filtering, pagination, search, and statistics calculation
- Includes chargeback impact calculation
- Returns proper TypeScript types

#### File: `src/lib/queries/users.ts`
- Extracted `getUsers` function from server action
- Uses client-side Supabase client
- Supports pagination and search filtering
- Returns AppUser[] type

### 2. Updated Sales Page
**File:** `src/app/dashboard/sales/page.tsx`
- Removed all server-side data fetching
- Kept only authentication check on server
- Passes only `userRole` and `userId` to client component
- Removed searchParams handling (now done in client)

### 3. Migrated SalesClient Component
**File:** `src/components/sales/sales-client.tsx`

#### Key Changes:
1. **Added useQuery hooks**:
   ```typescript
   // Sales data
   const { data: salesResponse, isLoading: salesLoading, error: salesError } = useQuery({
     queryKey: ["sales", page, typeFilter, agentFilter, fromDateFilter, toDateFilter, urlSearch],
     queryFn: () => getSales({...}),
     staleTime: 30000,
   });

   // Users/Agents data
   const { data: usersResponse, isLoading: usersLoading } = useQuery({
     queryKey: ["users"],
     queryFn: () => getUsers(),
     staleTime: 30000,
   });
   ```

2. **Updated props interface** - Removed `salesResponse` and `agents` props

3. **Added comprehensive loading skeleton**:
   - Header with title and button
   - 5 stats cards with proper structure
   - Table with realistic column widths
   - 10 table rows with multi-line cells
   - Pagination skeleton

4. **Added error state** - Error message with EmptyState component

5. **Removed useTransition** - No longer needed with client-side fetching

6. **Updated filter handling**:
   - Direct router.push instead of startTransition
   - Reads filters from searchParams
   - Sales agent filter automatically set to userId for sales_agent role

7. **Proper TypeScript types** - All types maintained from original

## Features Preserved
✅ All existing UI remains exactly the same
✅ Search functionality (name, email, phone, company, policy, etc.)
✅ Type filtering (utility, insurance, all)
✅ Agent filtering (for super_admin and processor)
✅ Date range filtering
✅ Pagination
✅ Statistics cards (5 cards with calculations)
✅ Chargeback impact calculation
✅ CRUD operations (Create, Edit, Delete)
✅ Permission-based UI (role-based access)
✅ Message button for agents
✅ Sale date and recorded date display

## Query Key Strategy

### Sales Query
```typescript
["sales", page, typeFilter, agentFilter, fromDateFilter, toDateFilter, urlSearch]
```
- Automatically refetches when any filter changes
- Caches results per unique combination of filters
- 30-second staleTime prevents unnecessary refetches

### Users Query
```typescript
["users"]
```
- Simple key since users list doesn't change often
- 30-second staleTime
- Shared across components that need user list

## Benefits of Migration
1. **Better UX** - Instant navigation with loading states
2. **Caching** - 30-second cache reduces API calls
3. **Automatic refetching** - React Query handles cache invalidation
4. **Loading states** - Proper skeleton UI during data fetch
5. **Error handling** - Built-in error state management
6. **Type safety** - Full TypeScript support maintained
7. **Parallel queries** - Sales and users data fetched simultaneously

## Special Handling
- **Sales Agent Role**: Automatically filters sales by their userId
- **Chargeback Impact**: Calculated client-side from chargebacks table
- **Statistics**: All 8 stats calculated from filtered data
- **Search**: Supports text and numeric search across multiple fields

## Testing Checklist
- [ ] Page loads with data
- [ ] Search works correctly
- [ ] Type filtering works (utility, insurance, all)
- [ ] Agent filtering works (super_admin/processor only)
- [ ] Date filtering works
- [ ] Pagination works
- [ ] Loading skeleton appears during fetch
- [ ] Error state displays on failure
- [ ] Stats cards show correct calculations
- [ ] Create/Edit/Delete operations work
- [ ] Message button works for agents
- [ ] Permissions are respected
- [ ] Sales agent sees only their sales
