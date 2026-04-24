import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListJobs, useGetJobStats } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, XCircle, ChevronRight, Zap, List, Plus, LayoutDashboard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode; live?: boolean }> = {
    starting: { variant: "secondary", className: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: <Activity className="w-3 h-3 mr-1" />, live: true },
    processing: { variant: "secondary", className: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <Zap className="w-3 h-3 mr-1" />, live: true },
    succeeded: { variant: "secondary", className: "bg-green-500/15 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    failed: { variant: "destructive", className: "bg-red-500/15 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3 mr-1" /> },
    canceled: { variant: "outline", className: "text-muted-foreground border-white/10", icon: <XCircle className="w-3 h-3 mr-1" /> },
  };

  const config = statusConfig[status] || { variant: "outline", className: "", icon: null };

  return (
    <Badge variant={config.variant} className={`capitalize backdrop-blur-sm ${config.className}`}>
      {config.live && <span className="live-dot inline-block w-1.5 h-1.5 mr-1.5 rounded-full bg-current" />}
      {config.icon}
      {status}
    </Badge>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function StatCard({
  index,
  label,
  value,
  loading,
  Icon,
  accent,
}: {
  index: number;
  label: string;
  value: number | string;
  loading: boolean;
  Icon: React.ElementType;
  accent: string;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      <Card className={`glass relative overflow-hidden border-white/10 hover:border-white/20 transition-all duration-300 group`}>
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${accent} blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500`} />
        <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-30 transition-opacity">
          <Icon className="w-12 h-12" />
        </div>
        <CardHeader className="pb-2 relative">
          <CardDescription className="font-medium uppercase tracking-wider text-xs">{label}</CardDescription>
          <CardTitle className="text-3xl font-display font-semibold text-foreground tabular-nums">
            {loading ? <Skeleton className="h-8 w-16 bg-white/5" /> : value}
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetJobStats();
  const { data: jobs, isLoading: jobsLoading } = useListJobs();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80 mb-1">
            <LayoutDashboard className="w-3 h-3" />
            Overview
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live overview of your LoRA training adapters.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide glow-primary transition-all hover:scale-[1.02]">
            <Zap className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Total Jobs" value={stats?.total || 0} loading={statsLoading} Icon={List} accent="bg-primary/40" />
        <StatCard
          index={1}
          label="Active"
          value={(stats?.starting || 0) + (stats?.processing || 0)}
          loading={statsLoading}
          Icon={Activity}
          accent="bg-blue-500/40"
        />
        <StatCard index={2} label="Succeeded" value={stats?.succeeded || 0} loading={statsLoading} Icon={CheckCircle2} accent="bg-green-500/40" />
        <StatCard index={3} label="Failed" value={stats?.failed || 0} loading={statsLoading} Icon={XCircle} accent="bg-red-500/40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
        className="space-y-4"
      >
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <List className="w-5 h-5 text-primary" />
          Recent Training Jobs
        </h2>

        <Card className="glass border-white/10 overflow-hidden">
          {jobsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
            </div>
          ) : !jobs?.length ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <div className="float-slow mb-4">
                <Activity className="w-12 h-12 opacity-30" />
              </div>
              <p className="text-lg font-medium text-foreground">No jobs found</p>
              <p className="mb-6">Create a new job to train your first LoRA adapter.</p>
              <Link href="/jobs/new">
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 backdrop-blur">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Job
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Job ID</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Trigger</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Rank / Steps</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, i) => (
                  <motion.tr
                    key={job.id}
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    className="group border-white/5 hover:bg-white/[0.03] transition-colors border-b last:border-0"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{job.id.toString().padStart(4, "0")}</TableCell>
                    <TableCell className="font-medium text-foreground">{job.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-white/[0.03] backdrop-blur text-xs border-white/10">
                        {job.triggerWord}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm font-mono">
                      {job.loraRank} / {job.steps}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 group-hover:translate-x-0.5 transition-all"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
