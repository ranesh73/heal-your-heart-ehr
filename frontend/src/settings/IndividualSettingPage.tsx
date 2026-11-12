import React from "react";
import { SettingsLayout } from "./SettingsLayout";
import { FacilityListPage } from "./facility/FacilityListPage";
import { FacilityMembersPage } from "./facility/FacilityMembersPage";
import { FacilityResourcesPage } from "./facility/FacilityResourcesPage";
import { KioskSetupPage } from "./facility/KioskSetupPage";
import { DepartmentsPage } from "./facility/DepartmentsPage";
import { RolesPage } from "./facility/RolesPage";
import { FacilityNotificationsPage } from "./facility/FacilityNotificationsPage";
import { AppointmentStatusPage } from "./calendar/AppointmentStatusPage";
import { VisitTypesPage } from "./calendar/VisitTypesPage";
import { EventTypesPage } from "./calendar/EventTypesPage";
import { ProviderTimingsPage } from "./calendar/ProviderTimingsPage";
import { WebEmbedPage } from "./calendar/WebEmbedPage";
import { InventorySettingsPage } from "./inventory/InventorySettingsPage";
import { ManageInjectionsPage } from "./injections/ManageInjectionsPage";
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

  // Specialized Calendar Subpages
  if (categoryId === "calendar") {
    let content: React.ReactNode = null;
    switch (activeOptionId) {
      case "provider-timings":
        content = <ProviderTimingsPage />;
        break;
      case "web-embed":
        content = <WebEmbedPage />;
        break;
      case "appointment-status":
        content = <AppointmentStatusPage />;
        break;
      case "visit-types":
        content = <VisitTypesPage />;
        break;
      case "event-types":
        content = <EventTypesPage />;
        break;
      default:
        const opt = category.options.find((o) => o.id === activeOptionId) || category.options[0];
        content = opt ? (
          <SettingContentView
            category={category}
            option={opt}
            onSelectOption={(o) => navigate(`/settings/${categoryId}/${o.id}`)}
            onBack={() => navigate("/settings")}
          />
        ) : null;
        break;
    }

    const calendarTabs = category.options.map((opt) => ({
      id: opt.id,
      label: opt.name,
      badge: opt.badge,
    }));

    return (
      <SettingsLayout
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
        tabs={calendarTabs}
      >
        <div style={{ padding: "16px 20px" }}>
          {content}
        </div>
      </SettingsLayout>
    );
  }

  // Specialized Inventory Subpages (3 Horizontal Tabs per Part B)
  if (categoryId === "inventory") {
    const inventoryTabs = category.options.map((opt) => ({
      id: opt.id,
      label: opt.name,
      badge: opt.badge,
    }));

    return (
      <SettingsLayout
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
        tabs={inventoryTabs}
      >
        <InventorySettingsPage activeOptionId={activeOptionId} />
      </SettingsLayout>
    );
  }

  // Specialized Manage Injections Subpage (Part D & E)
  if (categoryId === "injections" && activeOptionId === "manage-injections") {
    const injectionTabs = category.options.map((opt) => ({
      id: opt.id,
      label: opt.name,
      badge: opt.badge,
    }));

    return (
      <SettingsLayout
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
        tabs={injectionTabs}
      >
        <ManageInjectionsPage />
      </SettingsLayout>
    );
  }

  // Other Categories: Render Dedicated Individual Subpage
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
