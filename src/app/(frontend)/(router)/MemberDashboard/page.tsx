import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MemberDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Round 2 interviews are coming soon</CardTitle>
          <CardDescription>
            Your interview cockpit for this department will appear here once it is
            available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You have Member access for your department. No interviews are available
            to review yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
