import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../ui/Card.tsx";
import Text from "../ui/Text.tsx";
import Button from "../ui/Button.tsx";
import { Input } from "../ui/Field.tsx";
import { cn } from "../ui/cn.ts";
import { AdminAPI } from "../api";
import { ApiError } from "../api";

export default function AdminLoginPage() {
    const nav = useNavigate();
    const loc = useLocation() as any;

    const from = useMemo(() => (loc?.state?.from as string) || "/admin", [loc]);

    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setError(null);

        const p = password.trim();
        if (!p) {
            setError("Enter password");
            return;
        }

        setSubmitting(true);
        try {
            await AdminAPI.adminSessionLogin({ password: p });
            nav(from, { replace: true });
        } catch (e) {
            const ae = e instanceof ApiError ? e : new ApiError(0, "Unknown error");
            if (ae.status === 401) {
                setError("Wrong password");
            } else {
                setError(ae.message || "Login failed");
            }
            setSubmitting(false);
            return;
        }
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen grid place-items-center px-6">
            <div className="w-[520px]">
                <Card shadow="strong" radius="var(--r-card)">
                    <div className="p-[26px]">
                        <Text as="div" variant="h2">
                            Admin
                        </Text>
                        <Text variant="tiny" tone="muted" className="mt-[10px]">
                            Sign in to manage bookings
                        </Text>

                        {error ? (
                            <div
                                className={cn(
                                    "mt-[14px] rounded-[14px] border-[1.4px] border-[#e8c9c9] bg-[#fcf1f1] px-3 py-2 text-[#6b1f1f]",
                                )}
                            >
                                <Text variant="tiny" tone="ink" className="!text-inherit">
                                    {error}
                                </Text>
                            </div>
                        ) : null}

                        <div className="mt-[16px]">
                            <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                type="password"
                            />
                        </div>

                        <div className="mt-[14px]">
                            <Button
                                className="w-full"
                                disabled={submitting}
                                onClick={submit}
                            >
                                {submitting ? "Signing in…" : "Sign in"}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
