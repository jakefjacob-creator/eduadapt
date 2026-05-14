import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EduAdapt — SEND learning assistant",
  description:
    "Upload a lesson plan or worksheet and have it thoughtfully adapted for one specific child's needs — bridging home and school.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#E8826B",
          colorBackground: "#FBF7F0",
          colorText: "#3D3530",
          borderRadius: "1rem",
        },
      }}
    >
      <html lang="en" className={nunito.variable}>
        <body className="min-h-screen font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
