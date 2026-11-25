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
import { FacilityTimingsPage } from "./calendar/FacilityTimingsPage";
import { WebEmbedPage } from "./calendar/WebEmbedPage";
import { InventorySettingsPage } from "./inventory/InventorySettingsPage";
import { ManageInjectionsPage } from "./injections/ManageInjectionsPage";
import { ManageSupplementsDrugsPage } from "./rx/ManageSupplementsDrugsPage";
import { ImmunizationSettingsPage } from "./immunization/ImmunizationSettingsPage";
import { MessageSettingsPage } from "./message/MessageSettingsPage";
import { TaskPreferencesPage } from "./task/TaskPreferencesPage";
import { BillingSettingsPage } from "./billing/BillingSettingsPage";
import { PatientRecallSettingsPage } from "./subpages/PatientRecallSettingsPage";
import { PhrSettingsPage } from "./phr/PhrSettingsPage";
import { SettingContentView } from "./SettingContentView";
import { SETTINGS_CATEGORIES, ALL_SETTING_OPTIONS } from "./settingsData";
import { TemplatesModule } from "../templates/TemplatesModule";
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
        currentCategoryId="facility"
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
      case "facility-timings":
        content = <FacilityTimingsPage />;
        break;
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

    return (
      <SettingsLayout
        currentCategoryId="calendar"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        {content}
      </SettingsLayout>
    );
  }

  // Specialized Inventory Subpages (3 Horizontal Tabs per Part B)
  if (categoryId === "inventory") {
    return (
      <SettingsLayout
        currentCategoryId="inventory"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <InventorySettingsPage activeOptionId={activeOptionId} />
      </SettingsLayout>
    );
  }

  // Specialized Manage Injections Subpage (Part D & E)
  if (categoryId === "injections" && activeOptionId === "manage-injections") {
    return (
      <SettingsLayout
        currentCategoryId="injections"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <ManageInjectionsPage />
      </SettingsLayout>
    );
  }

  // Dedicated Templates Module (Integrated Horizontal Templates)
  if (categoryId === "templates") {
    return (
      <SettingsLayout
        currentCategoryId="templates"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <TemplatesModule
          initialTab={activeOptionId}
          onNavigateTab={handleTabChange}
          onBackToDashboard={() => navigate("/settings")}
        />
      </SettingsLayout>
    );
  }

  // Specialized Rx Subpages (Manage Supplements and Drugs)
  if (categoryId === "rx") {
    return (
      <SettingsLayout
        currentCategoryId="rx"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        {activeOptionId === "manage-supplements-drugs" ? (
          <ManageSupplementsDrugsPage />
        ) : (
          <SettingContentView
            category={category}
            option={category.options.find((o) => o.id === activeOptionId) || category.options[0]}
            onSelectOption={(o) => navigate(`/settings/${categoryId}/${o.id}`)}
            onBack={() => navigate("/settings")}
          />
        )}
      </SettingsLayout>
    );
  }

  // Specialized Immunization Subpages (Vaccines, VIS, Vaccine Chart)
  if (categoryId === "immunization") {
    return (
      <SettingsLayout
        currentCategoryId="immunization"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <ImmunizationSettingsPage activeOptionId={activeOptionId} />
      </SettingsLayout>
    );
  }

  // Specialized Message Subpages (Signature, Vacation Reply, My Preferences)
  if (categoryId === "message") {
    return (
      <SettingsLayout
        currentCategoryId="message"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <MessageSettingsPage activeOptionId={activeOptionId} />
      </SettingsLayout>
    );
  }

  // Specialized Task Subpages (My Preferences)
  if (categoryId === "task") {
    return (
      <SettingsLayout
        currentCategoryId="task"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <TaskPreferencesPage />
      </SettingsLayout>
    );
  }

  // Specialized Billing Subpages (All 9 CharmHealth Tabs)
  if (categoryId === "billing") {
    return (
      <SettingsLayout
        currentCategoryId="billing"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <BillingSettingsPage
          activeOptionId={activeOptionId}
          onTabChange={handleTabChange}
        />
      </SettingsLayout>
    );
  }

  // Specialized Patient Recall Subpages (Recall Types | Recall Status | Recall Preferences)
  if (categoryId === "patient-recall") {
    return (
      <SettingsLayout
        currentCategoryId="patient-recall"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <PatientRecallSettingsPage activeOptionId={activeOptionId} />
      </SettingsLayout>
    );
  }

  // Specialized PHR Settings Subpages (Preferences, Share Clinical Data, Embed, Custom App, Useful Info)
  if (categoryId === "phr-settings") {
    return (
      <SettingsLayout
        currentCategoryId="phr-settings"
        activeTab={activeOptionId}
        onTabChange={handleTabChange}
      >
        <PhrSettingsPage
          activeOptionId={activeOptionId}
          onTabChange={handleTabChange}
        />
      </SettingsLayout>
    );
  }

  // Other Categories: Render Dedicated Individual Subpage
  const currentOption = category.options.find((o) => o.id === activeOptionId) || category.options[0];

  return (
    <SettingsLayout
      currentCategoryId={categoryId}
      activeTab={activeOptionId}
      onTabChange={handleTabChange}
    >
      <div className="charm-settings-inner-container">
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
