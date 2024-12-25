import { isSamePeriod, startOfPeriod } from "@/lib/utils";
import { useContext, useEffect, useState } from "react";
import CreateModal from "./CreateModal";
import TaskList from "./TaskList";
import { AppContext } from "@/pages/_app";
import EditModal from "./EditModal";
import { Period, Task } from "@/lib/types";

const CalendarScreen = ({ day, period }: { day: Date; period: Period }) => {
  const { datesWithTasks, refresh } = useContext(AppContext);

  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  useEffect(() => {
    refresh();
    setTimeout(() => {
      if (!isSamePeriod(day, period)) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const id = `${startOfPeriod(day, period).toISOString()}-${period}`;
        const current = document.getElementById(id);
        if (current) {
          const offsetTop = current.offsetTop; // Adjust for 20px space
          window.scrollTo({ top: offsetTop, behavior: "smooth" });
        } else {
        }
      }
    }, 10);
  }, [day, period]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editTask && !createDay && e.key === "Enter") {
        e.preventDefault();
        setCreateDay(day);
      }
      if (e.key === "Esc") {
        if (!!editTask) {
          setEditTask(null);
        } else if (!!createDay) {
          setCreateDay(null);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [createDay, editTask]);

  return (
    <>
      <CreateModal
        day={createDay}
        setDay={setCreateDay}
        refresh={refresh}
        period={period}
      />
      <EditModal task={editTask} setTask={setEditTask} refresh={refresh} />
      <div className="p-3">
        <div className="space-y-3">
          {datesWithTasks?.map(({ date, tasks }) => (
            <TaskList
              date={date}
              tasks={tasks}
              period={period}
              onClickCreate={(date) => setCreateDay(date)}
              onClickEdit={(task) => setEditTask(task)}
              key={date.toISOString()}
            />
          ))}
        </div>
        <div className="h-[calc(100vh-310px)]" />
      </div>
    </>
  );
};

export default CalendarScreen;
