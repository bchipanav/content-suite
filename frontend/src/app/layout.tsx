import "./globals.css";

export const metadata = {
  title: "Content Suite",
  description: "Plataforma de gestión de contenido con IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
