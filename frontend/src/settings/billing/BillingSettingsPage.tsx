import React from "react";
import { ProcedureCodesTab } from "./ProcedureCodesTab";
import { FeeSchedulesTab } from "./FeeSchedulesTab";
import { BillingSettingsTab } from "./BillingSettingsTab";
import { PatientBillingSettingsTab } from "./PatientBillingSettingsTab";
import { ProcedureCodeForLabTestsTab } from "./ProcedureCodeForLabTestsTab";
import { BillingPackagesTab } from "./BillingPackagesTab";
import { InvoiceTemplatesTab } from "./InvoiceTemplatesTab";
import { ReceiptTemplatesTab } from "./ReceiptTemplatesTab";
import { RazorpayTab } from "./RazorpayTab";

interface BillingSettingsPageProps {
  activeOptionId: string;
  onTabChange?: (tabId: string) => void;
}

export function BillingSettingsPage({ activeOptionId, onTabChange }: BillingSettingsPageProps) {
  switch (activeOptionId) {
    case "procedure-codes":
      return <ProcedureCodesTab />;

    case "fee-schedules":
      return <FeeSchedulesTab />;

    case "billing-settings":
      return <BillingSettingsTab />;

    case "patient-billing-settings":
      return <PatientBillingSettingsTab />;

    case "procedure-code-for-lab-tests":
      return <ProcedureCodeForLabTestsTab />;

    case "billing-packages":
      return <BillingPackagesTab />;

    case "invoice-templates":
      return <InvoiceTemplatesTab />;

    case "receipt-templates":
      return <ReceiptTemplatesTab />;

    case "razorpay":
      return <RazorpayTab />;

    default:
      return <ProcedureCodesTab />;
  }
}

