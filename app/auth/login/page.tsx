import { LoginForm } from "@/components/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Invoicy",
  description: "Sign in to your Invoicy account",
};

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg md:max-w-2xl flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 style={{ fontSize: '2rem' }} className="text-[10rem] md:text-[16rem] lg:text-[20rem] font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-none">
            Invoicy
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl">Invoice Automation Platform</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
