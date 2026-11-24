export function groupSubtasksByTask<T extends { task_id: string }>(subtasks: T[]) {
  return subtasks.reduce<Record<string, T[]>>((grouped, subtask) => {
    (grouped[subtask.task_id] ??= []).push(subtask);
    return grouped;
  }, {});
}
