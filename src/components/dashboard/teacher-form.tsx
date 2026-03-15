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

/**
 * Normalise a Malaysian phone number to E.164 (+60...) format.
 *
 * Rules:
 *  - Strip all non-digit characters (spaces, dashes, brackets).
 *  - If it already starts with "60", prepend "+".
 *  - If it starts with "0", replace the leading "0" with "+60".
 *  - Otherwise (bare number like "12345678"), prepend "+60".
 */
function normalizeMY(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('60')) return `+${digits}`;
  if (digits.startsWith('0')) return `+60${digits.slice(1)}`;
  return `+60${digits}`;
}

const teacherFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  subject: z.string().min(3, "Subject is required."),
  contact: z.string().min(8, "A valid contact number is required."),
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
      onSubmit({
        ...values,
        // Normalise phone before saving
        contact: normalizeMY(values.contact),
      });
      if (onFormSubmit) onFormSubmit();
    });
  };

  const contactValue = form.watch("contact");

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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
                    +60
                  </span>
                  <Input
                    placeholder="12-3456789"
                    {...field}
                    className="pl-12"
                    // Strip the +60 prefix for display so the user only
                    // sees/edits the local portion while the stored value
                    // always holds the full E.164 number.
                    value={
                      field.value.startsWith('+60')
                        ? field.value.slice(3)
                        : field.value.startsWith('60')
                        ? field.value.slice(2)
                        : field.value
                    }
                    onChange={e => field.onChange(e.target.value)}
                  />
                </div>
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
            {isPending ? 'Saving…' : (initialData ? 'Update Teacher' : 'Add Teacher')}
          </Button>
        </div>
      </form>
    </Form>
  );
}