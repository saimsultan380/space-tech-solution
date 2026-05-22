# Payslip System - Quick Reference Guide

## What's New?

### 1. ✅ Currency Changed to PKR (Pakistani Rupees)

- All payslip amounts now display in **PKR** format
- Includes: Salary, Bonuses, Deductions, Revenue amounts
- Example: ₨ 50,000.00 instead of $ 50,000.00

### 2. ✅ Bonus Calculation Confirmed

**The system CORRECTLY adds bonus to your total salary:**

```
NET PAY = Basic Salary + Allowances + BONUS + Commission - Advance - Deductions
```

When you add a bonus amount, it is automatically included in the calculated net pay shown at the bottom of the form.

**You can see this in real-time:**

- Create or edit a payslip
- Add an amount to "Bonus" field
- Watch the "Salary Summary" section update
- "Total Earnings" increases by the bonus amount
- "Net Pay" shows the updated total

### 3. ✅ NEW: Payslip History Feature

#### Access History:

1. Go to **Payslips** section
2. Click **"View History"** button (top right)
3. Select an employee from the dropdown

#### What You'll See:

- **All past payslips** for that employee
- **Organized by year** (filter by year)
- **Summary cards** showing:
  - Total Earnings for selected year
  - Total Deductions for selected year
  - Total Net Pay for selected year

#### Actions Available:

- 👁️ **View** - See complete payslip details in a popup
- ⬇️ **Download** - Save payslip as PDF file

---

## How to Generate Payslips with Bonus

1. Click **"Generate Payslip"** button
2. Select employee
3. Enter pay period dates
4. Fill in salary details:
   - **Basic Salary** - Base monthly salary
   - **Allowances** - Any allowances
   - **Bonus** ← _This will be added to total_
   - **Commission** - Sales commission
   - **Advance** - Advance deducted from salary
   - **Deductions** - Other deductions
5. Watch **Salary Summary** section update in real-time
6. Verify **Total Earnings** includes your bonus
7. Confirm **Net Pay** is correct
8. Click **"Save Payslip"**

---

## Currency Information

| Field        | Display Format | Example      |
| ------------ | -------------- | ------------ |
| Basic Salary | PKR            | ₨ 50,000.00  |
| Bonus        | PKR            | ₨ 5,000.00   |
| Net Pay      | PKR            | ₨ 49,500.00  |
| Revenue      | PKR            | ₨ 100,000.00 |

---

## Common Tasks

### View a Specific Employee's History

1. Payslips → View History
2. Select employee from dropdown
3. All payslips load automatically
4. Use year filter to narrow down dates

### Download an Old Payslip

1. View History
2. Select employee
3. Find the month you need in the table
4. Click download icon
5. PDF saves to your computer

### Check if Bonus Was Added

1. Create/edit payslip
2. Enter bonus amount in "Bonus" field
3. Look at "Salary Summary" section
4. "Total Earnings" should increase
5. "Net Pay" should reflect the bonus

### Find Payslips by Month/Year

1. View History
2. Select employee
3. Use the **Year** dropdown at the top
4. Table updates to show only payslips from that year
5. Payslips are sorted newest first

---

## Troubleshooting

### Issue: Still seeing USD instead of PKR

- **Solution**: Refresh your browser (Ctrl+F5 or Cmd+Shift+R)

### Issue: Can't find View History button

- **Solution**: You must be logged in as Admin. History feature is admin-only.

### Issue: Employee not in history list

- **Solution**: Employee might not have any payslips yet. Generate a payslip first.

### Issue: Bonus not showing in total

- **Solution**: Check that you entered bonus amount and saved the payslip. Look at salary summary before saving.

---

## Support

For questions about payslips or need help with calculations, refer to the salary breakdown sections which show:

- ✅ Earnings (Basic + Allowances + Bonus + Commission)
- ✅ Deductions (Deductions + Advance)
- ✅ Net Pay (Total - Deductions)

All calculations are automatic and verified both on screen and in the database.
