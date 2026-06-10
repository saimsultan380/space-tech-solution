# Payslip PDF Upload - Visual Guide

## What You'll See

This guide shows you what the payslip PDF upload feature looks like in the application.

## 📍 Admin View: Upload Section

### When Creating/Editing a Payslip

**Location:** Dashboard → Payslips → Generate Payslip (or Edit)

The upload section appears after all the salary and payment details:

```
┌─────────────────────────────────────────────────────────┐
│  UPLOAD EXISTING PAYSLIP PDF                            │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Upload an old payslip PDF file in the same format as   │
│  generated payslips. This is useful for adding           │
│  historical payslips to the system.                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │              📤                                     │ │
│  │                                                     │ │
│  │          Click to upload PDF                       │ │
│  │       PDF files only, max 10MB                     │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ⚠️ Please select an employee first                     │
└─────────────────────────────────────────────────────────┘
```

### After Selecting a File

```
┌─────────────────────────────────────────────────────────┐
│  UPLOAD EXISTING PAYSLIP PDF                            │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  📄  Payslip_January_2023.pdf              ✕      │ │
│  │      2.45 MB                                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

[ Cancel ]  [ 💾 Save Payslip ]
```

### During Upload

```
[ Cancel ]  [ ⏳ Uploading... ]
```

## 📍 Admin View: Payslip List

### Payslip Table with PDF Column

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PAYROLL REGISTER                                     [ < ] March 2024 [ > ] │
├──────────────┬─────────┬────────────┬───────────┬──────────┬────────┬────────┤
│ Employee     │ Emp ID  │ Department │ Period    │ Net Pay  │ PDF    │ Actions│
├──────────────┼─────────┼────────────┼───────────┼──────────┼────────┼────────┤
│ John Doe     │ EMP-001 │ Sales      │ Mar 1-31  │ 50,000   │   📄   │  👁 ⋮  │
│ Jane Smith   │ EMP-002 │ Support    │ Mar 1-31  │ 45,000   │   -    │  👁 ⋮  │
│ Bob Johnson  │ EMP-003 │ Sales      │ Mar 1-31  │ 52,000   │   📄   │  👁 ⋮  │
└──────────────┴─────────┴────────────┴───────────┴──────────┴────────┴────────┘

Legend:
📄 = Uploaded PDF available (click to view)
-  = No uploaded PDF (can generate PDF from data)
👁 = View details
⋮  = More actions menu
```

### Actions Menu (When PDF Uploaded)

```
┌────────────────────────────┐
│ ✏️  Edit                    │
│ 📄  View Uploaded PDF       │
│ 📥  Download Generated PDF  │
│ 📤  Mark as Paid           │
│ 📋  Next Month Processed    │
│ 📤  Next Month Paid         │
│ 🗑️  Delete Salary           │
└────────────────────────────┘
```

### Actions Menu (When No PDF Uploaded)

```
┌────────────────────────────┐
│ ✏️  Edit                    │
│ 👁  Preview PDF             │
│ 📥  Download Generated PDF  │
│ 📤  Mark as Paid           │
│ 📋  Next Month Processed    │
│ 📤  Next Month Paid         │
│ 🗑️  Delete Salary           │
└────────────────────────────┘
```

## 📍 Employee View: My Payslips

### Payslip List for Employees

```
┌──────────────────────────────────────────────────────────────────────┐
│  MY PAYSLIPS                                  [ < ] March 2024 [ > ] │
├────────────────┬────────────┬───────────┬──────────┬─────────────────┤
│ Period         │ Pay Date   │ Net Pay   │ Status   │ Actions         │
├────────────────┼────────────┼───────────┼──────────┼─────────────────┤
│ Mar 1 - Mar 31 │ Apr 1 2024 │ 50,000    │ [Paid]   │ 👁 📄 📥        │
│ Feb 1 - Feb 28 │ Mar 1 2024 │ 50,000    │ [Paid]   │ 👁 PDF 📥       │
│ Jan 1 - Jan 31 │ Feb 1 2024 │ 48,000    │ [Paid]   │ 👁 📄 📥        │
└────────────────┴────────────┴───────────┴──────────┴─────────────────┘

