import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>FinRecruit</h1>
      <p>
        <Link href="/loginPage">Đăng nhập</Link>
      </p>
    </main>
  );
}
