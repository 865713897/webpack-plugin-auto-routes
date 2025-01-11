import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className='flex flex-col h-screen'>
      <header className='bg-blue-500 text-white p-4'>
        <h1 className='text-2xl font-bold'>My App</h1>
      </header>
      <main className='flex-1'>
        <Outlet />
      </main>
    </div>
  );
}
