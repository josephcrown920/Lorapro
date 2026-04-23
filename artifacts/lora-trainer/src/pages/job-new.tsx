import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateJob, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Cpu, Loader2, UploadCloud, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  triggerWord: z.string().min(2, { message: "Trigger word must be at least 2 characters." }).regex(/^[a-zA-Z0-9_]+$/, "Trigger word should be alphanumeric, no spaces"),
  steps: z.number().min(100).max(4000),
  loraRank: z.enum(["4", "8", "16", "32"]),
  imageZipUrl: z.string().url({ message: "Must be a valid URL." }),
});

export default function JobNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

              <div className="space-y-6 pt-4 border-t border-border/50">
                <FormField
                  control={form.control}
                  name="imageZipUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" />
                        Training Images URL (ZIP)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/dataset.zip" className="bg-background border-border/50 font-mono focus-visible:ring-primary/50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Provide a public URL to a ZIP file containing your training images. 
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
