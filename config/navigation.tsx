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
      title: "Administration",
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
          title: "Branches",
          url: "/branches",
          permission: { module: "branches", action: "view" },
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
    }
  ],
}
