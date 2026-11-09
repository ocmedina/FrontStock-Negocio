import { BranchProvider } from "@/contexts/BranchContext";

export default function RepartoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BranchProvider>{children}</BranchProvider>;
}
