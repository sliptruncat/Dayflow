import { describe, expect, it } from "vitest";
import { groupSubtasksByTask } from "./task-subtasks";

describe("groupSubtasksByTask", () => {
  it("groups saved subtasks by their parent task and preserves order", () => {
    const subtasks = [
      { id: "a", task_id: "task-1", title: "First" },
      { id: "b", task_id: "task-2", title: "Other task" },
      { id: "c", task_id: "task-1", title: "Second" },
    ];
    expect(groupSubtasksByTask(subtasks)).toEqual({
      "task-1": [subtasks[0], subtasks[2]],
      "task-2": [subtasks[1]],
    });
  });

  it("returns an empty map when no subtasks exist", () => {
    expect(groupSubtasksByTask([])).toEqual({});
  });
});
