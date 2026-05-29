import { ClerkProvider } from "@clerk/nextjs";
import { RoleProvider } from "@/lib/role";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Now",
  description: "Generator service management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <RoleProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </RoleProvider>
    </ClerkProvider>
  );
}