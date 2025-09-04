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
import type { Student, TransportArea } from "@/lib/types";
import { DialogClose } from "@/components/ui/dialog";

const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  level: z.enum(['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 5', 'Secondary 6']),
  subjects: z.string().min(3, "Please list at least one subject."),
  guardian: z.string().min(2, "Guardian's name is required."),
  guardianContact: z.string().min(10, "A valid contact number is required."),
  address: z.string().min(10, "Address is required."),
  firstTime: z.enum(['Yes', 'No']),
  transport: z.enum(['Yes', 'No']),
  transportArea: z.enum(['Inside Limit', 'Outside Limit', 'N/A']).optional(),
}).refine(data => {
    if (data.transport === 'Yes') {
      return data.transportArea && data.transportArea !== 'N/A';
    }
    return true;
  }, {
    message: "Transport area is required.",
    path: ["transportArea"],
  }
);

type StudentFormValues = z.infer<typeof studentFormSchema>;

type StudentFormProps = {
  onSubmit: (data: Omit<Student, 'id' | 'paymentStatus'>) => void;
  initialData?: Student;
  onFormSubmit?: () => void;
};

export function StudentForm({ onSubmit, initialData, onFormSubmit }: StudentFormProps) {
  const [isPending, startTransition] = React.useTransition();
  
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialData || {
      name: "",
      level: "Primary 1",
      subjects: "",
      guardian: "",
      guardianContact: "",
      address: "",
      firstTime: "Yes",
      transport: "No",
      transportArea: "N/A",
    },
  });

  const transportValue = form.watch("transport");

  const handleFormSubmit = (values: StudentFormValues) => {
    startTransition(() => {
        onSubmit({
          ...values,
          transportArea: values.transport === 'No' ? 'N/A' : values.transportArea as TransportArea,
        });
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
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firstTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Time Registration</FormLabel>
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
                    <SelectItem value="Primary 4">Primary 4</SelectItem>
                    <SelectItem value="Primary 5">Primary 5</SelectItem>
                    <SelectItem value="Primary 6">Primary 6</SelectItem>
                    <SelectItem value="Secondary 1">Secondary 1</SelectItem>
                    <SelectItem value="Secondary 2">Secondary 2</SelectItem>
                    <SelectItem value="Secondary 3">Secondary 3</SelectItem>
                    <SelectItem value="Secondary 5">Secondary 5</SelectItem>
                    <SelectItem value="Secondary 6">Secondary 6</SelectItem>
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

        {transportValue === 'Yes' && (
           <FormField
            control={form.control}
            name="transportArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transport Area</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Inside Limit">Inside Limit</SelectItem>
                    <SelectItem value="Outside Limit">Outside Limit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="guardianContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian's Contact</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 012-3456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <div className="flex justify-end gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : (initialData ? 'Update Student' : 'Add Student')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
