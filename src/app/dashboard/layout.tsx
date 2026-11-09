import DashboardWrapper from "@/components/DashboardWrapper";
import { BranchProvider } from "@/contexts/BranchContext";
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
      <BranchProvider>
        <RegisterProvider>
          <DashboardWrapper>
            <LayoutSwitcher>{children}</LayoutSwitcher>
          </DashboardWrapper>
        </RegisterProvider>
      </BranchProvider>
    </LayoutProvider>
  );
}
