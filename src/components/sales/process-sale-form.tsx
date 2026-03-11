"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/loading";
import { updateSaleStatus } from "@/lib/actions/sales";
import { CheckCircle, XCircle } from "lucide-react";
import type { SaleStatus } from "@/lib/types";

export function ProcessSaleForm({ saleId }: { saleId: string }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProcess = async (status: SaleStatus) => {
    setLoading(true);
    try {
      await updateSaleStatus(saleId, status, notes);
    } catch {
      // error handling
    }
    setLoading(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Process This Sale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          label="Processing Notes"
          placeholder="Add processing notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-3">
          <Button
            variant="success"
            onClick={() => handleProcess("approved")}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Spinner /> : <><CheckCircle className="h-4 w-4" /> Approve</>}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleProcess("rejected")}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Spinner /> : <><XCircle className="h-4 w-4" /> Reject</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
