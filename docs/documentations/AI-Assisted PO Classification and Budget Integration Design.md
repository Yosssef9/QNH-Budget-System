# Smart PO-to-Budget Linking System

## CareWare Procurement Integration with Budget Management System

---

# 1. Project Objective

## Business Problem

Today, when a Purchase Order (PO) is created in CareWare, the Purchasing Department must manually decide which approved budget item should pay for that PO.

Example:

```text
PO #2208

Item:
Stand Alone AC

Amount:
13,660 SAR
```

The purchasing employee must manually search:

```text
Department Budget
    ↓
Budget Category
    ↓
Budget Item
```

Then manually link the PO.

---

## Problems Today

### Time Consuming

Every PO requires manual searching.

---

### Human Error

Users may choose the wrong budget item.

---

### Inconsistent Decisions

Different users may classify similar purchases differently.

Example:

```text
User A:
Stand Alone AC
→ Air Conditioning

User B:
Stand Alone AC
→ Building Maintenance
```

---

### No Learning

The system never remembers previous decisions.

The same work is repeated again and again.

---

# 2. Proposed Solution

The Budget System will become an intelligent assistant.

Instead of forcing the user to search manually, the system will suggest the most likely approved budget item.

The user remains in full control.

The system only provides recommendations.

---

# 3. Complete Future Workflow

```text
PO Created in CareWare
        ↓
Automatic Sync
        ↓
PO Waiting For Budget Link
        ↓
Budget Suggestion Engine
        ↓
Suggested Budget Item
        ↓
User Review
        ↓
Approve / Change
        ↓
Budget Commitment Created
        ↓
System Learns Decision
```

---

# 4. Phase 1 – CareWare Synchronization

## Business Goal

Automatically retrieve newly approved POs from CareWare.

No Excel.

No manual import.

---

## Technical Process

Every 30 minutes:

```text
Budget System
      ↓
Query Oracle
      ↓
Get New POs
      ↓
Store Locally
```

Example:

```text
PO #2208

Item:
Stand Alone AC

Amount:
13,660 SAR
```

---

## Result

The PO appears inside the Budget System.

Status:

```text
Waiting For Budget Link
```

No budget impact yet.

---

# 5. Phase 2 – Budget Suggestion Engine

## Business Goal

Answer one question:

```text
Which approved budget item should pay for this PO?
```

---

## Example Budget

```text
Engineering Budget

Maintenance
 ├─ Air Conditioning
 ├─ Electrical Works
 └─ Plumbing

Furniture
 ├─ Office Chairs
 └─ Office Desks
```

---

New PO:

```text
Stand Alone AC
```

The system must determine:

```text
Air Conditioning?
Electrical Works?
Office Chairs?
```

---

# 6. Phase 3 – Exact Historical Matching

## Business Goal

Reuse previous approvals.

---

## What Data Is Used?

Table:

```text
PO Approval History
```

Example:

| PO Item        | Budget Item      |
| -------------- | ---------------- |
| Stand Alone AC | Air Conditioning |

---

## Step-by-Step Process

### Step 1

New PO arrives:

```text
Stand Alone AC
```

---

### Step 2

System searches approval history.

Question:

```text
Has this exact item been approved before?
```

---

### Step 3

Result:

```text
YES
```

Found:

```text
Stand Alone AC
 ↓
Air Conditioning
```

---

### Step 4

System creates suggestion:

```text
Maintenance
 ↓
Air Conditioning
```

---

### Step 5

User sees:

```text
Suggested Budget Item:
Maintenance → Air Conditioning

Reason:
Previously approved
```

---

### Step 6

User clicks:

```text
Approve
```

---

## Why Confidence Is 100%?

Because a human already approved this exact item previously.

No guessing is involved.

---

# 7. Phase 4 – Similar Historical PO Matching

## Business Goal

Handle items that have never been approved before.

---

## Example

New PO:

```text
Portable Cooling Unit
```

---

## Step 1

System searches:

```text
Has Portable Cooling Unit
been approved before?
```

Result:

```text
NO
```

---

## Step 2

