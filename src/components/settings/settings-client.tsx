"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/loading";
import { CURRENCIES, NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import type { AppUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePreferences, changePassword } from "@/lib/actions/profile";
import { updateUserAllowedModules } from "@/lib/actions/users";
import { updateAttendanceSettings } from "@/lib/actions/attendance-settings";
import { updateCompanySettings, type CompanySettings } from "@/lib/actions/company-settings";
import {
  User,
  Image as ImageIcon,
  Globe2,
  Lock,
  PanelLeft,
  Clock3,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";

interface SettingsClientProps {
  user: AppUser;
  attendanceSettings: {
    shift_start_12h: string;
    late_after_12h: string;
    shift_end_12h: string;
    checkout_latest_12h: string;
    notify_after_minutes: number;
    auto_leave_after_minutes: number;
    auto_leave_enabled: boolean;
    auto_leave_type: string;
  };
  manageableUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: "super_admin" | "sales_agent" | "processor";
    allowed_modules: string[] | null;
  }>;
  companySettings: CompanySettings;
}

export function SettingsClient({ user, manageableUsers, attendanceSettings, companySettings }: SettingsClientProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currency, setCurrency] = useState(user.preferred_currency || "PKR");
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [managedUsersState, setManagedUsersState] = useState(manageableUsers);
  const [selectedManagedUserId, setSelectedManagedUserId] = useState(
    manageableUsers[0]?.id ?? ""
  );
  const [moduleDraft, setModuleDraft] = useState<string[]>([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleMessage, setModuleMessage] = useState<string | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    shift_start_12h: attendanceSettings.shift_start_12h,
    late_after_12h: attendanceSettings.late_after_12h,
    shift_end_12h: attendanceSettings.shift_end_12h,
    checkout_latest_12h: attendanceSettings.checkout_latest_12h,
    notify_after_minutes: attendanceSettings.notify_after_minutes,
    auto_leave_after_minutes: attendanceSettings.auto_leave_after_minutes,
    auto_leave_enabled: attendanceSettings.auto_leave_enabled,
    auto_leave_type: attendanceSettings.auto_leave_type,
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [brandingForm, setBrandingForm] = useState({
    company_name: companySettings.company_name,
    address_line: companySettings.address_line,
    contact_email: companySettings.contact_email,
    logo_url: companySettings.logo_url,
  });
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState<string | null>(null);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  useEffect(() => {
    setManagedUsersState(manageableUsers);
  }, [manageableUsers]);

  useEffect(() => {
    setAttendanceForm({
      shift_start_12h: attendanceSettings.shift_start_12h,
      late_after_12h: attendanceSettings.late_after_12h,
      shift_end_12h: attendanceSettings.shift_end_12h,
      checkout_latest_12h: attendanceSettings.checkout_latest_12h,
      notify_after_minutes: attendanceSettings.notify_after_minutes,
      auto_leave_after_minutes: attendanceSettings.auto_leave_after_minutes,
      auto_leave_enabled: attendanceSettings.auto_leave_enabled,
      auto_leave_type: attendanceSettings.auto_leave_type,
    });
  }, [attendanceSettings]);

  useEffect(() => {
    setBrandingForm({
      company_name: companySettings.company_name,
      address_line: companySettings.address_line,
      contact_email: companySettings.contact_email,
      logo_url: companySettings.logo_url,
    });
  }, [companySettings]);

  useEffect(() => {
    if (user.role !== "super_admin") return;
    if (managedUsersState.length === 0) {
      setSelectedManagedUserId("");
      return;
    }
    const exists = managedUsersState.some((entry) => entry.id === selectedManagedUserId);
    if (!exists) {
      setSelectedManagedUserId(managedUsersState[0].id);
    }
  }, [managedUsersState, selectedManagedUserId, user.role]);

  const selectedManagedUser = useMemo(
    () => managedUsersState.find((entry) => entry.id === selectedManagedUserId) ?? null,
    [managedUsersState, selectedManagedUserId]
  );

  const selectedRoleModules = useMemo(() => {
    if (!selectedManagedUser) return [];
    return NAV_ITEMS[selectedManagedUser.role].map((item) => ({
      value: item.href,
      label: item.label,
    }));
  }, [selectedManagedUser]);

  useEffect(() => {
    if (!selectedManagedUser) {
      setModuleDraft([]);
      return;
    }
    setModuleDraft(selectedManagedUser.allowed_modules ?? []);
    setModuleMessage(null);
    setModuleError(null);
  }, [selectedManagedUserId, selectedManagedUser]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setProfileLoading(true);
    setProfileMessage(null);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      setProfileLoading(false);
      setProfileMessage("Failed to upload image. Please ensure 'avatars' bucket exists.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    try {
      await updateProfile({ full_name: fullName, avatar_url: publicUrl });
      setAvatarUrl(publicUrl);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : "Failed to save profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      await updateProfile({ full_name: fullName, avatar_url: avatarUrl });
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : "Failed to save profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePrefsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsLoading(true);
    setPrefsMessage(null);
    try {
      await updatePreferences({ preferred_currency: currency });
      setPrefsMessage("Preferences saved.");
    } catch (err) {
      setPrefsMessage(
        err instanceof Error ? err.message : "Failed to save preferences."
      );
    } finally {
      setPrefsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await changePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveModuleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagedUser) return;
    setModuleLoading(true);
    setModuleMessage(null);
    setModuleError(null);
    try {
      await updateUserAllowedModules(selectedManagedUser.id, moduleDraft);
      setManagedUsersState((prev) =>
        prev.map((entry) =>
          entry.id === selectedManagedUser.id
            ? { ...entry, allowed_modules: moduleDraft.length > 0 ? moduleDraft : null }
            : entry
        )
      );
      setModuleMessage("Sidebar visibility updated successfully.");
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : "Failed to update sidebar visibility.");
    } finally {
      setModuleLoading(false);
    }
  };

  const handleSaveAttendanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceLoading(true);
    setAttendanceMessage(null);
    setAttendanceError(null);
    try {
      await updateAttendanceSettings(attendanceForm);
      setAttendanceMessage("Attendance timings updated successfully.");
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Failed to update attendance timings.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCompanyLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBrandingLoading(true);
    setBrandingMessage(null);
    setBrandingError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const filePath = `company/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        throw new Error("Failed to upload image. Please ensure 'avatars' bucket exists.");
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setBrandingForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
      setBrandingMessage("Logo uploaded. Click Save to apply.");
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingLoading(true);
    setBrandingMessage(null);
    setBrandingError(null);
    try {
      await updateCompanySettings({
        company_name: brandingForm.company_name,
        address_line: brandingForm.address_line,
        contact_email: brandingForm.contact_email,
        logo_url: brandingForm.logo_url,
      });
      setBrandingMessage("Branding settings updated successfully.");
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : "Failed to update branding settings.");
    } finally {
      setBrandingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and security.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Globe2 className="mr-1.5 h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-1.5 h-4 w-4" />
            Security
          </TabsTrigger>
          {user.role === "super_admin" && (
            <TabsTrigger value="attendance">
              <Clock3 className="mr-1.5 h-4 w-4" />
              Attendance Timing
            </TabsTrigger>
          )}
          {user.role === "super_admin" && (
            <TabsTrigger value="branding">
              <ImageIcon className="mr-1.5 h-4 w-4" />
              Branding
            </TabsTrigger>
          )}
          {user.role === "super_admin" && (
            <TabsTrigger value="sidebar">
              <PanelLeft className="mr-1.5 h-4 w-4" />
              Sidebar Access
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        document.getElementById("avatar-upload")?.click()
                      }
                    >
                      <UploadCloud className="h-4 w-4" />
                      Upload Image
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: square image, max 2MB.
                    </p>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>

                <Input
                  id="full_name"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input id="email" label="Email" value={user.email} disabled />

                {profileMessage && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {profileMessage}
                  </p>
                )}

                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? <Spinner /> : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePrefsSave} className="space-y-4">
                <Select
                  label="Default Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={CURRENCIES}
                />
                {prefsMessage && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {prefsMessage}
                  </p>
                )}
                <Button type="submit" disabled={prefsLoading}>
                  {prefsLoading ? <Spinner /> : "Save Preferences"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  id="new_password"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  id="confirm_password"
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                {passwordMessage && !passwordError && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {passwordMessage}
                  </p>
                )}
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? <Spinner /> : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === "super_admin" && (
          <TabsContent value="branding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Payslip Branding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-md border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                      {brandingForm.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={brandingForm.logo_url}
                          alt="Company logo"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="inline-flex items-center gap-2"
                        onClick={() => document.getElementById("company-logo-upload")?.click()}
                        disabled={brandingLoading}
                      >
                        <UploadCloud className="h-4 w-4" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Recommended: transparent PNG, max 2MB.
                      </p>
                      <input
                        id="company-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCompanyLogoUpload}
                      />
                    </div>
                  </div>

                  <Input
                    id="company_name"
                    label="Company Name"
                    value={brandingForm.company_name}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, company_name: e.target.value }))
                    }
                    required
                  />
                  <Input
                    id="company_address_line"
                    label="Address Line"
                    value={brandingForm.address_line}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, address_line: e.target.value }))
                    }
                    required
                  />
                  <Input
                    id="company_contact_email"
                    label="Contact Email"
                    type="email"
                    value={brandingForm.contact_email}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, contact_email: e.target.value }))
                    }
                    required
                  />

                  {brandingError && <p className="text-sm text-destructive">{brandingError}</p>}
                  {brandingMessage && !brandingError && (
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {brandingMessage}
                    </p>
                  )}

                  <Button type="submit" disabled={brandingLoading}>
                    {brandingLoading ? <Spinner /> : "Save Branding"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user.role === "super_admin" && (
          <TabsContent value="attendance" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Attendance Timing Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAttendanceSettings} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="shift_start_12h"
                      label="Shift Start (AM/PM)"
                      placeholder="09:00 AM"
                      value={attendanceForm.shift_start_12h}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, shift_start_12h: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="late_after_12h"
                      label="Late After (AM/PM)"
                      placeholder="09:15 AM"
                      value={attendanceForm.late_after_12h}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, late_after_12h: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="shift_end_12h"
                      label="Shift End (AM/PM)"
                      placeholder="06:00 PM"
                      value={attendanceForm.shift_end_12h}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, shift_end_12h: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="checkout_latest_12h"
                      label="Latest Checkout (AM/PM)"
                      placeholder="11:00 PM"
                      value={attendanceForm.checkout_latest_12h}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, checkout_latest_12h: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold mb-3">Auto Attendance & Leave Settings</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure automatic notifications and leave creation for employees who miss check-in.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        id="notify_after_minutes"
                        label="Send Reminder After (minutes)"
                        type="number"
                        min="0"
                        placeholder="60"
                        value={String(attendanceForm.notify_after_minutes)}
                        onChange={(e) =>
                          setAttendanceForm((prev) => ({
                            ...prev,
                            notify_after_minutes: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <Input
                        id="auto_leave_after_minutes"
                        label="Auto-Create Leave After (minutes)"
                        type="number"
                        min="0"
                        placeholder="240"
                        value={String(attendanceForm.auto_leave_after_minutes)}
                        onChange={(e) =>
                          setAttendanceForm((prev) => ({
                            ...prev,
                            auto_leave_after_minutes: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <Select
                        label="Auto Leave Type"
                        value={attendanceForm.auto_leave_type}
                        onChange={(e) =>
                          setAttendanceForm((prev) => ({ ...prev, auto_leave_type: e.target.value }))
                        }
                        options={[
                          { value: "casual", label: "Casual Leave" },
                          { value: "sick", label: "Sick Leave" },
                          { value: "annual", label: "Annual Leave" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                      <div className="flex items-center gap-3 pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-primary"
                            checked={attendanceForm.auto_leave_enabled}
                            onChange={(e) =>
                              setAttendanceForm((prev) => ({
                                ...prev,
                                auto_leave_enabled: e.target.checked,
                              }))
                            }
                          />
                          <span className="text-sm">Enable Auto Leave Creation</span>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Times are calculated from the "Late After" time. E.g., if Late After is 9:15 AM and 
                      Reminder is 60 min, notification is sent at 10:15 AM.
                    </p>
                  </div>

                  {attendanceError && <p className="text-sm text-destructive">{attendanceError}</p>}
                  {attendanceMessage && !attendanceError && (
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {attendanceMessage}
                    </p>
                  )}

                  <Button type="submit" disabled={attendanceLoading}>
                    {attendanceLoading ? <Spinner /> : "Save Attendance Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user.role === "super_admin" && (
          <TabsContent value="sidebar" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PanelLeft className="h-4 w-4" />
                  Sidebar Visibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveModuleAccess} className="space-y-4">
                  <Select
                    label="Employee"
                    value={selectedManagedUserId}
                    options={managedUsersState.map((entry) => ({
                      value: entry.id,
                      label: `${entry.full_name} (${ROLE_LABELS[entry.role] || entry.role})`,
                    }))}
                    onChange={(e) => setSelectedManagedUserId(e.target.value)}
                  />
                  {selectedManagedUser && (
                    <p className="text-xs text-muted-foreground">
                      {selectedManagedUser.email}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModuleDraft(selectedRoleModules.map((item) => item.value))}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModuleDraft([])}
                    >
                      Use Role Defaults
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedRoleModules.map((mod) => {
                      const checked = moduleDraft.includes(mod.value);
                      return (
                        <label
                          key={mod.value}
                          className="flex items-center gap-2 rounded-[6px] border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-primary"
                            checked={checked}
                            onChange={(e) =>
                              setModuleDraft((prev) =>
                                e.target.checked
                                  ? [...prev, mod.value]
                                  : prev.filter((value) => value !== mod.value)
                              )
                            }
                          />
                          <span>{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {moduleDraft.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Role defaults are active. All sidebar items for this role remain visible.
                    </p>
                  )}

                  {moduleError && <p className="text-sm text-destructive">{moduleError}</p>}
                  {moduleMessage && !moduleError && (
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {moduleMessage}
                    </p>
                  )}

                  <Button type="submit" disabled={moduleLoading || !selectedManagedUser}>
                    {moduleLoading ? <Spinner /> : "Save Sidebar Visibility"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

