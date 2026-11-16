import React from "react";
import { MessageSignaturePage } from "./MessageSignaturePage";
import { VacationReplyPage } from "./VacationReplyPage";
import { MessagePreferencesPage } from "./MessagePreferencesPage";

interface MessageSettingsPageProps {
  activeOptionId: string;
}

export function MessageSettingsPage({ activeOptionId }: MessageSettingsPageProps) {
  if (activeOptionId === "message-signature") {
    return <MessageSignaturePage />;
  }
  if (activeOptionId === "vacation-reply") {
    return <VacationReplyPage />;
  }
  if (activeOptionId === "message-preferences") {
    return <MessagePreferencesPage />;
  }
  return <MessageSignaturePage />;
}

