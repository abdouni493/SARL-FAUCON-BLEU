# Réception Commandes & Messages de Réclamation - Implementation Guide

## Overview

This implementation provides:
1. **Enhanced Réception Commandes** (Receive Commands) interface for Chef de Projet profile
2. **Integrated Messages de Réclamation** (Reclamation Messages) interface for Storage profile
3. Complete database schema and connections
4. Validation and reclamation reply functionality

---

## Database Schema

### Tables Required

#### 1. reclamations
```sql
CREATE TABLE reclamations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receive_command_id UUID NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receive_command_id) REFERENCES receive_commands(id),
  FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
```

#### 2. reclamation_products
```sql
CREATE TABLE reclamation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL,
  product_id VARCHAR(255),
  product_name VARCHAR(255),
  quantity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reclamation_id) REFERENCES reclamations(id) ON DELETE CASCADE
);
```

#### 3. reclamation_responses
```sql
CREATE TABLE reclamation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL,
  response_message TEXT NOT NULL,
  responded_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reclamation_id) REFERENCES reclamations(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by) REFERENCES auth.users(id)
);
```

#### 4. command_validations
```sql
CREATE TABLE command_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receive_command_id UUID NOT NULL,
  validated_by UUID,
  validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'validated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receive_command_id) REFERENCES receive_commands(id),
  FOREIGN KEY (validated_by) REFERENCES auth.users(id)
);
```

### Execute SQL File

Run the SQL file: `SQL_RECLAMATION_AND_VALIDATION_SCHEMA.sql`

This file contains:
- All table creation statements
- Index definitions
- Sample data (optional)
- Permission grants

---

## Features by Page

### 1. Réception Commandes (ReceiveCommandsPage.tsx)

**For Chef de Projet Profile:**

#### Display
- List of receive commands in card format
- **Products displayed inline in each card** (like Storage profile)
- Status badge (pending/received)
- Date created

#### Card Contents
- Command ID
- Status
- Date
- **Products List** (showing product name and quantity)

#### Actions (Buttons)
- **View**: Opens detailed view dialog
- **Validate**: Saves validation to command_validations table
- **Reclamation**: Opens reclamation dialog with product selection
- **Print**: Prints command details

#### No Action Removed
- Delete button intentionally removed for Chef de Projet
- Edit button not available

#### Database Operations
- **Validation**: Updates `receive_commands.status` and creates entry in `command_validations`
- **Reclamation**: Creates `reclamations` record and `reclamation_products` entries

---

### 2. Messages de Réclamation (ReclamationMessagesPage.tsx)

**For Storage Profile:**

#### Features

**Loading & Display**
- Loading indicator while fetching
- Statistics cards showing:
  - Pending reclamations count
  - Resolved reclamations count

**Reclamation Cards**

Pending Reclamations:
- Command ID
- Message (truncated)
- Products list (inline display)
- Status badge (Pending)
- Buttons:
  - **View Details**: Opens full details dialog
  - **Reply**: Opens reply dialog

Resolved Reclamations:
- Command ID
- Message
- Products list
- Response preview
- Status badge (Resolved)
- View Details button

**Dialogs**

1. **Details Dialog**
   - Full message
   - Date created
   - All related products with quantities
   - Response (if exists)
   - Reply button (if pending)
   - Close button

2. **Reply Dialog**
   - Original message display
   - Text area for response
   - Send/Reply button
   - Response saved to `reclamation_responses` table
   - Reclamation status updated to 'resolved'

---

## Data Flow

### Creating a Reclamation

```
1. User on Réception Commandes clicks "Reclamation"
2. Dialog opens showing command products
3. User selects products and enters message
4. Clicks "Send"
5. System:
   - Creates reclamations record
   - Creates reclamation_products entries for selected items
6. Supabase confirms success
```

### Replying to Reclamation

