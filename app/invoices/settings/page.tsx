"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

type FieldConfig = {
  id: string;
  field_name: string;
  display_name: string;
  field_type: string;
  is_required: boolean;
  prompt_instruction: string | null;
  created_at: string;
  updated_at: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [newField, setNewField] = useState({
    field_name: "",
    display_name: "",
    field_type: "text",
    is_required: false,
    prompt_instruction: "",
  });

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      const channel = supabase
        .channel("field-config-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "field_configurations",
          },
          () => {
            fetchFields();
          }
        )
        .subscribe();

      const fetchFields = async () => {
        const { data, error } = await supabase
          .from("field_configurations")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching fields:", error);
        } else {
          setFields(data || []);
        }
        setLoading(false);
      };

      fetchFields();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [router]);

  const fetchFields = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("field_configurations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching fields:", error);
    } else {
      setFields(data || []);
    }
  };

  const handleCreateField = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("field_configurations")
      .insert([{
        ...newField,
        prompt_instruction: newField.prompt_instruction || null,
      }]);

    if (error) {
      console.error("Error creating field:", error);
      alert("Failed to create field");
    } else {
      setNewField({
        field_name: "",
        display_name: "",
        field_type: "text",
        is_required: false,
        prompt_instruction: "",
      });
      fetchFields();
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("field_configurations")
      .update({
        display_name: editingField.display_name,
        field_type: editingField.field_type,
        is_required: editingField.is_required,
        prompt_instruction: editingField.prompt_instruction || null,
      })
      .eq("id", editingField.id);

    if (error) {
      console.error("Error updating field:", error);
      alert("Failed to update field");
    } else {
      setEditDialogOpen(false);
      setEditingField(null);
      fetchFields();
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("field_configurations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting field:", error);
      alert("Failed to delete field");
    } else {
      fetchFields();
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Field Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Manage fields for invoice extraction
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Field</CardTitle>
          <CardDescription>
            Configure a new field for extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Name (snake_case)</Label>
              <Input
                value={newField.field_name}
                onChange={(e) =>
                  setNewField({ ...newField, field_name: e.target.value })
                }
                placeholder="invoice_number"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={newField.display_name}
                onChange={(e) =>
                  setNewField({ ...newField, display_name: e.target.value })
                }
                placeholder="Invoice Number"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newField.field_type}
                onChange={(e) =>
                  setNewField({ ...newField, field_type: e.target.value })
                }
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="currency">Currency</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="required"
                checked={newField.is_required}
                onCheckedChange={(checked) =>
                  setNewField({ ...newField, is_required: checked as boolean })
                }
              />
              <Label htmlFor="required">Required Field</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prompt Instruction</Label>
            <Textarea
              value={newField.prompt_instruction}
              onChange={(e) =>
                setNewField({ ...newField, prompt_instruction: e.target.value })
              }
              placeholder="Instructions for AI extraction..."
              rows={3}
            />
          </div>
          <Button onClick={handleCreateField}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Fields ({fields.length})</CardTitle>
          <CardDescription>
            Fields used for invoice extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.field_name}</TableCell>
                  <TableCell>{field.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{field.field_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Badge className="bg-red-500/10 text-red-500">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingField(field);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={editingField.display_name}
                  onChange={(e) =>
                    setEditingField({ ...editingField, display_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editingField.field_type}
                  onChange={(e) =>
                    setEditingField({ ...editingField, field_type: e.target.value })
                  }
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="currency">Currency</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-required"
                  checked={editingField.is_required}
                  onCheckedChange={(checked) =>
                    setEditingField({ ...editingField, is_required: checked as boolean })
                  }
                />
                <Label htmlFor="edit-required">Required Field</Label>
              </div>
              <div className="space-y-2">
                <Label>Prompt Instruction</Label>
                <Textarea
                  value={editingField.prompt_instruction || ""}
                  onChange={(e) =>
                    setEditingField({ ...editingField, prompt_instruction: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleUpdateField}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

