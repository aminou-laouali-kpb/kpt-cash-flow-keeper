import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import kptLogo from "@/assets/Cachet_KPT.png";

const menuItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Projets", url: "/projets", icon: FolderKanban },
  { title: "Paiements", url: "/paiements", icon: Receipt },
  { title: "Comptabilité", url: "/comptabilite", icon: FileText },
  { title: "Paramètres", url: "/parametres", icon: Settings },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={kptLogo} alt="Logo KPT" className="h-10 w-10 rounded-lg object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">KPT</span>
            <span className="text-xs text-sidebar-foreground/60">Karatou Pour Tous</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider">
            Menu principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
            {user?.email?.charAt(0).toUpperCase() || "?"}
          </div>
          <span className="text-xs text-sidebar-foreground/70 truncate flex-1">
            {user?.email}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
