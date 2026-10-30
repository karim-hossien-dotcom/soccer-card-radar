import LoginForm from "./login-form";

export const metadata = { title: "Log in · Card Radar" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return <LoginForm next={searchParams.next ?? "/"} />;
}
