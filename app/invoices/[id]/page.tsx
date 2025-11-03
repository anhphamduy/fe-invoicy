"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  user_id: string;
  file_path: string;
  extracted_data: Record<string, any> | null;
  status: string;
  confidence_scores: Record<string, number> | null;
  validation_errors: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      const channel = supabase
        .channel(`invoice-${invoiceId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "invoices",
            filter: `id=eq.${invoiceId}`,
          },
          (payload) => {
            setInvoice(payload.new as Invoice);
            setEditedData(payload.new.extracted_data || {});
          }
        )
        .subscribe();

      const fetchInvoice = async () => {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (error) {
          console.error("Error fetching invoice:", error);
          router.push("/invoices");
        } else {
          setInvoice(data);
          setEditedData(data.extracted_data || {});
        }
        setLoading(false);
      };

      fetchInvoice();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [invoiceId, router]);

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ extracted_data: editedData })
        .eq("id", invoiceId);

      if (error) throw error;

      setInvoice({ ...invoice, extracted_data: editedData });
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "integrated":
        return "bg-green-500/10 text-green-500";
      case "validated":
        return "bg-blue-500/10 text-blue-500";
      case "flagged":
        return "bg-yellow-500/10 text-yellow-500";
      case "processing":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Invoice Details</h1>
            <p className="text-muted-foreground mt-1">
              Review and edit extracted data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extracted Data</CardTitle>
          <CardDescription>
            Edit the fields below to correct any extraction errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(editedData).length === 0 ? (
            <p className="text-muted-foreground">No data extracted yet</p>
          ) : (
            Object.entries(editedData).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium capitalize">
                  {key.replace(/_/g, " ")}
                  {invoice.confidence_scores?.[key] && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Confidence: {Math.round((invoice.confidence_scores[key] || 0) * 100)}%)
                    </span>
                  )}
                </label>
                <Input
                  value={value || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, [key]: e.target.value })
                  }
                  placeholder={`Enter ${key.replace(/_/g, " ")}`}
                />
                {invoice.validation_errors?.[key] && (
                  <p className="text-sm text-red-500">
                    {invoice.validation_errors[key]}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {invoice.validation_errors && Object.keys(invoice.validation_errors).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(invoice.validation_errors).map(([key, error]) => (
                <div key={key} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

