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
import {
  ArrowLeft, RefreshCw, Terminal, Download, XCircle, Clock,
  Database, Settings2, Sparkles, ImageIcon, Zap, LayoutGrid,
  ExternalLink, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "generate";

export default function JobDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: job, isLoading } = useGetJob(id, {
    query: { enabled: !!id, queryKey: getGetJobQueryKey(id) },
  });

  const cancelJob = useCancelJob();
  const syncJob = useSyncJob();

  const isActive = job?.status === "starting" || job?.status === "processing";

  useEffect(() => {
    if (!isActive || !id) return;
    const interval = setInterval(() => {
      syncJob.mutate({ id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetJobQueryKey(id), data);
          if (data.status !== "starting" && data.status !== "processing") {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
          }
        },
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive, id, syncJob, queryClient]);

  // Auto-switch to generate tab when training completes
  useEffect(() => {
    if (job?.status === "succeeded") setActiveTab("generate");
  }, [job?.status]);

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this training job?")) {
      cancelJob.mutate({ id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetJobQueryKey(id), data);
          toast({ title: "Job Canceled", description: "Training successfully canceled." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to cancel." }),
      });
    }
  };

  const handleManualSync = () => {
    syncJob.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetJobQueryKey(id), data);
        toast({ title: "Synced", description: "Fetched latest status from Replicate." });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-32 mt-2" /></div>
        </div>
        <Card className="glass border-white/10"><CardContent className="h-64 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary/70" /></CardContent></Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
        <Link href="/"><Button>Back to Dashboard</Button></Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "overview", label: "Overview", icon: <Settings2 className="w-4 h-4" /> },
    {
      id: "generate",
      label: "Generate",
      icon: <Sparkles className="w-4 h-4" />,
      disabled: job.status !== "succeeded",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-10 w-10 glass border-white/10 hover:border-white/20 hover:text-foreground transition-all">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{job.name}</h1>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-muted-foreground text-sm font-mono mt-1 flex items-center gap-4">
              <span>ID: {job.id.toString().padStart(4, "0")}</span>
              {job.replicateId && <span>Replicate: {job.replicateId.substring(0, 8)}…</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isActive && (
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 backdrop-blur" onClick={handleCancel} disabled={cancelJob.isPending}>
              <XCircle className="w-4 h-4 mr-2" />Cancel Job
            </Button>
          )}
          <Button variant="outline" className="glass border-white/10 hover:border-white/20 hover:text-foreground transition-all" onClick={handleManualSync} disabled={syncJob.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncJob.isPending ? "animate-spin" : ""}`} />Sync Status
          </Button>
          {job.outputUrl && (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all hover:scale-[1.02]" onClick={() => window.open(job.outputUrl ?? undefined, "_blank")}>
              <Download className="w-4 h-4 mr-2" />Download Weights
            </Button>
          )}
          {job.status === "succeeded" && (
            <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:brightness-110 glow-primary transition-all hover:scale-[1.02]" onClick={() => setActiveTab("generate")}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Images
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-xl glass border border-white/10 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab.disabled
                ? "opacity-30 cursor-not-allowed text-muted-foreground"
                : activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            {activeTab === tab.id && !tab.disabled && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-white/10 rounded-lg border border-white/15"
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}{tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Params */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="md:col-span-1 space-y-6">
                <Card className="glass border-white/10">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-primary" />Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Trigger Word</p>
                      <div className="glass-subtle rounded-lg px-3 py-2 font-mono text-sm font-semibold text-primary">{job.triggerWord}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Steps</p><p className="font-mono font-medium tabular-nums">{job.steps}</p></div>
                      <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Rank</p><p className="font-mono font-medium tabular-nums">{job.loraRank}</p></div>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Database className="w-3 h-3" />Dataset Size</p>
                      <p className="font-mono font-medium">{job.imageCount || "26"} images</p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Created At</p>
                      <p className="font-mono text-sm">{format(new Date(job.createdAt), "MMM d, yyyy HH:mm:ss")}</p>
                    </div>
                    {job.status === "succeeded" && (
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => setActiveTab("generate")}
                          className="w-full flex items-center justify-between text-xs font-mono text-primary hover:text-primary/80 transition-colors"
                        >
                          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />Start generating</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Console */}
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="md:col-span-2">
                <Card className="glass-strong border-white/10 overflow-hidden flex flex-col h-[500px]">
                  <CardHeader className="bg-black/30 border-b border-white/5 pb-3 py-3 backdrop-blur-md">
                    <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />Training Console Output
                      {isActive && <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-amber-400"><span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-current" />LIVE</span>}
                      {job.status === "succeeded" && <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-emerald-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />COMPLETE</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-auto bg-black/40">
                    {job.logs ? (
                      <LogViewer logs={job.logs} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground/50 font-mono text-sm p-4 text-center">
                        {isActive
                          ? <span className="flex items-center gap-2"><span className="breathe">⏵</span>Waiting for training logs to stream from Replicate GPU…</span>
                          : "No logs available for this job."}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {job.errorMessage && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur">
                      <p className="text-red-400 font-mono text-sm font-semibold mb-1">Error executing job:</p>
                      <p className="text-red-500/80 font-mono text-xs whitespace-pre-wrap">{job.errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <GenerateTab jobId={job.id} triggerWord={job.triggerWord} outputUrl={job.outputUrl} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   Log Viewer — auto-scrolls to bottom
────────────────────────────────────────── */
function LogViewer({ logs }: { logs: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  return (
    <pre ref={ref} className="p-4 font-mono text-xs text-muted-foreground whitespace-pre-wrap overflow-auto h-full">
      {logs}
    </pre>
  );
}

/* ──────────────────────────────────────────
   Generate Tab
────────────────────────────────────────── */
const PROMPT_CHIPS = [
  "portrait, studio lighting, sharp focus",
  "Times Square at night, neon reflections",
  "luxury penthouse, golden hour",
  "basketball court at sunset, Nike ad",
  "music video set, dramatic lighting",
  "magazine cover, editorial fashion",
  "red carpet premiere, paparazzi",
  "rooftop at sunset, cinematic",
];

function GenerateTab({ jobId, triggerWord, outputUrl }: { jobId: number; triggerWord: string; outputUrl: string | null | undefined }) {
  const [prompt, setPrompt] = useState(`a portrait photo of ${triggerWord}, studio lighting, sharp focus, cinematic`);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: generations = [], isLoading } = useListGenerations(jobId, {
    query: {
      queryKey: getListGenerationsQueryKey(jobId),
      refetchInterval: (q) => {
        const data = q.state.data as { status: string }[] | undefined;
        return data?.some((g) => g.status === "processing") ? 2000 : false;
      },
    },
  });

  const generate = useGenerateImage();

  // Queue a generation — returns immediately (async backend)
  const queueGeneration = (p: string) => {
    generate.mutate(
      { id: jobId, data: { prompt: p } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGenerationsQueryKey(jobId) });
        },
        onError: (err) =>
          toast({ variant: "destructive", title: "Failed to queue", description: err instanceof Error ? err.message : "Unknown error" }),
      },
    );
  };

  const handleGenerate = () => { if (prompt.trim()) queueGeneration(prompt); };
  const handleRetry = (p: string) => queueGeneration(p);
  const handleChip = (chip: string) => setPrompt(`${triggerWord} ${chip}`);

  const succeeded = generations.filter((g) => g.status === "succeeded");
  const pending   = generations.filter((g) => g.status === "processing");
  const failed    = generations.filter((g) => g.status === "failed");

  // Detect auto-preview state: processing rows exist but none succeeded yet
  const isAutoPreviewRunning = pending.length > 0 && succeeded.length === 0;

  return (
    <div className="space-y-6">
      {/* Auto-preview banner */}
      <AnimatePresence>
        {isAutoPreviewRunning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl glass border border-violet-500/30 bg-violet-500/10"
          >
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
            </span>
            <div>
              <p className="text-sm font-medium text-violet-200">Auto-preview in progress</p>
              <p className="text-xs text-violet-300/60">Generating 3 preview shots from your weights — they'll appear below as they complete.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt card */}
      <Card className="glass border-white/10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />

        <CardHeader className="pb-3 relative">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-primary breathe" />
            Prompt your LoRA
          </CardTitle>
          <CardDescription className="text-sm">
            Include trigger word{" "}
            <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{triggerWord}</span>{" "}
            to invoke your trained subject.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 relative">
          <div className="flex flex-wrap gap-2">
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className="text-xs px-3 py-1.5 rounded-full glass-subtle border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25 transition-all hover:scale-[1.03] active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder={`e.g. ${triggerWord} wearing Balenciaga, cinematic portrait`}
              rows={3}
              className="glass-subtle border-white/10 font-mono text-sm focus-visible:ring-primary/50 focus-visible:border-primary/40 resize-none"
            />
            <p className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/40 font-mono pointer-events-none">⌘↩ to generate</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60 font-mono">
              {succeeded.length} ready
              {pending.length > 0 && <span className="ml-2 text-amber-400/80">· {pending.length} generating…</span>}
              {failed.length > 0 && <span className="ml-2 text-red-400/60">· {failed.length} failed</span>}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending || !prompt.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:brightness-110 glow-primary transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100"
            >
              {generate.isPending
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Queuing…</>
                : <><Sparkles className="w-4 h-4 mr-2" />Generate Image</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Gallery</h2>
          {succeeded.length > 0 && (
            <span className="ml-auto text-xs font-mono text-muted-foreground/60">
              {succeeded.length} image{succeeded.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl bg-white/5" />)}
          </div>
        ) : generations.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-20 h-20 rounded-2xl glass border border-white/10 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-muted-foreground font-medium">No images yet</p>
              <p className="text-muted-foreground/50 text-sm mt-1">Write a prompt above and hit Generate</p>
            </div>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Processing cards (shimmer) */}
            <AnimatePresence>
              {pending.map((g) => (
                <motion.div
                  key={`pending-${g.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  className="aspect-square rounded-xl overflow-hidden glass border border-white/10 flex flex-col items-center justify-center gap-3 relative"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <RefreshCw className="w-6 h-6 animate-spin text-primary/60 relative z-10" />
                  <p className="text-[10px] font-mono text-muted-foreground/50 relative z-10 px-4 text-center line-clamp-2">{g.prompt}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Succeeded + failed cards */}
            <AnimatePresence>
              {generations.filter((g) => g.status !== "processing").map((g, i) => (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative rounded-xl overflow-hidden glass border border-white/10 cursor-pointer"
                  onClick={() => g.status === "succeeded" && g.imageUrl && setLightboxImg(g.imageUrl)}
                >
                  {g.status === "succeeded" && g.imageUrl ? (
                    <>
                      <img
                        src={g.imageUrl}
                        alt={g.prompt}
                        className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 gap-2">
                        <p className="text-white text-xs font-mono line-clamp-3 leading-relaxed">{g.prompt}</p>
                        <a
                          href={g.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />Open full size
                        </a>
                      </div>
                    </>
                  ) : (
                    /* Failed card with retry */
                    <div className="w-full aspect-square flex flex-col items-center justify-center text-red-400/70 text-xs p-4 text-center bg-red-500/5 gap-3">
                      <XCircle className="w-6 h-6" />
                      <p className="font-mono text-[10px] text-red-400/50 line-clamp-2">{g.prompt}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetry(g.prompt); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-red-500/20 hover:border-red-400/40 text-red-400/80 hover:text-red-300 transition-all text-[10px] font-mono hover:scale-105 active:scale-95"
                      >
                        <RefreshCw className="w-3 h-3" />Retry
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
            onClick={() => setLightboxImg(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="relative max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={lightboxImg} alt="Generated" className="w-full h-full object-contain" />
              <a
                href={lightboxImg}
                target="_blank"
                rel="noreferrer"
                className="absolute top-3 right-3 p-2 rounded-lg glass border border-white/15 text-white/80 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute top-3 left-3 p-2 rounded-lg glass border border-white/15 text-white/80 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
