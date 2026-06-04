"use client"

import * as React from "react"
import { useAuth } from "@/components/auth-context"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { navigationData } from "@/config/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = useAuth();

  const filteredNavMain = React.useMemo(() => {
    return navigationData.navMain
      .map((group) => {
        if (group.items) {
          const items = group.items.filter((item: NavItem) => {
            if (item.permission) {
              return hasPermission(item.permission.module, item.permission.action);
            }
            return true;
          });
          return { ...group, items };
        }
        return group;
      })
      .filter((group) => {
        if (!group.items) return true;
        return group.items.length > 0;
      });
  }, [hasPermission]);

  const activeUser = React.useMemo(() => {
    return {
      name: user?.name || "Guest User",
      email: user?.email || "guest@itvault.com",
      avatar: "/avatars/admin.jpg",
    };
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={navigationData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={activeUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
