"use client";

import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { SidebarProvider, useSidebar } from "./sidebar-context";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-[#051424]">
      <Sidebar />
      <motion.div
        animate={{ marginLeft: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 flex flex-col min-h-screen"
      >
        <TopNav />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
      </motion.div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
