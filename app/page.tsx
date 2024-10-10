"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { get, set } from 'idb-keyval';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [buttonText, setButtonText] = useState('Set Password');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await checkAuthentication();
      await updateButtonText();
    };
    init();
  }, []);

  const checkAuthentication = async () => {
    const storedPassword = await get('app-password');
    if (!storedPassword) {
      setIsAuthenticated(true);
    }
  };

  const updateButtonText = async () => {
    const storedPassword = await get('app-password');
    setButtonText(storedPassword ? 'Login' : 'Set Password');
  };

  const handleLogin = async () => {
    const storedPassword = await get('app-password');
    if (!storedPassword) {
      await set('app-password', password);
      setIsAuthenticated(true);
    } else if (password === storedPassword) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-8">Welcome to Your Secure Notion-like App</h1>
      <div className="w-full max-w-md space-y-4">
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button className="w-full" onClick={handleLogin}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
}