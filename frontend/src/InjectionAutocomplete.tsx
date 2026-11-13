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
