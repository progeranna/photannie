import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api";
import { ApiError } from "../../api/http";
import { toISODateLocal } from "../../utils/date";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
    const nav = useNavigate();
    const loc = useLocation();

    const [status, setStatus] = useState<"checking" | "ok">("checking");

    useEffect(() => {
        let alive = true;

        const today = toISODateLocal(new Date());

        AdminAPI.adminListBookingsByDate(today)
            .then(() => {
                if (!alive) return;
                setStatus("ok");
            })
            .catch((e) => {
                if (!alive) return;

                const ae = e instanceof ApiError ? e : new ApiError(0, "Unknown error");
                if (ae.status === 401) {
                    nav("/admin/login", { replace: true, state: { from: loc.pathname } });
                    return;
                }

                nav("/admin/login", { replace: true, state: { from: loc.pathname } });
            });

        return () => {
            alive = false;
        };
    }, [nav, loc.pathname]);

    if (status !== "ok") return null;
    return <>{children}</>;
}
