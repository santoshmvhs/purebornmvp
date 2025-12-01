'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');

  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:9000/');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      const params = new URLSearchParams();
      params.append('username', 'admin');
      params.append('password', 'admin123');

      const response = await fetch('http://localhost:9000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <div className="space-x-4 mb-4">
        <Button onClick={testBackend}>Test Backend</Button>
        <Button onClick={testLogin}>Test Login</Button>
      </div>
      <pre className="bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  );
}

