import React from "react";
import { CatalogAutocomplete, CatalogItem } from "./CatalogAutocomplete";

export interface InjectionCatalogItem {
  id: string;
  name: string;
  normalized_name?: string;
  original_source_name?: string;
  verification_status?: string;
  is_active?: boolean;
}

const DEFAULT_FALLBACK_INJECTIONS: InjectionCatalogItem[] = [
  { id: "inj-lasix", name: "Lasix 20 mg ( 10 mg x 2 ml )", normalized_name: "lasix 20 mg ( 10 mg x 2 ml )", verification_status: "verified", is_active: true },
  { id: "inj-clexane-40", name: "Clexane 40 mg (0.4ml)", normalized_name: "clexane 40 mg (0.4ml)", verification_status: "verified", is_active: true },
  { id: "inj-clexane-60", name: "Clexane 60 mg (0.6 ml)", normalized_name: "clexane 60 mg (0.6 ml)", verification_status: "verified", is_active: true },
  { id: "inj-fondaflo", name: "Fondaflo 2.5 Injection", normalized_name: "fondaflo 2.5 injection", verification_status: "verified", is_active: true },
  { id: "inj-orofer", name: "Orofer FCM 1K Injection 20 ml", normalized_name: "orofer fcm 1k injection 20 ml", verification_status: "verified", is_active: true },
  { id: "inj-heparin", name: "Heparin Sodium 5,000 IU/mL", normalized_name: "heparin sodium 5,000 iu/ml", verification_status: "verified", is_active: true },
  { id: "inj-deriphyllin", name: "Deriphyllin 50 mg x 2 ml", normalized_name: "deriphyllin 50 mg x 2 ml", verification_status: "verified", is_active: true },
  { id: "inj-diclofenac", name: "Diclofenac Injection", normalized_name: "diclofenac injection", verification_status: "verified", is_active: true },
  { id: "inj-ceftriaxone", name: "Ceftriaxone 1 gm", normalized_name: "ceftriaxone 1 gm", verification_status: "verified", is_active: true },
  { id: "inj-dexamethasone", name: "Dexamethasone 4 mg", normalized_name: "dexamethasone 4 mg", verification_status: "verified", is_active: true },
];

export interface InjectionAutocompleteProps {
  value: string;
  catalogueId?: string | null;
  onSelect: (item: { id: string; name: string }) => void;
  onChangeText?: (text: string) => void;
  onChange?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function InjectionAutocomplete({
  value,
  catalogueId,
  onSelect,
  onChangeText,
  onChange,
  placeholder = "Search or select injection from master catalogue (e.g. Deform 20ml, Lasix, Clexane)...",
  required = false,
  disabled = false,
  id = "injection-autocomplete-input",
  className = "",
}: InjectionAutocompleteProps) {
  return (
    <CatalogAutocomplete
      value={value}
      catalogueId={catalogueId}
      type="injection"
      onSelect={(item: CatalogItem) => {
        onSelect({ id: item.catalogue_id || item.id, name: item.name });
      }}
      onChangeText={onChangeText}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      id={id}
      className={className}
      showBadge={true}
    />
  );
}
