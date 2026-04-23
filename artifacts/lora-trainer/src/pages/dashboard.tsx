import React from "react";
import { Link } from "wouter";
import { useListJobs, useGetJobStats } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, XCircle, ChevronRight, Zap, List, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string, icon: React.ReactNode }> = {
    starting: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <Activity className="w-3 h-3 mr-1" /> },
    processing: { variant: "secondary", className: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse", icon: <Zap className="w-3 h-3 mr-1" /> },
    succeeded: { variant: "secondary", className: "bg-green-500/10 text-green-500 border-green-500/20", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    failed: { variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20", icon: <XCircle className="w-3 h-3 mr-1" /> },
    canceled: { variant: "outline", className: "text-muted-foreground", icon: <XCircle className="w-3 h-3 mr-1" /> }
  };

  const config = statusConfig[status] || { variant: "outline", className: "", icon: null };

  return (
    <Badge variant={config.variant} className={`capitalize ${config.className}`}>
      {config.icon}
      {status}
    </Badge>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetJobStats();
  const { data: jobs, isLoading: jobsLoading } = useListJobs();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your LoRA training adapters.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
            <Zap className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Total Jobs</CardDescription>
            <CardTitle className="text-3xl font-display font-semibold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.total || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-blue-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500">
            <Activity className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-500 font-medium uppercase tracking-wider text-xs">Active</CardDescription>
            <CardTitle className="text-3xl font-display font-semibold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (stats?.starting || 0) + (stats?.processing || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-green-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-green-500 font-medium uppercase tracking-wider text-xs">Succeeded</CardDescription>
            <CardTitle className="text-3xl font-display font-semibold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.succeeded || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-red-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
            <XCircle className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-red-500 font-medium uppercase tracking-wider text-xs">Failed</CardDescription>
            <CardTitle className="text-3xl font-display font-semibold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.failed || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <List className="w-5 h-5 text-primary" />
          Recent Training Jobs
        </h2>
        
        <Card className="border-border/50 bg-card overflow-hidden">
          {jobsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full bg-muted/50" />
              <Skeleton className="h-10 w-full bg-muted/50" />
              <Skeleton className="h-10 w-full bg-muted/50" />
            </div>
          ) : !jobs?.length ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">No jobs found</p>
              <p className="mb-6">Create a new job to train your first LoRA adapter.</p>
              <Link href="/jobs/new">
                <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Job
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border/50">
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
                {jobs.map((job) => (
                  <TableRow key={job.id} className="group border-border/50 hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{job.id.toString().padStart(4, '0')}</TableCell>
                    <TableCell className="font-medium text-foreground">{job.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono bg-background text-xs">{job.triggerWord}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm font-mono">
                      {job.loraRank} / {job.steps}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
