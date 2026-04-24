import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import JSZip from "jszip";
import { useCreateJob, getListJobsQueryKey, getGetJobStatsQueryKey, requestUploadUrl } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Cpu, Loader2, UploadCloud, Zap, X, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  triggerWord: z.string().min(2, { message: "Trigger word must be at least 2 characters." }).regex(/^[a-zA-Z0-9_]+$/, "Trigger word should be alphanumeric, no spaces"),
  steps: z.number().min(100).max(4000),
  loraRank: z.enum(["4", "8", "16", "32"]),
  imageZipUrl: z.string().url({ message: "Must be a valid URL." }),
});

type UploadStage = "idle" | "zipping" | "uploading" | "done";

export default function JobNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createJob = useCreateJob();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      triggerWord: "tok",
      steps: 1000,
      loraRank: "16",
      imageZipUrl: "",
    },
  });

  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      toast({
        variant: "destructive",
        title: "No images found",
        description: "Please drop image files (jpg, png, webp).",
      });
      return;
    }
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const merged = [...prev];
      for (const f of images) {
        const key = `${f.name}-${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      return merged;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (uploadStage === "done") {
      setUploadStage("idle");
      form.setValue("imageZipUrl", "");
    }
  }

  async function uploadAndZip(): Promise<string | null> {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No images",
        description: "Drop a folder of training images first.",
      });
      return null;
    }

    try {
      setUploadStage("zipping");
      setUploadProgress(0);

      const zip = new JSZip();
      const used = new Set<string>();
      files.forEach((f, i) => {
        let name = f.name;
        if (used.has(name)) {
          const dot = name.lastIndexOf(".");
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          name = `${base}-${i}${ext}`;
        }
        used.add(name);
        zip.file(name, f);
      });

      const zipBlob = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (meta) => setUploadProgress(Math.round(meta.percent * 0.3)),
      );

      setUploadStage("uploading");

      const presign = await requestUploadUrl({
        name: "training-images.zip",
        size: zipBlob.size,
        contentType: "application/zip",
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.uploadURL);
        xhr.setRequestHeader("Content-Type", "application/zip");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(30 + Math.round((e.loaded / e.total) * 70));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(zipBlob);
      });

      const publicUrl = `${window.location.origin}/api/storage${presign.objectPath}`;
      form.setValue("imageZipUrl", publicUrl, { shouldValidate: true });
      setUploadStage("done");
      setUploadProgress(100);
      return publicUrl;
    } catch (err) {
      setUploadStage("idle");
      setUploadProgress(0);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      return null;
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      createJob.mutate(
        {
          data: {
            name: values.name,
            triggerWord: values.triggerWord,
            steps: values.steps,
            loraRank: parseInt(values.loraRank, 10) as 4 | 8 | 16 | 32,
            imageZipUrl: values.imageZipUrl,
          }
        },
        {
          onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
            toast({
              title: "Job created successfully",
              description: `Job ID ${job.id} has been queued for training.`,
            });
            setLocation(`/jobs/${job.id}`);
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "Failed to create job",
              description: error?.message || "An unexpected error occurred.",
            });
            setIsSubmitting(false);
          }
        }
      );
    } catch (error) {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            Configure Training Job
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Set parameters for your new LoRA adapter</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Cpu className="w-5 h-5" />
                Model Parameters
              </CardTitle>
              <CardDescription>
                Define the core settings for how your adapter will be trained.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Model Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., cyberpunk-v1" className="bg-background border-border/50 font-mono focus-visible:ring-primary/50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        A friendly name to identify this model.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="triggerWord"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trigger Word</FormLabel>
                      <FormControl>
                        <Input placeholder="tok" className="bg-background border-border/50 font-mono focus-visible:ring-primary/50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The special token used to activate the concept during generation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <FormField
                  control={form.control}
                  name="imageZipUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" />
                        Training Images
                      </FormLabel>
                      <FormControl>
                        <div
                          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            if (e.currentTarget === e.target) setIsDragging(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const dropped = Array.from(e.dataTransfer.files);
                            addFiles(dropped);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-all ${
                            isDragging
                              ? "border-primary bg-primary/10"
                              : "border-border/50 bg-background hover:border-primary/50 hover:bg-muted/30"
                          } p-8 text-center`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const picked = Array.from(e.target.files ?? []);
                              addFiles(picked);
                              e.target.value = "";
                            }}
                          />
                          <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm font-medium text-foreground">
                            Drop images here or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            jpg, png, webp — 15-30 photos recommended
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        {files.length} {files.length === 1 ? "image" : "images"} selected
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFiles([]); setUploadStage("idle"); form.setValue("imageZipUrl", ""); }}
                        className="text-xs h-7 text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="relative group aspect-square rounded-md overflow-hidden border border-border/50 bg-muted/30"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="absolute top-1 right-1 bg-background/80 hover:bg-red-500 text-foreground hover:text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {uploadStage === "idle" && (
                      <Button
                        type="button"
                        onClick={uploadAndZip}
                        variant="outline"
                        className="w-full border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Upload {files.length} {files.length === 1 ? "Image" : "Images"}
                      </Button>
                    )}

                    {(uploadStage === "zipping" || uploadStage === "uploading") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-muted-foreground">
                            {uploadStage === "zipping" ? "Compressing images..." : "Uploading to storage..."}
                          </span>
                          <span className="text-primary">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1.5" />
                      </div>
                    )}

                    {uploadStage === "done" && (
                      <div className="flex items-center gap-2 text-xs font-mono text-green-500 bg-green-500/10 border border-green-500/20 rounded-md p-3">
                        <CheckCircle2 className="w-4 h-4" />
                        Upload complete — ready to launch training.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-8 pt-4 border-t border-border/50">
                <FormField
                  control={form.control}
                  name="steps"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-4">
                        <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Training Steps</FormLabel>
                        <span className="font-mono text-primary font-bold">{value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={100}
                          max={5000}
                          step={100}
                          value={[value]}
                          onValueChange={(vals) => onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Number of optimization steps. More steps = longer training, potentially better results but risk of overfitting.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loraRank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">LoRA Rank (Dim)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50 font-mono">
                            <SelectValue placeholder="Select rank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="font-mono">
                          <SelectItem value="4">Rank 4 (Fastest, Smallest)</SelectItem>
                          <SelectItem value="8">Rank 8</SelectItem>
                          <SelectItem value="16">Rank 16 (Recommended)</SelectItem>
                          <SelectItem value="32">Rank 32</SelectItem>
                          <SelectItem value="64">Rank 64</SelectItem>
                          <SelectItem value="128">Rank 128 (Highest Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Higher rank captures more detail but produces a larger file.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 border-t border-border/50 py-4 flex justify-end gap-4">
              <Link href="/">
                <Button variant="ghost" type="button" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide shadow-primary/20 shadow-lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Engine...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Launch Training Job
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
