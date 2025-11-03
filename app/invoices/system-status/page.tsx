"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";

type SystemLog = {
  id: string;
  invoice_id: string | null;
  log_type: string;
  message: string;
  log_metadata: Record<string, any> | null;
  created_at: string;
};

type SapLog = {
  id: string;
  invoice_id: string;
  request_payload: Record<string, any>;
  response_payload: Record<string, any> | null;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
};

export default function SystemStatusPage() {
  const router = useRouter();
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [sapLogs, setSapLogs] = useState<SapLog[]>([]);
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

      const systemChannel = supabase
        .channel("system-logs-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "system_logs",
          },
          (payload) => {
            setSystemLogs((prev) => [payload.new as SystemLog, ...prev].slice(0, 100));
          }
        )
        .subscribe();

      const sapChannel = supabase
        .channel("sap-logs-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sap_logs",
          },
          (payload) => {
            setSapLogs((prev) => [payload.new as SapLog, ...prev].slice(0, 100));
          }
        )
        .subscribe();

      const fetchLogs = async () => {
        const [systemResult, sapResult] = await Promise.all([
          supabase
            .from("system_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("sap_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        if (systemResult.data) {
          setSystemLogs(systemResult.data);
        }
        if (sapResult.data) {
          setSapLogs(sapResult.data);
        }
        setLoading(false);
      };

      fetchLogs();

      return () => {
        supabase.removeChannel(systemChannel);
        supabase.removeChannel(sapChannel);
      };
    });
  }, [router]);

  const getLogTypeIcon = (logType: string) => {
    switch (logType) {
      case "upload":
      case "extract":
      case "validate":
      case "integrate":
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (statusCode: number | null, error: string | null) => {
    if (error) {
      return (
        <Badge className="bg-red-500/10 text-red-500">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    if (statusCode && statusCode >= 200 && statusCode < 300) {
      return (
        <Badge className="bg-green-500/10 text-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">System Status</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system logs and SAP integration status in real-time
        </p>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList>
          <TabsTrigger value="system">System Logs</TabsTrigger>
          <TabsTrigger value="sap">SAP Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Activity Logs</CardTitle>
              <CardDescription>
                Real-time logs of invoice processing activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No system logs yet
                </p>
              ) : (
                <div className="space-y-4">
                  {systemLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="mt-1">{getLogTypeIcon(log.log_type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.log_type}</Badge>
                          {log.invoice_id && (
                            <span className="text-sm text-muted-foreground">
                              Invoice: {log.invoice_id.substring(0, 8)}...
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground ml-auto">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.log_metadata && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              View Metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.log_metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sap">
          <Card>
            <CardHeader>
              <CardTitle>SAP Integration Logs</CardTitle>
              <CardDescription>
                Track SAP integration requests and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sapLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No SAP integration logs yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Status Code</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sapLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {log.invoice_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status_code, log.error_message)}
                        </TableCell>
                        <TableCell>{log.status_code || "N/A"}</TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <details>
                            <summary className="text-xs cursor-pointer text-muted-foreground">
                              View Details
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div>
                                <p className="text-xs font-medium">Request:</p>
                                <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-32">
                                  {JSON.stringify(log.request_payload, null, 2)}
                                </pre>
                              </div>
                              {log.response_payload && (
                                <div>
                                  <p className="text-xs font-medium">Response:</p>
                                  <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-32">
                                    {JSON.stringify(log.response_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.error_message && (
                                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                                  <p className="text-xs text-red-500">
                                    Error: {log.error_message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

