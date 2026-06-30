import "./globals.css";
import AuthHashHandler from "./AuthHashHandler";

export const metadata = {
  title: "Bento Silva | Área privada",
  description:
    "Experiência privada com ensaios, bastidores e registros adultos exclusivos de Bento Silva."
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
