import DashboardWrapper from "@/components/DashboardWrapper";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { RegisterProvider } from "@/contexts/RegisterContext";
import LayoutSwitcher from "@/components/LayoutSwitcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <RegisterProvider>
        <DashboardWrapper>
          <LayoutSwitcher>{children}</LayoutSwitcher>
        </DashboardWrapper>
      </RegisterProvider>
    </LayoutProvider>
  );
}

