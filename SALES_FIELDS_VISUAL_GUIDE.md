# Sales Fields - Visual Guide

## New Fields Location in Forms

### 1. Sales Information Section - Utility Details Card

```
┌─────────────────────────────────────────────────────┐
│ ⚡ Utility Details                                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Utility Company Name: [Duke Energy            ]    │
│  Utility Service Number: [123456789           ]    │
│  ✨ NEW → Utility Company Phone: [(555) 123-4567] │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2. Guest Pay Section (NEW CARD)

```
┌─────────────────────────────────────────────────────┐
│ 🔗 Guest Pay                                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Enable Guest Pay                    [●─────] │  │
│  │ Allow customers to pay through a guest link  │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  Guest Pay Link: [https://payment.example.com/...] │
│  (Only shown when toggle is ON)                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3. Billing & Amounts Section

```
┌─────────────────────────────────────────────────────┐
│ 💲 Billing & Amounts                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Bill Amount: [$100.00]  Discount: [$10.00]        │
│  Charged Amount: $90.00                             │
│                                                      │
│  Billed Month: [2024-05]  Due Date: [2024-06-01]   │
│                                                      │
│  ✨ NEW FIELDS BELOW ✨                              │
│                                                      │
│  Payment Status After Sale: [Pending        ▼]     │
│  Expected Next Bill Date: [2024-07-01      ]       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## New Fields in Sale Detail View

### Utility Details Card (Updated)

```
┌─────────────────────────────────────────────────────┐
│ ⚡ Utility Details                                   │
├─────────────────────────────────────────────────────┤
│  Type:                    utility / new             │
│  Utility Company:         Duke Energy               │
│  Utility service number:  123456789                 │
│  ✨ Utility company phone: (555) 123-4567           │
│  Account Status:          active                    │
│  Created:                 Jan 15, 2024              │
│  Last updated:            Jan 15, 2024              │
└─────────────────────────────────────────────────────┘
```

### Billing Card (Updated)

```
┌─────────────────────────────────────────────────────┐
│ 💲 Billing                                           │
├─────────────────────────────────────────────────────┤
│  Bill Amount:                      $100.00          │
│  Discount:                         $10.00           │
│  Charged Amount:                   $90.00           │
│  Billed Month:                     May 2024         │
│  Due Date:                         Jun 1, 2024      │
│  ✨ Payment Status After Sale:    Completed         │
│  ✨ Expected Next Bill Date:      Jul 1, 2024       │
└─────────────────────────────────────────────────────┘
```

### Guest Pay Card (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 🧾 Guest Pay                                         │
├─────────────────────────────────────────────────────┤
│  Guest Pay Enabled:        Yes                      │
│  Guest Pay Link:           https://payment.ex...    │
│                            (clickable link)         │
└─────────────────────────────────────────────────────┘
```

## Field Specifications

### 1. Utility Company Phone
- **Type:** Text input
- **Location:** Utility Details section (only for utility sales)
- **Required:** No
- **Format:** Free text (e.g., "(555) 123-4567")
- **Database:** `utility_company_phone TEXT`

### 2. Guest Pay Enabled
- **Type:** Toggle switch (boolean)
- **Location:** New "Guest Pay" card section
- **Required:** No (defaults to false)
- **Visual:** 
  - OFF: Gray toggle on left
  - ON: Primary color toggle on right
- **Database:** `guest_pay_enabled BOOLEAN DEFAULT false`

### 3. Guest Pay Link
- **Type:** Text input (URL)
- **Location:** Guest Pay section (only visible when toggle is ON)
- **Required:** No
- **Format:** URL (e.g., "https://payment.example.com/guest/...")
- **Database:** `guest_pay_link TEXT`
- **Display:** Clickable link in detail view

### 4. Payment Status After Sale
- **Type:** Dropdown select
- **Location:** Billing & Amounts section
- **Required:** No (defaults to "pending")
- **Options:**
  - Pending
  - Completed
  - Failed
  - Refunded
  - Cancelled
- **Database:** `payment_status_after_sale TEXT CHECK (...) DEFAULT 'pending'`

### 5. Expected Next Bill Date
- **Type:** Date picker
- **Location:** Billing & Amounts section
- **Required:** No
- **Format:** YYYY-MM-DD
- **Database:** `expected_next_bill_date DATE`

## Behavior Notes

### Guest Pay Toggle
- When **OFF**: Guest pay link field is hidden
- When **ON**: Guest pay link field appears below the toggle
- Smooth animation when toggling
- State persists when saving the form

### Conditional Display
- **Utility Company Phone**: Only shown for `sale_type = 'utility'`
- **Guest Pay Link Input**: Only shown when `guest_pay_enabled = true`
- **Guest Pay Link Display**: Only shown in detail view when link exists

### Default Values
- `guest_pay_enabled`: `false`
- `payment_status_after_sale`: `"pending"`
- All other new fields: `null` or empty string

### Validation
- No special validation on utility company phone (free text)
- Guest pay link accepts any text (no URL validation enforced)
- Payment status must be one of the 5 allowed values
- Dates must be valid date format

## Integration Points

### Create Sale Flow
1. User fills out the form including new fields
2. Form data includes all new fields in submission
3. `createSale` action saves all fields to database
4. Payment record created separately (existing flow)
5. Redirect to sales list

### Edit Sale Flow
1. Existing sale data loaded including new fields
2. Form pre-populated with current values
3. User can modify any field including new ones
4. `updateSaleDetails` action updates all fields
5. Redirect to sale detail view

### View Sale Flow
1. Sale data fetched including new fields
2. All fields displayed in appropriate cards
3. Guest pay link is clickable if present
4. Empty fields show "—" placeholder
