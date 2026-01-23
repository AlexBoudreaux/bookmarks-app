-- Seed starter categories
-- Main categories with subcategories as defined in PRD

-- UI
INSERT INTO categories (name, parent_id, sort_order) VALUES ('UI', NULL, 1);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Landing Pages', id, 1 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Components', id, 2 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'General UI', id, 3 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Branding/Aesthetic', id, 4 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Fonts', id, 5 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Assets/Resources', id, 6 FROM categories WHERE name = 'UI' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Misc', id, 7 FROM categories WHERE name = 'UI' AND parent_id IS NULL;

-- Image Gen
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Image Gen', NULL, 2);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Prompting', id, 1 FROM categories WHERE name = 'Image Gen' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Styles', id, 2 FROM categories WHERE name = 'Image Gen' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Misc', id, 3 FROM categories WHERE name = 'Image Gen' AND parent_id IS NULL;

-- General Dev
INSERT INTO categories (name, parent_id, sort_order) VALUES ('General Dev', NULL, 3);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Stack', id, 1 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Infra', id, 2 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Tools', id, 3 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Python', id, 4 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'JS/TS', id, 5 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Open Source', id, 6 FROM categories WHERE name = 'General Dev' AND parent_id IS NULL;

-- AI Dev
INSERT INTO categories (name, parent_id, sort_order) VALUES ('AI Dev', NULL, 4);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'AI SDK', id, 1 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Agents', id, 2 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'LLM Stack', id, 3 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Prompting', id, 4 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Learnings', id, 5 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Fine-Tuning', id, 6 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'RAG', id, 7 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'MCPs', id, 8 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'ML', id, 9 FROM categories WHERE name = 'AI Dev' AND parent_id IS NULL;

-- Claude Code/Cursor
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Claude Code/Cursor', NULL, 5);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Skills', id, 1 FROM categories WHERE name = 'Claude Code/Cursor' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'CLAUDE.md Prompts', id, 2 FROM categories WHERE name = 'Claude Code/Cursor' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Sub-Agents', id, 3 FROM categories WHERE name = 'Claude Code/Cursor' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'MCPs', id, 4 FROM categories WHERE name = 'Claude Code/Cursor' AND parent_id IS NULL;

-- Personal/Growth/Finance
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Personal/Growth/Finance', NULL, 6);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Inspiration', id, 1 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Fitness', id, 2 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Finance', id, 3 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Learnings', id, 4 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Reading', id, 5 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Productivity', id, 6 FROM categories WHERE name = 'Personal/Growth/Finance' AND parent_id IS NULL;

-- Business
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Business', NULL, 7);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Ideas', id, 1 FROM categories WHERE name = 'Business' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'General Business', id, 2 FROM categories WHERE name = 'Business' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Marketing', id, 3 FROM categories WHERE name = 'Business' AND parent_id IS NULL;

-- Automation/Personal Agent
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Automation/Personal Agent', NULL, 8);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Prompts', id, 1 FROM categories WHERE name = 'Automation/Personal Agent' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Workflows', id, 2 FROM categories WHERE name = 'Automation/Personal Agent' AND parent_id IS NULL;
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Productivity', id, 3 FROM categories WHERE name = 'Automation/Personal Agent' AND parent_id IS NULL;

-- Misc
INSERT INTO categories (name, parent_id, sort_order) VALUES ('Misc', NULL, 9);
INSERT INTO categories (name, parent_id, sort_order)
SELECT 'Uncategorized', id, 1 FROM categories WHERE name = 'Misc' AND parent_id IS NULL;
