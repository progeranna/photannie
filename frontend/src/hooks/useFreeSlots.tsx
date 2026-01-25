import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { PublicAPI, type FreeSlotsResponse } from "../api";
import { RULES } from "../config/rules";

type State =
    | { status: "idle" | "loading"; data?: undefined; error?: undefined }
    | { status: "success"; data: FreeSlotsResponse; error?: undefined }
    | { status: "error"; data?: undefined; error: ApiError };

function jsDayToISOWeekday(jsDay: number): number {
    return jsDay === 0 ? 7 : jsDay;
}

export function useFreeSlots(date: string, refreshToken: number) {
    const [state, setState] = useState<State>({ status: "idle" });

    useEffect(() => {
        if (!date) return;

        const d = new Date(`${date}T00:00:00`);
        const isoWeekday = jsDayToISOWeekday(d.getDay());
        const isWorkday = RULES.workDays.includes(isoWeekday as any);

        if (!isWorkday) {
            setState({ status: "success", data: { date, free_slots: [] } });
            return;
        }

        let alive = true;
        setState({ status: "loading" });

        PublicAPI.getFreeSlotsByDate(date)
            .then((data) => {
                if (!alive) return;
                setState({ status: "success", data });
            })
            .catch((err) => {
                if (!alive) return;
                setState({
                    status: "error",
                    error: err instanceof ApiError ? err : new ApiError(0, "Unknown error"),
                });
            });

        return () => {
            alive = false;
        };
    }, [date, refreshToken]);

    return state;
}