```
1. Storage user sees pending reclamation
2. Clicks "Reply" or "View Details" → Reply
3. Dialog shows:
   - Original message from Chef de Projet
   - Text area for response
4. Types response and clicks "Send Response"
5. System:
   - Creates reclamation_responses entry
   - Updates reclamation status to 'resolved'
   - Sends success message
6. Card moves to "Resolved" section
```

---

## API Functions

### ReceiveCommandsPage.tsx

```typescript
// Fetch all commands with products
fetchData()

// Validate a command and record validation
handleValidation(cmdId: string)

// Create reclamation with selected products
handleReclamation()

// Toggle product selection
handleProductToggle(productId: string)

// Print command
handlePrint(cmdId: string)
```

### ReclamationMessagesPage.tsx

```typescript
// Fetch all reclamations with products and responses
fetchReclamations()

// Send reply to reclamation
handleReply()
```

---

## Database Indexes

For performance optimization, these indexes are created:

```sql
CREATE INDEX idx_reclamations_receive_command_id ON reclamations(receive_command_id);
CREATE INDEX idx_reclamations_status ON reclamations(status);
CREATE INDEX idx_reclamations_created_by ON reclamations(created_by);
CREATE INDEX idx_reclamation_products_reclamation_id ON reclamation_products(reclamation_id);
CREATE INDEX idx_reclamation_responses_reclamation_id ON reclamation_responses(reclamation_id);
CREATE INDEX idx_command_validations_receive_command_id ON command_validations(receive_command_id);
```

---

## File Structure

### Modified Files
- `src/pages/ReceiveCommandsPage.tsx` - Enhanced with product display and validation
- `src/pages/ReclamationMessagesPage.tsx` - Fixed with database integration

### New SQL File
- `SQL_RECLAMATION_AND_VALIDATION_SCHEMA.sql` - Database schema and setup

---

## Translation Keys Used

All labels are translatable:

- `nav.receive_commands` - Réception Commandes
- `nav.reclamation_messages` - Messages de Réclamation
- `common.products` - Products
- `common.quantity` - Quantity
- `common.validate` - Validate
- `common.reclamation` - Reclamation
- `common.pending_reclamations` - Pending Reclamations
- `common.resolved_reclamations` - Resolved Reclamations
- `common.view_details` - View Details
- `common.reply` - Reply
- `common.original_message` - Original Message
- `common.response` - Response
- `common.enter_response` - Enter Response
- `common.send_response` - Send Response

---

## Setup Instructions

### 1. Create Database Tables

Execute the SQL file: `SQL_RECLAMATION_AND_VALIDATION_SCHEMA.sql`

**Important**: Run this before deploying code changes.

### 2. Deploy Code

Replace existing files:
- `src/pages/ReceiveCommandsPage.tsx`
- `src/pages/ReclamationMessagesPage.tsx`

### 3. Test Functionality

#### Test Chef de Projet Profile
- Navigate to Réception Commandes
- Verify products display in cards
- Test Validate action
- Test Reclamation creation with product selection

#### Test Storage Profile
- Navigate to Messages de Réclamation
- Verify reclamations load from database
- Test reply functionality
- Verify status changes to "resolved"

---

## Error Handling

Both pages include error handling:

**Display**
- Error messages shown in red banner at top
- Messages auto-dismiss after 3 seconds
- Validation errors prevent action

**Database Errors**
- Connection errors caught and displayed
- Insertion errors with meaningful messages
- Transaction rollback on failure

---

## Performance Optimization

### Queries
- Supabase relations used for efficient queries
- Indexes on foreign keys
- Ordered by created_at DESC for newest first

### UI
- Lazy loading with Loader component
- Motion animations with staggered delays
- Card pagination via grid layout

---

## Future Enhancements

Recommended additions:
1. Reclamation priority levels
2. Attachment uploads for reclamations
3. Reclamation history timeline
4. Bulk validation operations
5. Reclamation templates
6. Email notifications
7. Advanced filtering and search

---

## Support

For issues or questions:
1. Check database tables are created
2. Verify Supabase RLS policies allow operations
3. Check browser console for errors
4. Verify user authentication

