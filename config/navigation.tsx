import * as React from "react"
import {
  RiGalleryLine,
  RiLineChartLine,
  RiShieldUserLine,
  RiTerminalBoxLine,
  RiRobotLine,
  RiBookOpenLine,
  RiSettingsLine,
  RiCropLine,
  RiPieChartLine,
  RiMapLine,
  RiOrganizationChart,
  RiMacbookLine,
} from "@remixicon/react"

export const navigationData: {
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
  navMain: NavGroup[]
} = {
  teams: [
    {
      name: "IT Vault",
      logo: <RiGalleryLine />,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <RiLineChartLine />,
    },
    {
      title: "Access Management",
      url: "#",
      icon: <RiShieldUserLine />,
      isActive: true,
      items: [
        {
          title: "Users",
          url: "/users",
          permission: { module: "users", action: "view" },
        },
        {
          title: "Roles",
          url: "/roles",
          permission: { module: "roles", action: "view" },
        },
        {
          title: "Modules",
          url: "/modules",
          permission: { module: "modules", action: "view" },
        },
        {
          title: "Permissions",
          url: "/permissions",
          permission: { module: "permissions", action: "view" },
        },
      ],
    },
    {
      title: "Organization",
      url: "#",
      icon: <RiOrganizationChart />,
      items: [
        {
          title: "Branches",
          url: "/branches",
          permission: { module: "branches", action: "view" },
        },
        {
          title: "Staffs",
          url: "/staff",
          permission: { module: "staff", action: "view" },
        }
      ]
    },
    {
      title: "IT Service Desk",
      url: "#",
      icon: <RiMacbookLine />,
      items: [
        {
          title: "Internet Accounts",
          url: "/internet-accounts",
          permission: { module: "internet_accounts", action: "view" },
        },
        {
          title: "Subscriptions",
          url: "/subscriptions",
          permission: { module: "subscriptions", action: "view" },
        },
        {
          title: "Assets",
          url: "/assets",
          permission: { module: "assets", action: "view" },
        }
      ]
    },
  ],
}
