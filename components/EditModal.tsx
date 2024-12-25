import { FormEvent, useContext, useEffect, useState } from "react";
import { AppContext } from "@/pages/_app";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Task } from "@/lib/types";

const EditModal = ({
  task,
  setTask,
  refresh,
}: {
  task?: Task | null;
  setTask: (task: Task | null) => void;
  refresh: () => Promise<void>;
}) => {
  const { db } = useContext(AppContext);
  const { toast } = useToast();

  const [name, setName] = useState<string>(task?.name || "");
  useEffect(() => {
    if (task?.name && task.name !== name) {
      setName(task.name);
    }
  }, [task]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!task) return;
    if (name === task.name) return;
    if (!name) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Name is required to create a new item",
      });
      return;
    }
    await db.update({ id: task.id, name: name });
    await refresh();
    setTask(null);
    setName("");
  };

  if (!task) return null;
  return (
    <Dialog open={!!task} onOpenChange={() => setTask(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Task</DialogTitle>
          <DialogDescription>Update the name of you task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} autoComplete="off">
          <div>
            <Label htmlFor="task_name" className="text-right">
              Name
            </Label>
            <Input
              id="task_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              data-bwignore
            />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={name === "" || name === task.name}>
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;
