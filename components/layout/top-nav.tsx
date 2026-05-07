"use client";

import { Bell, Search, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { NotificationCenter, useNotificationCount } from "@/components/notifications";

export function TopNav() {
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useNotificationCount();

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <header className="sticky top-0 z-40 h-16 bg-[#051424]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
        {/* Search — opens command palette */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 bg-[#122131] border border-[#424655]/30 hover:border-[#b0c6ff]/30 rounded-lg px-3 py-2 w-full transition-all duration-200 text-left"
          >
            <Search className="w-4 h-4 text-[#8c90a1] shrink-0" />
            <span className="text-sm text-[#8c90a1]/60 flex-1">Search obligations, MAPs...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#8c90a1] bg-[#273647]/50 rounded border border-[#424655]/30">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Center Brand */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
          <span className="text-sm font-semibold text-[#d4e4fa]/80">
            Suraksha Compliance OS
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(p => !p)}
              className="relative p-2 rounded-lg text-[#8c90a1] hover:text-[#b0c6ff] hover:bg-[#273647]/30 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#b0c6ff] text-[#002d6f] text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <Link
            href="/settings"
            className="p-2 rounded-lg text-[#8c90a1] hover:text-[#b0c6ff] hover:bg-[#273647]/30 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <div className="ml-2 pl-3 border-l border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#568dff] to-[#b0c6ff] flex items-center justify-center">
              <span className="text-xs font-bold text-[#002d6f]">PS</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
