import LoginForm from "./LoginForm";

export const metadata = {
  title: "Entrar | Bento Silva"
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center bg-ink px-5 py-12 text-bone">
      <LoginForm />
    </main>
  );
}
