import { requireAuth } from "@/lib/auth";
import { globalSearch } from "@/lib/actions/search";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface SearchPageProps {
  searchParams?: { q?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await requireAuth();
  const query = (searchParams?.q || "").trim();
  const currency = user.preferred_currency ?? "USD";

  let results: Awaited<ReturnType<typeof globalSearch>> | null = null;
  if (query) {
    results = await globalSearch(query);
  }

  return <SearchResults query={query} results={results} currency={currency} />;
}

function SearchResults({
  query,
  results,
  currency,
}: {
  query: string;
  results: Awaited<ReturnType<typeof globalSearch>> | null;
  currency: string;
}) {
  if (!query) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground text-sm">
          Type a keyword in the search bar at the top (or press <kbd className="rounded border bg-muted px-1 text-[10px]">/</kbd>) to search
          across call logs responses, sales, payments, users, and chargebacks.
        </p>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const { customers, sales, payments, users, chargebacks } = results;

  const hasAny =
    customers.length || sales.length || payments.length || users.length || chargebacks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground text-sm">
          Showing results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
        </p>
      </div>

      {!hasAny && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No results found. Try a different keyword.
            </p>
          </CardContent>
        </Card>
      )}

      {customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Call Logs Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/call-logs-responses/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.email} · {c.phone}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.created_at)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sales.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/sales/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.company_name}</span>
                    <Badge variant="secondary" className="capitalize">
                      {s.sale_type} / {s.subtype}
                    </Badge>
                    <Badge
                      variant={s.status === "approved" ? "success" : s.status === "pending" ? "warning" : "destructive"}
                      className="capitalize"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(s.customer as { name?: string } | null)?.name || "Unknown customer"}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">
                    {formatCurrency(s.charged_amount, currency || "USD")}
                  </div>
                  <div>{formatDate(s.created_at)}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {(p.customer as { name?: string } | null)?.name || "Unknown customer"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(p.sale as { company_name?: string } | null)?.company_name || "No sale linked"}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">
                    {formatCurrency(p.amount, currency || "USD")}
                  </div>
                  <div>{formatDate(p.created_at)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{u.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.email} · {u.role}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(u.created_at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {chargebacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Chargebacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chargebacks.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {(c.sale as { company_name?: string } | null)?.company_name || "Unknown sale"}
                    </span>
                    <Badge
                      variant={
                        c.status === "open"
                          ? "warning"
                          : c.status === "resolved"
                          ? "success"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {c.reason}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.date)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
