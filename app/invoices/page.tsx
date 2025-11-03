"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, FileText } from "lucide-react";
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

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
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
        .channel("invoices-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "invoices",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setInvoices((prev) => [payload.new as Invoice, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setInvoices((prev) =>
                prev.map((inv) =>
                  inv.id === payload.new.id ? (payload.new as Invoice) : inv
                )
              );
            } else if (payload.eventType === "DELETE") {
              setInvoices((prev) =>
                prev.filter((inv) => inv.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      const fetchInvoices = async () => {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching invoices:", error);
        } else {
          setInvoices(data || []);
        }
        setLoading(false);
      };

      fetchInvoices();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [router]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your invoices in real-time
          </p>
        </div>
        <Link href="/invoices/upload">
          <Button>Upload Invoices</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            {invoices.length} invoice(s) total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No invoices yet</p>
              <Link href="/invoices/upload">
                <Button>Upload Your First Invoice</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.extracted_data?.invoice_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      {invoice.extracted_data?.vendor || "N/A"}
                    </TableCell>
                    <TableCell>
                      {invoice.extracted_data?.total_amount
                        ? `${invoice.extracted_data.currency || ""} ${invoice.extracted_data.total_amount}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {invoice.extracted_data?.invoice_date || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

