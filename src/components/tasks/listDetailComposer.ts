import type { Task } from '@/src/types/database';
import type { TaskComposerSaveInput } from '@/src/components/tasks/CreateTaskSheet';

export async function saveTaskFromListDetail({
  editingTask,
  data,
  create,
  update,
}: {
  editingTask?: Pick<Task, 'id'>;
  data: TaskComposerSaveInput;
  create: (data: TaskComposerSaveInput) => Promise<void>;
  update: (id: string, data: TaskComposerSaveInput) => Promise<void>;
}) {
  if (editingTask) {
    await update(editingTask.id, data);
    return;
  }

  await create(data);
}
