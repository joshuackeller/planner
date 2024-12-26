import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createContext, useEffect, useState } from "react";
import { LocalDB, runSQLite } from "../lib/LocalDB";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarWeeks,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn, isSamePeriod } from "@/lib/utils";
import { useRouter } from "next/router";
import Auth, { AUTH_KEY } from "@/components/Auth";
import Head from "next/head";
import { Toaster } from "@/components/ui/toaster";
import { Period, Task } from "@/lib/types";

export const AppContext = createContext<{
  db: LocalDB;
  day: Date;
  datesWithTasks: DateWithTasks[];
  refresh: () => Promise<void>;
}>({} as any);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const selectedPeriod = router.asPath.includes("year")
    ? "year"
    : router.asPath.includes("months")
    ? "months"
    : router.asPath.includes("weeks")
    ? "weeks"
    : "days";

  // CONTEXT VALUES
  const [day, setDay] = useState<Date>(new Date());
  const [db, setDb] = useState<LocalDB>();
  const [datesWithTasks, setDatesWithTasks] = useState<DateWithTasks[]>([]);
  const refresh = async () =>
    setDatesWithTasks(await BuildDatesWithTasks(day, selectedPeriod, db));

  useEffect(() => {
    refresh();
  }, [day, selectedPeriod]);

  const [calOpen, setCalOpen] = useState<boolean>(false);

  const [token, setToken] = useState<string | null>("");

  useEffect(() => {
    if (typeof window !== undefined) {
      setToken(localStorage.getItem(AUTH_KEY));
    }
  }, []);

  useEffect(() => {
    if (!!token) {
      runSQLite(setDb);
    }
  }, [token]);

  useEffect(() => {
    const sync = async () => {
      if (!db) return;
      await db.syncPull();
      await refresh();
    };

    if (!!token && !!db) {
      console.log("RUNNING PULL");
      sync();
    }
  }, [token, db]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (!!token && !!db) {
      interval = setInterval(() => {
        console.log("RUNNING PUSH");
        db.syncPush();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, db]);

  const handlePrevious = () => {
    if (selectedPeriod === "days") {
      setDay(subWeeks(day, 1));
    } else if (selectedPeriod === "weeks") {
      setDay(subMonths(day, 1));
    } else if (selectedPeriod === "months") {
      setDay(subYears(day, 1));
    } else if (selectedPeriod === "year") {
      setDay(subYears(day, 1));
    }
  };

  const handleNext = () => {
    if (selectedPeriod === "days") {
      setDay(addWeeks(day, 1));
    } else if (selectedPeriod === "weeks") {
      setDay(addMonths(day, 1));
    } else if (selectedPeriod === "months") {
      setDay(addYears(day, 1));
    } else if (selectedPeriod === "year") {
      setDay(addYears(day, 1));
    }
  };

  return (
    <>
      <Head>
        <title>Planner</title>
      </Head>
      <Toaster />
      {token === "" ? (
        <div className="h-screen w-full flex justify-center items-center bg-zinc-100 animate-pulse">
          <h1 className="animate-pulse">Loading data...</h1>
        </div>
      ) : token === null ? (
        <Auth />
      ) : !db ? (
        <div className="h-screen w-full flex justify-center items-center bg-zinc-100 animate-pulse">
          <h1 className="animate-pulse">Loading data...</h1>
        </div>
      ) : (
        <AppContext.Provider value={{ db, day, datesWithTasks, refresh }}>
          <Component {...pageProps} />
          <div className="fixed mx-3 bottom-3 w-[calc(100vw-24px)] flex justify-between items-center rounded-xl py-3 px-4 bg-zinc-900/10">
            <div className="bg-white rounded-md p-1">
              {["days", "weeks", "months", "year"].map((period) => (
                <button
                  key={period}
                  className={cn(
                    "inline-flex items-center capitalize rounded-md h-8 px-3 py-2 text-xs font-medium transition",
                    period === selectedPeriod && "bg-black text-white"
                  )}
                  onClick={() =>
                    router.push(`/${period}`, undefined, {
                      scroll: false,
                    })
                  }
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {!isSamePeriod(day, selectedPeriod) && (
                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDay(new Date())}
                  >
                    Today
                  </Button>
                </div>
              )}
              <DropdownMenu open={calOpen} onOpenChange={setCalOpen}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <CalendarIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-none p-0 m-0">
                  <Calendar
                    mode="single"
                    selected={day}
                    onSelect={(val) => {
                      if (val) {
                        setDay(val);
                        setCalOpen(false);
                      }
                    }}
                    className="rounded-md border"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex gap-1">
                <Button size="sm" onClick={handlePrevious} className="w-24">
                  <ChevronLeftIcon />
                  {PreviousText(day, selectedPeriod)}
                </Button>
                <Button size="sm" onClick={handleNext} className="w-24">
                  {NextText(day, selectedPeriod)}
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </AppContext.Provider>
      )}
    </>
  );
}

const PreviousText = (date: Date, period: Period): string => {
  if (period === "days") {
    return format(subWeeks(startOfWeek(date), 1), "MMM d");
  } else if (period === "weeks") {
    return format(subMonths(date, 1), "MMM");
  } else if (period === "months") {
    return format(subYears(startOfWeek(date), 1), "yyyy");
  } else if (period === "year") {
    return format(subYears(startOfWeek(date), 1), "yyyy");
  } else {
    return "Invalid Date";
  }
};

const NextText = (date: Date, period: Period): string => {
  if (period === "days") {
    return format(addWeeks(startOfWeek(date), 1), "MMM d");
  } else if (period === "weeks") {
    return format(addMonths(date, 1), "MMM");
  } else if (period === "months") {
    return format(addYears(startOfWeek(date), 1), "yyyy");
  } else if (period === "year") {
    return format(addYears(startOfWeek(date), 1), "yyyy");
  } else {
    return "Invalid Date";
  }
};

type DateWithTasks = { date: Date; tasks: Task[] };

const BuildDatesWithTasks = async (
  day: Date,
  period: Period,
  db?: LocalDB
): Promise<DateWithTasks[]> => {
  if (!db) return [];
  let dates: Date[] = [];

  if (period === "days") {
    const startOfTheWeek = startOfWeek(day, { weekStartsOn: 0 });
    dates = Array.from({ length: 7 }, (_, i) => addDays(startOfTheWeek, i));
  } else if (period === "weeks") {
    const startMonth = startOfMonth(day);
    const endMonth = endOfMonth(day);
    const numWeeks = differenceInCalendarWeeks(endMonth, startMonth) + 1;
    dates = Array.from({ length: numWeeks }, (_, i) => addWeeks(startMonth, i));
  } else if (period === "months") {
    const startOfYearDate = startOfYear(day);
    dates = Array.from({ length: 12 }, (_, i) => addMonths(startOfYearDate, i));
  } else if (period === "year") {
    dates = [startOfYear(day)];
  }

  return await Promise.all(
    dates.map(async (date) => ({
      date,
      tasks: await db.list(date, period),
    }))
  );
};
