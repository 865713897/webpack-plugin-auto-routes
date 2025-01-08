import React from 'react';
import { useParams } from 'react-router-dom';

export default function UserId() {
  const { id } = useParams();
  return <div>This is User-{id} Page!</div>;
}
