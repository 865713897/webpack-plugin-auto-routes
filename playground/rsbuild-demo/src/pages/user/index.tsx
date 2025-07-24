import { Outlet } from 'react-router-dom'

export default function User() {
  return (
    <div>
      <div>This is User Page!</div>
      <Outlet /> {/* 子路由出口 */}
    </div>
  )
}