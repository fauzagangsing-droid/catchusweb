import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create Customer Account" };
export default function RegisterPage() { return <RegisterForm />; }
