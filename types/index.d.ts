import * as React from "react"

declare global {
  interface NavPermission {
    module: string
    action: string
  }

  interface NavItem {
    title: string
    url: string
    permission?: NavPermission
  }

  interface NavGroup {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: NavItem[]
  }
}
