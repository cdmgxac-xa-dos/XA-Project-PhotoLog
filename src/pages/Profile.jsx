import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../lib/useAuth.js";
import { notificationsSupported, getNotificationStatus, enableNotifications, disableNotifications } from "../lib/notifications.js";

const STATUS_LABEL = {
  unsupported: "Not available on this device/browser",
  denied: "Blocked — enable notifications for this site in your browser settings",
  subscribed: "On — you'll be notified when teammates add photos",
  unsubscribed: "Off",
};

export default function Profile({ project, projects, onSwitchProject }) {
  const { appUser, signOut } = useAuth();
  const [notifStatus, setNotifStatus] = useState("unsubscribed");
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState("");

  useEffect(() => {
    getNotificationStatus().then(setNotifStatus).catch(() => setNotifStatus("unsupported"));
  }, []);

  async function toggleNotifications() {
    setNotifBusy(true);
    setNotifError("");
    try {
      if (notifStatus === "subscribed") {
        await disableNotifications();
        setNotifStatus("unsubscribed");
      } else {
        await enableNotifications();
        setNotifStatus("subscribed");
      }
    } catch (err) {
      setNotifError(err.message);
      setNotifStatus(await getNotificationStatus());
    } finally {
      setNotifBusy(false);
    }
  }

  return (
    <AppShell project={project} title="Profile">
      <div className="space-y-4">
        <Card>
          <p className="font-display font-bold text-lg text-text-primary">
            {appUser?.employee?.full_name || appUser?.employee_code}
          </p>
          <p className="text-sm text-text-tertiary mt-0.5">{appUser?.roles?.role_name}</p>
          <p className="text-xs text-text-tertiary mt-2">{appUser?.employee_code} · {appUser?.login_email}</p>
        </Card>

        <Card title="Current Project">
          <p className="text-sm text-text-primary">{project?.description || project?.project_code}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{project?.project_code} {project?.site_location && `· ${project.site_location}`}</p>
          {projects.length > 1 && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onSwitchProject}>
              Switch Project
            </Button>
          )}
        </Card>

        <Card title="Notifications">
          <p className="text-xs text-text-tertiary mb-3">{STATUS_LABEL[notifStatus]}</p>
          {notifError && <p className="text-xs text-status-red mb-3">{notifError}</p>}
          {notificationsSupported() && notifStatus !== "denied" && (
            <Button
              variant={notifStatus === "subscribed" ? "secondary" : "primary"}
              size="sm"
              onClick={toggleNotifications}
              disabled={notifBusy}
            >
              {notifBusy ? "Please wait..." : notifStatus === "subscribed" ? "Turn Off Notifications" : "Enable Notifications"}
            </Button>
          )}
        </Card>

        <Button variant="danger" className="w-full" onClick={signOut}>Sign Out</Button>
      </div>
    </AppShell>
  );
}
