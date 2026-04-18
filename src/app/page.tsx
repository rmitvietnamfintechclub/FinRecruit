import { redirect } from 'next/navigation';

export default function Home() {
  // This instantly forwards anyone who visits the root URL straight to your dashboard
  redirect('/HeadDashboard');
}