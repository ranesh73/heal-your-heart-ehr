import React, { useState } from "react";
import { VaccinesPage } from "./VaccinesPage";
import { AddVaccinePage } from "./AddVaccinePage";
import { VaccineVISPage } from "./VaccineVISPage";
import { VaccineChartPage } from "./VaccineChartPage";

interface ImmunizationSettingsPageProps {
  activeOptionId: string;
}

export function ImmunizationSettingsPage({ activeOptionId }: ImmunizationSettingsPageProps) {
  const [isAddingVaccine, setIsAddingVaccine] = useState(false);

  // Render subpage based on activeOptionId
  if (activeOptionId === "vaccines") {
    if (isAddingVaccine) {
      return (
        <AddVaccinePage
          onBack={() => setIsAddingVaccine(false)}
          onSuccess={() => setIsAddingVaccine(false)}
        />
      );
    }
    return <VaccinesPage onAddNew={() => setIsAddingVaccine(true)} />;
  }

  if (activeOptionId === "vis") {
    return <VaccineVISPage />;
  }

  if (activeOptionId === "vaccine-chart") {
    return <VaccineChartPage />;
  }

  return <VaccinesPage onAddNew={() => setIsAddingVaccine(true)} />;
}

