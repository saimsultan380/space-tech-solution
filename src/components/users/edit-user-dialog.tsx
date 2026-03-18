"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { updateUser } from "@/lib/actions/users";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { Pencil } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "sales_agent", label: "Sales Agent" },
  { value: "processor", label: "Processor" },
  { value: "super_admin", label: "Super Admin" },
];

interface EditUserDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    employee_id: string;
    role: string;
    allowed_modules?: string[] | null;
  };
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: user.email,
    full_name: user.full_name,
    role: user.role as UserRole,
    allowedModules: user.allowed_modules ?? [],
  });

  const roleModules = useMemo(
    () =>
      (NAV_ITEMS[form.role] || []).map((item) => ({
        value: item.href,
        label: item.label,
      })),
    [form.role]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await updateUser(user.id, {
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        allowedModules: form.allowedModules,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }

    setLoading(false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Edit user">
        <Pencil className="h-3.5 w-3.5 text-[#3B6EF8]" />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader className="items-start text-left pr-8">
          <DialogTitle className="text-left">Edit User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-0"
        >
          <Input
            id="employee_id"
            label="Employee ID"
            value={user.employee_id}
            disabled
            className="bg-muted/50 font-mono"
          />
          <Input
            id="full_name"
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
          />
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Select
            id="role"
            label="Role"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as UserRole,
                allowedModules: [],
              }))
            }
            required
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Module Access</p>
            <p className="text-xs text-muted-foreground">
              Select modules for this user. Leave empty for full role access.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roleModules.map((mod) => {
                const checked = form.allowedModules.includes(mod.value);
                return (
                  <label
                    key={mod.value}
                    className="flex cursor-pointer items-center gap-2 rounded-[4px] border border-border/60 bg-muted/40 px-2 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                      checked={checked}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          allowedModules: e.target.checked
                            ? [...f.allowedModules, mod.value]
                            : f.allowedModules.filter((v) => v !== mod.value),
                        }))
                      }
                    />
                    <span>{mod.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
