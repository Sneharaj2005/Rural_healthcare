import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import Sidebar from '../components/common/Sidebar'
import clsx from 'clsx'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSidebarToggle = () => {
    // On mobile: open/close drawer; on desktop: collapse/expand
    if (window.innerWidth < 1024) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div
        className={clsx(
          'flex flex-1 flex-col overflow-hidden transition-all duration-250',
          // Offset for desktop sidebar
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        {/* Top navbar */}
        <Navbar
          onSidebarToggle={handleSidebarToggle}
          sidebarCollapsed={collapsed}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
