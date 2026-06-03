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
import { RiGalleryLine, RiPulseLine, RiCommandLine, RiTerminalBoxLine, RiRobotLine, RiBookOpenLine, RiSettingsLine, RiCropLine, RiPieChartLine, RiMapLine, RiShieldUserLine } from "@remixicon/react"

// This is sample data.
const data = {
  user: {
    name: "Admin User",
    email: "admin@itvault.com",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "IT Vault",
      logo: (
        <RiGalleryLine
        />
      ),
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Administration",
      url: "#",
      icon: (
        <RiShieldUserLine />
      ),
      isActive: true,
      items: [
        {
          title: "Users",
          url: "/users",
        },
        {
          title: "Roles",
          url: "/roles",
        },
        {
          title: "Modules",
          url: "/modules",
        },
        {
          title: "Permissions",
          url: "/permissions",
        },
      ],
    },
    {
      title: "Playground",
      url: "#",
      icon: (
        <RiTerminalBoxLine
        />
      ),
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: (
        <RiRobotLine
        />
      ),
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: (
        <RiBookOpenLine
        />
      ),
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <RiSettingsLine
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <RiCropLine
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: (
        <RiPieChartLine
        />
      ),
    },
    {
      name: "Travel",
      url: "#",
      icon: (
        <RiMapLine
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = useAuth();

  const filteredNavMain = React.useMemo(() => {
    return data.navMain.map((group) => {
      if (group.title === "Administration") {
        const items = group.items.filter((item) => {
          if (item.url === "/users") return hasPermission("users", "view");
          if (item.url === "/roles") return hasPermission("roles", "view");
          if (item.url === "/modules") return hasPermission("modules", "view");
          if (item.url === "/permissions") return hasPermission("permissions", "view");
          return true;
        });
        return { ...group, items };
      }
      return group;
    }).filter((group) => group.items && group.items.length > 0);
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
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={activeUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