System searches previously approved PO items.

Example History:

| Previous PO Item | Budget Item      |
| ---------------- | ---------------- |
| Stand Alone AC   | Air Conditioning |
| Window AC        | Air Conditioning |
| Split AC         | Air Conditioning |
| Central AC       | Air Conditioning |
| Office Chair     | Office Chairs    |
| Network Switch   | IT Equipment     |

---

## Step 3

System compares the new PO description against previous approved PO descriptions.

Example:

```text
Portable Cooling Unit
```

compared with:

```text
Stand Alone AC
Window AC
Split AC
Central AC
```

The comparison is based on semantic similarity, meaning the system compares the meaning of the descriptions rather than exact keywords. Embedding models represent text as numerical vectors and similar meanings are located closer together in vector space.

---

## Step 4

System finds the most similar historical approvals.

Example:

| Similar Historical Item | Linked Budget Item |
| ----------------------- | ------------------ |
| Split AC                | Air Conditioning   |
| Window AC               | Air Conditioning   |
| Stand Alone AC          | Air Conditioning   |

---

## Step 5

System asks:

```text
What budget item
were these similar purchases linked to?
```

Answer:

```text
Air Conditioning
Air Conditioning
Air Conditioning
```

---

## Step 6

System creates suggestion:

```text
Maintenance
 ↓
Air Conditioning
```

---

## What User Sees?

```text
Suggested Budget Item:
Maintenance → Air Conditioning

Reason:
3 similar purchases were previously approved under Air Conditioning
```

This explanation is far more useful than showing:

```text
Confidence = 95%
```

alone.

---

# 8. Phase 5 – AI Assistance

## Business Goal

Handle completely new items.

---

Example:

```text
Portable Vaccine Storage Refrigerator
```

---

No exact match.

No similar approved purchases.

---

The system sends:

```text
PO Description
Supplier
Department
Available Budget Items
```

to the AI service.

---

AI returns:

```text
Suggested:
Medical Equipment

Reason:
Medical refrigeration equipment is typically categorized as medical equipment.
```

---

User still makes the final decision.

AI never approves automatically.

---

# 9. Phase 6 – User Review Screen

User sees:

| PO                    | Suggested Budget Item | Reason                     |
| --------------------- | --------------------- | -------------------------- |
| Stand Alone AC        | Air Conditioning      | Previously approved        |
| Portable Cooling Unit | Air Conditioning      | Similar approved purchases |
| Vaccine Refrigerator  | Medical Equipment     | AI recommendation          |

---

Actions:

```text
Approve
Change
Reject
```

---

# 10. Phase 7 – Budget Commitment Creation

After approval:

```text
PO #2208
13,660 SAR
```

linked to:

```text
Maintenance
 ↓
Air Conditioning
```

---

Budget Before:

| Type      |  Amount |
| --------- | ------: |
| Approved  | 100,000 |
| Committed |       0 |
| Available | 100,000 |

---

Budget After:

| Type      |  Amount |
| --------- | ------: |
| Approved  | 100,000 |
| Committed |  13,660 |
| Available |  86,340 |

---

# 11. Phase 8 – Learning System

Every approval becomes future knowledge.

Example:

```text
Portable Cooling Unit
 ↓
Air Conditioning
```

saved permanently.

---

Next time:

```text
Portable Cooling Unit
```

arrives.

The system skips Phase 4 and immediately suggests:

```text
Air Conditioning
```

because it already learned from the previous approval.

---

# 12. Phase 9 – Actual Spending Tracking

When CareWare reports:

```text
Invoice Posted
```

or

```text
Goods Received
```

the system converts:

```text
Committed Amount
```

into:

```text
Actual Spending
```

keeping budget balances accurate.

---

# Final Vision

```text
CareWare PO
      ↓
Automatic Budget Item Suggestion
      ↓
User Approval
      ↓
Budget Commitment
      ↓
Learning Database
      ↓
Better Future Suggestions
```

The system does not replace purchasing staff.

The system acts as an intelligent procurement assistant that reduces manual work, improves consistency, and continuously learns from real purchasing decisions.
