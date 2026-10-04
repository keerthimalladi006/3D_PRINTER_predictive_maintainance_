import { useEffect, useState } from 'react';

interface TestData {
  name: string;
  data: any;
  error: string | null;
  loading: boolean;
}

export function TestPage() {
  const [results, setResults] = useState<TestData[]>([]);

  useEffect(() => {
    const testEndpoints = async () => {
      const tests: TestData[] = [
        { name: 'machine-status', data: null, error: null, loading: true },
        { name: 'health', data: null, error: null, loading: true },
        { name: 'anomalies', data: null, error: null, loading: true },
        { name: 'maintenance', data: null, error: null, loading: true },
        { name: 'vibration', data: null, error: null, loading: true },
      ];

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL ??
        (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

      for (const test of tests) {
        try {
          const res = await fetch(`${apiBaseUrl}/${test.name}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          test.data = await res.json();
          test.error = null;
        } catch (err) {
          test.error = err instanceof Error ? err.message : 'Unknown error';
          test.data = null;
        } finally {
          test.loading = false;
        }
      }

      setResults(tests);
    };

    testEndpoints();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: 'white', color: 'black' }}>
      <h1>API Integration Test</h1>
      {results.length === 0 ? (
        <div>Loading tests...</div>
      ) : (
        results.map((test) => (
          <div key={test.name} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
            <h2 style={{ marginBottom: '10px' }}>GET /api/{test.name}</h2>
            {test.loading ? (
              <div>Loading...</div>
            ) : test.error ? (
              <div style={{ color: 'red' }}>Error: {test.error}</div>
            ) : (
              <div>
                <div style={{ color: 'green', marginBottom: '10px' }}>✓ Success</div>
                <pre style={{ fontSize: '11px', overflow: 'auto', maxHeight: '300px', backgroundColor: '#f5f5f5', padding: '10px' }}>
                  {JSON.stringify(test.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
