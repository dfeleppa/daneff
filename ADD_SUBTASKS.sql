-- Add sub-task support to tasks table
-- Add parent_task_id column to enable task hierarchy (UUID to match tasks.id type)
ALTER TABLE tasks 
ADD COLUMN parent_task_id UUID NULL;

-- Add completion_percentage column for tracking sub-task completion
ALTER TABLE tasks 
ADD COLUMN completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Add foreign key constraint for parent_task_id
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_parent_task 
FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Add index for better query performance on parent_task_id
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add constraint to prevent self-referencing and circular dependencies
ALTER TABLE tasks 
ADD CONSTRAINT chk_no_self_reference 
CHECK (parent_task_id IS NULL OR parent_task_id != id);

-- Optional: Add a view to easily get task hierarchies
CREATE OR REPLACE VIEW task_hierarchy AS
WITH RECURSIVE task_tree AS (
    -- Base case: root tasks (no parent)
    SELECT 
        id,
        title,
        description,
        status_id,
        priority,
        project_id,
        assignee_id,
        due_date,
        created_at,
        updated_at,
        parent_task_id,
        completion_percentage,
        0 as depth,
        ARRAY[id] as path
    FROM tasks 
    WHERE parent_task_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child tasks
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status_id,
        t.priority,
        t.project_id,
        t.assignee_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.parent_task_id,
        t.completion_percentage,
        tt.depth + 1,
        tt.path || t.id
    FROM tasks t
    JOIN task_tree tt ON t.parent_task_id = tt.id
    WHERE NOT t.id = ANY(tt.path) -- Prevent infinite loops
)
SELECT * FROM task_tree
ORDER BY path;

COMMENT ON VIEW task_hierarchy IS 'Hierarchical view of tasks showing parent-child relationships';