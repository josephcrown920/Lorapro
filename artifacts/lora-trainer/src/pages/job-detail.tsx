import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetJob,
  useCancelJob,
  useSyncJob,
  useGenerateImage,
  useListGenerations,
  getGetJobQueryKey,
  getListJobsQueryKey,
  getGetJobStatsQueryKey,
  getListGenerationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/pages/dashboard";
import { ArrowLeft, RefreshCw, Terminal, Download, XCircle, Clock, Database, Settings2, Sparkles, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function JobDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useGetJob(id, { 
    query: { 
      enabled: !!id, 
      queryKey: getGetJobQueryKey(id) 
    } 
  });

  const cancelJob = useCancelJob();
  const syncJob = useSyncJob();

  // Auto-polling for active jobs
  const isActive = job?.status === "starting" || job?.status === "processing";
  
  useEffect(() => {
    if (!isActive || !id) return;
    
    const interval = setInterval(() => {
      syncJob.mutate({ id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetJobQueryKey(id), data);
          if (data.status !== "starting" && data.status !== "processing") {
            // Status changed, refresh lists
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          }
        }
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isActive, id, syncJob, queryClient]);

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this training job?")) {
      cancelJob.mutate({ id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetJobQueryKey(id), data);
          toast({
            title: "Job Canceled",
            description: "The training job has been successfully canceled.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to cancel the job.",
          });
        }
      });
    }
  };

  const handleManualSync = () => {
    syncJob.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetJobQueryKey(id), data);
        toast({
          title: "Synced",
          description: "Fetched latest status from Replicate.",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Card className="glass border-white/10">
          <CardContent className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary/70" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-10 w-10 glass border-white/10 hover:border-white/20 hover:text-foreground transition-all">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                {job.name}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-muted-foreground text-sm font-mono mt-1 flex items-center gap-4">
              <span>ID: {job.id.toString().padStart(4, "0")}</span>
              {job.replicateId && <span>Replicate: {job.replicateId.substring(0, 8)}...</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 backdrop-blur"
              onClick={handleCancel}
              disabled={cancelJob.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Job
            </Button>
          )}
          <Button
            variant="outline"
            className="glass border-white/10 hover:border-white/20 hover:text-foreground transition-all"
            onClick={handleManualSync}
            disabled={syncJob.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncJob.isPending ? "animate-spin" : ""}`} />
            Sync Status
          </Button>
          {job.outputUrl && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all hover:scale-[1.02]"
              onClick={() => window.open(job.outputUrl ?? undefined, "_blank")}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Weights
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="md:col-span-1 space-y-6"
        >
          <Card className="glass border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Trigger Word</p>
                <div className="glass-subtle rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary">
                  {job.triggerWord}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Steps</p>
                  <p className="font-mono font-medium tabular-nums">{job.steps}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Rank</p>
                  <p className="font-mono font-medium tabular-nums">{job.loraRank}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Dataset Size
                </p>
                <p className="font-mono font-medium">{job.imageCount || "Unknown"} images</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created At
                </p>
                <p className="font-mono text-sm">{format(new Date(job.createdAt), "MMM d, yyyy HH:mm:ss")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="md:col-span-2"
        >
          <Card className="glass-strong border-white/10 overflow-hidden flex flex-col h-[500px]">
            <CardHeader className="bg-black/30 border-b border-white/5 pb-3 py-3 backdrop-blur-md">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Training Console Output
                {isActive && <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-amber-400"><span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-current" />LIVE</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto bg-black/40">
              {job.logs ? (
                <pre className="p-4 font-mono text-xs text-muted-foreground whitespace-pre-wrap">{job.logs}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/50 font-mono text-sm p-4 text-center">
                  {isActive ? (
                    <span className="flex items-center gap-2">
                      <span className="breathe">⏵</span>
                      Waiting for training logs to stream from Replicate GPU...
                    </span>
                  ) : (
                    "No logs available for this job."
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {job.errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur"
              >
                <p className="text-red-400 font-mono text-sm font-semibold mb-1">Error executing job:</p>
                <p className="text-red-500/80 font-mono text-xs whitespace-pre-wrap">{job.errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {job.status === "succeeded" && job.outputUrl && <InferencePanel jobId={job.id} triggerWord={job.triggerWord} />}
    </motion.div>
  );
}

function InferencePanel({ jobId, triggerWord }: { jobId: number; triggerWord: string }) {
  const [prompt, setPrompt] = useState(`a portrait photo of ${triggerWord}, cinematic lighting, high detail`);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: generations = [], isLoading } = useListGenerations(jobId, {
    query: { queryKey: getListGenerationsQueryKey(jobId) },
  });

  const generate = useGenerateImage();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate.mutate(
      { id: jobId, data: { prompt } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGenerationsQueryKey(jobId) });
          toast({ title: "Image generated", description: "Your image is ready below." });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Generation failed",
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
    >
    <Card className="glass border-white/10 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
      <CardHeader className="pb-4 relative">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary breathe" />
          Generate with this LoRA
        </CardTitle>
        <CardDescription className="text-xs">
          Include your trigger word <span className="font-mono text-primary">{triggerWord}</span> in the prompt to invoke your trained subject.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`e.g. a portrait of ${triggerWord} in a forest`}
          rows={3}
          className="glass-subtle border-white/10 font-mono text-sm focus-visible:ring-primary/50 focus-visible:border-primary/40"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending || !prompt.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all hover:scale-[1.02]"
          >
            {generate.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t border-white/5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <ImageIcon className="w-3 h-3" />
            Recent Generations ({generations.length})
          </p>
          {isLoading ? (
            <Skeleton className="h-32 w-full bg-white/5" />
          ) : generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/50 font-mono text-xs">
              No images generated yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <AnimatePresence>
                {generations.map((g, i) => (
                  <motion.div
                    key={g.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const }}
                    whileHover={{ y: -3 }}
                    className="rounded-lg overflow-hidden glass border-white/10 group relative"
                  >
                    {g.status === "succeeded" && g.imageUrl ? (
                      <a href={g.imageUrl} target="_blank" rel="noreferrer" className="block relative">
                        <img
                          src={g.imageUrl}
                          alt={g.prompt}
                          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : g.status === "failed" ? (
                      <div className="w-full aspect-square flex items-center justify-center text-red-400/80 text-xs p-2 text-center bg-red-500/5">
                        Failed
                      </div>
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-white/[0.02]">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary/70" />
                      </div>
                    )}
                    <div className="p-2 text-xs font-mono text-muted-foreground line-clamp-2">{g.prompt}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
