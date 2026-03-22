'use client';

import { CirclePlusIcon, PanelLeftIcon, MessageIcon, UserIcon, SettingsIcon } from './icons.js';
import { SidebarHistory } from './sidebar-history.js';
import { SidebarUserNav } from './sidebar-user-nav.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from './ui/sidebar.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.js';
import { useChatNav } from './chat-nav-context.js';

// Icons as inline SVGs to avoid dependency issues
function UsersIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BookOpenIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function MessageSquareIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function AppSidebar({ user }) {
  const { navigateToChat } = useChatNav();
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  const role = user?.role || 'member';
  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <Sidebar>
      <SidebarHeader>
        <div className={collapsed ? 'flex justify-center' : 'flex items-center justify-between'}>
          {!collapsed && (
            <span className="px-2 font-semibold text-lg">Chat</span>
          )}
          <button
            className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <PanelLeftIcon size={16} />
          </button>
        </div>

        <SidebarMenu>
          {/* New chat */}
          <SidebarMenuItem className="mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  href="/"
                  className={collapsed ? 'justify-center' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToChat(null);
                    setOpenMobile(false);
                  }}
                >
                  <CirclePlusIcon size={16} />
                  {!collapsed && <span>New chat</span>}
                </SidebarMenuButton>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">New chat</TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {!collapsed && (
        <SidebarContent>
          <SidebarMenu>
            {/* Chat History */}
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton href="/chats" className={collapsed ? 'justify-center' : ''}>
                    <MessageIcon size={16} />
                    {!collapsed && <span>Chat History</span>}
                  </SidebarMenuButton>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Chat History</TooltipContent>}
              </Tooltip>
            </SidebarMenuItem>

            {/* Manager: Team Chats */}
            {isManager && (
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton href="/team-chats" className={collapsed ? 'justify-center' : ''}>
                      <MessageSquareIcon size={16} />
                      {!collapsed && <span>Team Chats</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Team Chats</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            )}

            {/* Manager: Manage Team */}
            {isManager && (
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton href="/manage-team" className={collapsed ? 'justify-center' : ''}>
                      <UsersIcon size={16} />
                      {!collapsed && <span>Manage Team</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Manage Team</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            )}

            {/* Admin: Knowledge Base */}
            {isAdmin && (
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton href="/admin/knowledge" className={collapsed ? 'justify-center' : ''}>
                      <BookOpenIcon size={16} />
                      {!collapsed && <span>Knowledge Base</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Knowledge Base</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            )}

            {/* Admin: Settings */}
            {isAdmin && (
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton href="/admin/general" className={collapsed ? 'justify-center' : ''}>
                      <SettingsIcon size={16} />
                      {!collapsed && <span>Settings</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            )}

            {/* Admin: Users */}
            {isAdmin && (
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton href="/admin/users" className={collapsed ? 'justify-center' : ''}>
                      <UserIcon size={16} />
                      {!collapsed && <span>Users</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Users</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            )}
          </SidebarMenu>

          <div className="mx-4 border-t border-border" />
          <SidebarHistory />
        </SidebarContent>
      )}

      {/* Spacer when collapsed to push footer down */}
      {collapsed && <div className="flex-1" />}

      <SidebarFooter>
        {user && <SidebarUserNav user={user} collapsed={collapsed} />}
      </SidebarFooter>
    </Sidebar>
  );
}
