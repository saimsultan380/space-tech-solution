"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/loading";
import { CURRENCIES } from "@/lib/constants";
import type { AppUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePreferences, changePassword } from "@/lib/actions/profile";
import {
  User,
  Image as ImageIcon,
  Globe2,
  Lock,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";

interface SettingsClientProps {
  user: AppUser;
}

export function SettingsClient({ user }: SettingsClientProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and security.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
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
      </Tabs>
    </div>
  );
}

