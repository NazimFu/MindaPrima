"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Teacher } from "@/lib/types";
import { DialogClose } from "@/components/ui/dialog";

const teacherFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  subject: z.string().min(3, "Subject is required."),
  contact: z.string().min(10, "A valid contact number is required."),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

type TeacherFormProps = {
  onSubmit: (data: TeacherFormValues) => void;
  initialData?: Teacher;
  onFormSubmit?: () => void;
};

export function TeacherForm({ onSubmit, initialData, onFormSubmit }: TeacherFormProps) {
    const [isPending, startTransition] = React.useTransition();

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: initialData || {
      name: "",
      subject: "",
      contact: "",
    },
  });

  const handleFormSubmit = (values: TeacherFormValues) => {
    startTransition(() => {
        onSubmit(values);
        if (onFormSubmit) {
            onFormSubmit();
        }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Mr. Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Physics" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : (initialData ? 'Update Teacher' : 'Add Teacher')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
