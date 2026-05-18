# 📦 How to Check Bundle Size

## Quick Commands

### 1. Clean Build (Recommended)
```powershell
# Remove lock file and .next folder
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

# Run fresh build
npm run build
```

### 2. Regular Build
```powershell
# Just build (if no lock issues)
npm run build
```

### 3. Build and Start Production Server
```powershell
npm run build
npm start
```

---

## 📊 Reading the Build Output

After running `npm run build`, look for the route table:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    5 kB          85 kB
├ ○ /dashboard                          12 kB         120 kB
├ ○ /dashboard/reports                  15 kB         125 kB
├ ○ /dashboard/sales                    18 kB         130 kB
└ ○ /dashboard/customers                14 kB         122 kB
```

### What to Look For

#### ✅ GOOD (Target Achieved)
- **First Load JS < 500 KB** per route
- **Size < 50 KB** for individual routes
- **Shared chunks** properly split

#### ⚠️ NEEDS ATTENTION
- **First Load JS > 500 KB** - Still too large
- **Size > 100 KB** - Route-specific code is too heavy
- **No code splitting** - Everything in one chunk

#### ❌ CRITICAL
- **First Load JS > 1 MB** - Major optimization needed
- **Build errors** - Fix before deploying

---

## 🔍 Detailed Bundle Analysis

### Install Bundle Analyzer
```powershell
npm install --save-dev @next/bundle-analyzer
```

### Update next.config.ts
```typescript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

### Run Analysis
```powershell
$env:ANALYZE="true"; npm run build
```

This opens an interactive visualization showing:
- What's in each bundle
- Size of each dependency
- Opportunities for optimization

---

## 📈 Compare Before/After

### Before Optimization
```
Route (app)                              Size     First Load JS
┌ ○ /                                   50 kB        1.2 MB
├ ○ /dashboard                         120 kB        1.5 MB
├ ○ /dashboard/reports                 180 kB        1.8 MB
```

### After Optimization (Expected)
```
Route (app)                              Size     First Load JS
┌ ○ /                                    5 kB         85 kB
├ ○ /dashboard                          12 kB        120 kB
├ ○ /dashboard/reports                  15 kB        125 kB
```

**Improvement:** ~90% reduction in First Load JS

---

## 🧪 Testing Lazy Loading

### 1. Test Recharts Lazy Loading
```powershell
# Start production server
npm run build
npm start
```

1. Open browser to http://localhost:3000
2. Open DevTools → Network tab
3. Navigate to Dashboard
4. **Verify:** recharts NOT loaded yet
5. Navigate to Reports page
6. **Verify:** recharts loads now (look for chunk with "recharts")

### 2. Test xlsx Lazy Loading
1. Navigate to any page with export button
2. Open DevTools → Network tab
3. **Verify:** xlsx NOT loaded yet
4. Click "Export" button
5. **Verify:** xlsx loads now (look for chunk with "xlsx")

### 3. Test Icon Centralization
1. Open DevTools → Network tab
2. Navigate between pages
3. **Verify:** No duplicate lucide-react chunks
4. **Verify:** Icons load from single centralized chunk

---

## 📊 Performance Metrics to Track

### Core Web Vitals
```powershell
# Run Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

**Target Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **FCP (First Contentful Paint):** < 1.8s
- **TTI (Time to Interactive):** < 3.8s

### Bundle Size Metrics
- **First Load JS:** < 500 KB
- **Total JS:** < 1 MB
- **CSS:** < 100 KB
- **Images:** Optimized (AVIF/WebP)

---

## 🐛 Troubleshooting

### Build Fails with Lock Error
```powershell
Remove-Item -Path ".next\lock" -Force
npm run build
```

### Build Fails with TypeScript Errors
```powershell
# Check for type errors
npx tsc --noEmit

# If errors found, fix them before building
```

### Build Succeeds but Bundle Still Large
1. Check if all optimizations were applied
2. Run bundle analyzer to identify culprits
3. Look for:
   - Unused dependencies
   - Large libraries not lazy-loaded
   - Duplicate code across chunks

### Lazy Loading Not Working
1. Verify dynamic imports use correct syntax
2. Check browser console for errors
3. Ensure `ssr: false` for client-only components
4. Clear browser cache and rebuild

---

## 📝 Build Output Example

### Successful Optimized Build
```
Route (app)                                   Size     First Load JS
┌ ○ /                                         5.2 kB        87.3 kB
├ ○ /_not-found                               0 B            0 B
├ ○ /chat                                    12.1 kB       118.4 kB
├ ○ /dashboard                               15.3 kB       125.6 kB
├ ○ /dashboard/attendance                    18.7 kB       132.1 kB
├ ○ /dashboard/call-logs-responses           22.4 kB       138.8 kB
├ ○ /dashboard/chargebacks                   24.1 kB       142.5 kB
├ ○ /dashboard/customers                     19.8 kB       135.2 kB
├ ○ /dashboard/leaves                        17.2 kB       128.6 kB
├ ○ /dashboard/marketing-budget              21.3 kB       137.7 kB
├ ○ /dashboard/payments                      16.9 kB       127.3 kB
├ ○ /dashboard/payslips                      20.5 kB       136.9 kB
├ ○ /dashboard/personal-notepad              14.8 kB       124.2 kB
├ ○ /dashboard/processing-accounts           23.6 kB       140.1 kB
├ ○ /dashboard/reports                       25.8 kB       145.2 kB
├ ○ /dashboard/sales                         26.4 kB       146.8 kB
├ ○ /dashboard/settings                      18.3 kB       133.7 kB
├ ○ /dashboard/users                         19.1 kB       134.5 kB
└ ○ /forgot-password                          8.4 kB        94.8 kB

○  (Static)  prerendered as static content

✓ Compiled successfully
```

**Key Indicators:**
- ✅ All routes < 30 kB individual size
- ✅ All routes < 150 kB First Load JS
- ✅ No build errors
- ✅ Successful compilation

---

## 🎯 Success Checklist

Before deploying to production:

- [ ] Build completes without errors
- [ ] All routes show First Load JS < 500 KB
- [ ] Lazy loading verified in browser DevTools
- [ ] No console errors in production mode
- [ ] Lighthouse score > 90
- [ ] All pages load and function correctly
- [ ] Navigation is smooth and fast
- [ ] Export functionality works (xlsx loads on demand)
- [ ] Charts load correctly (recharts loads on demand)
- [ ] Sidebar active state works correctly

---

## 🚀 Deploy Checklist

- [ ] Run production build locally
- [ ] Test all critical user flows
- [ ] Verify bundle sizes are acceptable
- [ ] Check for any console warnings/errors
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Monitor performance after deployment
- [ ] Set up alerts for bundle size increases

---

**Last Updated:** May 18, 2026  
**Status:** Ready for verification
