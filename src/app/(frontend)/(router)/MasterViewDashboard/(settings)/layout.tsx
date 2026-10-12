import { SettingsTabs } from '@/app/(frontend)/(router)/MasterViewDashboard/(settings)/SettingsTabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsTabs />
      {children}
    </>
  );
}
