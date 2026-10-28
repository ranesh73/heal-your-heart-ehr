# Reference: Component Design System & Style Tokens

## 1. Visual & Spatial Tokens

### Colors
- **Header Background**: `#FFFFFF` with border `#E2E8F0`.
- **Application Background**: `#F8FAFC` (Cool slate white).
- **Primary Brand Color**: `#1B3B5F` (Charm Navy) / `#145E63` (Heal Your Heart Teal).
- **Accent Brand Color**: `#10B981` (TeleHealth / Active success green).
- **Interactive Blue**: `#2563EB` (Links, selection highlights, active tabs).
- **Warning / Unsigned Orange**: `#F59E0B` (Unsigned encounters, pending review flags).
- **Critical / Allergy Red**: `#EF4444` (Contraindication badges, severe alerts).
- **Border Grays**:
  - Divider: `#E2E8F0`
  - Input Borders: `#CBD5E1`
  - Subtle Hover: `#F1F5F9`

---

## 2. Typography Hierarchy
- **Primary Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Scale**:
  - `Header 1` (Patient Name, Section Titles): 18px - 20px, Bold (600/700), Color `#0F172A`.
  - `Header 2` (Card / Accordion Headings): 15px - 16px, Semi-bold (600), Color `#1E293B`.
  - `Body / Data Cell Text`: 13px - 14px, Regular (400), Color `#334155`.
  - `Small / Metadata Labels` (RID, DOB, Units): 11px - 12px, Regular (400) or Medium (500), Color `#64748B`.
  - `Badges & Pills`: 11px - 12px, Semi-bold (600).

---

## 3. Structural Dimensions

### Headers & Navigation Bars
- **Home Header**: Height 60px, padding 0 24px.
- **Child Screen Header**: Height 45px, padding 0 16px.
- **Patient Chart Header Strip**: Height ~75px, full width, padded.
- **Three-Pane Encounter Column Widths**:
  - `Left Pane` (Patient Context & Accordions): Width `300px`, border-right `1px solid #E2E8F0`.
  - `Middle Pane` (Prior Consultation Viewer & Flowsheet): Width `308px` (expandable), border-right `1px solid #E2E8F0`.
  - `Right Pane` (Active SOAP Editor): Flex-1 (`416px` to `800px`+ depending on viewport).

---

## 4. UI Components

### 1. Data Tables
- Header: Background `#F8FAFC`, text `#475569`, height `36px`, border-bottom `2px solid #E2E8F0`, uppercase/titlecase.
- Rows: Background `#FFFFFF`, alternating hover `#F8FAFC`, height `40px` - `48px`, border-bottom `1px solid #F1F5F9`.
- Selection: Checkbox column on left edge for bulk operations.

### 2. Action Buttons
- **Primary Button**: Background `#1B3B5F`, text `#FFFFFF`, border-radius `4px`, padding `6px 14px`, font-size `13px`, font-weight `500`.
- **Secondary Button**: Background `#FFFFFF`, border `1px solid #CBD5E1`, text `#334155`, border-radius `4px`.
- **Icon Buttons**: Size `28x28px` or `32x32px`, subtle hover background `#F1F5F9`.
- **Pill Badges**: Full rounded (`rounded-full`), height `22px`, font-size `11px`, padding `2px 8px`.

### 3. Forms & Inputs
- **Text Inputs**: Height `32px` (compact) or `36px` (standard), border `1px solid #CBD5E1`, border-radius `4px`, padding `0 8px`.
- **Dropdowns / Comboboxes**: Height `32px`, background `#FFFFFF`, chevron icon on right.
- **Textareas**: Minimum height `72px`, resizable vertically, font-size `13px`.
- **Checkboxes & Radios**: Standard 14x14px with accent brand color.
- **Validation**: Red border `#EF4444` and red error message text `12px` beneath field.

### 4. Modals & Drawers
- Backdrop: `rgba(15, 23, 42, 0.45)` with soft blur.
- Container: Background `#FFFFFF`, border-radius `8px`, box-shadow `0 20px 25px -5px rgba(0, 0, 0, 0.1)`.
- Header: Height `48px`, bottom border `1px solid #E2E8F0`, close `✕` button on right.
- Footer: Height `52px`, top border `1px solid #E2E8F0`, right-aligned Cancel & Submit buttons.
