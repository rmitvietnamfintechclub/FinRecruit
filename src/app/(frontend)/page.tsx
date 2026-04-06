'use client';

import { useEffect, useState } from 'react';

type ApiResponse = {
  success: boolean;
  count?: number;
  data?: Record<string, unknown>[];
  message?: string;
  error?: string;
};

export default function ResponseListPage() {
  const [responses, setResponses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const res = await fetch('/api/response', { cache: 'no-store' });
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || json.error || 'Failed to fetch responses');
        }

        setResponses(json.data ?? []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unexpected error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, []);

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Response List</h1>

      {loading && <p>Loading data...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && responses.length === 0 && <p>No response data found.</p>}

      {!loading && !error && responses.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>#</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((item, index) => (
                <tr key={String(item._id ?? index)}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' }}>
                    {index + 1}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
