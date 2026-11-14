import React from "react";
import { CatalogAutocomplete, CatalogItem } from "../CatalogAutocomplete";

export interface MedicineCatalogItem {
  id: string;
  product_name: string;
  trade_name: string;
  normalized_name?: string;
  normalized_trade?: string;
  is_active?: boolean;
}

export interface MedicineAutocompleteProps {
  value: string;
  tradeNameValue?: string;
  onSelect: (item: { id: string; product_name: string; trade_name: string }) => void;
  onChangeText?: (text: string) => void;
  onChange?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function MedicineAutocomplete({
  value,
  tradeNameValue,
  onSelect,
  onChangeText,
  onChange,
  placeholder = "Search 219 master medicines (Product Name, Trade Name or Formulation)...",
  required = false,
  disabled = false,
  id = "medicine-autocomplete-input",
  className = "",
}: MedicineAutocompleteProps) {
  return (
    <CatalogAutocomplete
      value={value}
      type="medicine"
      onSelect={(item: CatalogItem) => {
        onSelect({
          id: item.catalogue_id || item.id,
          product_name: item.name,
          trade_name: item.trade_name || item.name,
        });
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
