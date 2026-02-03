
# Agent Skills & Logic: Bao Hong Girl E-commerce

## Skill 1: Google Apps Script API Development
- **doGet(e)**: Fetch product data and verify member logins.
- **doPost(e)**: Handle member registration and order submissions.
- **CORS**: Ensure correct headers for frontend-backend communication.
- **JSON**: Return structured JSON responses.

## Skill 2: Membership & Authentication Logic
- **Registration**: Check duplicate `m_email`, auto-generate `m_id`, and hash passwords.
- **Login**: Validate credentials and return session tokens/User IDs.
- **Session Management**: Use `localStorage` to maintain user state and handle logout.

## Skill 3: E-commerce Frontend Engine
- **Product Display**: Dynamically render cards with "Ingredients" and "Usage Instructions".
- **Shopping Cart**: Manage quantities, calculate totals, and persist session data.
- **Inventory Sync**: Reference current `p_stock` during order submission.

## Skill 4: Order Management Pipeline
- **o_items**: Convert cart to JSON string.
- **o_id**: Auto-generate unique IDs (e.g., ORD-YYYYMMDD-XXXX).
- **o_created_at**: Timestamp records.

## Database Configuration (Google Sheets)
- **Product_Sheet_ID**: `1j5dzYl3_Q7Kw1L3k_5P3XWmbMZexemlhEp0qE4lc4wU`
- **Member_Sheet_ID**: `1GmAOZ5WFZK1AW7-xhJ6PmlAHs5QXvmrYNn73VOkzSx4`
- **Order_Sheet_ID**: `17Qc9aLSMIwNr0mawZaaloZi1G3qviHfgNvI--E92uW4`
