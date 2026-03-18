"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { updateUser } from "@/lib/actions/users";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <DialogHeader className="items-start text-left border-b border-border/50 pb-4">
          <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-5 py-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar hover:scrollbar-thin">
            <Input
              id="employee_id"
              label="Employee ID"
              value={user.employee_id}
              disabled
              className="bg-muted/50 font-bold text-primary"
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

            <div className="space-y-3 pt-2 text-left">
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground text-left">Module Access</p>
                <p className="text-xs text-muted-foreground mt-1 text-left">
                  Select specific modules for this user. Leave empty for default role access.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {roleModules.map((mod) => {
                  const checked = form.allowedModules.includes(mod.value);
                  return (
                    <label
                      key={mod.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all hover:bg-muted/50",
                        checked ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
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
                      <span className="font-medium">{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 pt-6 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {loading ? <Spinner /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
