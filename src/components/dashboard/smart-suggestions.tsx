"use client";

import * as React from 'react';
import { suggestDashboardActions } from '@/ai/flows/suggest-dashboard-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SmartSuggestions() {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const getSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestDashboardActions({
        recentAppUsage: 'User has been viewing student and teacher lists frequently. Several new students were registered this week.',
        dataPatterns: 'There is an increase in "Secondary 1" enrollments. A few students have "Overdue" payment statuses.',
      });
      setSuggestions(result.suggestedActions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch AI suggestions. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Smart Suggestions</CardTitle>
            <CardDescription>AI-powered recommendations to improve your workflow.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : suggestions.length > 0 ? (
          <ul className="space-y-2 list-disc pl-5 text-sm">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4">
            Click the button to generate suggestions.
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={getSuggestions} disabled={loading}>
            {loading ? 'Generating...' : 'Get Suggestions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
