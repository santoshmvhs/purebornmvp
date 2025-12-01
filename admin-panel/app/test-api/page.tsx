'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');

  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // Auto-detect production
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return 'https://purebornmvp.onrender.com';
      }
    }
    return 'http://localhost:9000';
  };

  const testBackend = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/`);
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      const apiUrl = getApiUrl();
      const params = new URLSearchParams();
      params.append('username', 'admin');
      params.append('password', 'admin123');

      const response = await fetch(`${apiUrl}/auth/login`, {
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

