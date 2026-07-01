import "./globals.css";
import AuthHashHandler from "./AuthHashHandler";

export const metadata = {
  title: "Bento Silva | Area reservada",
  description:
    "Experiencia reservada com bastidores e acesso exclusivo de Bento Silva.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
