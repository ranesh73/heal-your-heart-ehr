import React from "react";
import { SettingsLayout } from "./SettingsLayout";
import { FacilityListPage } from "./facility/FacilityListPage";
import { FacilityMembersPage } from "./facility/FacilityMembersPage";
import { FacilityResourcesPage } from "./facility/FacilityResourcesPage";
import { KioskSetupPage } from "./facility/KioskSetupPage";
import { DepartmentsPage } from "./facility/DepartmentsPage";
import { RolesPage } from "./facility/RolesPage";
import { FacilityNotificationsPage } from "./facility/FacilityNotificationsPage";
import { SettingContentView } from "./SettingContentView";
import { SETTINGS_CATEGORIES, ALL_SETTING_OPTIONS } from "./settingsData";
import { navigate } from "../api";

interface IndividualSettingPageProps {
  categoryId: string;
  optionId?: string;
}

export function IndividualSettingPage({
  categoryId,
  optionId,
}: IndividualSettingPageProps) {
  // Find current category
  const category = SETTINGS_CATEGORIES.find((c) => c.id === categoryId) || SETTINGS_CATEGORIES[0];

  // Default option if none provided
  const activeOptionId = optionId || category.options[0]?.id || "facility-list";

  const handleTabChange = (targetOptId: string) => {
    navigate(`/settings/${categoryId}/${targetOptId}`);
  };

  // Specialized Facility Subpages
  if (categoryId === "facility") {
    let content: React.ReactNode = null;
    switch (activeOptionId) {
      case "facility-list":
        content = <FacilityListPage />;
        break;
      case "facility-members":
        content = <FacilityMembersPage />;
        break;
      case "facility-resources":
        content = <FacilityResourcesPage />;
        break;
      case "kiosk-setup":
        content = <KioskSetupPage />;
        break;
      case "departments":
        content = <DepartmentsPage />;
        break;
      case "roles":
        content = <RolesPage />;
        break;
      case "notifications":
        content = <FacilityNotificationsPage />;
        break;
      default:
        content = <FacilityListPage />;
        break;
    }

    return (
      <SettingsLayout
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        {content}
      </SettingsLayout>
    );
  }

  // Other 24 Categories: Render Dedicated Individual Subpage
  const currentOption = category.options.find((o) => o.id === activeOptionId) || category.options[0];

  const categoryTabs = category.options.map((opt) => ({
    id: opt.id,
    label: opt.name,
    badge: opt.badge,
  }));

  return (
    <SettingsLayout
      activeTab={activeOptionId}
      onTabChange={handleTabChange}
      tabs={categoryTabs}
    >
      <div className="charm-settings-tab-content">
        {currentOption ? (
          <SettingContentView
            category={category}
            option={currentOption}
            onSelectOption={(opt) => navigate(`/settings/${categoryId}/${opt.id}`)}
            onBack={() => navigate("/settings")}
          />
        ) : (
          <div>Select a setting option above.</div>
        )}
      </div>
    </SettingsLayout>
  );
}
