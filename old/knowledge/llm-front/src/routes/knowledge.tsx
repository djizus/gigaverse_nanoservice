import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Upload,
  X,
  FileText,
  FileImage,
  FileCode,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface KnowledgeFile {
  path: string;
  content: string;
  metadata?: {
    title?: string;
    tags?: string[];
    lastModified?: Date;
    fileType?: string;
    originalName?: string;
    size?: number;
  };
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

function buildFileTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  console.log("Building file tree with files:", files);
  files.forEach((filename) => {
    console.log("Building file tree with file:", filename);
    const parts = filename.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const existingNode = currentLevel.find((node) => node.name === part);

      if (existingNode) {
        if (!isLastPart) {
          currentLevel = existingNode.children!;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: isLastPart ? "file" : "folder",
          children: isLastPart ? undefined : [],
        };
        currentLevel.push(newNode);
        if (!isLastPart) {
          currentLevel = newNode.children!;
        }
      }
    });
  });

  return root;
}

function FileTreeNode({
  node,
  onSelect,
  getFileIcon,
}: {
  node: TreeNode;
  onSelect: (path: string) => void;
  getFileIcon: (filename: string) => React.ReactElement;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (node.type === "file") {
    return (
      <div
        className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer text-lg"
        onClick={() => onSelect(node.path)}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <Collapsible.Trigger className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer w-full text-lg">
          {isOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <Folder className="h-5 w-5" />
          <span className="truncate">{node.name}</span>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="pl-6 space-y-2">
            {node.children?.map((child, index) => (
              <FileTreeNode
                key={index}
                node={child}
                onSelect={onSelect}
                getFileIcon={getFileIcon}
              />
            ))}
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

export function KnowledgePage() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    setFileTree(buildFileTree(files));
  }, [files]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/knowledge/files`);
      const data = await response.json();
      console.log("Received files from API:", data);
      // Handle the response format: { files: string[], total: number }
      setFiles(data.files || []);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const fetchFile = async (path: string) => {
    try {
      console.log("Attempting to fetch file:", path);
      const encodedPath = encodeURIComponent(path);
      const response = await fetch(`${API_URL}/knowledge/files/${encodedPath}`);
      const data = await response.json();
      console.log("Received file data:", data);
      if (data.filename && data.content !== undefined) {
        const fileData: KnowledgeFile = {
          path: data.filename,
          content: data.content,
          metadata: data.metadata
        };
        setSelectedFile(fileData);
        setEditContent(data.content);
        setIsEditing(true);
      } else {
        console.error("File not found:", path);
      }
    } catch (error) {
      console.error("Failed to fetch file:", error);
    }
  };

  const searchFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/knowledge/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ term: searchTerm }),
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Failed to search:", error);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) {
      console.error("No file selected for saving");
      return;
    }

    try {
      console.log("Saving file:", selectedFile.path);
      console.log("Content length:", editContent.length);

      const encodedPath = encodeURIComponent(selectedFile.path);
      const response = await fetch(
        `${API_URL}/knowledge/files/${encodedPath}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: editContent,
          }),
        },
      );

      const data = await response.json();
      console.log("Save response:", data);

      if (response.ok) {
        console.log("File saved successfully");
        setSelectedFile({ ...selectedFile, content: editContent });
        // Refresh file list to update metadata
        await fetchFiles();
      } else {
        console.error("Failed to save file:", data.error);
        // TODO: Add error notification for user
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      // TODO: Add error notification for user
    }
  };

  const createFile = async () => {
    if (!newFilePath) return;

    try {
      const response = await fetch(
        `${API_URL}/knowledge/files/${newFilePath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: "",
          }),
        },
      );

      if (response.ok) {
        setNewFilePath("");
        fetchFiles(); // Refresh list
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "pdf":
      case "doc":
      case "docx":
        return <FileText className="h-5 w-5" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileImage className="h-5 w-5" />;
      case "txt":
      case "csv":
      case "json":
        return <FileCode className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const uploadFiles = async (files: FileList) => {
    const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
      filename: file.name,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadProgress((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        // Update progress to processing
        setUploadProgress((prev) =>
          prev.map((upload) =>
            upload.filename === file.name
              ? { ...upload, progress: 50, status: "processing" }
              : upload,
          ),
        );

        const response = await fetch(`${API_URL}/knowledge/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Update progress to completed
          setUploadProgress((prev) =>
            prev.map((upload) =>
              upload.filename === file.name
                ? { ...upload, progress: 100, status: "completed" }
                : upload,
            ),
          );

          // Refresh file list after successful upload
          await fetchFiles();
        } else {
          const error = await response.text();
          setUploadProgress((prev) =>
            prev.map((upload) =>
              upload.filename === file.name
                ? { ...upload, status: "error", error }
                : upload,
            ),
          );
        }
      } catch (error) {
        setUploadProgress((prev) =>
          prev.map((upload) =>
            upload.filename === file.name
              ? {
                  ...upload,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : upload,
          ),
        );
      }
    }

    // Remove completed uploads after 3 seconds
    setTimeout(() => {
      setUploadProgress((prev) =>
        prev.filter((upload) => upload.status !== "completed"),
      );
    }, 3000);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Reset input value to allow re-uploading same file
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const removeUpload = (filename: string) => {
    setUploadProgress((prev) =>
      prev.filter((upload) => upload.filename !== filename),
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-[1920px]">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <div className="space-x-2">
          <Link to="/">
            <Button variant="outline" size="lg">
              Simple Chat
            </Button>
          </Link>
          <Link to="/api">
            <Button variant="outline" size="lg">
              API Explorer
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Arborescence des fichiers */}
        <Card className="col-span-3 h-[85vh]">
          <CardHeader>
            <CardTitle className="text-2xl">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="New file path"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    className="text-lg"
                  />
                  <Button onClick={createFile} size="lg">
                    Create
                  </Button>
                </div>

                {/* File Upload Section */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/25"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop files here or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Supports: PDF, DOC, DOCX, TXT, CSV, JSON, MD
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv,.json,.md"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                  >
                    Choose Files
                  </Button>
                </div>

                {/* Upload Progress */}
                {uploadProgress.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Upload Progress</h4>
                    {uploadProgress.map((upload, index) => (
                      <div key={index} className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {upload.filename}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {upload.status === "uploading" && "Uploading..."}
                              {upload.status === "processing" &&
                                "Processing..."}
                              {upload.status === "completed" && "Completed"}
                              {upload.status === "error" && "Error"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => removeUpload(upload.filename)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {upload.status !== "error" && (
                          <div className="w-full bg-background rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                        )}
                        {upload.error && (
                          <p className="text-xs text-destructive mt-1">
                            {upload.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchFiles();
                    }
                  }}
                  className="text-lg"
                />
                <Button onClick={searchFiles} size="lg">
                  Search
                </Button>
              </div>

              <ScrollArea className="h-[calc(85vh-200px)]">
                <div className="space-y-2">
                  {searchTerm && searchResults.length > 0
                    ? // Search results
                      searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-accent rounded-md cursor-pointer text-lg"
                          onClick={() => {
                            const filePath = result.metadata?.source || "";
                            if (filePath) {
                              fetchFile(filePath);
                            }
                          }}
                        >
                          <div className="font-medium">
                            {result.metadata?.source || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.text}
                          </div>
                        </div>
                      ))
                    : // File tree
                      fileTree.map((node, index) => (
                        <FileTreeNode
                          key={index}
                          node={node}
                          onSelect={(path) => fetchFile(path)}
                          getFileIcon={getFileIcon}
                        />
                      ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Contenu et preview du fichier */}
        <div className="col-span-9 grid grid-cols-2 gap-6 h-[85vh]">
          {/* Éditeur */}
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">
                {selectedFile ? selectedFile.path : "Select a file"}
              </CardTitle>
              <div className="flex space-x-2">
                {isEditing && (
                  <Button onClick={saveFile} size="lg">
                    Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <Textarea
                  className="min-h-[calc(85vh-200px)] text-lg font-mono w-full"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                      e.preventDefault();
                      saveFile();
                    }
                  }}
                />
              ) : (
                <div className="text-center text-muted-foreground text-lg">
                  Select a file to view or edit its content
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Markdown */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(85vh-200px)]">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown>{selectedFile?.content || ""}</ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
