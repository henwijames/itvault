"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  RiUserLine,
  RiShieldLine,
  RiShieldKeyholeLine,
  RiCpuLine,
} from "@remixicon/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface BreadcrumbConfig {
  parent?: string;
  label: string;
  icon?: React.ReactNode;
}

const breadcrumbConfig: Record<string, BreadcrumbConfig> = {
  "/dashboard": {
    parent: "",
    label: "Dashboard",
  },
  "/users": {
    parent: "Administration",
    label: "Users Administration",
    icon: <RiUserLine className="size-4 text-muted-foreground" />,
  },
  "/roles": {
    parent: "Administration",
    label: "Roles Administration",
    icon: <RiShieldLine className="size-4 text-muted-foreground" />,
  },
  "/permissions": {
    parent: "Administration",
    label: "Permissions Management",
    icon: <RiShieldKeyholeLine className="size-4 text-muted-foreground" />,
  },
  "/modules": {
    parent: "Administration",
    label: "Modules Administration",
    icon: <RiCpuLine className="size-4 text-muted-foreground" />,
  },
  "/branches": {
    parent: "Administration",
    label: "Branches Page",
    icon: <RiCpuLine className="size-4 text-muted-foreground" />,
  },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const config = breadcrumbConfig[pathname] || {
    label: "Dashboard",
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {config.parent && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    {config.parent}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground flex items-center gap-1.5">
                {config.icon}
                {config.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
