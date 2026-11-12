/**
 * Workspace tabs, in the order they render.
 *
 * `template_library` is the storage key for the CharmHealth Library tab; it
 * predates the label and is what the API still expects, so it is kept as-is.
 */
export type TabType =
  | 'my_templates'
  | 'practice_templates'
  | 'email_templates'
  | 'template_library'
  | 'common_medication';

export interface TemplateOption {
  id?: number;
  component_id?: number;
  option_label: string;
  option_value: string;
  order_index?: number;
  /** Parent option id; null/undefined for a root-level option. */
  parent_option_id?: number | null;
  /** Pre-ticked in the stored template. */
  is_selected?: boolean;
  /** Renders a disclosure triangle even when it has no visible children. */
  is_expandable?: boolean;
  /** Only present on payloads sent to the API; the API returns a flat list. */
  children?: TemplateOption[];
}

/**
 * Field types the clinical template viewer can render. The renderer falls
 * back to a read-only text field for any value outside this union, so new
 * types can be introduced backend-first without breaking the viewer.
 */
export type ComponentType =
  | 'Heading'
  | 'Centered Heading'
  | 'Info Text'
  | 'Check List'
  | 'Simple Question'
  | 'Single Choice'
  | 'Multi Choice'
  | 'Checkbox Group'
  | 'Rating Scale'
  | 'Yes/No Question'
  | 'Notes'
  | 'Textarea'
  | 'Table'
  | 'Interpretation'
  | 'Calculated Field'
  | 'Score Field'
  | 'Field Group'
  | 'Image'
  | 'Text Field'
  | 'Number Field'
  | 'Date'
  | 'Time'
  | 'Dropdown'
  | (string & {});

export interface TemplateComponent {
  id?: number;
  section_id?: number;
  component_type: ComponentType;
  label: string;
  placeholder?: string;
  is_required?: boolean | number;
  is_mandatory?: boolean | number;
  default_value?: string | null;
  order_index?: number;
  /** Columns used by a choice grid; 1 renders one option per full-width row. */
  column_count?: number;
  /** Small parenthetical hint shown beside the label. */
  help_text?: string | null;
  options?: TemplateOption[];
  config?: Record<string, any>;
}

export interface HeadingConfig {
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isMandatory?: boolean;
}

export interface TableCellProperties {
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
}

export interface TableConfig {
  columnCount: number;
  headers?: string[];
  rows: Array<Array<{ text: string; properties?: TableCellProperties }>>;
}

export interface QuestionConfig {
  multiline?: boolean;
  generatedText?: string;
  includeOthers?: boolean;
  includeComments?: boolean;
  includeCommentsYes?: boolean;
  includeCommentsNo?: boolean;
  generatedTextYes?: string;
  generatedTextNo?: string;
  min?: number;
  max?: number;
  patientField?: string;
  placeholderField?: string;
  imageUrl?: string;
}

export interface TemplateSection {
  id?: number;
  template_id?: number;
  title: string;
  category?: 'Subjective' | 'Objective' | 'Assessment' | 'Plan' | 'Custom';
  order_index?: number;
  column_layout?: 1 | 2 | 3;
  components: TemplateComponent[];
}

export interface TemplateRelationship {
  id?: number;
  template_id?: number;
  parent_component_id: number;
  trigger_value: string;
  child_component_id: number;
  parent_label?: string;
  child_label?: string;
}

export interface ClinicalTemplate {
  id: number;
  name: string;
  template_type: string;
  specialty: string;
  /** Medical category badge shown in the My Templates table. */
  category?: string;
  description?: string;
  /** Free-text clinical template body authored in the template form. */
  content?: string;
  /** Comma-separated tag string as stored in SQLite. */
  tags?: string;
  /** Server-split convenience view of `tags`. */
  tags_list?: string[];
  is_active?: boolean;
  is_practice: number;
  is_library: number;
  created_by?: string;
  owner_email?: string;
  created_at?: string;
  updated_at?: string;
  accessible_to?: string;
  roles_list?: string[];
  roles?: string[];
  sections?: TemplateSection[];
  relationships?: TemplateRelationship[];
}

/** Payload accepted by the create / update template endpoints. */
export interface TemplateFormValues {
  name: string;
  template_type: string;
  category: string;
  description: string;
  content: string;
  tags: string;
  is_active: boolean;
}

/**
 * One entry of the Common Medication catalogue served by
 * `/api/medical-conditions`. These appear on the Common Medication tab only -
 * never on My Templates.
 */
export interface MedicalCondition {
  key: string;
  label: string;
  /** Clinical grouping shown beside the condition, e.g. "Cardiac". */
  category?: string;
  /** One-line summary of what the condition's templates cover. */
  description?: string;
}

/** Filter state driving the My Templates listing. */
export interface TemplateFilters {
  tab: TabType;
  template_type: string;
  condition: string;
  search: string;
  nameSearch: string;
}

export interface Patient {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  condition_history?: string;
}

export interface ConsultationResponseItem {
  component_id: number;
  component_label: string;
  response_value: string;
}

export interface UserSession {
  id: number;
  email: string;
  full_name: string;
  role: string;
  branch?: string;
  token?: string;
}

export interface MedicationReference {
  id?: number;
  condition_key: string;
  condition_name: string;
  category: string;
  medication_name: string;
  generic_name: string;
  form: string;
  strength: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultationRecord {
  id: number;
  template_id: number;
  patient_id?: number | null;
  consultation_date?: string;
  encounter_type?: string;
  notes?: string;
  status?: string;
  template_name?: string;
  patient_name?: string;
  mrn?: string;
  responses?: Array<{
    id?: number;
    component_id: number;
    component_label: string;
    response_value: string;
  }>;
}
