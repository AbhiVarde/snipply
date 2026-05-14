import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

const title = "Snipply";
const description =
  "Build, preview, save, share, and fork React components in a browser-based editor with persistent Supabase storage.";

export const metadata = {
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    "Snipply",
    "React component editor",
    "live code preview",
    "component sharing",
    "component fork",
    "Supabase components",
  ],
  authors: [{ name: "Abhi Varde", url: "https://abhivarde.in" }],
  creator: "Abhi Varde",
  publisher: "Abhi Varde",
  openGraph: {
    title,
    description,
    siteName: title,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>{children}</body>
    </html>
  );
}
