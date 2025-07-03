"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Student } from "@/lib/types";

const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  level: z.enum(['Primary 1', 'Primary 2', 'Primary 3', 'Secondary 1', 'Secondary 2']),
  subjects: z.string().min(3, "Please list at least one subject."),
  guardian: z.string().min(2, "Guardian's name is required."),
  address: z.string().min(10, "Address is required."),
  transport: z.enum(['Yes', 'No']),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

type StudentFormProps = {
  onSubmit: (data: StudentFormValues) => void;
  initialData?: Student;
};

export function StudentForm({ onSubmit, initialData }: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialData || {
      name: "",
      level: "Primary 1",
      subjects: "",
      guardian: "",
      address: "",
      transport: "No",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Primary 1">Primary 1</SelectItem>
                    <SelectItem value="Primary 2">Primary 2</SelectItem>
                    <SelectItem value="Primary 3">Primary 3</SelectItem>
                    <SelectItem value="Secondary 1">Secondary 1</SelectItem>
                    <SelectItem value="Secondary 2">Secondary 2</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transport Required</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="subjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subjects</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Mathematics, Science" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="guardian"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guardian's Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit">{initialData ? 'Update Student' : 'Add Student'}</Button>
        </div>
      </form>
    </Form>
  );
}
