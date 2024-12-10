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
import { Period, Task } from "@/lib/LocalDB";
import { AppContext } from "@/pages/_app";

const TaskList = ({
  tasks,
  period,
  refresh,
}: {
  tasks: Task[];
  period: Period;
  refresh: () => Promise<void>;
}) => {
  const { db } = useContext(AppContext);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
          new Date(task.date),
          period,
          _tasks.map(({ id }) => id)
        );
        await refresh();
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={tasks.map(({ id }) => id)}>
        {tasks.map((task) => (
          <div key={task.id}>
            <TaskItem task={task} refresh={refresh} />
          </div>
        ))}
      </SortableContext>
    </DndContext>
  );
};

const TaskItem = ({
  task,
  refresh,
}: {
  task: Task;
  refresh: () => Promise<void>;
}) => {
  const { db } = useContext(AppContext);
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
          <div className="flex items-center gap-x-2 cursor-default">
            <Checkbox
              id={task.id}
              checked={task.complete}
              onClick={(e) => e.stopPropagation()} // Stop event from propagating
              onCheckedChange={async (val) => {
                await db.update({ id: task.id, complete: val ? true : false });
                await refresh();
              }}
            />
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
