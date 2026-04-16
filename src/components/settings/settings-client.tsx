"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/loading";
import { CURRENCIES, getSidebarModuleOptionsForRole, ROLE_LABELS } from "@/lib/constants";
import type { AppUser } from "@/lib/types";
import { formatCnic } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePreferences, changePassword } from "@/lib/actions/profile";
import { updateUserAllowedModules } from "@/lib/actions/users";
import { updateAttendanceSettings } from "@/lib/actions/attendance-settings";
import { updateCompanySettings, updateThemeColors, type CompanySettings } from "@/lib/actions/company-settings";
import {
  User,
  Image as ImageIcon,
  Globe2,
  Lock,
  PanelLeft,
  Clock3,
  UploadCloud,
  CheckCircle2,
  Palette,
  RotateCcw,
} from "lucide-react";

interface SettingsClientProps {
  user: AppUser;
  attendanceSettings: {
    shift_start_time: string;
    late_after_time: string;
    shift_end_time: string;
    checkout_latest_time: string;
    shift_start_12h: string;
    late_after_12h: string;
    shift_end_12h: string;
    checkout_latest_12h: string;
    checkout_grace_minutes: number;
    allow_early_checkout: boolean;
    early_checkout_minutes: number;
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
  const [department, setDepartment] = useState(user.department ?? "");
  const [companyNameProfile, setCompanyNameProfile] = useState(user.company_name ?? "");
  const [educationDegree, setEducationDegree] = useState(user.education_degree ?? "");
  const [joiningDate, setJoiningDate] = useState(user.joining_date ?? "");
  const [employmentType, setEmploymentType] = useState<string>(user.employment_type ?? "full_time");
  const [fatherName, setFatherName] = useState(user.father_name ?? "");
  const [cnic, setCnic] = useState(formatCnic(user.cnic ?? ""));
  const [address, setAddress] = useState(user.address ?? "");
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
  const toTimeInputValue = (time24: string) => (time24 || "09:00:00").slice(0, 5);
  const [attendanceForm, setAttendanceForm] = useState({
    shift_start_time: toTimeInputValue(attendanceSettings.shift_start_time),
    late_after_time: toTimeInputValue(attendanceSettings.late_after_time),
    shift_end_time: toTimeInputValue(attendanceSettings.shift_end_time),
    checkout_latest_time: toTimeInputValue(attendanceSettings.checkout_latest_time),
    checkout_grace_minutes: attendanceSettings.checkout_grace_minutes ?? 0,
    allow_early_checkout: attendanceSettings.allow_early_checkout ?? false,
    early_checkout_minutes: attendanceSettings.early_checkout_minutes ?? 0,
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

  const [themeForm, setThemeForm] = useState({
    sidebar_color: companySettings.sidebar_color ?? "",
    sidebar_text_color: companySettings.sidebar_text_color ?? "",
    button_color: companySettings.button_color ?? "",
    button_text_color: companySettings.button_text_color ?? "",
    active_tab_color: companySettings.active_tab_color ?? "",
    active_tab_text_color: companySettings.active_tab_text_color ?? "",
  });
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    setManagedUsersState(manageableUsers);
  }, [manageableUsers]);

  useEffect(() => {
    setAttendanceForm({
      shift_start_time: toTimeInputValue(attendanceSettings.shift_start_time),
      late_after_time: toTimeInputValue(attendanceSettings.late_after_time),
      shift_end_time: toTimeInputValue(attendanceSettings.shift_end_time),
      checkout_latest_time: toTimeInputValue(attendanceSettings.checkout_latest_time),
      checkout_grace_minutes: attendanceSettings.checkout_grace_minutes ?? 0,
      allow_early_checkout: attendanceSettings.allow_early_checkout ?? false,
      early_checkout_minutes: attendanceSettings.early_checkout_minutes ?? 0,
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
    setThemeForm({
      sidebar_color: companySettings.sidebar_color ?? "",
      sidebar_text_color: companySettings.sidebar_text_color ?? "",
      button_color: companySettings.button_color ?? "",
      button_text_color: companySettings.button_text_color ?? "",
      active_tab_color: companySettings.active_tab_color ?? "",
      active_tab_text_color: companySettings.active_tab_text_color ?? "",
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
    return getSidebarModuleOptionsForRole(selectedManagedUser.role);
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
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl,
        department: department || null,
        company_name: companyNameProfile || null,
        education_degree: educationDegree || null,
        joining_date: joiningDate || null,
        employment_type: employmentType || null,
        father_name: fatherName || null,
        cnic: cnic || null,
        address: address || null,
      });
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

  const handleSaveThemeColors = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeLoading(true);
    setThemeMessage(null);
    setThemeError(null);
    try {
      await updateThemeColors({
        sidebar_color: themeForm.sidebar_color || null,
        sidebar_text_color: themeForm.sidebar_text_color || null,
        button_color: themeForm.button_color || null,
        button_text_color: themeForm.button_text_color || null,
        active_tab_color: themeForm.active_tab_color || null,
        active_tab_text_color: themeForm.active_tab_text_color || null,
      });
      setThemeMessage("Theme colors updated. Reload the page to see changes across the app.");
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : "Failed to update theme colors.");
    } finally {
      setThemeLoading(false);
    }
  };

  const resetThemeSection = (section: "sidebar" | "button" | "tab") => {
    setThemeForm((prev) => {
      if (section === "sidebar") return { ...prev, sidebar_color: "", sidebar_text_color: "" };
      if (section === "button") return { ...prev, button_color: "", button_text_color: "" };
      return { ...prev, active_tab_color: "", active_tab_text_color: "" };
    });
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
            <TabsTrigger value="appearance">
              <Palette className="mr-1.5 h-4 w-4" />
              Appearance
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="full_name"
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input id="email" label="Email" value={user.email} disabled />
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-4">Additional Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="department"
                      label="Department"
                      placeholder="e.g., Sales, Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                    <Input
                      id="company_name_profile"
                      label="Company"
                      placeholder="e.g., Space Tech Solution"
                      value={companyNameProfile}
                      onChange={(e) => setCompanyNameProfile(e.target.value)}
                    />
                    <Input
                      id="education_degree"
                      label="Education"
                      placeholder="e.g., Bachelor's in Computer Science"
                      value={educationDegree}
                      onChange={(e) => setEducationDegree(e.target.value)}
                    />
                    <Input
                      id="joining_date"
                      label="Date of Joining"
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                    />
                    <Select
                      label="Employment Type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      options={[
                        { value: "full_time", label: "Full Time" },
                        { value: "part_time", label: "Part Time" },
                        { value: "contract", label: "Contract" },
                        { value: "intern", label: "Intern" },
                      ]}
                    />
                    <Input
                      id="father_name"
                      label="Father Name"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                    />
                    <Input
                      id="cnic_profile"
                      label="CNIC"
                      placeholder="XXXXX-XXXXXXX-X"
                      value={cnic}
                      maxLength={15}
                      onChange={(e) => setCnic(formatCnic(e.target.value))}
                    />
                    <Input
                      id="address_profile"
                      label="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

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
          <TabsContent value="appearance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveThemeColors} className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Customize the colors used for sidebar active items, primary buttons, and active tabs across the app. Leave blank to use defaults.
                  </p>

                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Sidebar Active Item</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground"
                        onClick={() => resetThemeSection("sidebar")}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ColorPickerField
                        id="sidebar_color"
                        label="Background"
                        value={themeForm.sidebar_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, sidebar_color: v }))}
                      />
                      <ColorPickerField
                        id="sidebar_text_color"
                        label="Text"
                        value={themeForm.sidebar_text_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, sidebar_text_color: v }))}
                      />
                    </div>
                    {(themeForm.sidebar_color || themeForm.sidebar_text_color) && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <div
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
                          style={{
                            backgroundColor: themeForm.sidebar_color || "hsl(221.2, 83.2%, 53.3%)",
                            color: themeForm.sidebar_text_color || "#ffffff",
                          }}
                        >
                          Dashboard
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Primary Buttons</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground"
                        onClick={() => resetThemeSection("button")}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ColorPickerField
                        id="button_color"
                        label="Background"
                        value={themeForm.button_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, button_color: v }))}
                      />
                      <ColorPickerField
                        id="button_text_color"
                        label="Text"
                        value={themeForm.button_text_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, button_text_color: v }))}
                      />
                    </div>
                    {(themeForm.button_color || themeForm.button_text_color) && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm"
                          style={{
                            backgroundColor: themeForm.button_color || "hsl(221.2, 83.2%, 53.3%)",
                            color: themeForm.button_text_color || "#ffffff",
                          }}
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Active Tabs</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground"
                        onClick={() => resetThemeSection("tab")}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ColorPickerField
                        id="active_tab_color"
                        label="Background"
                        value={themeForm.active_tab_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, active_tab_color: v }))}
                      />
                      <ColorPickerField
                        id="active_tab_text_color"
                        label="Text"
                        value={themeForm.active_tab_text_color}
                        onChange={(v) => setThemeForm((p) => ({ ...p, active_tab_text_color: v }))}
                      />
                    </div>
                    {(themeForm.active_tab_color || themeForm.active_tab_text_color) && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <div
                          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
                          style={{
                            backgroundColor: themeForm.active_tab_color || "hsl(221.2, 83.2%, 53.3%)",
                            color: themeForm.active_tab_text_color || "#ffffff",
                          }}
                        >
                          Active Tab
                        </div>
                      </div>
                    )}
                  </div>

                  {themeError && <p className="text-sm text-destructive">{themeError}</p>}
                  {themeMessage && !themeError && (
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {themeMessage}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={themeLoading}>
                      {themeLoading ? <Spinner /> : "Save Theme Colors"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setThemeForm({
                          sidebar_color: "",
                          sidebar_text_color: "",
                          button_color: "",
                          button_text_color: "",
                          active_tab_color: "",
                          active_tab_text_color: "",
                        });
                      }}
                    >
                      Reset All to Defaults
                    </Button>
                  </div>
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
                      id="shift_start_time"
                      label="Shift Start"
                      type="time"
                      value={attendanceForm.shift_start_time}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, shift_start_time: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="late_after_time"
                      label="Late After"
                      type="time"
                      value={attendanceForm.late_after_time}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, late_after_time: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="shift_end_time"
                      label="Shift End"
                      type="time"
                      value={attendanceForm.shift_end_time}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, shift_end_time: e.target.value }))
                      }
                      required
                    />
                    <Input
                      id="checkout_latest_time"
                      label="Latest Checkout"
                      type="time"
                      value={attendanceForm.checkout_latest_time}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, checkout_latest_time: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="checkout_grace_minutes"
                      label="Late Checkout Grace (minutes after shift end)"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={String(attendanceForm.checkout_grace_minutes)}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          checkout_grace_minutes: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <div className="flex items-center gap-3 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary"
                          checked={attendanceForm.allow_early_checkout}
                          onChange={(e) =>
                            setAttendanceForm((prev) => ({
                              ...prev,
                              allow_early_checkout: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm">Allow Early Checkout</span>
                      </label>
                    </div>
                    <Input
                      id="early_checkout_minutes"
                      label="Early Checkout Allowed (minutes before shift end)"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={String(attendanceForm.early_checkout_minutes)}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          early_checkout_minutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      disabled={!attendanceForm.allow_early_checkout}
                    />
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

function ColorPickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          id={id}
          value={value || "#3b82f6"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
        />
        <input
          type="text"
          placeholder="#3b82f6"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="h-10 flex-1 rounded-md border border-border bg-transparent px-3 text-sm font-mono"
        />
        {value && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

