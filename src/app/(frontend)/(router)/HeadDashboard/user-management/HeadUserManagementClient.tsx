'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import { MemberGrantPanel } from '@/components/user-management/MemberGrantPanel';

export function HeadUserManagementClient({ department }: { department: DepartmentType }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-black">User Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Grant Member access for {department}.
        </p>
      </div>
      <MemberGrantPanel department={department} />
    </div>
  );
}
