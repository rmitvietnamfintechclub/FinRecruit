import { NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  HEAD_DEPARTMENTS,
  getDepartmentAliases,
} from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/guards/auth&RBAC';
import User from '@/app/(backend)/models/User';

export const runtime = 'nodejs';

type HeadAccount = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
};

export const GET = withActiveRBAC('Executive Board', async () => {
  await dbConnect();

  const active = await getActiveConfig();

  const allAliases = HEAD_DEPARTMENTS.flatMap((dept) =>
    getDepartmentAliases(dept)
  );

  // 1. LẤY DANH SÁCH DEPARTMENT HEADS
  const headDocs = await User.find({
    role: 'Department Head',
    isActive: true,
    department: { $in: allAliases },
  })
    .select('name email avatar department')
    .sort({ name: 1, email: 1 })
    .lean()
    .exec();

  const headsByDepartment = HEAD_DEPARTMENTS.reduce(
    (acc, dept) => {
      const aliases = getDepartmentAliases(dept);
      acc[dept] = headDocs
        .filter((d) => aliases.includes(d.department))
        .map((d) => ({
          id: d._id.toString(),
          name: d.name ?? null,
          email: d.email,
          avatar: d.avatar ?? null,
        }));
      return acc;
    },
    {} as Record<(typeof HEAD_DEPARTMENTS)[number], HeadAccount[]>
  );

  // 2. ĐẾM SỐ LƯỢNG GUEST TRONG WAITING ROOM
  const waitingGuestCount = await User.countDocuments({
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  });

  // 3. ĐẾM SỐ LƯỢNG ACTIVE MEMBERS THEO TỪNG BAN (Dùng Aggregation cho tối ưu)
  const membersAggregation = await User.aggregate([
    {
      $match: {
        role: 'Member',
        isActive: true,
      },
    },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
      },
    },
  ]);

  // Gom nhóm kết quả đếm được vào đúng tên ban chuẩn (xử lý luôn cả các alias)
  const membersCountByDepartment = HEAD_DEPARTMENTS.reduce(
    (acc, dept) => {
      const aliases = getDepartmentAliases(dept);
      // Tìm tất cả các kết quả aggregation có _id (tên ban trong DB) khớp với alias
      const totalForDept = membersAggregation
        .filter((item) => aliases.includes(item._id))
        .reduce((sum, item) => sum + item.count, 0);
      
      acc[dept] = totalForDept;
      return acc;
    },
    {} as Record<(typeof HEAD_DEPARTMENTS)[number], number>
  );

  // 4. TRẢ VỀ PAYLOAD
  return NextResponse.json({
    success: true,
    active,
    headsByDepartment,
    waitingGuestCount,
    membersCountByDepartment, 
  });
});