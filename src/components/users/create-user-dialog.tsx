"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loading";
import { createUser } from "@/lib/actions/users";
import type { UserRole } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/constants";

const ROLE_OPTIONS = [
  { value: "sales_agent", label: "Sales Agent" },
  { value: "processor", label: "Processor" },
  { value: "super_admin", label: "Super Admin" },
];

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "sales_agent" as UserRole,
    allowedModules: [] as string[],
  });

  const allModuleOptions = Array.from(
    new Map(
      Object.values(NAV_ITEMS)
        .flat()
        .map((item) => [item.href, { value: item.href, label: item.label }])
    ).values()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        allowedModules: form.allowedModules,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Create New User</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-0"
      >
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
        <Input
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
          placeholder="Min 6 characters"
        />
        <Select
          id="role"
          label="Role"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
          required
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Module Access</p>
          <p className="text-xs text-muted-foreground">
            Choose which sidebar modules this user can see. Leave empty for full access based on role.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allModuleOptions.map((mod) => {
              const checked = form.allowedModules.includes(mod.value);
              return (
                <label
                  key={mod.value}
                  className="flex items-center gap-2 rounded-[4px] border border-border/60 bg-muted/40 px-2 py-1.5 text-xs cursor-pointer"
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