Legend:
👁  = View details
📄  = View uploaded PDF (blue icon)
PDF = Preview generated PDF (text button)
📥  = Download PDF
```

### What Employees See

**When PDF is uploaded:**
- Blue 📄 icon - clicks to open uploaded PDF
- No "PDF" text button or download icon (uploaded PDF takes priority)

**When no PDF uploaded:**
- "PDF" text button - previews system-generated payslip
- 📥 Download icon - downloads system-generated PDF

## 🎨 Color Coding

### PDF Icons
- **Blue 📄 icon** = Uploaded PDF (admin uploaded a file)
- **Regular "PDF" button** = Can generate PDF from data

### Status Badges
- **[Paid]** (Green) = Payment completed
- **[Processed]** (Yellow/Orange) = Payslip created, not yet marked as paid

## 📱 Responsive Behavior

### Mobile View (Tablet/Phone)

The upload area becomes vertically stacked:

```
┌──────────────────────┐
│  📤                  │
│                      │
│  Click to upload PDF │
│  PDF files only,     │
│  max 10MB           │
└──────────────────────┘
```

### Desktop View

Upload area is wider and more spacious:

```
┌──────────────────────────────────────────────┐
│                                              │
│               📤                             │
│                                              │
│         Click to upload PDF                  │
│      PDF files only, max 10MB               │
│                                              │
└──────────────────────────────────────────────┘
```

## 🔔 User Notifications

### Success Messages

**After successful upload:**
```
┌─────────────────────────────────────────┐
│ ✅ Payslip saved successfully!           │
└─────────────────────────────────────────┘
```

### Error Messages

**File too large:**
```
┌─────────────────────────────────────────┐
│ ❌ File size must be less than 10MB     │
└─────────────────────────────────────────┘
```

**Wrong file type:**
```
┌─────────────────────────────────────────┐
│ ❌ Only PDF files are allowed            │
└─────────────────────────────────────────┘
```

**No employee selected:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Please select an employee first      │
└─────────────────────────────────────────┘
```

**Upload failed:**
```
┌─────────────────────────────────────────┐
│ ❌ Failed to upload PDF: [error details]│
└─────────────────────────────────────────┘
```

## 🖼️ Complete Form Layout

Here's what the entire payslip form looks like with the upload section:

```
┌───────────────────────────────────────────────────────────┐
│  GENERATE PAYSLIP                                    ✕    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  BASIC INFORMATION                                        │
│  ──────────────────────────────────────────────────────   │
│  Employee: [Select employee       ▼]                     │
│  Employee ID: EMP-001 (auto-filled)                      │
│  Period Start: [2024-03-01]  Period End: [2024-03-31]   │
│  Pay Date: [2024-04-01]                                  │
│                                                           │
│  EMPLOYEE PROFILE DETAILS                                 │
│  ──────────────────────────────────────────────────────   │
│  Father Name: [          ]  CNIC: [XXXXX-XXXXXXX-X]     │
│  Joining Date: [          ]  Category: [Permanent    ▼]  │
│  Department: [Sales Dept  ]  Position: [Sales Rep    ]   │
│  Address: [                                           ]   │
│                                                           │
│  SALARY BREAKDOWN                                         │
│  ──────────────────────────────────────────────────────   │
│  Basic Salary: [50000]    Allowances: [5000]            │
│  Bonus: [0]               Commission: [0]                │
│  Advance: [0]             Deductions: [0]                │
│                                                           │
│  PAYMENT DETAILS                                          │
│  ──────────────────────────────────────────────────────   │
│  Paid Through: [Bank        ▼]                           │
│  Account Number: [1234567890]                            │
│  Bank Branch: [Main Branch]                              │
│                                                           │
│  UPLOAD EXISTING PAYSLIP PDF                             │
│  ──────────────────────────────────────────────────────   │
│  Upload an old payslip PDF file in the same format...    │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │              📤  Click to upload PDF               │  │
│  │         PDF files only, max 10MB                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  SALARY SUMMARY                                    │  │
│  │  Total Earnings: 55,000.00                         │  │
│  │  Total Deductions: 0.00                            │  │
│  │  ─────────────────────────────────────────────────│  │
│  │  NET PAY: 55,000.00      Status: [Paid       ▼]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│              [ Cancel ]  [ Save Payslip ]                 │
└───────────────────────────────────────────────────────────┘
```

## 🎯 Key Visual Features

1. **Clear Sectioning:** Each section has a header with visual separator
2. **Upload Area:** Prominent with icon and clear instructions
3. **File Preview:** Shows filename and size after selection
4. **Status Indicators:** Color-coded badges (green/yellow)
5. **PDF Icons:** Blue for uploaded, regular for generated
6. **Responsive Design:** Adapts to screen size
7. **Clear Actions:** Icons with tooltips for better UX

## 💡 Tips for Users

- Look for the **blue PDF icon** 📄 to identify uploaded payslips
- Hover over icons to see tooltips explaining what they do
- The upload section only appears when editing/creating payslips
- Click anywhere in the upload box to select a file
- Remove file by clicking the ✕ button next to filename

---

**This visual guide helps users quickly understand the interface without needing to read lengthy documentation.**
