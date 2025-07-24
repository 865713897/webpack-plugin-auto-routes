// @route-parent-id: user
// @route-meta: { "title": "User Id" }
import React from 'react';
import { useParams } from 'react-router-dom';

export default function UserId() {
  const { id } = useParams();
  return (
    <div>
      <div>This is UserId Page! id is {id}</div>
    </div>
  );
}
