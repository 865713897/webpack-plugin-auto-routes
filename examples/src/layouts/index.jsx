import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <p>This is Layout Page</p>
      <Outlet />
    </div>
  );
}