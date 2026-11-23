import React from "react";
import { IndividualSettingPage } from "./IndividualSettingPage";

/**
 * SettingsDashboard
 * Clean 2-pane Settings workspace directly rendering the first active settings view
 * (/settings/facility/facility-list) without forcing intermediate configuration cards.
 */
export function SettingsDashboard() {
  return (
    <IndividualSettingPage
      categoryId="facility"
      optionId="facility-list"
    />
  );
}

export default SettingsDashboard;
