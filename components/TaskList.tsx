import { Checkbox } from "@/components/ui/checkbox";
import { useContext } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppContext } from "@/pages/_app";
import { Button } from "./ui/button";
import { cn, isSamePeriod } from "@/lib/utils";
import { addDays, endOfMonth, format, isSameMonth, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  CheckIcon,
  CornerDownRightIcon,
  EllipsisVerticalIcon,
  XIcon,
} from "lucide-react";
import { Period, Task } from "@/lib/types";

const TaskList = ({
  date,
  tasks,
  period,
  onClickEdit,
  onClickCreate,
}: {
  date: Date;
  tasks: Task[];
  period: Period;
  onClickEdit: (task: Task) => void;
  onClickCreate: (date: Date) => void;
}) => {
  const { db, refresh } = useContext(AppContext);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const samePeriod = isSamePeriod(date, period);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!!active && !!over) {
      const _tasks = [...tasks];
      const oldIndex = _tasks.findIndex((item) => item.id === active.id);
      const newIndex = _tasks.findIndex((item) => item.id === over.id);

      if (oldIndex !== newIndex) {
        const [task] = _tasks.splice(oldIndex, 1);
        _tasks.splice(newIndex, 0, task);
        await db.updateOrder(
          parseISO(task.date),
          period,
          _tasks.map(({ id }) => id)
        );
        await refresh();
      }
    }
  };

  return (
    <div
      className="rounded-xl bg-white p-4"
      id={`${date.toISOString()}-${period}`}
    >
      <div className="flex min-h-64">
        <div
          className={cn(
            "p-3 w-44 rounded-xl flex flex-col justify-between",
            samePeriod ? "bg-primary" : "bg-secondary"
          )}
        >
          <div className="flex justify-between">
            <div>
              <h6 className={cn(samePeriod && "text-white")}>
                {DateTitle(date, period)}
              </h6>
            </div>
            <div className="mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <EllipsisVerticalIcon
                    className={cn("size-5", samePeriod && "text-white")}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onClickCreate(date)}>
                    <CheckIcon />
                    Add Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await db.copyIncompletes(date, period);
                      await refresh();
                    }}
                  >
                    <CornerDownRightIcon />
                    Copy Previous Incomplete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="!text-red-500"
                    onClick={async () => {
                      await db.clearPeriod(date, period);
                      await refresh();
                    }}
                  >
                    <XIcon />
                    Clear All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div>
            <p className={cn("text-sm", samePeriod && "text-white")}>
              {tasks.reduce(
                (total, task) => total + (task.complete ? 1 : 0),
                0
              )}{" "}
              / {tasks.length}
            </p>
          </div>
        </div>
        <div className="px-3 flex-1 flex flex-col justify-between">
          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={tasks.map(({ id }) => id)}>
                {tasks.map((task) => (
                  <TaskItem
                    task={task}
                    onClickEdit={onClickEdit}
                    key={task.id}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onClickCreate(date)}
            >
              <CheckIcon />
              Add Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskItem = ({
  task,
  onClickEdit,
}: {
  task: Task;
  onClickEdit: (task: Task) => void;
}) => {
  const { db, refresh } = useContext(AppContext);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ContextMenu>
        <ContextMenuTrigger className="">
          <div className="flex items-start gap-x-2 cursor-default -mb-1.5">
            <div>
              <Checkbox
                id={task.id}
                checked={task.complete}
                onClick={(e) => e.stopPropagation()} // Stop event from propagating
                onCheckedChange={async (val) => {
                  await db.update({
                    id: task.id,
                    complete: val ? true : false,
                  });
                  await refresh();
                }}
              />
            </div>
            <div
              {...listeners}
              className="leading-none pt-0.5 pb-1 !cursor-default"
            >
              <label className="text-sm leading-none !cursor-default">
                {task.name}
              </label>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => onClickEdit(task)}
            className="flex justify-between"
          >
            Edit
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => navigator.clipboard.writeText(task.name)}
            className="flex justify-between"
          >
            Copy
          </ContextMenuItem>
          <ContextMenuItem
            onClick={async () => {
              await db.delete(task.id);
              await refresh();
            }}
            className="text-red-500"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default TaskList;

const DateTitle = (date: Date, period: Period): string => {
  if (period === "days") {
    return `${format(date, "EEE MMM d")}`;
  } else if (period === "weeks") {
    let end = addDays(date, 6);
    if (!isSameMonth(date, end)) {
      end = endOfMonth(date);
    }
    return `${format(date, "MMM d")} - ${format(end, "MMM d")}`;
  } else if (period === "months") {
    return `${format(date, "MMM yyyy")}`;
  } else if (period === "year") {
    return `${format(date, "yyyy")}`;
  } else {
    return "Invalid Date";
  }
};
