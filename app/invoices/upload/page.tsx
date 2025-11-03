"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { uploadInvoices } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function generateShortId(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  }
  const array = new Uint8Array(8);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function renameFileWithShortId(file: File): File {
  const shortId = generateShortId();
  const extension = file.name.split(".").pop();
  const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
  const newName = `${nameWithoutExt}_${shortId}.${extension}`;
  
  return new File([file], newName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; error: number } | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
      } else {
        setUser(user);
      }
    });
  }, [router]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files)
          .filter((file) => file.type.startsWith("image/"))
          .map((file) => renameFileWithShortId(file));
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => renameFileWithShortId(file));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const response = await uploadInvoices(files, user.id);
      let success = 0;
      let error = 0;

      response.forEach((item: any) => {
        if (item.status === "pending") {
          success++;
        } else {
          error++;
        }
      });

      setUploadStatus({ success, error });
      setFiles([]);
      setTimeout(() => {
        router.push("/invoices");
      }, 2000);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus({ success: 0, error: files.length });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Upload Invoices</h1>
        <p className="text-muted-foreground mt-1">
          Upload image files to extract invoice data automatically
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drag & Drop Files</CardTitle>
          <CardDescription>
            Support PNG, JPG, JPEG, GIF, WEBP files. You can upload multiple files at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your files here
            </p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-medium">Selected Files ({files.length})</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-4"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.length} file(s)
                  </>
                )}
              </Button>
            </div>
          )}

          {uploadStatus && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                {uploadStatus.success > 0 && (
                  <Badge className="bg-green-500/10 text-green-500">
                    {uploadStatus.success} uploaded successfully
                  </Badge>
                )}
                {uploadStatus.error > 0 && (
                  <Badge className="bg-red-500/10 text-red-500">
                    {uploadStatus.error} failed
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting to dashboard...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

