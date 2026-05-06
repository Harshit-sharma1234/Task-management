-- Table: ticket_statuses
CREATE TABLE IF NOT EXISTS public.ticket_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    dot TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Table: ticket_priorities
CREATE TABLE IF NOT EXISTS public.ticket_priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Insert Default Statuses
INSERT INTO public.ticket_statuses (value, label, icon, color, dot, sort_order) VALUES
('backlog', 'Backlog', 'CircleDot', 'text-gray-400', 'bg-gray-400', 1),
('to_do', 'Todo', 'Circle', 'text-orange-400', 'bg-orange-400', 2),
('in_progress', 'In Progress', 'CircleDot', 'text-indigo-500', 'bg-indigo-500', 3),
('review', 'Review', 'CircleDot', 'text-fuchsia-400', 'bg-fuchsia-400', 4),
('in_review', 'In Review', 'CircleDot', 'text-purple-500', 'bg-purple-500', 5),
('done', 'Done', 'CheckCircle2', 'text-green-500', 'bg-green-500', 6),
('cancelled', 'Cancelled', 'X', 'text-red-500', 'bg-red-500', 7)
ON CONFLICT (value) DO NOTHING;

-- Insert Default Priorities
INSERT INTO public.ticket_priorities (value, label, icon, color, sort_order) VALUES
('no_priority', 'No priority', 'MoreHorizontal', 'text-gray-400', 1),
('low', 'Low', 'SignalLow', 'text-indigo-500', 2),
('medium', 'Medium', 'SignalMedium', 'text-yellow-500', 3),
('high', 'High', 'SignalHigh', 'text-red-500', 4),
('urgent', 'Urgent', 'SignalHigh', 'text-red-600', 5)
ON CONFLICT (value) DO NOTHING;

-- Enable RLS and add public read access
ALTER TABLE public.ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ticket_statuses" ON public.ticket_statuses FOR SELECT USING (true);
CREATE POLICY "Public read ticket_priorities" ON public.ticket_priorities FOR SELECT USING (true);
